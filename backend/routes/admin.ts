import express from 'express';
import { query } from '../db/connection.js';
import { requireAdminAuth } from '../auth/adminToken.js';

const router = express.Router();

router.use(requireAdminAuth);

/** Parsed from repeated or comma-separated query params */
export type AdminMultiFilters = {
  subjectCodes: string[];
  semesters: string[];
  periods: string[];
  teacherIds: number[];
};

function parseStringArrayFromQuery(q: express.Request['query'][string]): string[] {
  if (q == null) return [];
  const raw = Array.isArray(q) ? q : [q];
  const out: string[] = [];
  for (const item of raw) {
    const s = String(item ?? '');
    for (const part of s.split(',')) {
      const t = part.trim();
      if (t) out.push(t);
    }
  }
  return out;
}

function parseTeacherIdsFromQuery(q: express.Request['query'][string]): number[] {
  const nums = parseStringArrayFromQuery(q)
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n) && n > 0);
  return [...new Set(nums)];
}

function parseAdminMultiFilters(req: express.Request): AdminMultiFilters {
  return {
    subjectCodes: parseStringArrayFromQuery(req.query.subjectCodes),
    semesters: parseStringArrayFromQuery(req.query.semesters),
    periods: parseStringArrayFromQuery(req.query.periods),
    teacherIds: parseTeacherIdsFromQuery(req.query.teacherIds),
  };
}

/**
 * WHERE fragments for classes c + subjects s + teachers t.
 * `exclude` omits that dimension so dropdown options narrow based on the other selections.
 */
function buildClassDimensionFilters(
  f: AdminMultiFilters,
  exclude: 'subject' | 'semester' | 'period' | 'teacher',
  startParam: number
): { sql: string; params: unknown[]; nextParam: number } {
  const parts: string[] = [];
  const params: unknown[] = [];
  let p = startParam;

  if (exclude !== 'subject' && f.subjectCodes.length > 0) {
    parts.push(`s.subject_code = ANY($${p++}::text[])`);
    params.push(f.subjectCodes);
  }
  if (exclude !== 'semester' && f.semesters.length > 0) {
    parts.push(`COALESCE(c.semester, '') = ANY($${p++}::text[])`);
    params.push(f.semesters);
  }
  if (exclude !== 'period' && f.periods.length > 0) {
    parts.push(`COALESCE(c.period, '') = ANY($${p++}::text[])`);
    params.push(f.periods);
  }
  if (exclude !== 'teacher' && f.teacherIds.length > 0) {
    parts.push(`c.teacher_id = ANY($${p++}::int[])`);
    params.push(f.teacherIds);
  }

  const sql = parts.length ? parts.join(' AND ') : 'TRUE';
  return { sql, params, nextParam: p };
}

/** All dimensions apply (empty arrays = no filter on that axis). */
function buildGlobalMetricsClassFilters(f: AdminMultiFilters, startParam: number): { sql: string; params: unknown[]; nextParam: number } {
  const parts: string[] = [];
  const params: unknown[] = [];
  let p = startParam;
  if (f.subjectCodes.length > 0) {
    parts.push(`s.subject_code = ANY($${p++}::text[])`);
    params.push(f.subjectCodes);
  }
  if (f.semesters.length > 0) {
    parts.push(`COALESCE(c.semester, '') = ANY($${p++}::text[])`);
    params.push(f.semesters);
  }
  if (f.periods.length > 0) {
    parts.push(`COALESCE(c.period, '') = ANY($${p++}::text[])`);
    params.push(f.periods);
  }
  if (f.teacherIds.length > 0) {
    parts.push(`c.teacher_id = ANY($${p++}::int[])`);
    params.push(f.teacherIds);
  }
  const sql = parts.length ? parts.join(' AND ') : 'TRUE';
  return { sql, params, nextParam: p };
}

const CLASS_JOIN_FROM = `FROM classes c
       JOIN subjects s ON s.subject_id = c.subject_id
       JOIN teachers t ON t.teacher_id = c.teacher_id`;

