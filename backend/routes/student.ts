import express from 'express';
import { query } from '../db/connection.js';
import { requireStudentAuth, type StudentAuthedRequest } from '../auth/studentToken.js';

const router = express.Router();

type AssignmentQuestionOption = {
  option_id: number;
  option_text: string;
  is_correct: number;
};

type AssignmentQuestionRow = {
  question_id: number;
  sort_order: number;
  question_text: string;
  question_type: string;
  option_id: number | null;
  option_text: string | null;
  is_correct: number | null;
};

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

function normalizeType(raw: string | null | undefined): string {
  if (!raw) return 'multiple_choice';
  return raw;
}

function groupQuestions(rows: AssignmentQuestionRow[]) {
  const byId = new Map<number, {
    questionId: number;
    sortOrder: number;
    questionText: string;
    questionType: string;
    options: AssignmentQuestionOption[];
  }>();

  for (const row of rows) {
    const existing = byId.get(row.question_id) || {
      questionId: row.question_id,
      sortOrder: row.sort_order,
      questionText: row.question_text,
      questionType: normalizeType(row.question_type),
      options: [],
    };

    if (row.option_id != null && row.option_text != null && row.is_correct != null) {
      existing.options.push({
        option_id: row.option_id,
        option_text: row.option_text,
        is_correct: row.is_correct,
      });
    }

    byId.set(row.question_id, existing);
  }

  return Array.from(byId.values()).sort((a, b) => a.sortOrder - b.sortOrder);
}

async function ensureStudentCanAccess(studentId: number, classId: number, assignmentId: number) {
  const assignmentRes = await query(
    `SELECT assignment_id, class_id, assignment_name, description, type, max_points, due_date, allowed_submissions, ai_params
     FROM assignments
     WHERE assignment_id = $1 AND class_id = $2`,
    [assignmentId, classId]
  );

  if (assignmentRes.rows.length === 0) {
    return { ok: false as const, status: 404, error: 'Assignment not found' };
  }

  const enrollmentRes = await query(
    `SELECT 1
     FROM student_classes
     WHERE student_id = $1 AND class_id = $2 AND status = 'active'`,
    [studentId, classId]
  );

  if (enrollmentRes.rows.length === 0) {
    return { ok: false as const, status: 403, error: 'You are not enrolled in this class' };
  }

  return { ok: true as const, assignment: assignmentRes.rows[0] as {
    assignment_id: number;
    class_id: number;
    assignment_name: string;
    description: string | null;
    type: string | null;
    max_points: number;
    due_date: string | null;
    allowed_submissions: number;
    ai_params: string | null;
  } };
}

router.get('/assignments/:classId/:assignmentId', requireStudentAuth, async (req: StudentAuthedRequest, res) => {
  try {
    const studentId = req.studentAuth?.studentId;
    const classId = Number(req.params.classId);
    const assignmentId = Number(req.params.assignmentId);

    if (!studentId || !Number.isFinite(classId) || !Number.isFinite(assignmentId)) {
      return res.status(400).json({ success: false, error: 'Invalid class or assignment id' });
    }

    const access = await ensureStudentCanAccess(studentId, classId, assignmentId);
    if (!access.ok) {
      return res.status(access.status).json({ success: false, error: access.error });
    }

    const questionsRes = await query(
      `SELECT q.question_id, q.sort_order, q.question_text, q.question_type,
              o.option_id, o.option_text, o.is_correct
       FROM assignment_questions q
       LEFT JOIN assignment_question_options o ON o.question_id = q.question_id
       WHERE q.assignment_id = $1
       ORDER BY q.sort_order ASC, o.option_id ASC`,
      [assignmentId]
    );

    const groupedQuestions = groupQuestions(questionsRes.rows as AssignmentQuestionRow[]);

    const gradeRes = await query(
      `SELECT points_earned, percentage, letter_grade, submission_date, graded_date, submission_attempts
       FROM student_grades
       WHERE student_id = $1 AND assignment_id = $2`,
      [studentId, assignmentId]
    );

    const grade = gradeRes.rows[0] as {
      points_earned: number | null;
      percentage: number | null;
      letter_grade: string | null;
      submission_date: string | null;
      graded_date: string | null;
      submission_attempts: number;
    } | undefined;

    const attemptsUsed = grade?.submission_attempts ?? 0;
    const allowedSubmissions = Math.max(1, Number(access.assignment.allowed_submissions ?? 1));

    return res.json({
      success: true,
      assignment: {
        assignmentId: access.assignment.assignment_id,
        classId: access.assignment.class_id,
        assignmentName: access.assignment.assignment_name,
        description: access.assignment.description,
        type: access.assignment.type,
        maxPoints: access.assignment.max_points,
        dueDate: access.assignment.due_date,
        allowedSubmissions,
        aiInstructions: access.assignment.ai_params,
      },
      questions: groupedQuestions.map((q) => ({
        questionId: q.questionId,
        sortOrder: q.sortOrder,
        questionText: q.questionText,
        questionType: q.questionType,
        options: q.options.map((o) => ({
          optionId: o.option_id,
          optionText: o.option_text,
        })),
      })),
      submission: {
        attemptsUsed,
        attemptsRemaining: Math.max(0, allowedSubmissions - attemptsUsed),
        canSubmit: attemptsUsed < allowedSubmissions,
      },
      grade: grade
        ? {
            pointsEarned: grade.points_earned,
            percentage: grade.percentage,
            letterGrade: grade.letter_grade,
            submissionDate: grade.submission_date,
            gradedDate: grade.graded_date,
          }
        : null,
    });
  } catch (error) {
    console.error('Student assignment payload error:', error);
    return res.status(500).json({ success: false, error: 'Failed to load assignment' });
  }
});

