import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware-fixed';

const prisma = new PrismaClient();

export class UserController {
  // Récupérer le profil
  async getProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: {
          id: true,
          email: true,
          name: true,
          language: true,
          darkMode: true,
          dailyGoal: true,
          createdAt: true,
          lastLoginAt: true
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

  // Mettre à jour le profil
  async updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { name, email } = req.body;

      // Si changement d'email, vérifier qu'il n'est pas déjà utilisé
      if (email) {
        const existingUser = await prisma.user.findFirst({
          where: {
            email,
            id: { not: req.userId }
          }
        });

        if (existingUser) {
          throw new AppError('Cet email est déjà utilisé', 409);
        }
      }

      const updatedUser = await prisma.user.update({
        where: { id: req.userId },
        data: {
          ...(name !== undefined && { name }),
          ...(email && { email })
        },
        select: {
          id: true,
          email: true,
          name: true,
          language: true,
          darkMode: true,
          dailyGoal: true
        }
      });

      res.json({
        success: true,
        message: 'Profil mis à jour',
        data: { user: updatedUser }
      });
    } catch (error) {
      next(error);
    }
  }

  // Changer le mot de passe
  async changePassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        throw new AppError('Mot de passe actuel et nouveau requis', 400);
      }

      if (newPassword.length < 6) {
        throw new AppError('Le nouveau mot de passe doit contenir au moins 6 caractères', 400);
      }

      const user = await prisma.user.findUnique({
        where: { id: req.userId }
      });

      if (!user || !user.password) {
        throw new AppError('Utilisateur non trouvé', 404);
      }

      // Vérifier le mot de passe actuel
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        throw new AppError('Mot de passe actuel incorrect', 401);
      }

      // Hash du nouveau mot de passe
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await prisma.user.update({
        where: { id: req.userId },
        data: { password: hashedPassword }
      });

      res.json({
        success: true,
        message: 'Mot de passe modifié avec succès'
      });
    } catch (error) {
      next(error);
    }
  }

  // Mettre à jour les préférences
  async updatePreferences(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { language, darkMode, dailyGoal } = req.body;

      const updatedUser = await prisma.user.update({
        where: { id: req.userId },
        data: {
          ...(language && { language }),
          ...(darkMode !== undefined && { darkMode }),
          ...(dailyGoal !== undefined && { dailyGoal: dailyGoal ? Number(dailyGoal) : null })
        },
        select: {
          id: true,
          email: true,
          name: true,
          language: true,
          darkMode: true,
          dailyGoal: true
        }
      });

      res.json({
        success: true,
        message: 'Préférences mises à jour',
        data: { user: updatedUser }
      });
    } catch (error) {
      next(error);
    }
  }

  // Supprimer le compte
  async deleteAccount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { password } = req.body;

      const user = await prisma.user.findUnique({
        where: { id: req.userId }
      });

      if (!user) {
        throw new AppError('Utilisateur non trouvé', 404);
      }

      // Si l'utilisateur a un mot de passe (pas login social), le vérifier
      if (user.password) {
        if (!password) {
          throw new AppError('Mot de passe requis pour supprimer le compte', 400);
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          throw new AppError('Mot de passe incorrect', 401);
        }
      }

      // Supprimer l'utilisateur (cascade supprimera scans et aliments manuels)
      await prisma.user.delete({
        where: { id: req.userId }
      });

      res.json({
        success: true,
        message: 'Compte supprimé avec succès'
      });
    } catch (error) {
      next(error);
    }
  }
}