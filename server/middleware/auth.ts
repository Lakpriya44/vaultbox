import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { db } from '../db';
import { IUser } from '../models';

export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

export const authenticateJwt = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentication required. No token provided.' });
      return;
    }

    const token = authHeader.split(' ')[1];
    let decoded: any;
    try {
      decoded = jwt.verify(token, config.jwtSecret);
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        res.status(401).json({ error: 'Session expired. Please log in again.' });
        return;
      }
      res.status(401).json({ error: 'Invalid authentication token.' });
      return;
    }

    if (!decoded || !decoded.userId) {
      res.status(401).json({ error: 'Invalid token payload.' });
      return;
    }

    const user = await db.findUserById(decoded.userId);
    if (!user) {
      res.status(401).json({ error: 'User no longer exists.' });
      return;
    }

    req.user = user;
    next();
  } catch (err: any) {
    console.error('[AuthMiddleware] Error:', err);
    res.status(500).json({ error: 'Internal server error during authentication.' });
  }
};