/** GET /api/admin/filter-options — distinct values per axis; each list respects the other three axes (cascading). */
router.get('/filter-options', async (req: express.Request, res: express.Response) => {
  try {
    const f = parseAdminMultiFilters(req);

    const subWhere = buildClassDimensionFilters(f, 'subject', 1);
    const subjectsRes = await query(
      `SELECT DISTINCT s.subject_code
       ${CLASS_JOIN_FROM}
       WHERE ${subWhere.sql}
       ORDER BY s.subject_code ASC`,
      subWhere.params
    );

    const semWhere = buildClassDimensionFilters(f, 'semester', 1);
    const semestersRes = await query(
      `SELECT DISTINCT c.semester
       ${CLASS_JOIN_FROM}
       WHERE c.semester IS NOT NULL AND TRIM(c.semester) <> ''
         AND ${semWhere.sql}
       ORDER BY c.semester ASC`,
      semWhere.params
    );

    const perWhere = buildClassDimensionFilters(f, 'period', 1);
    const periodsRes = await query(
      `SELECT DISTINCT c.period
       ${CLASS_JOIN_FROM}
       WHERE c.period IS NOT NULL AND TRIM(c.period) <> ''
         AND ${perWhere.sql}
       ORDER BY c.period ASC`,
      perWhere.params
    );

    const teachWhere = buildClassDimensionFilters(f, 'teacher', 1);
    const teachersRes = await query(
      `SELECT DISTINCT t.teacher_id, t.first_name, t.last_name
       ${CLASS_JOIN_FROM}
       WHERE ${teachWhere.sql}
       ORDER BY t.last_name ASC, t.first_name ASC`,
      teachWhere.params
    );

    return res.json({
      success: true,
      subjectCodes: (subjectsRes.rows as { subject_code: string }[]).map((r) => r.subject_code),
      semesters: (semestersRes.rows as { semester: string }[]).map((r) => r.semester),
      periods: (periodsRes.rows as { period: string }[]).map((r) => r.period),
      teachers: (teachersRes.rows as { teacher_id: number; first_name: string; last_name: string }[]).map((r) => ({
        teacherId: Number(r.teacher_id),
        firstName: r.first_name,
        lastName: r.last_name,
      })),
    });
  } catch (err) {
    console.error('admin filter-options error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load filter options' });
  }
});

/**
 * GET /api/admin/metrics/global
 * Query: subjectCodes, semesters, periods, teacherIds — repeated or comma-separated; OR within each; AND across dimensions.
 */
router.get('/metrics/global', async (req: express.Request, res: express.Response) => {
  try {
    const f = parseAdminMultiFilters(req);
    const { sql: filterSql, params } = buildGlobalMetricsClassFilters(f, 1);

    const weeklyRes = await query(
      `SELECT
         sm.week_start_date,
         sm.week_end_date,
         sm.week_number,
         AVG(sm.accuracy_score) FILTER (WHERE sm.accuracy_score IS NOT NULL) AS avg_accuracy,
         AVG(sm.ai_dependency_score) FILTER (WHERE sm.ai_dependency_score IS NOT NULL) AS avg_ai_dependency,
         AVG(sm.understanding_score) FILTER (WHERE sm.understanding_score IS NOT NULL) AS avg_understanding
       FROM student_metrics sm
       INNER JOIN student_classes sc
         ON sc.student_id = sm.student_id AND sc.class_id = sm.class_id
       INNER JOIN classes c ON c.class_id = sm.class_id
       INNER JOIN subjects s ON s.subject_id = c.subject_id
       WHERE LOWER(TRIM(sc.status)) = 'active'
         AND (${filterSql})
       GROUP BY sm.week_start_date, sm.week_end_date, sm.week_number
       ORDER BY sm.week_start_date DESC NULLS LAST, sm.week_number DESC
       LIMIT 8`,
      params
    );

    const rows = weeklyRes.rows as Array<{
      week_start_date: string | null;
      week_end_date: string | null;
      week_number: number | null;
      avg_accuracy: string | number | null;
      avg_ai_dependency: string | number | null;
      avg_understanding: string | number | null;
    }>;

    const weekly = [...rows].reverse().map((row) => ({
      weekNumber: Number(row.week_number),
      weekStartDate: row.week_start_date ?? '',
      weekEndDate: row.week_end_date ?? '',
      accuracy: row.avg_accuracy != null ? Number(row.avg_accuracy) : null,
      aiDependency: row.avg_ai_dependency != null ? Number(row.avg_ai_dependency) : null,
      understanding: row.avg_understanding != null ? Number(row.avg_understanding) : null,
    }));

    const latest = rows[0];
    const currentAverages =
      latest == null
        ? null
        : {
            accuracy: latest.avg_accuracy != null ? Number(latest.avg_accuracy) : null,
            aiDependency: latest.avg_ai_dependency != null ? Number(latest.avg_ai_dependency) : null,
            understanding: latest.avg_understanding != null ? Number(latest.avg_understanding) : null,
          };
    const currentWeekMeta =
      latest == null
        ? null
        : {
            weekNumber: Number(latest.week_number),
            weekStartDate: latest.week_start_date ?? '',
            weekEndDate: latest.week_end_date ?? '',
          };

    return res.json({ success: true, weekly, currentAverages, currentWeek: currentWeekMeta });
  } catch (err) {
    console.error('admin metrics/global error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch global metrics' });
  }
});

/** GET /api/admin/classes — all classes with teacher + subject */
router.get('/classes', async (_req: express.Request, res: express.Response) => {
  try {
    const result = await query(
      `SELECT c.class_id, c.class_code, c.class_name, c.period, c.semester, c.room_number,
              s.subject_code, s.description AS subject_description,
              t.teacher_id, t.first_name AS teacher_first_name, t.last_name AS teacher_last_name
       FROM classes c
       JOIN subjects s ON s.subject_id = c.subject_id
       JOIN teachers t ON t.teacher_id = c.teacher_id
       ORDER BY t.last_name ASC, t.first_name ASC, c.class_name ASC`
    );
    return res.json({ success: true, classes: result.rows });
  } catch (err) {
    console.error('admin classes error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch classes' });
  }
});

