import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config/environment';

interface DecodedToken {
  id: string;
  email: string;
  role: string;
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: { message: 'No token provided' }
      });
    }

    const decoded = jwt.verify(token, config.JWT_SECRET) as DecodedToken;
    (req as any).userId = decoded.id;
    (req as any).userRole = decoded.role;

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: { message: 'Invalid or expired token' }
    });
  }
};

export const adminMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    if ((req as any).userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: { message: 'Admin access required' }
      });
    }
    next();
  } catch (error) {
    res.status(403).json({
      success: false,
      error: { message: 'Forbidden' }
    });
  }
};
