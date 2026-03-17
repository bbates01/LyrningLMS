import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { query } from '../db/connection.js';

function generateAssignmentLink(): string {
  return crypto.randomBytes(8).toString('hex');
}

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

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

// GET /api/classes/:classId/assignments — assignments for a class
router.get('/:classId/assignments', async (req, res) => {
  try {
    const { classId } = req.params;
    const result = await query(
      `SELECT assignment_id, assignment_name, description, type, max_points, due_date, assignment_link, ai_params, question_types, allowed_submissions
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
      `SELECT question_id, sort_order, question_text, question_type, correct_answer
       FROM assignment_questions
       WHERE assignment_id = $1
       ORDER BY sort_order ASC`,
      [aid]
    );
    const questions: { questionId: number; sortOrder: number; questionText: string; questionType: string; options: { optionText: string; isCorrect: number }[] }[] = [];
    for (const q of questionsRows.rows as { question_id: number; sort_order: number; question_text: string; question_type: string | null; correct_answer: string | null }[]) {
      const optRows = await query(
        `SELECT option_text, is_correct FROM assignment_question_options WHERE question_id = $1 ORDER BY option_id ASC`,
        [q.question_id]
      );
      questions.push({
        questionId: q.question_id,
        sortOrder: q.sort_order,
        questionText: q.question_text,
        questionType: q.question_type || 'multiple_choice',
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
    await query('DELETE FROM assignments WHERE assignment_id = $1', [aid]);
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
    };

    if (teacherId == null || !assignmentName) {
      return res
        .status(400)
        .json({ success: false, error: 'teacherId and assignmentName are required' });
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
    const questionTypesStr =
      typeof questionTypes === 'string' ? questionTypes : Array.isArray(questionTypes) ? (questionTypes as string[]).join(',') : null;

    const insertResult = await query(
      `INSERT INTO assignments (class_id, assignment_name, description, type, max_points, due_date, assignment_link, ai_params, question_types, allowed_submissions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING assignment_id, class_id, assignment_name, description, type, max_points, due_date, assignment_link, ai_params, question_types, allowed_submissions`,
      [
        classId,
        assignmentName,
        description ?? null,
        type ?? null,
        maxPoints ?? 100,
        dueDate ?? null,
        assignmentLink,
        aiParams ?? null,
        questionTypesStr ?? null,
        allowedSubmissionsNum,
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
    const { questions } = req.body as {
      questions?: {
        questionText: string;
        questionType?: string;
        correctAnswer?: string;
        correctAnswers?: string[];
        falseAnswers: string[];
      }[];
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
      'SELECT assignment_id FROM assignments WHERE assignment_id = $1 AND class_id = $2',
      [assignmentIdNum, classIdNum]
    );
    if (assignCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Assignment not found' });
    }

    const questionTypeMap: Record<string, string> = {
      select_all_that_apply: 'select_all_that_apply',
      multiple_choice: 'multiple_choice',
      true_false: 'true_false',
      short_answer: 'short_answer',
    };
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const questionText = q?.questionText?.trim();
      const typeRaw = q?.questionType ?? 'multiple_choice';
      const questionType = questionTypeMap[typeRaw] ?? 'multiple_choice';
      const correctAnswers = Array.isArray(q?.correctAnswers) ? q.correctAnswers.filter((c) => c != null && String(c).trim() !== '') : [];
      const correctAnswerSingle = q?.correctAnswer != null ? String(q.correctAnswer).trim() : '';
      const falseAnswers = Array.isArray(q?.falseAnswers) ? q.falseAnswers : [];

      if (!questionText) continue;

      const insertQ = await query(
        `INSERT INTO assignment_questions (assignment_id, sort_order, question_text, question_type, correct_answer)
         VALUES ($1, $2, $3, $4, NULL)
         RETURNING question_id`,
        [assignmentIdNum, i + 1, questionText, questionType]
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

    return res.status(201).json({ success: true });
  } catch (err) {
    console.error('Error saving assignment questions:', err);
    res.status(500).json({ success: false, error: 'Failed to save questions' });
  }
});

// GET /api/classes/assignments/:assignmentId/pdf — no longer supported (PDFs not stored)
router.get('/assignments/:assignmentId/pdf', async (_req, res) => {
  return res
    .status(404)
    .json({ error: 'PDF download is not supported; files are not stored permanently.' });
});

export default router;
