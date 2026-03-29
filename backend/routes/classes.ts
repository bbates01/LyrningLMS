import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { query } from '../db/connection.js';

function generateAssignmentLink(): string {
  return crypto.randomBytes(8).toString('hex');
}

function generateClassCode(): string {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

function normalizeAttemptScoringPolicy(raw: unknown): 'latest' | 'highest' | 'average' {
  const policy = String(raw ?? 'latest').trim().toLowerCase();
  if (policy === 'highest' || policy === 'average') return policy;
  return 'latest';
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

async function recomputeAssignmentAggregateGrades(
  assignmentId: number,
  policyRaw: unknown
): Promise<void> {
  const policy = normalizeAttemptScoringPolicy(policyRaw);
  const studentsRes = await query(
    `SELECT DISTINCT student_id
     FROM student_assignment_attempt_grades
     WHERE assignment_id = $1`,
    [assignmentId]
  );
  const studentIds = (studentsRes.rows as Array<{ student_id: number }>).map((r) => Number(r.student_id));
  const studentsFromGradesRes = await query(
    `SELECT DISTINCT student_id
     FROM student_grades
     WHERE assignment_id = $1`,
    [assignmentId]
  );
  for (const row of studentsFromGradesRes.rows as Array<{ student_id: number }>) {
    const sid = Number(row.student_id);
    if (!studentIds.includes(sid)) studentIds.push(sid);
  }
  const assignmentMetaRes = await query(
    `SELECT max_points
     FROM assignments
     WHERE assignment_id = $1
     LIMIT 1`,
    [assignmentId]
  );
  const assignmentMaxPoints = Number((assignmentMetaRes.rows[0] as any)?.max_points ?? 100);
  const avg = (vals: Array<number | null | undefined>) => {
    const nums = vals.filter((v): v is number => v != null && Number.isFinite(Number(v))).map(Number);
    if (!nums.length) return null;
    return Number((nums.reduce((s, n) => s + n, 0) / nums.length).toFixed(2));
  };

  for (const studentId of studentIds) {
    const attemptsRes = await query(
      `SELECT
         attempt_number,
         points_earned,
         percentage,
         understanding_score,
         ai_dependency_score,
         engagement_score
       FROM student_assignment_attempt_grades
       WHERE assignment_id = $1 AND student_id = $2
       ORDER BY attempt_number ASC`,
      [assignmentId, studentId]
    );
    const attempts = attemptsRes.rows as Array<{
      attempt_number: number;
      points_earned: number | null;
      percentage: number | null;
      understanding_score: number | null;
      ai_dependency_score: number | null;
      engagement_score: number | null;
    }>;
    if (!attempts.length) {
      const fromResponsesRes = await query(
        `SELECT
           attempt_number,
           SUM(
             COALESCE(
               sar.points_earned,
               CASE WHEN sar.is_correct = 1 THEN COALESCE(aq.max_points, 1) ELSE 0 END
             )
           )::float AS points_earned_sum,
           SUM(COALESCE(aq.max_points, 1))::float AS points_possible_sum
         FROM student_assignment_responses sar
         JOIN assignment_questions aq ON aq.question_id = sar.question_id
         WHERE assignment_id = $1 AND student_id = $2
         GROUP BY attempt_number
         ORDER BY attempt_number ASC`,
        [assignmentId, studentId]
      );
      for (const row of fromResponsesRes.rows as Array<{ attempt_number: number; points_earned_sum: number | null; points_possible_sum: number | null }>) {
        const pointsPossible = Number(row.points_possible_sum ?? 0);
        const pointsEarnedRaw = Number(row.points_earned_sum ?? 0);
        const percentage = pointsPossible > 0 ? Number(((pointsEarnedRaw / pointsPossible) * 100).toFixed(2)) : null;
        const pointsEarned = percentage == null ? null : Number(((assignmentMaxPoints * percentage) / 100).toFixed(2));
        const letterGrade = percentage == null ? null : toLetterGrade(percentage);
        await query(
          `INSERT INTO student_assignment_attempt_grades (
             student_id, assignment_id, attempt_number, points_earned, percentage, letter_grade, is_kept
           ) VALUES ($1, $2, $3, $4, $5, $6, FALSE)
           ON CONFLICT (student_id, assignment_id, attempt_number)
           DO UPDATE SET
             points_earned = EXCLUDED.points_earned,
             percentage = EXCLUDED.percentage,
             letter_grade = EXCLUDED.letter_grade`,
          [studentId, assignmentId, Number(row.attempt_number), pointsEarned, percentage, letterGrade]
        );
      }
    }

    const finalAttemptsRes = await query(
      `SELECT
         attempt_number,
         points_earned,
         percentage,
         understanding_score,
         ai_dependency_score,
         engagement_score
       FROM student_assignment_attempt_grades
       WHERE assignment_id = $1 AND student_id = $2
       ORDER BY attempt_number ASC`,
      [assignmentId, studentId]
    );
    const finalAttempts = finalAttemptsRes.rows as Array<{
      attempt_number: number;
      points_earned: number | null;
      percentage: number | null;
      understanding_score: number | null;
      ai_dependency_score: number | null;
      engagement_score: number | null;
    }>;
    if (!finalAttempts.length) continue;

    let chosen = finalAttempts[finalAttempts.length - 1];
    if (policy === 'highest') {
      chosen = [...finalAttempts].sort((a, b) => {
        const ap = a.percentage == null ? -1 : Number(a.percentage);
        const bp = b.percentage == null ? -1 : Number(b.percentage);
        if (bp !== ap) return bp - ap;
        return Number(b.attempt_number) - Number(a.attempt_number);
      })[0];
    }

    let keptAttemptNumber = chosen.attempt_number;
    if (policy === 'average') {
      keptAttemptNumber = finalAttempts[finalAttempts.length - 1].attempt_number;
    }
    await query(
      `UPDATE student_assignment_attempt_grades
       SET is_kept = FALSE
       WHERE assignment_id = $1 AND student_id = $2`,
      [assignmentId, studentId]
    );
    await query(
      `UPDATE student_assignment_attempt_grades
       SET is_kept = TRUE
       WHERE assignment_id = $1 AND student_id = $2 AND attempt_number = $3`,
      [assignmentId, studentId, keptAttemptNumber]
    );

    const aggregate =
      policy === 'average'
        ? {
            pointsEarned: avg(finalAttempts.map((a) => a.points_earned)),
            percentage: avg(finalAttempts.map((a) => a.percentage)),
            understandingScore: avg(finalAttempts.map((a) => a.understanding_score)),
            aiDependencyScore: avg(finalAttempts.map((a) => a.ai_dependency_score)),
            engagementScore: avg(finalAttempts.map((a) => a.engagement_score)),
          }
        : {
            pointsEarned: chosen.points_earned == null ? null : Number(chosen.points_earned),
            percentage: chosen.percentage == null ? null : Number(chosen.percentage),
            understandingScore: chosen.understanding_score == null ? null : Number(chosen.understanding_score),
            aiDependencyScore: chosen.ai_dependency_score == null ? null : Number(chosen.ai_dependency_score),
            engagementScore: chosen.engagement_score == null ? null : Number(chosen.engagement_score),
          };

    const letterGrade = aggregate.percentage == null ? null : toLetterGrade(Number(aggregate.percentage));
    await query(
      `UPDATE student_grades
       SET points_earned = $1,
           percentage = $2,
           letter_grade = $3,
           understanding_score = $4,
           ai_dependency_score = $5,
           engagement_score = $6
       WHERE student_id = $7 AND assignment_id = $8`,
      [
        aggregate.pointsEarned,
        aggregate.percentage,
        letterGrade,
        aggregate.understandingScore,
        aggregate.aiDependencyScore,
        aggregate.engagementScore,
        studentId,
        assignmentId,
      ]
    );
  }
}

// POST /api/classes/enroll — student enrolls in a class by class_code
router.post('/enroll', async (req, res) => {
  try {
    const { studentId, classCode } = req.body as { studentId?: number; classCode?: string };
    if (studentId == null || !classCode || typeof classCode !== 'string') {
      return res.status(400).json({ success: false, error: 'studentId and classCode are required' });
    }
    const code = String(classCode).trim().toUpperCase();
    const classRow = await query('SELECT class_id FROM classes WHERE class_code = $1', [code]);
    if (classRow.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Invalid class code' });
    }
    const classId = classRow.rows[0].class_id;
    const existing = await query(
      'SELECT 1 FROM student_classes WHERE student_id = $1 AND class_id = $2',
      [studentId, classId]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'Already enrolled in this class' });
    }
    await query(
      `INSERT INTO student_classes (student_id, class_id, enrollment_date, status)
       VALUES ($1, $2, CURRENT_DATE, 'active')`,
      [studentId, classId]
    );
    return res.status(201).json({ success: true, classId });
  } catch (err) {
    console.error('Error enrolling student:', err);
    res.status(500).json({ success: false, error: 'Failed to enroll' });
  }
});

