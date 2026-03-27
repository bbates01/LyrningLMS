import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required');
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

type MockStudent = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  dateOfBirth: string;
  profile: 'high_low' | 'mid_high' | 'improving';
};

type AssignmentRow = {
  assignment_id: number;
  class_id: number;
  max_points: number;
};

type ExistingStudent = {
  student_id: number;
  username: string;
};

const SEED_TAG = 'metrics_seed_v1';

const MOCK_STUDENTS: MockStudent[] = [
  { firstName: 'Nora', lastName: 'Keller', username: 'nora_keller_mx', email: 'nora.keller.metrics@school.edu', dateOfBirth: '2006-02-11', profile: 'high_low' },
  { firstName: 'Ethan', lastName: 'Brooks', username: 'ethan_brooks_mx', email: 'ethan.brooks.metrics@school.edu', dateOfBirth: '2006-06-03', profile: 'high_low' },
  { firstName: 'Maya', lastName: 'Rios', username: 'maya_rios_mx', email: 'maya.rios.metrics@school.edu', dateOfBirth: '2006-04-19', profile: 'mid_high' },
  { firstName: 'Jordan', lastName: 'Price', username: 'jordan_price_mx', email: 'jordan.price.metrics@school.edu', dateOfBirth: '2005-12-08', profile: 'mid_high' },
  { firstName: 'Leah', lastName: 'Patel', username: 'leah_patel_mx', email: 'leah.patel.metrics@school.edu', dateOfBirth: '2006-09-22', profile: 'improving' },
  { firstName: 'Mateo', lastName: 'Diaz', username: 'mateo_diaz_mx', email: 'mateo.diaz.metrics@school.edu', dateOfBirth: '2006-01-27', profile: 'improving' },
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toLetterGrade(percentage: number): string {
  if (percentage >= 93) return 'A';
  if (percentage >= 90) return 'A-';
  if (percentage >= 87) return 'B+';
  if (percentage >= 83) return 'B';
  if (percentage >= 80) return 'B-';
  if (percentage >= 77) return 'C+';
  if (percentage >= 73) return 'C';
  if (percentage >= 70) return 'C-';
  if (percentage >= 67) return 'D+';
  if (percentage >= 63) return 'D';
  if (percentage >= 60) return 'D-';
  return 'F';
}

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0=Sun
  const diff = (day + 6) % 7; // Monday-based
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

function fmtDate(d: Date): string {
  return d.toISOString();
}

function scoreForProfile(profile: MockStudent['profile'], weekIdx: number, slot: number): { percentage: number; aiDependency: number } {
  // weekIdx: 0 oldest ... 7 newest
  if (profile === 'high_low') {
    const percentage = clamp(88 + weekIdx * 1.2 + (slot % 2 === 0 ? 2 : -1), 82, 99);
    const aiDependency = clamp(10 + (slot % 2 === 0 ? 2 : -1) + (weekIdx % 2), 3, 24);
    return { percentage, aiDependency };
  }
  if (profile === 'mid_high') {
    const percentage = clamp(64 + weekIdx * 1.8 + (slot % 2 === 0 ? 1 : -2), 56, 84);
    const aiDependency = clamp(74 + (slot % 2 === 0 ? 6 : -4) + (weekIdx % 2), 55, 95);
    return { percentage, aiDependency };
  }
  const percentage = clamp(52 + weekIdx * 5.5 + (slot % 2 === 0 ? 3 : -2), 48, 92);
  const aiDependency = clamp(84 - weekIdx * 6.8 + (slot % 2 === 0 ? 2 : -3), 20, 92);
  return { percentage, aiDependency };
}

function pickProfile(index: number): MockStudent['profile'] {
  const pattern: MockStudent['profile'][] = ['high_low', 'mid_high', 'improving'];
  return pattern[index % pattern.length];
}

function shouldEnrollInClass(studentId: number, classId: number): boolean {
  // Deterministic pseudo-random mix: ~60% enrollment chance.
  const value = (studentId * 31 + classId * 17) % 10;
  return value < 6;
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Step A: discover existing classes and assignments.
    const classRes = await client.query<{ class_id: number }>(
      `SELECT class_id FROM classes ORDER BY class_id ASC`
    );
    if (classRes.rows.length === 0) {
      throw new Error('No classes found. Cannot seed metrics without existing classes.');
    }
    const classIds = classRes.rows.map((r) => Number(r.class_id));

    const assignmentRes = await client.query<AssignmentRow>(
      `SELECT assignment_id, class_id, max_points
       FROM assignments
       ORDER BY class_id ASC, assignment_id ASC`
    );
    const assignments = assignmentRes.rows.map((r) => ({
      assignment_id: Number(r.assignment_id),
      class_id: Number(r.class_id),
      max_points: Number(r.max_points),
    }));

    if (assignments.length === 0) {
      throw new Error('No assignments found. Cannot seed grades without existing assignments.');
    }
    const selectedAssignments = assignments;
    const assignmentsByClass = new Map<number, AssignmentRow[]>();
    for (const assignment of selectedAssignments) {
      const list = assignmentsByClass.get(assignment.class_id) ?? [];
      list.push(assignment);
      assignmentsByClass.set(assignment.class_id, list);
    }

    // Ensure each selected assignment has at least one question for response seeding.
    const selectedAssignmentIds = selectedAssignments.map((a) => a.assignment_id);
    const questionRes = await client.query<{ assignment_id: number; question_id: number }>(
      `SELECT assignment_id, MIN(question_id) AS question_id
       FROM assignment_questions
       WHERE assignment_id = ANY($1::bigint[])
       GROUP BY assignment_id`,
      [selectedAssignmentIds]
    );
    const firstQuestionByAssignment = new Map<number, number>(
      questionRes.rows.map((r) => [Number(r.assignment_id), Number(r.question_id)])
    );

    // Step B: upsert mock students.
    const passwordHash = await bcrypt.hash('MockPass123!', 10);

    for (const s of MOCK_STUDENTS) {
      await client.query<{ student_id: number }>(
        `INSERT INTO students (first_name, last_name, email, username, password_hash, date_of_birth)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (username)
         DO UPDATE SET
           first_name = EXCLUDED.first_name,
           last_name = EXCLUDED.last_name,
           email = EXCLUDED.email,
           date_of_birth = EXCLUDED.date_of_birth
         RETURNING student_id`,
        [s.firstName, s.lastName, s.email, s.username, passwordHash, s.dateOfBirth]
      );
    }

    // Step C: include ALL students for full assignment + metric coverage.
    const allStudentsRes = await client.query<ExistingStudent>(
      `SELECT student_id, username
       FROM students
       ORDER BY student_id ASC`
    );
    const allStudents = allStudentsRes.rows.map((r) => ({
      student_id: Number(r.student_id),
      username: r.username,
    }));
    const studentIds = allStudents.map((s) => s.student_id);

    // Create a deterministic random enrollment mix so students are NOT in every class.
    // Also guarantee each student has at least one class and each class has at least one student.
    const studentToClassSet = new Map<number, Set<number>>();
    const classToStudentCount = new Map<number, number>(classIds.map((id) => [id, 0]));
    for (const studentId of studentIds) {
      const set = new Set<number>();
      for (const classId of classIds) {
        if (shouldEnrollInClass(studentId, classId)) set.add(classId);
      }
      if (set.size === 0) {
        const fallbackClass = classIds[studentId % classIds.length];
        set.add(fallbackClass);
      }
      studentToClassSet.set(studentId, set);
      for (const classId of set) classToStudentCount.set(classId, (classToStudentCount.get(classId) ?? 0) + 1);
    }
    for (const classId of classIds) {
      if ((classToStudentCount.get(classId) ?? 0) > 0) continue;
      const fallbackStudentId = studentIds[classId % studentIds.length];
      studentToClassSet.get(fallbackStudentId)?.add(classId);
      classToStudentCount.set(classId, 1);
    }

    for (const studentId of studentIds) {
      const enrolledClassSet = studentToClassSet.get(studentId) ?? new Set<number>();
      for (const classId of classIds) {
        const status = enrolledClassSet.has(classId) ? 'active' : 'inactive';
        await client.query(
          `INSERT INTO student_classes (student_id, class_id, enrollment_date, status)
           VALUES ($1, $2, CURRENT_DATE, $3)
           ON CONFLICT (student_id, class_id)
           DO UPDATE SET status = EXCLUDED.status`,
          [studentId, classId, status]
        );
      }
    }

    // Idempotency cleanup for this seed set only.
    await client.query(
      `DELETE FROM ai_usage_logs
       WHERE details->>'seed_tag' = $1`,
      [SEED_TAG]
    );

    // Also remove previously seeded response rows for these students + selected assignments.
    await client.query(
      `DELETE FROM student_assignment_responses
       WHERE student_id = ANY($1::bigint[])
         AND assignment_id = ANY($2::bigint[])`,
      [studentIds, selectedAssignmentIds]
    );

    // Step D: seed 8 weeks of submissions + grade rows across all assignments.
    const currentWeekStart = startOfWeek(new Date());
    const weekStarts = Array.from({ length: 8 }, (_, i) => addDays(currentWeekStart, -(7 * (7 - i))));

    for (let i = 0; i < allStudents.length; i++) {
      const studentId = allStudents[i].student_id;
      const profile = pickProfile(i);
      const enrolledClassSet = studentToClassSet.get(studentId) ?? new Set<number>();
      const studentAssignments = selectedAssignments.filter((a) => enrolledClassSet.has(a.class_id));

      for (let assignmentIdx = 0; assignmentIdx < studentAssignments.length; assignmentIdx++) {
        const assignment = studentAssignments[assignmentIdx];
        const weekIdx = assignmentIdx % 8;
        const slot = Math.floor(assignmentIdx / 8);
        const weekStart = weekStarts[weekIdx];
        const { percentage, aiDependency } = scoreForProfile(profile, weekIdx, slot);
        const understanding = Number((percentage * (1 - aiDependency / 100)).toFixed(2));
        const pointsEarned = Number(((assignment.max_points * percentage) / 100).toFixed(2));
        const dayOffset = (assignmentIdx % 5) + 1; // spread across weekdays
        const submissionDate = addDays(weekStart, dayOffset);
        submissionDate.setHours(15, 30, 0, 0);
        const gradedDate = addDays(submissionDate, 1);
        gradedDate.setHours(9, 0, 0, 0);

        await client.query(
            `INSERT INTO student_grades (
               student_id,
               assignment_id,
               points_earned,
               percentage,
               letter_grade,
               submission_date,
               graded_date,
               understanding_score,
               ai_dependency_score,
               engagement_score,
               submission_attempts
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
             ON CONFLICT (student_id, assignment_id)
             DO UPDATE SET
               points_earned = EXCLUDED.points_earned,
               percentage = EXCLUDED.percentage,
               letter_grade = EXCLUDED.letter_grade,
               submission_date = EXCLUDED.submission_date,
               graded_date = EXCLUDED.graded_date,
               understanding_score = EXCLUDED.understanding_score,
               ai_dependency_score = EXCLUDED.ai_dependency_score,
               engagement_score = EXCLUDED.engagement_score,
               submission_attempts = EXCLUDED.submission_attempts`,
            [
              studentId,
              assignment.assignment_id,
              pointsEarned,
              percentage,
              toLetterGrade(percentage),
              fmtDate(submissionDate),
              fmtDate(gradedDate),
              understanding,
              aiDependency,
              percentage, // engagement proxy
              1,
            ]
          );

        const firstQuestionId = firstQuestionByAssignment.get(assignment.assignment_id);
        if (firstQuestionId) {
          await client.query(
              `INSERT INTO student_assignment_responses (
                 student_id,
                 assignment_id,
                 question_id,
                 attempt_number,
                 response_text,
                 selected_option_ids,
                 is_correct,
                 submitted_at
               ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
              [
                studentId,
                assignment.assignment_id,
                firstQuestionId,
                1,
                `Seeded mock response for ${allStudents[i].username}`,
                null,
                percentage >= 70 ? 1 : 0,
                fmtDate(submissionDate),
              ]
            );
        }

          // Seed AI usage logs to make behavior profiles visible in usage analytics.
        const approxChatCount = Math.max(1, Math.round(aiDependency / 12));
        for (let c = 0; c < approxChatCount; c++) {
          const logTime = new Date(submissionDate);
          logTime.setMinutes(logTime.getMinutes() - (c + 1) * 12);
          await client.query(
              `INSERT INTO ai_usage_logs (student_id, action, timestamp, details)
               VALUES ($1, 'chat', $2, $3::jsonb)`,
              [
                studentId,
                fmtDate(logTime),
                JSON.stringify({
                  seed_tag: SEED_TAG,
                  assignment_id: assignment.assignment_id,
                  week_index: weekIdx,
                  profile,
                  simulated_dependency: aiDependency,
                }),
              ]
          );
        }
      }
    }

    // Step E: weekly rollup upsert into student_metrics for past 8 weeks.
    for (let i = 0; i < studentIds.length; i++) {
      const studentId = studentIds[i];
      const profile = pickProfile(i);
      const enrolledClassIds = Array.from(studentToClassSet.get(studentId) ?? []);
      for (let weekIdx = 0; weekIdx < 8; weekIdx++) {
        const weekStart = weekStarts[weekIdx];
        const weekEnd = addDays(weekStart, 6);
        const weekNumberRes = await client.query<{ week_number: number }>(
          `SELECT EXTRACT(WEEK FROM $1::timestamptz)::int AS week_number`,
          [fmtDate(weekStart)]
        );
        const weekNumber = Number(weekNumberRes.rows[0].week_number);

        // roll up per class for this student/week (as required by student_metrics PK).
        for (const classId of enrolledClassIds) {
          const aggRes = await client.query<{
            accuracy_score: number | null;
            ai_dependency_score: number | null;
            understanding_score: number | null;
          }>(
            `SELECT
               AVG(sg.percentage) AS accuracy_score,
               AVG(sg.ai_dependency_score) AS ai_dependency_score,
               AVG(sg.percentage * (1 - (sg.ai_dependency_score / 100.0))) AS understanding_score
             FROM student_grades sg
             JOIN assignments a ON a.assignment_id = sg.assignment_id
             WHERE sg.student_id = $1
               AND a.class_id = $2
               AND sg.submission_date >= $3::timestamptz
               AND sg.submission_date < ($3::timestamptz + INTERVAL '7 days')`,
            [studentId, classId, fmtDate(weekStart)]
          );
          const agg = aggRes.rows[0];

          // Guarantee all students/classes have all 8 weekly metric points, even if a class had no submissions that week.
          const fallback = scoreForProfile(profile, weekIdx, 0);
          const accuracy = agg.accuracy_score != null ? Number(agg.accuracy_score) : Number(fallback.percentage.toFixed(2));
          const aiDependency =
            agg.ai_dependency_score != null ? Number(agg.ai_dependency_score) : Number(fallback.aiDependency.toFixed(2));
          const understanding =
            agg.understanding_score != null
              ? Number(agg.understanding_score)
              : Number((accuracy * (1 - aiDependency / 100)).toFixed(2));

          await client.query(
            `INSERT INTO student_metrics (
               student_id,
               class_id,
               week_number,
               week_start_date,
               week_end_date,
               accuracy_score,
               ai_dependency_score,
               understanding_score,
               engagement_score,
               notes
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
             ON CONFLICT (student_id, class_id, week_number)
             DO UPDATE SET
               week_start_date = EXCLUDED.week_start_date,
               week_end_date = EXCLUDED.week_end_date,
               accuracy_score = EXCLUDED.accuracy_score,
               ai_dependency_score = EXCLUDED.ai_dependency_score,
               understanding_score = EXCLUDED.understanding_score,
               engagement_score = EXCLUDED.engagement_score,
               notes = EXCLUDED.notes`,
            [
              studentId,
              classId,
              weekNumber,
              weekStart.toISOString().slice(0, 10),
              weekEnd.toISOString().slice(0, 10),
              accuracy,
              aiDependency,
              understanding,
              accuracy, // keep engagement aligned to current convention
              `Seeded by ${SEED_TAG}`,
            ]
          );
        }
      }
    }

    await client.query('COMMIT');
    console.log(`✅ Seed complete (${SEED_TAG})`);
    console.log(`Created/updated ${MOCK_STUDENTS.length} mock students with randomized class enrollments and seeded 8 weeks of metrics.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
