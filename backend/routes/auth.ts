import express from 'express';
import bcrypt from 'bcrypt';
import { query } from '../db/connection.js';
import { LoginRequest, LoginResponse, Student, Teacher } from '../types.js';

const router = express.Router();

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

export default router;