/** GET /api/admin/classes/:classId/grades — same payload as teacher grades route */
router.get('/classes/:classId/grades', async (req: express.Request, res: express.Response) => {
  try {
    const classId = Number(req.params.classId);
    if (!Number.isFinite(classId)) {
      return res.status(400).json({ success: false, error: 'Invalid class id' });
    }

    const assignmentsResult = await query(
      `SELECT assignment_id, assignment_name, description, ai_params, type, max_points, due_date, allowed_submissions,
              COALESCE(keep_type, attempt_scoring_policy) AS keep_type
       FROM assignments
       WHERE class_id = $1
       ORDER BY due_date ASC NULLS LAST`,
      [classId]
    );

    const studentsResult = await query(
      `SELECT s.student_id, s.first_name, s.last_name
       FROM student_classes sc
       JOIN students s ON s.student_id = sc.student_id
       WHERE sc.class_id = $1 AND LOWER(TRIM(sc.status)) = 'active'
       ORDER BY s.last_name ASC, s.first_name ASC`,
      [classId]
    );

    const gradesResult = await query(
      `SELECT sg.student_id, sg.assignment_id, sg.points_earned, sg.percentage,
              sg.letter_grade, sg.submission_date, sg.understanding_score, sg.ai_dependency_score
       FROM student_grades sg
       JOIN assignments a ON a.assignment_id = sg.assignment_id
       WHERE a.class_id = $1`,
      [classId]
    );

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
    console.error('admin class grades error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch grades' });
  }
});

router.get('/classes/:classId/metrics/students', async (req: express.Request, res: express.Response) => {
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
    console.error('admin metrics students error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch metrics' });
  }
});

router.get('/classes/:classId/metrics/students/:studentId', async (req: express.Request, res: express.Response) => {
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
    console.error('admin student metric history error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch student metrics' });
  }
});

router.get('/classes/:classId/metrics/class-averages', async (req: express.Request, res: express.Response) => {
  try {
    const classId = Number(req.params.classId);
    if (!Number.isFinite(classId)) {
      return res.status(400).json({ success: false, error: 'Invalid class id' });
    }

    const weeklyRes = await query(
      `SELECT
         sm.week_start_date,
         sm.week_end_date,
         sm.week_number,
         AVG(sm.accuracy_score) FILTER (WHERE sm.accuracy_score IS NOT NULL) AS avg_accuracy,
         AVG(sm.ai_dependency_score) FILTER (WHERE sm.ai_dependency_score IS NOT NULL) AS avg_ai_dependency,
         AVG(sm.understanding_score) FILTER (WHERE sm.understanding_score IS NOT NULL) AS avg_understanding
       FROM student_metrics sm
       INNER JOIN student_classes sc
         ON sc.student_id = sm.student_id AND sc.class_id = sm.class_id
       WHERE sm.class_id = $1 AND LOWER(TRIM(sc.status)) = 'active'
       GROUP BY sm.week_start_date, sm.week_end_date, sm.week_number
       ORDER BY sm.week_start_date DESC NULLS LAST, sm.week_number DESC
       LIMIT 8`,
      [classId]
    );

    const rows = weeklyRes.rows as Array<{
      week_start_date: string | null;
      week_end_date: string | null;
      week_number: number | null;
      avg_accuracy: string | number | null;
      avg_ai_dependency: string | number | null;
      avg_understanding: string | number | null;
    }>;

    const weekly = [...rows]
      .reverse()
      .map((row) => ({
        weekNumber: Number(row.week_number),
        weekStartDate: row.week_start_date ?? '',
        weekEndDate: row.week_end_date ?? '',
        accuracy: row.avg_accuracy != null ? Number(row.avg_accuracy) : null,
        aiDependency: row.avg_ai_dependency != null ? Number(row.avg_ai_dependency) : null,
        understanding: row.avg_understanding != null ? Number(row.avg_understanding) : null,
      }));

    const latest = rows[0];
    const currentAverages =
      latest == null
        ? null
        : {
            accuracy: latest.avg_accuracy != null ? Number(latest.avg_accuracy) : null,
            aiDependency: latest.avg_ai_dependency != null ? Number(latest.avg_ai_dependency) : null,
            understanding: latest.avg_understanding != null ? Number(latest.avg_understanding) : null,
          };
    const currentWeekMeta =
      latest == null
        ? null
        : {
            weekNumber: Number(latest.week_number),
            weekStartDate: latest.week_start_date ?? '',
            weekEndDate: latest.week_end_date ?? '',
          };

    return res.json({ success: true, weekly, currentAverages, currentWeek: currentWeekMeta });
  } catch (err) {
    console.error('admin class metric averages error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch class metric averages' });
  }
});

export default router;
