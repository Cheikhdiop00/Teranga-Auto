import jwt from 'jsonwebtoken';
import { JwtUser } from '../middlewares/auth.js';

export function signToken(payload: JwtUser) {
  const secret = process.env.JWT_SECRET as string;
  if (!secret) throw new Error('JWT_SECRET is not defined');
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(payload, secret, { expiresIn });
}

export function verifyToken(token: string) {
  const secret = process.env.JWT_SECRET as string;
  if (!secret) throw new Error('JWT_SECRET is not defined');
  return jwt.verify(token, secret);
}
