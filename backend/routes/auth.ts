import express from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { query } from '../db/connection.js';
import { LoginRequest, LoginResponse, Student, Teacher } from '../types.js';
import { issueStudentToken } from '../auth/studentToken.js';

const router = express.Router();

function parseStudentIds(input: string): number[] {
  const ids = input
    .split(/[\s,;\n\r\t]+/g)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n) && n > 0);

  // de-dupe, stable-ish order
  return Array.from(new Set(ids));
}

function generatePassword(length = 10): string {
  // Avoid ambiguous chars (0/O, 1/I/l)
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

router.post('/login', async (req: express.Request, res: express.Response) => {
  try {
    const { username, password, userType } = req.body as LoginRequest;

    if (!username || !password || !userType) {
      return res.status(400).json({
        success: false,
        error: 'Username, password, and userType are required',
      } as LoginResponse);
    }

    if (userType !== 'student' && userType !== 'teacher') {
      return res.status(400).json({
        success: false,
        error: 'Invalid userType. Must be "student" or "teacher"',
      } as LoginResponse);
    }

    const tableName = userType === 'student' ? 'students' : 'teachers';
    const idField = userType === 'student' ? 'student_id' : 'teacher_id';

    const result = await query(
      `SELECT ${idField} as id, first_name, last_name, email, username, password_hash FROM ${tableName} WHERE username = $1`,
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password',
      } as LoginResponse);
    }

    const user = result.rows[0];
    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password',
      } as LoginResponse);
    }

    const response: LoginResponse = {
      success: true,
      role: userType,
      userId: user.id,
      userName: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
    };

    res.json(response);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during authentication',
    } as LoginResponse);
  }
});

/**
 * POST /api/auth/student/login
 * Body: { studentId: number|string, password: string }
 *
 * Student-only login that authenticates by student_id.
 * (Teacher login continues to use /login with username + userType=teacher.)
 */
router.post('/student/login', async (req: express.Request, res: express.Response) => {
  try {
    const rawStudentId = (req.body as { studentId?: unknown })?.studentId;
    const password = (req.body as { password?: unknown })?.password;
    const studentId = typeof rawStudentId === 'string' || typeof rawStudentId === 'number' ? Number(rawStudentId) : NaN;

    if (!Number.isFinite(studentId) || studentId <= 0 || typeof password !== 'string' || !password) {
      return res.status(400).json({ success: false, error: 'studentId and password are required' });
    }

    const result = await query(
      'SELECT student_id, first_name, last_name, email, username, password_hash FROM students WHERE student_id = $1',
      [studentId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid student ID or password' });
    }

    const student = result.rows[0] as Pick<Student, 'student_id' | 'first_name' | 'last_name' | 'email' | 'username' | 'password_hash'>;
    const ok = await bcrypt.compare(password, student.password_hash);
    if (!ok) {
      return res.status(401).json({ success: false, error: 'Invalid student ID or password' });
    }

    return res.json({
      success: true,
      role: 'student',
      userId: student.student_id,
      userName: student.username,
      firstName: student.first_name,
      lastName: student.last_name,
      email: student.email,
      token: issueStudentToken(Number(student.student_id)),
    });
  } catch (error) {
    console.error('Student login error:', error);
    return res.status(500).json({ success: false, error: 'Server error during authentication' });
  }
});

/**
 * POST /api/auth/students/passwords/generate
 * Body: { studentIdsText: string, passwordLength?: number }
 *
 * Accepts a pasted list of student IDs, generates a password for each existing student,
 * stores bcrypt hashes, and returns the plaintext passwords once.
 */
router.post('/students/passwords/generate', async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body as { studentIdsText?: unknown; passwordLength?: unknown };
    const studentIdsText = typeof body.studentIdsText === 'string' ? body.studentIdsText : '';
    const passwordLengthRaw = typeof body.passwordLength === 'number' ? body.passwordLength : 10;
    const passwordLength = Math.max(8, Math.min(32, Math.floor(passwordLengthRaw)));

    const studentIds = parseStudentIds(studentIdsText);
    if (studentIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Paste at least one valid student ID.' });
    }

    const found = await query(
      'SELECT student_id FROM students WHERE student_id = ANY($1::bigint[]) ORDER BY student_id',
      [studentIds]
    );
    const foundIds = found.rows.map((r) => Number(r.student_id)).filter((n) => Number.isFinite(n));
    const foundSet = new Set(foundIds);
    const missingIds = studentIds.filter((id) => !foundSet.has(id));

    const generated: { studentId: number; password: string }[] = [];
    for (const id of foundIds) {
      generated.push({ studentId: id, password: generatePassword(passwordLength) });
    }

    const saltRounds = 12;
    for (const row of generated) {
      const hash = await bcrypt.hash(row.password, saltRounds);
      await query('UPDATE students SET password_hash = $1 WHERE student_id = $2', [hash, row.studentId]);
    }

    return res.json({
      success: true,
      generated,
      missingIds,
    });
  } catch (error) {
    console.error('Generate student passwords error:', error);
    return res.status(500).json({ success: false, error: 'Server error generating passwords' });
  }
});

/**
 * POST /api/auth/students/passwords/save
 * Body: { updates: Array<{ studentId: number, password: string }> }
 *
 * Hashes and saves teacher-edited passwords.
 */
router.post('/students/passwords/save', async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body as { updates?: unknown };
    const updates = Array.isArray(body.updates) ? (body.updates as any[]) : [];
    const normalized = updates
      .map((u) => ({
        studentId: Number(u?.studentId),
        password: typeof u?.password === 'string' ? u.password : '',
      }))
      .filter((u) => Number.isFinite(u.studentId) && u.studentId > 0 && u.password.trim().length >= 1);

    if (normalized.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid updates provided.' });
    }

    const ids = Array.from(new Set(normalized.map((u) => u.studentId)));
    const found = await query('SELECT student_id FROM students WHERE student_id = ANY($1::bigint[])', [ids]);
    const foundSet = new Set(found.rows.map((r) => Number(r.student_id)));
    const missingIds = ids.filter((id) => !foundSet.has(id));

    const saltRounds = 12;
    let updatedCount = 0;
    for (const u of normalized) {
      if (!foundSet.has(u.studentId)) continue;
      const hash = await bcrypt.hash(u.password, saltRounds);
      await query('UPDATE students SET password_hash = $1 WHERE student_id = $2', [hash, u.studentId]);
      updatedCount++;
    }

    return res.json({ success: true, updatedCount, missingIds });
  } catch (error) {
    console.error('Save student passwords error:', error);
    return res.status(500).json({ success: false, error: 'Server error saving passwords' });
  }
});

/**
 * GET /api/auth/students
 *
 * Returns basic information for all students so teachers can see existing IDs
 * and avoid duplicating entries when managing passwords.
 */
router.get('/students', async (_req: express.Request, res: express.Response) => {
  try {
    const result = await query(
      'SELECT student_id, first_name, last_name, email, username FROM students ORDER BY student_id ASC'
    );
    return res.json({ success: true, students: result.rows as Array<Pick<Student, 'student_id' | 'first_name' | 'last_name' | 'email' | 'username'>> });
  } catch (error) {
    console.error('List students error:', error);
    return res.status(500).json({ success: false, error: 'Server error fetching students' });
  }
});

export default router;