router.post('/assignments/:classId/:assignmentId/submit', requireStudentAuth, async (req: StudentAuthedRequest, res) => {
  try {
    const studentId = req.studentAuth?.studentId;
    const classId = Number(req.params.classId);
    const assignmentId = Number(req.params.assignmentId);

    if (!studentId || !Number.isFinite(classId) || !Number.isFinite(assignmentId)) {
      return res.status(400).json({ success: false, error: 'Invalid class or assignment id' });
    }

    const answersRaw = (req.body as { answers?: unknown })?.answers;
    const answers = Array.isArray(answersRaw) ? answersRaw : [];

    const access = await ensureStudentCanAccess(studentId, classId, assignmentId);
    if (!access.ok) {
      return res.status(access.status).json({ success: false, error: access.error });
    }

    const existingGradeRes = await query(
      'SELECT submission_attempts FROM student_grades WHERE student_id = $1 AND assignment_id = $2',
      [studentId, assignmentId]
    );
    const attemptsUsed = Number(existingGradeRes.rows[0]?.submission_attempts ?? 0);
    const allowedSubmissions = Math.max(1, Number(access.assignment.allowed_submissions ?? 1));

    if (attemptsUsed >= allowedSubmissions) {
      return res.status(409).json({ success: false, error: 'No submissions remaining for this assignment' });
    }

    const questionsRes = await query(
      `SELECT q.question_id, q.sort_order, q.question_text, q.question_type,
              o.option_id, o.option_text, o.is_correct
       FROM assignment_questions q
       LEFT JOIN assignment_question_options o ON o.question_id = q.question_id
       WHERE q.assignment_id = $1
       ORDER BY q.sort_order ASC, o.option_id ASC`,
      [assignmentId]
    );

    const groupedQuestions = groupQuestions(questionsRes.rows as AssignmentQuestionRow[]);
    const answerByQuestionId = new Map<number, { selectedOptionIds: number[]; responseText: string }>();

    for (const answer of answers as Array<{ questionId?: unknown; selectedOptionIds?: unknown; responseText?: unknown }>) {
      const questionId = Number(answer?.questionId);
      if (!Number.isFinite(questionId)) continue;
      const selectedOptionIds = Array.isArray(answer?.selectedOptionIds)
        ? (answer.selectedOptionIds as unknown[])
            .map((v) => Number(v))
            .filter((v) => Number.isFinite(v))
        : [];
      const responseText = typeof answer?.responseText === 'string' ? answer.responseText : '';
      answerByQuestionId.set(questionId, { selectedOptionIds, responseText });
    }

    let objectiveTotal = 0;
    let objectiveCorrect = 0;

    const attemptNumber = attemptsUsed + 1;

    for (const q of groupedQuestions) {
      const studentAnswer = answerByQuestionId.get(q.questionId) ?? { selectedOptionIds: [], responseText: '' };
      let isCorrect: number | null = null;
      const type = normalizeType(q.questionType);

      if (type !== 'short_answer') {
        objectiveTotal += 1;

        const selected = new Set(studentAnswer.selectedOptionIds);
        const correct = new Set(q.options.filter((o) => o.is_correct === 1).map((o) => Number(o.option_id)));

        if (type === 'select_all_that_apply') {
          isCorrect = selected.size === correct.size && Array.from(correct).every((id) => selected.has(id)) ? 1 : 0;
        } else {
          isCorrect = selected.size === 1 && correct.size === 1 && selected.has(Array.from(correct)[0]) ? 1 : 0;
        }

        if (isCorrect === 1) objectiveCorrect += 1;
      }

      await query(
        `INSERT INTO student_assignment_responses (
          student_id,
          assignment_id,
          question_id,
          attempt_number,
          response_text,
          selected_option_ids,
          is_correct
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          studentId,
          assignmentId,
          q.questionId,
          attemptNumber,
          studentAnswer.responseText || null,
          studentAnswer.selectedOptionIds.length ? studentAnswer.selectedOptionIds.join(',') : null,
          isCorrect,
        ]
      );
    }

    const percentage = objectiveTotal > 0 ? Number(((objectiveCorrect / objectiveTotal) * 100).toFixed(2)) : null;
    const pointsEarned = percentage != null
      ? Number(((Number(access.assignment.max_points) * percentage) / 100).toFixed(2))
      : null;
    const letterGrade = percentage != null ? toLetterGrade(percentage) : null;

    await query(
      `INSERT INTO student_grades (
        student_id,
        assignment_id,
        points_earned,
        percentage,
        letter_grade,
        submission_date,
        graded_date,
        submission_attempts
      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), $6)
      ON CONFLICT (student_id, assignment_id)
      DO UPDATE SET
        points_earned = EXCLUDED.points_earned,
        percentage = EXCLUDED.percentage,
        letter_grade = EXCLUDED.letter_grade,
        submission_date = EXCLUDED.submission_date,
        graded_date = EXCLUDED.graded_date,
        submission_attempts = EXCLUDED.submission_attempts`,
      [studentId, assignmentId, pointsEarned, percentage, letterGrade, attemptNumber]
    );

    return res.json({
      success: true,
      submission: {
        attemptNumber,
        attemptsRemaining: Math.max(0, allowedSubmissions - attemptNumber),
      },
      grade: {
        pointsEarned,
        percentage,
        letterGrade,
      },
    });
  } catch (error) {
    console.error('Student assignment submit error:', error);
    return res.status(500).json({ success: false, error: 'Failed to submit assignment' });
  }
});

export default router;
