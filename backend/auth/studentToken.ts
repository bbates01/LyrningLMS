import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const STUDENT_JWT_SECRET = process.env.STUDENT_JWT_SECRET || process.env.JWT_SECRET || 'dev-student-secret-change-me';
const STUDENT_JWT_EXPIRES_IN =
  (process.env.STUDENT_JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] | undefined) || '8h';

export interface StudentTokenPayload {
  role: 'student';
  studentId: number;
}

export interface StudentAuthedRequest extends Request {
  studentAuth?: StudentTokenPayload;
}

export function issueStudentToken(studentId: number): string {
  return jwt.sign(
    { role: 'student', studentId } satisfies StudentTokenPayload,
    STUDENT_JWT_SECRET,
    { expiresIn: STUDENT_JWT_EXPIRES_IN }
  );
}

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || typeof authHeader !== 'string') return null;
  const [scheme, token] = authHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}

export function requireStudentAuth(req: StudentAuthedRequest, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ success: false, error: 'Missing student auth token' });
    return;
  }

  try {
    const decoded = jwt.verify(token, STUDENT_JWT_SECRET) as StudentTokenPayload;
    if (!decoded || decoded.role !== 'student' || !Number.isFinite(decoded.studentId)) {
      res.status(401).json({ success: false, error: 'Invalid student auth token' });
      return;
    }
    req.studentAuth = { role: 'student', studentId: Number(decoded.studentId) };
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Invalid or expired student auth token' });
  }
}
