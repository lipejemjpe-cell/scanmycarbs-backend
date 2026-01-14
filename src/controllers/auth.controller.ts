import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware-fixed';

const prisma = new PrismaClient();

export class AuthController {
  // Inscription
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, name } = req.body;

      // Validation
      if (!email || !password) {
        throw new AppError('Email et mot de passe requis', 400);
      }

      // Vérifier si l'utilisateur existe déjà
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        throw new AppError('Cet email est déjà utilisé', 409);
      }

      // Hash du mot de passe
      const hashedPassword = await bcrypt.hash(password, 10);

      // Créer l'utilisateur
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name: name || null,
          lastLoginAt: new Date()
        }
      });

      // Générer le token JWT
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new AppError('JWT_SECRET not configured', 500);
      }
      const token = jwt.sign(
        { userId: user.id },
        jwtSecret as string,
        { expiresIn: process.env.JWT_EXPIRE || '7d' } as any
      );

      res.status(201).json({
        success: true,
        message: 'Compte créé avec succès',
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            language: user.language,
            darkMode: user.darkMode
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Connexion
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      // Validation
      if (!email || !password) {
        throw new AppError('Email et mot de passe requis', 400);
      }

      // Trouver l'utilisateur
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !user.password) {
        throw new AppError('Email ou mot de passe incorrect', 401);
      }

      // Vérifier le mot de passe
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new AppError('Email ou mot de passe incorrect', 401);
      }

      // Mettre à jour lastLoginAt
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });

      // Générer le token
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new AppError('JWT_SECRET not configured', 500);
      }
      const token = jwt.sign(
        { userId: user.id },
        jwtSecret as string,
        { expiresIn: process.env.JWT_EXPIRE || '7d' } as any
      );

      res.json({
        success: true,
        message: 'Connexion réussie',
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            language: user.language,
            darkMode: user.darkMode,
            dailyGoal: user.dailyGoal
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Login Google
  async googleLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const { googleId, email, name } = req.body;

      if (!googleId || !email) {
        throw new AppError('Informations Google manquantes', 400);
      }

      // Chercher ou créer l'utilisateur
      let user = await prisma.user.findUnique({ where: { googleId } });

      if (!user) {
        user = await prisma.user.create({
          data: {
            googleId,
            email,
            name: name || null,
            lastLoginAt: new Date()
          }
        });
      } else {
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() }
        });
      }

      // Générer le token
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new AppError('JWT_SECRET not configured', 500);
      }
      const token = jwt.sign(
        { userId: user.id },
        jwtSecret as string,
        { expiresIn: process.env.JWT_EXPIRE || '7d' } as any
      );

      res.json({
        success: true,
        message: 'Connexion Google réussie',
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            language: user.language,
            darkMode: user.darkMode
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Login Apple
  async appleLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const { appleId, email, name } = req.body;

      if (!appleId) {
        throw new AppError('Informations Apple manquantes', 400);
      }

      let user = await prisma.user.findUnique({ where: { appleId } });

      if (!user) {
        user = await prisma.user.create({
          data: {
            appleId,
            email: email || `apple_${appleId}@scanmycarbs.app`,
            name: name || null,
            lastLoginAt: new Date()
          }
        });
      } else {
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() }
        });
      }

      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new AppError('JWT_SECRET not configured', 500);
      }
      const token = jwt.sign(
        { userId: user.id },
        jwtSecret as string,
        { expiresIn: process.env.JWT_EXPIRE || '7d' } as any
      );

      res.json({
        success: true,
        message: 'Connexion Apple réussie',
        data: { token, user }
      });
    } catch (error) {
      next(error);
    }
  }

  // Vérifier le token
  async verifyToken(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: {
          id: true,
          email: true,
          name: true,
          language: true,
          darkMode: true,
          dailyGoal: true
        }
      });

      if (!user) {
        throw new AppError('Utilisateur non trouvé', 404);
      }

      res.json({
        success: true,
        data: { user }
      });
    } catch (error) {
      next(error);
    }
  }

  // Rafraîchir le token
  async refreshToken(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new AppError('JWT_SECRET not configured', 500);
      }
      const newToken = jwt.sign(
        { userId: req.userId },
        jwtSecret as string,
        { expiresIn: process.env.JWT_EXPIRE || '7d' } as any
      );

      res.json({
        success: true,
        data: { token: newToken }
      });
    } catch (error) {
      next(error);
    }
  }

  // Déconnexion (simple confirmation côté serveur)
  async logout(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      res.json({
        success: true,
        message: 'Déconnexion réussie'
      });
    } catch (error) {
      next(error);
    }
  }
}