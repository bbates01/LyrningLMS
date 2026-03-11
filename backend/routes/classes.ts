import express from 'express';
import multer from 'multer';
import { query } from '../db/connection.js';

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
      `SELECT assignment_id, assignment_name, description, type, max_points, due_date
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
    } = req.body as {
      teacherId?: number;
      assignmentName?: string;
      description?: string;
      type?: string;
      maxPoints?: number;
      dueDate?: string;
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

    const insertResult = await query(
      `INSERT INTO assignments (class_id, assignment_name, description, type, max_points, due_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING assignment_id, class_id, assignment_name, description, type, max_points, due_date`,
      [
        classId,
        assignmentName,
        description ?? null,
        type ?? null,
        maxPoints ?? 100,
        dueDate ?? null,
      ]
    );

    return res.status(201).json({ success: true, assignment: insertResult.rows[0] });
  } catch (err) {
    console.error('Error creating assignment:', err);
    res.status(500).json({ success: false, error: 'Failed to create assignment' });
  }
});

// POST /api/classes/:classId/assignments/pdf — teacher uploads an assignment PDF (stored as BLOB)
router.post('/:classId/assignments/pdf', upload.single('pdf'), async (req, res) => {
  try {
    const { classId } = req.params;
    const { teacherId, assignmentName, description, type, maxPoints, dueDate } = req.body as {
      teacherId?: string | number;
      assignmentName?: string;
      description?: string;
      type?: string;
      maxPoints?: string | number;
      dueDate?: string;
    };

    const teacherIdNum = teacherId == null ? null : Number(teacherId);
    const maxPointsNum = maxPoints == null ? null : Number(maxPoints);

    if (teacherIdNum == null || Number.isNaN(teacherIdNum) || !assignmentName) {
      return res
        .status(400)
        .json({ success: false, error: 'teacherId and assignmentName are required' });
    }

    if (!req.file || !req.file.buffer || req.file.buffer.length === 0) {
      return res.status(400).json({ success: false, error: 'A pdf file is required (field name: pdf)' });
    }

    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ success: false, error: 'Only application/pdf is supported' });
    }

    // Make sure this teacher actually owns the class
    const classCheck = await query(
      'SELECT class_id FROM classes WHERE class_id = $1 AND teacher_id = $2',
      [classId, teacherIdNum]
    );
    if (classCheck.rows.length === 0) {
      return res
        .status(403)
        .json({ success: false, error: 'You are not allowed to add assignments to this class' });
    }

    // Create the assignment row
    const created = await query(
      `INSERT INTO assignments (class_id, assignment_name, description, type, max_points, due_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING assignment_id, class_id, assignment_name, description, type, max_points, due_date`,
      [
        classId,
        assignmentName,
        description ?? null,
        type ?? null,
        maxPointsNum == null || Number.isNaN(maxPointsNum) ? 100 : maxPointsNum,
        dueDate ?? null,
      ]
    );

    const assignment = created.rows[0];
    if (!assignment?.assignment_id) {
      return res.status(500).json({ success: false, error: 'Failed to create assignment' });
    }

    // Store the PDF blob
    await query(
      `INSERT INTO assignment_documents (assignment_id, filename, mime_type, pdf_blob)
       VALUES ($1, $2, $3, $4)`,
      [assignment.assignment_id, req.file.originalname ?? null, req.file.mimetype, req.file.buffer]
    );

    return res.status(201).json({ success: true, assignmentId: assignment.assignment_id });
  } catch (err) {
    console.error('Error uploading assignment PDF:', err);
    res.status(500).json({ success: false, error: 'Failed to upload assignment PDF' });
  }
});

// GET /api/classes/assignments/:assignmentId/pdf — download the stored assignment PDF
router.get('/assignments/:assignmentId/pdf', async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const result = await query(
      `SELECT d.pdf_blob, d.mime_type, d.filename
       FROM assignment_documents d
       WHERE d.assignment_id = $1`,
      [assignmentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'PDF not found' });
    }

    const row = result.rows[0] as {
      pdf_blob: Buffer;
      mime_type: string;
      filename?: string | null;
    };

    res.setHeader('Content-Type', row.mime_type || 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${(row.filename || `assignment-${assignmentId}.pdf`).replace(/"/g, '')}"`
    );
    return res.send(row.pdf_blob);
  } catch (err) {
    console.error('Error downloading assignment PDF:', err);
    res.status(500).json({ error: 'Failed to download PDF' });
  }
});

export default router;