// GET /api/classes/student/:studentId — classes the student is enrolled in
router.get('/student/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const result = await query(
      `SELECT c.class_id, c.class_code, c.class_name, c.period, c.semester, c.room_number,
              s.subject_code, s.description AS subject_description,
              t.first_name AS teacher_first_name, t.last_name AS teacher_last_name
       FROM classes c
       JOIN subjects s ON s.subject_id = c.subject_id
       JOIN teachers t ON t.teacher_id = c.teacher_id
       JOIN student_classes sc ON sc.class_id = c.class_id
       WHERE sc.student_id = $1 AND sc.status = 'active'
       ORDER BY c.class_name`,
      [studentId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching student classes:', err);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

// GET /api/classes/:classId/students — enrolled students for a class
router.get('/:classId/students', async (req, res) => {
  try {
    const classId = Number(req.params.classId);
    if (!Number.isFinite(classId)) {
      return res.status(400).json({ success: false, error: 'Invalid class id' });
    }

    const result = await query(
      `SELECT
         s.student_id,
         s.first_name,
         s.last_name,
         s.email,
         s.username
       FROM student_classes sc
       JOIN students s ON s.student_id = sc.student_id
       WHERE sc.class_id = $1 AND LOWER(TRIM(sc.status)) = 'active'
       ORDER BY s.student_id ASC`,
      [classId]
    );

    return res.json({ success: true, students: result.rows });
  } catch (err) {
    console.error('Error fetching enrolled students:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch students for class' });
  }
});

// DELETE /api/classes/:classId/students/:studentId — remove student from class (set inactive)
router.delete('/:classId/students/:studentId', async (req, res) => {
  try {
    const classId = Number(req.params.classId);
    const studentId = Number(req.params.studentId);
    if (!Number.isFinite(classId) || !Number.isFinite(studentId)) {
      return res.status(400).json({ success: false, error: 'Invalid class id or student id' });
    }

    const existing = await query(
      `SELECT 1
       FROM student_classes
       WHERE class_id = $1 AND student_id = $2
       LIMIT 1`,
      [classId, studentId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Student is not enrolled in this class' });
    }

    await query(
      `UPDATE student_classes
       SET status = 'inactive'
       WHERE class_id = $1 AND student_id = $2`,
      [classId, studentId]
    );

    return res.json({ success: true });
  } catch (err) {
    console.error('Error removing student from class:', err);
    return res.status(500).json({ success: false, error: 'Failed to remove student from class' });
  }
});

// POST /api/classes/:classId/students/add-existing — enroll an existing student by username
router.post('/:classId/students/add-existing', async (req, res) => {
  try {
    const classId = Number(req.params.classId);
    const username = String((req.body as { username?: unknown })?.username ?? '').trim().toLowerCase();
    if (!Number.isFinite(classId) || !username) {
      return res.status(400).json({ success: false, error: 'classId and username are required' });
    }

    const classRes = await query('SELECT class_id FROM classes WHERE class_id = $1 LIMIT 1', [classId]);
    if (classRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Class not found' });
    }

    const studentRes = await query(
      `SELECT student_id, first_name, last_name, email, username
       FROM students
       WHERE LOWER(username) = $1
       LIMIT 1`,
      [username]
    );
    if (studentRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Student username not found' });
    }
    const student = studentRes.rows[0] as any;

    await query(
      `INSERT INTO student_classes (student_id, class_id, enrollment_date, status)
       VALUES ($1, $2, CURRENT_DATE, 'active')
       ON CONFLICT (student_id, class_id)
       DO UPDATE SET status = 'active'`,
      [student.student_id, classId]
    );

    return res.status(201).json({
      success: true,
      student: {
        student_id: Number(student.student_id),
        first_name: student.first_name,
        last_name: student.last_name,
        email: student.email,
        username: student.username,
      },
    });
  } catch (err) {
    console.error('Error adding existing student to class:', err);
    return res.status(500).json({ success: false, error: 'Failed to add existing student' });
  }
});

// POST /api/classes/:classId/students/add-new — create and enroll a brand-new student
router.post('/:classId/students/add-new', async (req, res) => {
  try {
    const classId = Number(req.params.classId);
    const body = req.body as {
      firstName?: unknown;
      lastName?: unknown;
      username?: unknown;
      password?: unknown;
      email?: unknown;
      dateOfBirth?: unknown;
    };
    const firstName = String(body.firstName ?? '').trim();
    const lastName = String(body.lastName ?? '').trim();
    const username = String(body.username ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    const emailInput = String(body.email ?? '').trim().toLowerCase();
    const dateOfBirthRaw = String(body.dateOfBirth ?? '').trim();
    const dateOfBirth = dateOfBirthRaw || '2006-01-01';
    const email = emailInput || `${username}@school.edu`;

    if (!Number.isFinite(classId) || !firstName || !lastName || !username || !password) {
      return res.status(400).json({ success: false, error: 'firstName, lastName, username, and password are required' });
    }

    const classRes = await query('SELECT class_id FROM classes WHERE class_id = $1 LIMIT 1', [classId]);
    if (classRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Class not found' });
    }

    const existingUsername = await query('SELECT 1 FROM students WHERE LOWER(username) = $1 LIMIT 1', [username]);
    if (existingUsername.rows.length > 0) {
      return res.status(409).json({ success: false, error: 'Username is already taken' });
    }

    const existingEmail = await query('SELECT 1 FROM students WHERE LOWER(email) = $1 LIMIT 1', [email]);
    if (existingEmail.rows.length > 0) {
      return res.status(409).json({ success: false, error: 'Email is already in use; provide a different email' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const insertedRes = await query(
      `INSERT INTO students (first_name, last_name, email, username, password_hash, date_of_birth)
       VALUES ($1, $2, $3, $4, $5, $6::date)
       RETURNING student_id, first_name, last_name, email, username`,
      [firstName, lastName, email, username, passwordHash, dateOfBirth]
    );
    const student = insertedRes.rows[0] as any;

    await query(
      `INSERT INTO student_classes (student_id, class_id, enrollment_date, status)
       VALUES ($1, $2, CURRENT_DATE, 'active')
       ON CONFLICT (student_id, class_id)
       DO UPDATE SET status = 'active'`,
      [student.student_id, classId]
    );

    // Keep teacher password visibility consistent with existing admin UX.
    await query(
      `INSERT INTO student_passwords_plaintext (student_id, password_plaintext)
       VALUES ($1, $2)
       ON CONFLICT (student_id)
       DO UPDATE SET password_plaintext = EXCLUDED.password_plaintext, updated_at = NOW()`,
      [student.student_id, password]
    );

    return res.status(201).json({
      success: true,
      student: {
        student_id: Number(student.student_id),
        first_name: student.first_name,
        last_name: student.last_name,
        email: student.email,
        username: student.username,
      },
    });
  } catch (err) {
    console.error('Error creating and adding student to class:', err);
    return res.status(500).json({ success: false, error: 'Failed to create student' });
  }
});

// GET /api/classes/teacher/:teacherId — classes the teacher teaches
router.get('/teacher/:teacherId', async (req, res) => {
  try {
    const { teacherId } = req.params;
    const result = await query(
      `SELECT c.class_id, c.class_code, c.class_name, c.period, c.semester, c.room_number,
              s.subject_code, s.description AS subject_description
       FROM classes c
       JOIN subjects s ON s.subject_id = c.subject_id
       WHERE c.teacher_id = $1
       ORDER BY c.class_name`,
      [teacherId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching teacher classes:', err);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

// POST /api/classes/teacher/:teacherId — create a class for a teacher
router.post('/teacher/:teacherId', async (req, res) => {
  try {
    const teacherId = Number(req.params.teacherId);
    const body = req.body as {
      className?: unknown;
      subjectCode?: unknown;
      semester?: unknown;
      period?: unknown;
      roomNumber?: unknown;
      classCode?: unknown;
    };

    const className = String(body.className ?? '').trim();
    const subjectCode = String(body.subjectCode ?? '').trim().toUpperCase();
    const semester = String(body.semester ?? '').trim() || null;
    const period = String(body.period ?? '').trim() || null;
    const roomNumber = String(body.roomNumber ?? '').trim() || null;
    const requestedClassCode = String(body.classCode ?? '').trim().toUpperCase();

    if (!Number.isFinite(teacherId)) {
      return res.status(400).json({ success: false, error: 'Invalid teacher id' });
    }
    if (!className || !subjectCode) {
      return res.status(400).json({ success: false, error: 'className and subjectCode are required' });
    }

    const teacherCheck = await query('SELECT 1 FROM teachers WHERE teacher_id = $1 LIMIT 1', [teacherId]);
    if (teacherCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Teacher not found' });
    }

    const subjectUpsert = await query(
      `INSERT INTO subjects (subject_code, description)
       VALUES ($1, $2)
       ON CONFLICT (subject_code)
       DO UPDATE SET description = COALESCE(subjects.description, EXCLUDED.description)
       RETURNING subject_id, subject_code, description`,
      [subjectCode, `${subjectCode} course`]
    );
    const subject = subjectUpsert.rows[0] as { subject_id: number; subject_code: string; description: string | null };

    let finalClassCode = requestedClassCode;
    if (!finalClassCode) {
      for (let i = 0; i < 8; i++) {
        const candidate = generateClassCode();
        const existing = await query('SELECT 1 FROM classes WHERE class_code = $1 LIMIT 1', [candidate]);
        if (existing.rows.length === 0) {
          finalClassCode = candidate;
          break;
        }
      }
      if (!finalClassCode) {
        return res.status(500).json({ success: false, error: 'Could not generate a unique class code' });
      }
    } else {
      const existing = await query('SELECT 1 FROM classes WHERE class_code = $1 LIMIT 1', [finalClassCode]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ success: false, error: 'Class code is already in use' });
      }
    }

    const created = await query(
      `INSERT INTO classes (class_code, subject_id, teacher_id, class_name, period, semester, room_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING class_id, class_code, class_name, period, semester, room_number`,
      [finalClassCode, subject.subject_id, teacherId, className, period, semester, roomNumber]
    );
    const row = created.rows[0] as any;
    return res.status(201).json({
      success: true,
      class: {
        class_id: Number(row.class_id),
        class_code: row.class_code,
        class_name: row.class_name,
        period: row.period,
        semester: row.semester,
        room_number: row.room_number,
        subject_code: subject.subject_code,
        subject_description: subject.description,
      },
    });
  } catch (err) {
    console.error('Error creating class:', err);
    return res.status(500).json({ success: false, error: 'Failed to create class' });
  }
});

// GET /api/classes/:classId — single class details (for header)
router.get('/:classId', async (req, res) => {
  try {
    const { classId } = req.params;
    const result = await query(
      `SELECT c.class_id, c.class_code, c.class_name, c.period, c.semester, c.room_number,
              s.subject_code, s.description AS subject_description,
              t.teacher_id, t.first_name AS teacher_first_name, t.last_name AS teacher_last_name
       FROM classes c
       JOIN subjects s ON s.subject_id = c.subject_id
       JOIN teachers t ON t.teacher_id = c.teacher_id
       WHERE c.class_id = $1`,
      [classId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching class:', err);
    res.status(500).json({ error: 'Failed to fetch class' });
  }
});

// PUT /api/classes/:classId — update class metadata
router.put('/:classId', async (req, res) => {
  try {
    const classId = Number(req.params.classId);
    const {
      teacherId,
      className,
      subjectCode,
      semester,
      period,
      roomNumber,
      classCode,
    } = req.body as {
      teacherId?: number;
      className?: string;
      subjectCode?: string;
      semester?: string;
      period?: string;
      roomNumber?: string;
      classCode?: string;
    };

    if (!Number.isFinite(classId) || !Number.isFinite(Number(teacherId))) {
      return res.status(400).json({ success: false, error: 'Invalid class id or teacher id' });
    }
    if (!className || !className.trim() || !subjectCode || !subjectCode.trim()) {
      return res.status(400).json({ success: false, error: 'className and subjectCode are required' });
    }

    const ownership = await query(
      'SELECT class_id FROM classes WHERE class_id = $1 AND teacher_id = $2 LIMIT 1',
      [classId, teacherId]
    );
    if (ownership.rows.length === 0) {
      return res.status(403).json({ success: false, error: 'You are not allowed to edit this class' });
    }

    const normalizedSubjectCode = subjectCode.trim().toUpperCase();
    const subjectRes = await query(
      `INSERT INTO subjects (subject_code, description)
       VALUES ($1, $2)
       ON CONFLICT (subject_code)
       DO UPDATE SET description = COALESCE(subjects.description, EXCLUDED.description)
       RETURNING subject_id, subject_code, description`,
      [normalizedSubjectCode, `${normalizedSubjectCode} course`]
    );
    const subject = subjectRes.rows[0] as { subject_id: number; subject_code: string; description: string | null };

    const normalizedClassCode = classCode && classCode.trim() ? classCode.trim().toUpperCase() : null;
    if (normalizedClassCode) {
      const classCodeInUse = await query(
        'SELECT class_id FROM classes WHERE class_code = $1 AND class_id <> $2 LIMIT 1',
        [normalizedClassCode, classId]
      );
      if (classCodeInUse.rows.length > 0) {
        return res.status(409).json({ success: false, error: 'Class code is already in use' });
      }
    }

    const updated = await query(
      `UPDATE classes
       SET class_name = $1,
           subject_id = $2,
           semester = $3,
           period = $4,
           room_number = $5,
           class_code = COALESCE($6, class_code)
       WHERE class_id = $7
       RETURNING class_id, class_code, class_name, semester, period, room_number`,
      [
        className.trim(),
        subject.subject_id,
        semester?.trim() || null,
        period?.trim() || null,
        roomNumber?.trim() || null,
        normalizedClassCode,
        classId,
      ]
    );

    return res.json({
      success: true,
      class: {
        class_id: Number((updated.rows[0] as any).class_id),
        class_code: (updated.rows[0] as any).class_code,
        class_name: (updated.rows[0] as any).class_name,
        semester: (updated.rows[0] as any).semester,
        period: (updated.rows[0] as any).period,
        room_number: (updated.rows[0] as any).room_number,
        subject_code: subject.subject_code,
        subject_description: subject.description,
      },
    });
  } catch (err) {
    console.error('Error updating class:', err);
    return res.status(500).json({ success: false, error: 'Failed to update class' });
  }
});

// DELETE /api/classes/:classId — delete class and dependent records
router.delete('/:classId', async (req, res) => {
  try {
    const classId = Number(req.params.classId);
    const teacherId = Number((req.query.teacherId as string) || (req.body as any)?.teacherId);
    if (!Number.isFinite(classId) || !Number.isFinite(teacherId)) {
      return res.status(400).json({ success: false, error: 'Invalid class id or teacher id' });
    }

    const ownership = await query(
      'SELECT class_id FROM classes WHERE class_id = $1 AND teacher_id = $2 LIMIT 1',
      [classId, teacherId]
    );
    if (ownership.rows.length === 0) {
      return res.status(403).json({ success: false, error: 'You are not allowed to delete this class' });
    }

    await query('BEGIN');
    try {
      await query(
        `DELETE FROM student_grades
         WHERE assignment_id IN (SELECT assignment_id FROM assignments WHERE class_id = $1)`,
        [classId]
      );
      await query('DELETE FROM assignments WHERE class_id = $1', [classId]);
      await query('DELETE FROM student_metrics WHERE class_id = $1', [classId]);
      await query('DELETE FROM student_classes WHERE class_id = $1', [classId]);
      await query('DELETE FROM classes WHERE class_id = $1', [classId]);
      await query('COMMIT');
    } catch (txErr) {
      await query('ROLLBACK');
      throw txErr;
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Error deleting class:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete class' });
  }
});

// GET /api/classes/:classId/assignments — assignments for a class
router.get('/:classId/assignments', async (req, res) => {
  try {
    const { classId } = req.params;
    const result = await query(
      `SELECT assignment_id, assignment_name, description, type, max_points, due_date, assignment_link, ai_params, question_types, allowed_submissions,
              COALESCE(keep_type, attempt_scoring_policy) AS attempt_scoring_policy
       FROM assignments
       WHERE class_id = $1
       ORDER BY due_date ASC NULLS LAST`,
      [classId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching class assignments:', err);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// PUT /api/classes/:classId/assignments/:assignmentId — teacher updates assignment metadata
router.put('/:classId/assignments/:assignmentId', async (req, res) => {
  try {
    const classId = Number(req.params.classId);
    const assignmentId = Number(req.params.assignmentId);
    const {
      teacherId,
      assignmentName,
      description,
      dueDate,
      aiParams,
      maxPoints,
      allowedSubmissions,
      attemptScoringPolicy,
    } = req.body as {
      teacherId?: number;
      assignmentName?: string;
      description?: string;
      dueDate?: string | null;
      aiParams?: string | null;
      maxPoints?: number;
      allowedSubmissions?: number;
      attemptScoringPolicy?: string;
    };

    if (!Number.isFinite(classId) || !Number.isFinite(assignmentId) || !Number.isFinite(Number(teacherId))) {
      return res.status(400).json({ success: false, error: 'Invalid ids' });
    }
    if (!assignmentName || !assignmentName.trim()) {
      return res.status(400).json({ success: false, error: 'assignmentName is required' });
    }

    const classCheck = await query(
      'SELECT class_id FROM classes WHERE class_id = $1 AND teacher_id = $2',
      [classId, teacherId]
    );
    if (classCheck.rows.length === 0) {
      return res.status(403).json({ success: false, error: 'You are not allowed to edit assignments in this class' });
    }

    let dueDateIso: string | null = null;
    if (typeof dueDate === 'string' && dueDate.trim()) {
      const parsed = new Date(dueDate);
      if (Number.isNaN(parsed.getTime())) {
        return res.status(400).json({ success: false, error: 'dueDate must be a valid date/time' });
      }
      dueDateIso = parsed.toISOString();
    }

    const allowedSubmissionsNum =
      typeof allowedSubmissions === 'number' && Number.isFinite(allowedSubmissions)
        ? Math.max(1, Math.floor(allowedSubmissions))
        : 1;
    const scoringPolicy = normalizeAttemptScoringPolicy(attemptScoringPolicy);
    const maxPointsNum =
      typeof maxPoints === 'number' && Number.isFinite(maxPoints) && maxPoints > 0
        ? Number(maxPoints)
        : 100;

    const updated = await query(
      `UPDATE assignments
       SET assignment_name = $1,
           description = $2,
           due_date = $3,
           ai_params = $4,
           max_points = $5,
           allowed_submissions = $6,
           keep_type = $7,
           attempt_scoring_policy = $7
       WHERE assignment_id = $8 AND class_id = $9
       RETURNING assignment_id, assignment_name, description, due_date, ai_params, max_points, allowed_submissions, keep_type`,
      [
        assignmentName.trim(),
        description ?? null,
        dueDateIso,
        aiParams ?? null,
        maxPointsNum,
        allowedSubmissionsNum,
        scoringPolicy,
        assignmentId,
        classId,
      ]
    );
    if (updated.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Assignment not found' });
    }
    await recomputeAssignmentAggregateGrades(assignmentId, scoringPolicy);

    return res.json({ success: true, assignment: updated.rows[0] });
  } catch (err) {
    console.error('Error updating assignment:', err);
    return res.status(500).json({ success: false, error: 'Failed to update assignment' });
  }
});

// GET /api/classes/:classId/assignments/:assignmentId/questions — questions and options for preview
router.get('/:classId/assignments/:assignmentId/questions', async (req, res) => {
  try {
    const { classId, assignmentId } = req.params;
    const aid = Number(assignmentId);
    const cid = Number(classId);
    if (Number.isNaN(aid) || Number.isNaN(cid)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const assignCheck = await query(
      'SELECT assignment_id FROM assignments WHERE assignment_id = $1 AND class_id = $2',
      [aid, cid]
    );
    if (assignCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    const questionsRows = await query(
      `SELECT question_id, sort_order, question_text, question_type, correct_answer, max_points
       FROM assignment_questions
       WHERE assignment_id = $1
       ORDER BY sort_order ASC`,
      [aid]
    );
    const questions: { questionId: number; sortOrder: number; questionText: string; questionType: string; maxPoints: number; options: { optionText: string; isCorrect: number }[] }[] = [];
    for (const q of questionsRows.rows as { question_id: number; sort_order: number; question_text: string; question_type: string | null; correct_answer: string | null; max_points: number | null }[]) {
      const optRows = await query(
        `SELECT option_text, is_correct FROM assignment_question_options WHERE question_id = $1 ORDER BY option_id ASC`,
        [q.question_id]
      );
      questions.push({
        questionId: q.question_id,
        sortOrder: q.sort_order,
        questionText: q.question_text,
        questionType: q.question_type || 'multiple_choice',
        maxPoints: Number(q.max_points ?? 1),
        options: (optRows.rows as { option_text: string; is_correct: number }[]).map((o) => ({
          optionText: o.option_text,
          isCorrect: o.is_correct,
        })),
      });
    }
    res.json({ questions });
  } catch (err) {
    console.error('Error fetching assignment questions:', err);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// DELETE /api/classes/:classId/assignments/:assignmentId
router.delete('/:classId/assignments/:assignmentId', async (req, res) => {
  try {
    const { classId, assignmentId } = req.params;
    const aid = Number(assignmentId);
    const cid = Number(classId);
    if (Number.isNaN(aid) || Number.isNaN(cid)) {
      return res.status(400).json({ success: false, error: 'Invalid id' });
    }
    const assignCheck = await query(
      'SELECT assignment_id FROM assignments WHERE assignment_id = $1 AND class_id = $2',
      [aid, cid]
    );
    if (assignCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Assignment not found' });
    }
    await query('BEGIN');
    try {
      await query('DELETE FROM student_assignment_responses WHERE assignment_id = $1', [aid]);
      await query('DELETE FROM student_assignment_attempt_grades WHERE assignment_id = $1', [aid]);
      await query('DELETE FROM student_grades WHERE assignment_id = $1', [aid]);
      await query(
        `DELETE FROM assignment_question_options
         WHERE question_id IN (
           SELECT question_id FROM assignment_questions WHERE assignment_id = $1
         )`,
        [aid]
      );
      await query('DELETE FROM assignment_questions WHERE assignment_id = $1', [aid]);
      await query('DELETE FROM assignments WHERE assignment_id = $1', [aid]);
      await query('COMMIT');
    } catch (txErr) {
      await query('ROLLBACK');
      throw txErr;
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('Error deleting assignment:', err);
    res.status(500).json({ success: false, error: 'Failed to delete assignment' });
  }
});

// POST /api/classes/:classId/assignments — teacher creates an assignment for a class
router.post('/:classId/assignments', async (req, res) => {
  try {
    const { classId } = req.params;
    const {
      teacherId,
      assignmentName,
      description,
      type,
      maxPoints,
      dueDate,
      aiParams,
      questionTypes,
      allowedSubmissions,
      attemptScoringPolicy,
      pdfSummary,
    } = req.body as {
      teacherId?: number;
      assignmentName?: string;
      description?: string;
      type?: string;
      maxPoints?: number;
      dueDate?: string;
      aiParams?: string;
      questionTypes?: string;
      allowedSubmissions?: number;
      attemptScoringPolicy?: string;
      pdfSummary?: string;
    };

    if (teacherId == null || !assignmentName) {
      return res
        .status(400)
        .json({ success: false, error: 'teacherId and assignmentName are required' });
    }
    const hasDueDate = typeof dueDate === 'string' && dueDate.trim().length > 0;
    let parsedDueDateIso: string | null = null;
    if (hasDueDate) {
      const parsedDueDate = new Date(dueDate);
      if (Number.isNaN(parsedDueDate.getTime())) {
        return res.status(400).json({ success: false, error: 'dueDate must be a valid date/time' });
      }
      parsedDueDateIso = parsedDueDate.toISOString();
    }

    // Make sure this teacher actually owns the class
    const classCheck = await query(
      'SELECT class_id FROM classes WHERE class_id = $1 AND teacher_id = $2',
      [classId, teacherId]
    );

    if (classCheck.rows.length === 0) {
      return res
        .status(403)
        .json({ success: false, error: 'You are not allowed to add assignments to this class' });
    }

    const assignmentLink = generateAssignmentLink();
    const allowedSubmissionsNum =
      typeof allowedSubmissions === 'number' && Number.isFinite(allowedSubmissions)
        ? Math.max(1, Math.floor(allowedSubmissions))
        : 1;
    const scoringPolicy = normalizeAttemptScoringPolicy(attemptScoringPolicy);
    const questionTypesStr =
      typeof questionTypes === 'string' ? questionTypes : Array.isArray(questionTypes) ? (questionTypes as string[]).join(',') : null;

    const insertResult = await query(
      `INSERT INTO assignments (class_id, assignment_name, description, type, max_points, due_date, assignment_link, ai_params, question_types, allowed_submissions, keep_type, attempt_scoring_policy, pdf_summary)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11, $12)
       RETURNING assignment_id, class_id, assignment_name, description, type, max_points, due_date, assignment_link, ai_params, question_types, allowed_submissions, keep_type, pdf_summary`,
      [
        classId,
        assignmentName,
        description ?? null,
        type ?? null,
        maxPoints ?? 100,
        parsedDueDateIso,
        assignmentLink,
        aiParams ?? null,
        questionTypesStr ?? null,
        allowedSubmissionsNum,
        scoringPolicy,
        pdfSummary ?? null,
      ]
    );

    return res.status(201).json({ success: true, assignment: insertResult.rows[0] });
  } catch (err) {
    console.error('Error creating assignment:', err);
    res.status(500).json({ success: false, error: 'Failed to create assignment' });
  }
});

// POST /api/classes/:classId/assignments/pdf — attach PDF to an existing assignment (assignmentId required). Does NOT create assignments.
router.post('/:classId/assignments/pdf', upload.single('pdf'), async (req, res) => {
  try {
    const { classId } = req.params;
    const { teacherId, assignmentId: existingAssignmentId } = req.body as {
      teacherId?: string | number;
      assignmentId?: string | number;
    };

    const teacherIdNum = teacherId == null ? null : Number(teacherId);
    if (teacherIdNum == null || Number.isNaN(teacherIdNum)) {
      return res
        .status(400)
        .json({ success: false, error: 'teacherId is required' });
    }

    const aid = existingAssignmentId != null ? Number(existingAssignmentId) : NaN;
    if (Number.isNaN(aid) || aid <= 0) {
      return res
        .status(400)
        .json({ success: false, error: 'assignmentId is required to attach a PDF' });
    }

    if (!req.file || !req.file.buffer || req.file.buffer.length === 0) {
      return res.status(400).json({ success: false, error: 'A pdf file is required (field name: pdf)' });
    }

    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ success: false, error: 'Only application/pdf is supported' });
    }

    const classCheck = await query(
      'SELECT class_id FROM classes WHERE class_id = $1 AND teacher_id = $2',
      [classId, teacherIdNum]
    );
    if (classCheck.rows.length === 0) {
      return res
        .status(403)
        .json({ success: false, error: 'You are not allowed to add assignments to this class' });
    }

    const assignCheck = await query(
      'SELECT assignment_id FROM assignments WHERE assignment_id = $1 AND class_id = $2',
      [aid, classId]
    );
    if (assignCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Assignment not found' });
    }

    // PDF is accepted and processed (e.g. for AI); not stored permanently in this flow.
    return res.status(201).json({ success: true, assignmentId: aid });
  } catch (err) {
    console.error('Error uploading assignment PDF:', err);
    res.status(500).json({ success: false, error: 'Failed to upload assignment PDF' });
  }
});

// GET /api/classes/assignments/link/:link — look up an assignment by its shareable link token
router.get('/assignments/link/:link', async (req, res) => {
  try {
    const { link } = req.params;
    const result = await query(
      `SELECT a.assignment_id, a.class_id, a.assignment_name, a.description, a.type,
              a.max_points, a.due_date, a.assignment_link,
              c.class_name
       FROM assignments a
       JOIN classes c ON c.class_id = a.class_id
       WHERE a.assignment_link = $1`,
      [link]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching assignment by link:', err);
    res.status(500).json({ error: 'Failed to fetch assignment' });
  }
});

// POST /api/classes/:classId/assignments/:assignmentId/questions — save questions and options for an assignment
router.post('/:classId/assignments/:assignmentId/questions', async (req, res) => {
  try {
    const { classId, assignmentId } = req.params;
    const { questions, assignmentMaxPoints } = req.body as {
      questions?: {
        questionText: string;
        questionType?: string;
        maxPoints?: number;
        correctAnswer?: string;
        correctAnswers?: string[];
        falseAnswers: string[];
      }[];
      assignmentMaxPoints?: number;
    };

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: 'questions array is required and must not be empty' });
    }

    const assignmentIdNum = Number(assignmentId);
    const classIdNum = Number(classId);
    if (Number.isNaN(assignmentIdNum) || Number.isNaN(classIdNum)) {
      return res.status(400).json({ success: false, error: 'Invalid assignment or class id' });
    }

    const assignCheck = await query(
      'SELECT assignment_id, max_points FROM assignments WHERE assignment_id = $1 AND class_id = $2',
      [assignmentIdNum, classIdNum]
    );
    if (assignCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Assignment not found' });
    }

    const assignmentMaxPointsValue =
      typeof assignmentMaxPoints === 'number' && Number.isFinite(assignmentMaxPoints) && assignmentMaxPoints > 0
        ? Number(assignmentMaxPoints)
        : Number((assignCheck.rows[0] as any).max_points ?? 100);

    const questionTypeMap: Record<string, string> = {
      select_all_that_apply: 'select_all_that_apply',
      multiple_choice: 'multiple_choice',
      true_false: 'true_false',
      short_answer: 'short_answer',
    };
    const providedPoints = questions.map((q) => Number(q.maxPoints));
    const hasAllPointValues = providedPoints.every((n) => Number.isFinite(n) && n > 0);
    const normalizedQuestionPoints = hasAllPointValues
      ? providedPoints
      : (() => {
          const count = Math.max(1, questions.length);
          const even = Number((assignmentMaxPointsValue / count).toFixed(2));
          const arr = new Array(count).fill(even);
          const sum = Number((arr.reduce((s, n) => s + n, 0)).toFixed(2));
          arr[count - 1] = Number((arr[count - 1] + (assignmentMaxPointsValue - sum)).toFixed(2));
          return arr;
        })();
    const totalQuestionPoints = Number(
      normalizedQuestionPoints.reduce((s, n) => s + Number(n || 0), 0).toFixed(2)
    );
    if (Math.abs(totalQuestionPoints - assignmentMaxPointsValue) > 0.01) {
      return res.status(400).json({
        success: false,
        error: `Question point total (${totalQuestionPoints}) must equal assignment max points (${assignmentMaxPointsValue}).`,
      });
    }

    await query('BEGIN');
    try {
      await query(`UPDATE assignments SET max_points = $1 WHERE assignment_id = $2 AND class_id = $3`, [
        assignmentMaxPointsValue,
        assignmentIdNum,
        classIdNum,
      ]);
      await query(
        `DELETE FROM assignment_question_options
         WHERE question_id IN (
           SELECT question_id FROM assignment_questions WHERE assignment_id = $1
         )`,
        [assignmentIdNum]
      );
      await query('DELETE FROM assignment_questions WHERE assignment_id = $1', [assignmentIdNum]);

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const questionText = q?.questionText?.trim();
        const typeRaw = q?.questionType ?? 'multiple_choice';
        const questionType = questionTypeMap[typeRaw] ?? 'multiple_choice';
        const correctAnswers = Array.isArray(q?.correctAnswers) ? q.correctAnswers.filter((c) => c != null && String(c).trim() !== '') : [];
        const correctAnswerSingle = q?.correctAnswer != null ? String(q.correctAnswer).trim() : '';
        const falseAnswers = Array.isArray(q?.falseAnswers) ? q.falseAnswers : [];
        const questionMaxPoints = Number(normalizedQuestionPoints[i]);

        if (!questionText) continue;

        const insertQ = await query(
          `INSERT INTO assignment_questions (assignment_id, sort_order, question_text, question_type, max_points, correct_answer)
           VALUES ($1, $2, $3, $4, $5, NULL)
           RETURNING question_id`,
          [assignmentIdNum, i + 1, questionText, questionType, questionMaxPoints]
        );
        const questionId = (insertQ.rows[0] as { question_id: number }).question_id;

        const correctOptionIds: number[] = [];
        if (questionType === 'select_all_that_apply' && correctAnswers.length > 0) {
          for (const text of correctAnswers) {
            const ins = await query(
              `INSERT INTO assignment_question_options (question_id, option_text, is_correct)
               VALUES ($1, $2, 1)
               RETURNING option_id`,
              [questionId, text]
            );
            correctOptionIds.push((ins.rows[0] as { option_id: number }).option_id);
          }
          for (const fa of falseAnswers) {
            if (fa != null && String(fa).trim() !== '') {
              await query(
                `INSERT INTO assignment_question_options (question_id, option_text, is_correct)
                 VALUES ($1, $2, 0)`,
                [questionId, String(fa).trim()]
              );
            }
          }
          await query(
            'UPDATE assignment_questions SET correct_answer = $1 WHERE question_id = $2',
            [correctOptionIds.join(','), questionId]
          );
        } else {
          const insertCorrect = await query(
            `INSERT INTO assignment_question_options (question_id, option_text, is_correct)
             VALUES ($1, $2, 1)
             RETURNING option_id`,
            [questionId, correctAnswerSingle || '']
          );
          const correctOptionId = (insertCorrect.rows[0] as { option_id: number }).option_id;
          await query(
            'UPDATE assignment_questions SET correct_answer = $1 WHERE question_id = $2',
            [String(correctOptionId), questionId]
          );
          for (const fa of falseAnswers) {
            if (fa != null && String(fa).trim() !== '') {
              await query(
                `INSERT INTO assignment_question_options (question_id, option_text, is_correct)
                 VALUES ($1, $2, 0)`,
                [questionId, String(fa).trim()]
              );
            }
          }
        }
      }

      await query('COMMIT');
    } catch (txErr) {
      await query('ROLLBACK');
      throw txErr;
    }

    return res.status(201).json({ success: true });
  } catch (err) {
    console.error('Error saving assignment questions:', err);
    res.status(500).json({ success: false, error: 'Failed to save questions' });
  }
});

// GET /api/classes/:classId/grades — all assignments with student grades for a class
router.get('/:classId/grades', async (req, res) => {
  try {
    const classId = Number(req.params.classId);
    if (!Number.isFinite(classId)) {
      return res.status(400).json({ success: false, error: 'Invalid class id' });
    }

    // Fetch all assignments for the class
    const assignmentsResult = await query(
      `SELECT assignment_id, assignment_name, description, ai_params, type, max_points, due_date, allowed_submissions,
              COALESCE(keep_type, attempt_scoring_policy) AS keep_type
       FROM assignments
       WHERE class_id = $1
       ORDER BY due_date ASC NULLS LAST`,
      [classId]
    );

    // Fetch all enrolled students
    const studentsResult = await query(
      `SELECT s.student_id, s.first_name, s.last_name
       FROM student_classes sc
       JOIN students s ON s.student_id = sc.student_id
       WHERE sc.class_id = $1 AND LOWER(TRIM(sc.status)) = 'active'
       ORDER BY s.last_name ASC, s.first_name ASC`,
      [classId]
    );

    // Fetch all grades for assignments in this class
    const gradesResult = await query(
      `SELECT sg.student_id, sg.assignment_id, sg.points_earned, sg.percentage,
              sg.letter_grade, sg.submission_date, sg.understanding_score, sg.ai_dependency_score
       FROM student_grades sg
       JOIN assignments a ON a.assignment_id = sg.assignment_id
       WHERE a.class_id = $1`,
      [classId]
    );

    // Index grades by assignment_id -> student_id
    const gradeMap = new Map<number, Map<number, any>>();
    for (const g of gradesResult.rows as any[]) {
      if (!gradeMap.has(g.assignment_id)) {
        gradeMap.set(g.assignment_id, new Map());
      }
      gradeMap.get(g.assignment_id)!.set(g.student_id, g);
    }

    const students = (studentsResult.rows as any[]).map((s) => ({
      studentId: s.student_id,
      firstName: s.first_name,
      lastName: s.last_name,
    }));

    const assignments = (assignmentsResult.rows as any[]).map((a) => {
      const assignGrades = gradeMap.get(a.assignment_id);
      const studentGrades = students.map((s) => {
        const grade = assignGrades?.get(s.studentId);
        return {
          studentId: s.studentId,
          firstName: s.firstName,
          lastName: s.lastName,
          submitted: !!grade,
          pointsEarned: grade?.points_earned ?? null,
          percentage: grade?.percentage ?? null,
          letterGrade: grade?.letter_grade ?? null,
          submissionDate: grade?.submission_date ?? null,
          understandingScore: grade?.understanding_score ?? null,
          aiDependencyScore: grade?.ai_dependency_score ?? null,
        };
      });
      const submitted = studentGrades.filter((s) => s.submitted);
      const avg = (values: Array<number | null>) => {
        const nums = values.filter((v): v is number => v != null);
        if (nums.length === 0) return null;
        return nums.reduce((sum, v) => sum + v, 0) / nums.length;
      };
      return {
        assignmentId: a.assignment_id,
        assignmentName: a.assignment_name,
        description: a.description,
        aiParams: a.ai_params,
        type: a.type,
        maxPoints: a.max_points,
        dueDate: a.due_date,
        allowedSubmissions: a.allowed_submissions,
        attemptScoringPolicy: a.keep_type,
        averages: {
          accuracy: avg(submitted.map((s) => s.percentage)),
          understanding: avg(submitted.map((s) => s.understandingScore)),
          aiDependency: avg(submitted.map((s) => s.aiDependencyScore)),
        },
        students: studentGrades,
      };
    });

    return res.json({ success: true, assignments });
  } catch (err) {
    console.error('Error fetching class grades:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch grades' });
  }
});

// GET /api/classes/:classId/metrics/students — class student list with current-week metric badges
router.get('/:classId/metrics/students', async (req, res) => {
  try {
    const classId = Number(req.params.classId);
    if (!Number.isFinite(classId)) {
      return res.status(400).json({ success: false, error: 'Invalid class id' });
    }

    const studentsRes = await query(
      `SELECT s.student_id, s.first_name, s.last_name, s.username
       FROM student_classes sc
       JOIN students s ON s.student_id = sc.student_id
       WHERE sc.class_id = $1 AND LOWER(TRIM(sc.status)) = 'active'
       ORDER BY s.last_name ASC, s.first_name ASC`,
      [classId]
    );

    const metricsRes = await query(
      `SELECT DISTINCT ON (sm.student_id)
         sm.student_id,
         sm.accuracy_score,
         sm.ai_dependency_score,
         sm.understanding_score
       FROM student_metrics sm
       WHERE sm.class_id = $1
       ORDER BY sm.student_id, sm.week_start_date DESC NULLS LAST, sm.week_number DESC`,
      [classId]
    );

    const byStudentId = new Map<number, any>();
    for (const row of metricsRes.rows as any[]) byStudentId.set(Number(row.student_id), row);

    const students = (studentsRes.rows as any[]).map((s) => {
      const m = byStudentId.get(Number(s.student_id));
      return {
        studentId: Number(s.student_id),
        firstName: s.first_name,
        lastName: s.last_name,
        username: s.username,
        currentWeek: {
          accuracy: m?.accuracy_score != null ? Number(m.accuracy_score) : null,
          aiDependency: m?.ai_dependency_score != null ? Number(m.ai_dependency_score) : null,
          understanding: m?.understanding_score != null ? Number(m.understanding_score) : null,
        },
      };
    });

    return res.json({ success: true, students });
  } catch (err) {
    console.error('Error fetching class metrics student list:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch metrics' });
  }
});

// GET /api/classes/:classId/metrics/students/:studentId — weekly metric series for one student
router.get('/:classId/metrics/students/:studentId', async (req, res) => {
  try {
    const classId = Number(req.params.classId);
    const studentId = Number(req.params.studentId);
    if (!Number.isFinite(classId) || !Number.isFinite(studentId)) {
      return res.status(400).json({ success: false, error: 'Invalid class id or student id' });
    }

    const studentRes = await query(
      `SELECT s.student_id, s.first_name, s.last_name, s.username
       FROM student_classes sc
       JOIN students s ON s.student_id = sc.student_id
       WHERE sc.class_id = $1
         AND s.student_id = $2
         AND LOWER(TRIM(sc.status)) = 'active'
       LIMIT 1`,
      [classId, studentId]
    );
    if (studentRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Student is not enrolled in this class' });
    }

    const weeklyRes = await query(
      `SELECT
         sm.week_start_date,
         sm.week_end_date,
         sm.week_number,
         sm.accuracy_score,
         sm.ai_dependency_score,
         sm.understanding_score
       FROM student_metrics sm
       WHERE sm.student_id = $1
         AND sm.class_id = $2
       ORDER BY sm.week_start_date DESC NULLS LAST, sm.week_number DESC
       LIMIT 8`,
      [studentId, classId]
    );

    const history = (weeklyRes.rows as any[]).reverse().map((row) => ({
      weekNumber: Number(row.week_number),
      weekStartDate: row.week_start_date,
      weekEndDate: row.week_end_date,
      accuracy: row.accuracy_score != null ? Number(row.accuracy_score) : null,
      aiDependency: row.ai_dependency_score != null ? Number(row.ai_dependency_score) : null,
      understanding: row.understanding_score != null ? Number(row.understanding_score) : null,
    }));

    return res.json({
      success: true,
      student: {
        studentId: Number((studentRes.rows[0] as any).student_id),
        firstName: (studentRes.rows[0] as any).first_name,
        lastName: (studentRes.rows[0] as any).last_name,
        username: (studentRes.rows[0] as any).username,
      },
      history,
    });
  } catch (err) {
    console.error('Error fetching student metric history:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch student metrics' });
  }
});

// GET /api/classes/assignments/:assignmentId/pdf — no longer supported (PDFs not stored)
router.get('/assignments/:assignmentId/pdf', async (_req, res) => {
  return res
    .status(404)
    .json({ error: 'PDF download is not supported; files are not stored permanently.' });
});

export default router;
