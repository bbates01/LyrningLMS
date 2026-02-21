import express from 'express';
import { query } from '../db/connection.js';

const router = express.Router();

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

export default router;
