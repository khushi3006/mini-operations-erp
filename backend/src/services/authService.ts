import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { TokenPayload } from '../types';

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('FATAL: JWT_SECRET environment variable is missing. Please configure it in .env');
  }
  return secret;
};

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export const loginUser = async (email: string, password: string) => {
  if (!email || !password) {
    throw new AppError('Email and password are required', 400);
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() }
  });

  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401);
  }

  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    name: user.name
  };

  const token = jwt.sign(payload, getJwtSecret(), { expiresIn: '24h' });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    }
  };
};

export const getUserById = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true
    }
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return user;
};