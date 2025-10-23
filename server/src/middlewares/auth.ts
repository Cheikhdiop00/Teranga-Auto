import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export type JwtUser = { id: string; role: 'ADMIN' | 'CLIENT' | 'MECANICIEN' };

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface Request {
      user?: JwtUser;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.substring(7) : undefined;
  if (!token) return res.status(401).json({ message: 'Missing Authorization header' });

  try {
    const secret = process.env.JWT_SECRET as string;
    const payload = jwt.verify(token, secret) as JwtUser;
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

export function requireRoles(...roles: JwtUser['role'][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthenticated' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Forbidden' });
    next();
  };
}
