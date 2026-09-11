import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { AuthRequest, TokenPayload } from '../types';
import { AppError } from './errorHandler';

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('FATAL: JWT_SECRET environment variable is missing. Please configure it in .env');
  }
  return secret;
};

export const authenticate = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Authentication token required', 401));
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as TokenPayload;
    req.user = decoded;
    next();
  } catch (error) {
    return next(new AppError('Invalid or expired authentication token', 401));
  }
};

export const authorizeRoles = (...allowedRoles: Role[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Unauthorized: Role '${req.user.role}' does not have permission to perform this action.`,
          403
        )
      );
    }

    next();
  };
};