import express from 'express';
import { query } from '../db/connection.js';
import { requireStudentAuth, type StudentAuthedRequest } from '../auth/studentToken.js';
import OpenAI from 'openai';

const groq = process.env.GROQ_API_KEY
  ? new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    })
  : null;

const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-70b-versatile';

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
  max_points: number | null;
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

function isPastDue(dueDateRaw: string | null | undefined): boolean {
  if (!dueDateRaw) return false;
  const due = new Date(dueDateRaw);
  if (Number.isNaN(due.getTime())) return false;
  return Date.now() > due.getTime();
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const copy = [...arr];
  let s = seed;
  for (let i = copy.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = (s >>> 0) % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function groupQuestions(rows: AssignmentQuestionRow[]) {
  const byId = new Map<number, {
    questionId: number;
    sortOrder: number;
    questionText: string;
    questionType: string;
    maxPoints: number;
    options: AssignmentQuestionOption[];
  }>();

  for (const row of rows) {
    const qId = Number(row.question_id);
    const existing = byId.get(qId) || {
      questionId: qId,
      sortOrder: row.sort_order,
      questionText: row.question_text,
      questionType: normalizeType(row.question_type),
      maxPoints: Number(row.max_points ?? 1),
      options: [],
    };

    if (row.option_id != null && row.option_text != null && row.is_correct != null) {
      existing.options.push({
        option_id: Number(row.option_id),
        option_text: row.option_text,
        is_correct: row.is_correct,
      });
    }

    byId.set(qId, existing);
  }

  return Array.from(byId.values()).sort((a, b) => a.sortOrder - b.sortOrder);
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 50;
  return Math.max(0, Math.min(100, value));
}

function normalizeAttemptScoringPolicy(raw: unknown): 'latest' | 'highest' | 'average' {
  const p = String(raw ?? 'latest').trim().toLowerCase();
  if (p === 'highest' || p === 'average') return p;
  return 'latest';
}

function attemptScoringPolicyLabel(policy: 'latest' | 'highest' | 'average'): string {
  if (policy === 'highest') return 'Highest Score Saved';
  if (policy === 'average') return 'Average Score Saved';
  return 'Most Recent Score Saved';
}

function computeUnderstandingFromAttemptPercentages(percentages: number[]): number | null {
  if (!percentages.length) return null;
  const clean = percentages.filter((p) => Number.isFinite(p));
  if (!clean.length) return null;
  if (clean.length === 1) return clampScore(clean[0]);
  const first = clean[0];
  const latest = clean[clean.length - 1];
  const growth = latest - first;
  // Growth-focused understanding: improvement across attempts weighs more than raw latest score.
  const score = (0.6 * (50 + growth)) + (0.4 * latest);
  return clampScore(score);
}

async function upsertWeeklyMetrics(studentId: number, classId: number): Promise<void> {
  const weekRes = await query(
    `SELECT
       DATE_TRUNC('week', NOW())::date AS week_start_date,
       (DATE_TRUNC('week', NOW()) + INTERVAL '6 days')::date AS week_end_date,
       EXTRACT(WEEK FROM NOW())::int AS week_number`
  );
  const week = weekRes.rows[0] as {
    week_start_date: string;
    week_end_date: string;
    week_number: number;
  };

  const aggRes = await query(
    `SELECT
       AVG(sg.percentage) AS accuracy_score,
       AVG(COALESCE(sg.ai_dependency_score, 50)) AS ai_dependency_score,
       AVG(COALESCE(sg.understanding_score, sg.percentage)) AS understanding_score,
       AVG(COALESCE(sg.engagement_score, sg.percentage)) AS engagement_score
     FROM student_grades sg
     JOIN assignments a ON a.assignment_id = sg.assignment_id
     WHERE sg.student_id = $1
       AND a.class_id = $2
       AND sg.submission_date >= $3::date
       AND sg.submission_date < ($3::date + INTERVAL '7 days')`,
    [studentId, classId, week.week_start_date]
  );
  const agg = aggRes.rows[0] as {
    accuracy_score: number | null;
    ai_dependency_score: number | null;
    understanding_score: number | null;
    engagement_score: number | null;
  };

  await query(
    `INSERT INTO student_metrics (
       student_id,
       class_id,
       week_number,
       week_start_date,
       week_end_date,
       accuracy_score,
       understanding_score,
       ai_dependency_score,
       engagement_score
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (student_id, class_id, week_number)
     DO UPDATE SET
       week_start_date = EXCLUDED.week_start_date,
       week_end_date = EXCLUDED.week_end_date,
       accuracy_score = EXCLUDED.accuracy_score,
       understanding_score = EXCLUDED.understanding_score,
       ai_dependency_score = EXCLUDED.ai_dependency_score,
       engagement_score = EXCLUDED.engagement_score`,
    [
      studentId,
      classId,
      week.week_number,
      week.week_start_date,
      week.week_end_date,
      agg.accuracy_score,
      agg.understanding_score,
      agg.ai_dependency_score,
      agg.engagement_score,
    ]
  );
}

async function recomputeAndPersistAggregateGrade(
  studentId: number,
  assignmentId: number,
  policyRaw: unknown
): Promise<{
  pointsEarned: number | null;
  percentage: number | null;
  letterGrade: string | null;
  understandingScore: number | null;
  aiDependencyScore: number | null;
  engagementScore: number | null;
}> {
  const policy = normalizeAttemptScoringPolicy(policyRaw);
  const attemptsRes = await query(
    `SELECT
       attempt_number,
       points_earned,
       percentage,
       letter_grade,
       understanding_score,
       ai_dependency_score,
       engagement_score
     FROM student_assignment_attempt_grades
     WHERE student_id = $1 AND assignment_id = $2
     ORDER BY attempt_number ASC`,
    [studentId, assignmentId]
  );
  const attempts = attemptsRes.rows as Array<{
    attempt_number: number;
    points_earned: number | null;
    percentage: number | null;
    letter_grade: string | null;
    understanding_score: number | null;
    ai_dependency_score: number | null;
    engagement_score: number | null;
  }>;

  if (attempts.length === 0) {
    return {
      pointsEarned: null,
      percentage: null,
      letterGrade: null,
      understandingScore: null,
      aiDependencyScore: null,
      engagementScore: null,
    };
  }

  const avg = (vals: Array<number | null | undefined>) => {
    const nums = vals.filter((v): v is number => v != null && Number.isFinite(Number(v))).map(Number);
    if (nums.length === 0) return null;
    return Number((nums.reduce((s, n) => s + n, 0) / nums.length).toFixed(2));
  };

  let chosen = attempts[attempts.length - 1];
  if (policy === 'highest') {
    chosen = [...attempts].sort((a, b) => {
      const ap = a.percentage == null ? -1 : Number(a.percentage);
      const bp = b.percentage == null ? -1 : Number(b.percentage);
      if (bp !== ap) return bp - ap;
      return Number(b.attempt_number) - Number(a.attempt_number);
    })[0];
  }

  let keptAttemptNumber = chosen.attempt_number;
  if (policy === 'average') {
    keptAttemptNumber = attempts[attempts.length - 1].attempt_number;
  }
  await query(
    `UPDATE student_assignment_attempt_grades
     SET is_kept = FALSE
     WHERE student_id = $1 AND assignment_id = $2`,
    [studentId, assignmentId]
  );
  await query(
    `UPDATE student_assignment_attempt_grades
     SET is_kept = TRUE
     WHERE student_id = $1 AND assignment_id = $2 AND attempt_number = $3`,
    [studentId, assignmentId, keptAttemptNumber]
  );

  const aggregate =
    policy === 'average'
      ? {
          pointsEarned: avg(attempts.map((a) => a.points_earned)),
          percentage: avg(attempts.map((a) => a.percentage)),
          understandingScore: avg(attempts.map((a) => a.understanding_score)),
          aiDependencyScore: avg(attempts.map((a) => a.ai_dependency_score)),
          engagementScore: avg(attempts.map((a) => a.engagement_score)),
        }
      : {
          pointsEarned: chosen.points_earned == null ? null : Number(chosen.points_earned),
          percentage: chosen.percentage == null ? null : Number(chosen.percentage),
          understandingScore: chosen.understanding_score == null ? null : Number(chosen.understanding_score),
          aiDependencyScore: chosen.ai_dependency_score == null ? null : Number(chosen.ai_dependency_score),
          engagementScore: chosen.engagement_score == null ? null : Number(chosen.engagement_score),
        };

  const letterGrade = aggregate.percentage == null ? null : toLetterGrade(Number(aggregate.percentage));
  const submissionAttempts = attempts.length;

  await query(
    `UPDATE student_grades
     SET points_earned = $1,
         percentage = $2,
         letter_grade = $3,
         understanding_score = $4,
         ai_dependency_score = $5,
         engagement_score = $6,
         submission_date = NOW(),
         graded_date = NOW(),
         submission_attempts = $7
     WHERE student_id = $8 AND assignment_id = $9`,
    [
      aggregate.pointsEarned,
      aggregate.percentage,
      letterGrade,
      aggregate.understandingScore,
      aggregate.aiDependencyScore,
      aggregate.engagementScore,
      submissionAttempts,
      studentId,
      assignmentId,
    ]
  );

  return {
    pointsEarned: aggregate.pointsEarned,
    percentage: aggregate.percentage,
    letterGrade,
    understandingScore: aggregate.understandingScore,
    aiDependencyScore: aggregate.aiDependencyScore,
    engagementScore: aggregate.engagementScore,
  };
}

async function ensureStudentCanAccess(studentId: number, classId: number, assignmentId: number) {
  const assignmentRes = await query(
    `SELECT assignment_id, class_id, assignment_name, description, type, max_points, due_date, allowed_submissions,
            COALESCE(keep_type, attempt_scoring_policy) AS keep_type,
            allow_partial_short_answer, allow_partial_select_all_that_apply,
            ai_params, pdf_summary
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
     WHERE student_id = $1 AND class_id = $2`,
    [studentId, classId]
  );

  if (enrollmentRes.rows.length === 0) {
    return { ok: false as const, status: 403, error: 'You are not enrolled in this class' };
  }

  if (isPastDue(assignmentRes.rows[0]?.due_date as string | null | undefined)) {
    return {
      ok: false as const,
      status: 403,
      error: 'This assignment can no longer be completed because the due date has passed.',
    };
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
    keep_type: string | null;
    allow_partial_short_answer: boolean;
    allow_partial_select_all_that_apply: boolean;
    ai_params: string | null;
    pdf_summary: string | null;
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
      `SELECT q.question_id, q.sort_order, q.question_text, q.question_type, q.max_points,
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
    const attemptScoringPolicy = normalizeAttemptScoringPolicy(access.assignment.keep_type);

    const attemptGradesRes = await query(
      `SELECT
         attempt_number,
         points_earned,
         percentage,
         letter_grade,
         submission_date,
         is_kept
       FROM student_assignment_attempt_grades
       WHERE student_id = $1 AND assignment_id = $2
       ORDER BY attempt_number ASC`,
      [studentId, assignmentId]
    );
    const attemptGrades = (attemptGradesRes.rows as Array<{
      attempt_number: number;
      points_earned: number | null;
      percentage: number | null;
      letter_grade: string | null;
      submission_date: string | null;
      is_kept: boolean;
    }>).map((a) => ({
      attemptNumber: Number(a.attempt_number),
      pointsEarned: a.points_earned == null ? null : Number(a.points_earned),
      percentage: a.percentage == null ? null : Number(a.percentage),
      letterGrade: a.letter_grade ?? null,
      submissionDate: a.submission_date ?? null,
      isKept: Boolean(a.is_kept),
    }));

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
        attemptScoringPolicy,
        attemptScoringPolicyLabel: attemptScoringPolicyLabel(attemptScoringPolicy),
        aiInstructions: access.assignment.ai_params,
        pdfSummary: access.assignment.pdf_summary,
      },
      questions: groupedQuestions.map((q) => ({
        questionId: q.questionId,
        sortOrder: q.sortOrder,
        questionText: q.questionText,
        questionType: q.questionType,
        options: seededShuffle(q.options, studentId * 1000 + q.questionId).map((o) => ({
          optionId: o.option_id,
          optionText: o.option_text,
        })),
      })),
      submission: {
        attemptsUsed,
        attemptsRemaining: Math.max(0, allowedSubmissions - attemptsUsed),
        canSubmit: attemptsUsed < allowedSubmissions,
        attempts: attemptGrades,
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
    const attemptScoringPolicy = normalizeAttemptScoringPolicy(access.assignment.keep_type);

    if (attemptsUsed >= allowedSubmissions) {
      return res.status(409).json({ success: false, error: 'No submissions remaining for this assignment' });
    }

    const questionsRes = await query(
      `SELECT q.question_id, q.sort_order, q.question_text, q.question_type, q.max_points,
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

    let possiblePointsTotal = 0;
    let earnedPointsTotal = 0;
    const allowPartialShortAnswer = Boolean(access.assignment.allow_partial_short_answer);
    const allowPartialSata = Boolean(access.assignment.allow_partial_select_all_that_apply);

    const attemptNumber = attemptsUsed + 1;
    const questionResults: { questionId: number; isCorrect: number | null }[] = [];

    for (const q of groupedQuestions) {
      const studentAnswer = answerByQuestionId.get(q.questionId) ?? { selectedOptionIds: [], responseText: '' };
      let isCorrect: number | null = null;
      let correctnessScore = 0;
      const type = normalizeType(q.questionType);
      const questionMaxPoints = Math.max(0, Number(q.maxPoints ?? 1));
      possiblePointsTotal += questionMaxPoints;

      if (type === 'short_answer') {
        const expectedAnswer = q.options.find((o) => o.is_correct === 1)?.option_text?.trim() || '';
        const studentResponse = studentAnswer.responseText.trim();

        if (!studentResponse) {
          correctnessScore = 0;
        } else if (groq) {
          try {
            const gradingInstruction = allowPartialShortAnswer
              ? 'Reply with only one number from 0.00 to 1.00 representing fractional correctness (0 = incorrect, 1 = fully correct).'
              : 'Reply with only "1" for correct or "0" for incorrect.';
            const completion = await groq.chat.completions.create({
              model: GROQ_MODEL,
              messages: [{
                role: 'user',
                content: `You are grading a short answer question. Be reasonably lenient and focus on demonstrated understanding.\n\nQuestion: "${q.questionText}"\nExpected answer: "${expectedAnswer}"\nStudent's answer: "${studentResponse}"\nPartial credit allowed: ${allowPartialShortAnswer ? 'yes' : 'no'}\n\n${gradingInstruction}`,
              }],
              max_tokens: 5,
            });
            const result = completion.choices[0]?.message?.content?.trim();
            if (allowPartialShortAnswer) {
              const parsed = Number(result);
              correctnessScore = Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : 0;
            } else {
              correctnessScore = result === '1' ? 1 : 0;
            }
          } catch {
            // Fallback to case-insensitive string match if AI fails
            correctnessScore = studentResponse.toLowerCase() === expectedAnswer.toLowerCase() ? 1 : 0;
          }
        } else {
          // No AI available — fall back to simple string comparison
          correctnessScore = studentResponse.toLowerCase() === expectedAnswer.toLowerCase() ? 1 : 0;
        }
      } else {
        const selected = new Set(studentAnswer.selectedOptionIds);
        const correct = new Set(q.options.filter((o) => o.is_correct === 1).map((o) => Number(o.option_id)));

        if (type === 'select_all_that_apply') {
          if (allowPartialSata) {
            const correctSelected = Array.from(correct).filter((id) => selected.has(id)).length;
            const incorrectSelected = Array.from(selected).filter((id) => !correct.has(id)).length;
            const denom = Math.max(1, correct.size);
            correctnessScore = Math.max(0, Math.min(1, (correctSelected - incorrectSelected) / denom));
          } else {
            correctnessScore = selected.size === correct.size && Array.from(correct).every((id) => selected.has(id)) ? 1 : 0;
          }
        } else {
          correctnessScore = selected.size === 1 && correct.size === 1 && selected.has(Array.from(correct)[0]) ? 1 : 0;
        }
      }
      isCorrect = correctnessScore >= 0.999 ? 1 : 0;
      const questionPointsEarned = Number((questionMaxPoints * correctnessScore).toFixed(2));
      earnedPointsTotal += questionPointsEarned;

      questionResults.push({ questionId: q.questionId, isCorrect });

      await query(
        `INSERT INTO student_assignment_responses (
          student_id,
          assignment_id,
          question_id,
          attempt_number,
          response_text,
          selected_option_ids,
          is_correct,
          correctness_score,
          points_earned
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          studentId,
          assignmentId,
          q.questionId,
          attemptNumber,
          studentAnswer.responseText || null,
          studentAnswer.selectedOptionIds.length ? studentAnswer.selectedOptionIds.join(',') : null,
          isCorrect,
          correctnessScore,
          questionPointsEarned,
        ]
      );
    }

    const assignmentMaxPoints = Math.max(1, Number(access.assignment.max_points ?? 100));
    const scoringDenominator = possiblePointsTotal > 0 ? possiblePointsTotal : assignmentMaxPoints;
    const percentage = scoringDenominator > 0 ? Number(((earnedPointsTotal / scoringDenominator) * 100).toFixed(2)) : null;
    const pointsEarned = percentage != null
      ? Number(((assignmentMaxPoints * percentage) / 100).toFixed(2))
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

    await query(
      `INSERT INTO student_assignment_attempt_grades (
        student_id,
        assignment_id,
        attempt_number,
        points_earned,
        percentage,
        letter_grade,
        is_kept,
        submission_date,
        graded_date
      ) VALUES ($1, $2, $3, $4, $5, $6, FALSE, NOW(), NOW())
      ON CONFLICT (student_id, assignment_id, attempt_number)
      DO UPDATE SET
        points_earned = EXCLUDED.points_earned,
        percentage = EXCLUDED.percentage,
        letter_grade = EXCLUDED.letter_grade,
        submission_date = EXCLUDED.submission_date,
        graded_date = EXCLUDED.graded_date`,
      [studentId, assignmentId, attemptNumber, pointsEarned, percentage, letterGrade]
    );

    // Calculate metrics
    let understandingScore: number | null = null;
    let aiDependencyScore: number | null = 50; // neutral fallback
    let engagementScore: number | null = null;

    // AI dependency score from full chat transcript snapshot for this attempt.
    try {
      const transcriptRes = await query(
        `SELECT role, content
         FROM student_chat_messages
         WHERE student_id = $1 AND assignment_id = $2 AND attempt_number = $3
         ORDER BY created_at ASC`,
        [studentId, assignmentId, attemptNumber]
      );

      if (groq && transcriptRes.rows.length > 0) {
        const transcriptText = transcriptRes.rows
          .map((r) => `${String(r.role || 'unknown').toUpperCase()}: ${String(r.content || '')}`)
          .join('\n');

        const scoringPrompt = `You are grading AI dependency in a student LMS context.
Return ONLY one number from 0 to 100 where:
- 0 = fully independent
- 100 = completely dependent on AI

Score based on:
1) Whether the student asks for direct answers vs guidance
2) Whether they iterate critically vs copy/paste
3) How much the final work appears AI-generated
4) Whether requests are clarifying questions vs answer-dumping requests

Student assignment transcript:
${transcriptText}`;

        const depCompletion = await groq.chat.completions.create({
          model: GROQ_MODEL,
          messages: [{ role: 'user', content: scoringPrompt }],
          max_tokens: 8,
        });
        const depText = depCompletion.choices[0]?.message?.content?.trim() || '50';
        aiDependencyScore = clampScore(parseFloat(depText));
      }
    } catch (err) {
      console.error('AI dependency scoring failed; defaulting to neutral score:', err);
      aiDependencyScore = 50;
    } finally {
      // Always clear temporary transcript rows for this attempt.
      try {
        await query(
          `DELETE FROM student_chat_messages
           WHERE student_id = $1 AND assignment_id = $2 AND attempt_number = $3`,
          [studentId, assignmentId, attemptNumber]
        );
      } catch (cleanupErr) {
        console.error('Failed to clean temporary student_chat_messages rows:', cleanupErr);
      }
    }

    const attemptPercentagesRes = await query(
      `SELECT percentage
       FROM student_assignment_attempt_grades
       WHERE student_id = $1 AND assignment_id = $2
       ORDER BY attempt_number ASC`,
      [studentId, assignmentId]
    );
    const attemptPercentages = (attemptPercentagesRes.rows as Array<{ percentage: number | null }>)
      .map((r) => (r.percentage == null ? null : Number(r.percentage)))
      .filter((p): p is number => p != null && Number.isFinite(p));
    understandingScore = computeUnderstandingFromAttemptPercentages(attemptPercentages);

    engagementScore = percentage; // placeholder existing behavior

    await query(
      `UPDATE student_assignment_attempt_grades
       SET understanding_score = $1,
           ai_dependency_score = $2,
           engagement_score = $3
       WHERE student_id = $4 AND assignment_id = $5 AND attempt_number = $6`,
      [understandingScore, aiDependencyScore, engagementScore, studentId, assignmentId, attemptNumber]
    );

    const aggregateGrade = await recomputeAndPersistAggregateGrade(
      studentId,
      assignmentId,
      attemptScoringPolicy
    );

    // Keep weekly metrics fresh per submit (per student, per class, current week).
    await upsertWeeklyMetrics(studentId, classId);

    return res.json({
      success: true,
      submission: {
        attemptNumber,
        attemptsRemaining: Math.max(0, allowedSubmissions - attemptNumber),
      },
      grade: {
        pointsEarned: aggregateGrade.pointsEarned,
        percentage: aggregateGrade.percentage,
        letterGrade: aggregateGrade.letterGrade,
        understandingScore: aggregateGrade.understandingScore,
        aiDependencyScore: aggregateGrade.aiDependencyScore,
        engagementScore: aggregateGrade.engagementScore,
      },
      questionResults,
    });
  } catch (error) {
    console.error('Student assignment submit error:', error);
    return res.status(500).json({ success: false, error: 'Failed to submit assignment' });
  }
});

export default router;
