import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { User } from '../generated/prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const REFRESH_SECRET = process.env.JWT_SECRET ? process.env.JWT_SECRET + '_refresh' : 'fallback_refresh';

export class AuthService {
  
  // 1. REGISTER A NEW USER
  static async register(email: string, passwordRaw: string, name: string) {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Hash the password securely
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(passwordRaw, saltRounds);

    // Save to database
    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword
      }
    });

    return this.generateTokens(newUser);
  }

  // 2. LOGIN EXISTING USER
  static async login(email: string, passwordRaw: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(passwordRaw, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    return this.generateTokens(user);
  }

  // Helper method to generate both tokens
  private static async generateTokens(user: User) {
    const accessToken = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: user.id }, REFRESH_SECRET, { expiresIn: '7d' });

    // Store refresh token in DB for revocation capability
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    };
  }
}