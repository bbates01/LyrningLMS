import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'dev-admin-secret-change-me';
const ADMIN_JWT_EXPIRES_IN =
  (process.env.ADMIN_JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] | undefined) || '12h';

export interface AdminTokenPayload {
  role: 'admin';
  adminId: number;
}

export interface AdminAuthedRequest extends Request {
  adminAuth?: AdminTokenPayload;
}

export function issueAdminToken(adminId: number): string {
  return jwt.sign({ role: 'admin', adminId } satisfies AdminTokenPayload, ADMIN_JWT_SECRET, {
    expiresIn: ADMIN_JWT_EXPIRES_IN,
  });
}

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || typeof authHeader !== 'string') return null;
  const [scheme, token] = authHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}

export function requireAdminAuth(req: AdminAuthedRequest, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ success: false, error: 'Missing admin auth token' });
    return;
  }

  try {
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET) as AdminTokenPayload;
    if (!decoded || decoded.role !== 'admin' || !Number.isFinite(decoded.adminId)) {
      res.status(401).json({ success: false, error: 'Invalid admin auth token' });
      return;
    }
    req.adminAuth = { role: 'admin', adminId: Number(decoded.adminId) };
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Invalid or expired admin auth token' });
  }
}
