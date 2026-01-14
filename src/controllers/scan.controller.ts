import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware-fixed';

const prisma = new PrismaClient();

export class ScanController {
  // Créer un nouveau scan
  async createScan(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { foods, mealType, notes, imageUrl } = req.body;

      if (!foods || !Array.isArray(foods) || foods.length === 0) {
        throw new AppError('Liste d\'aliments requise', 400);
      }

      // Calculer les totaux
      let totalCalories = 0;
      let totalCarbs = 0;
      let totalProtein = 0;
      let totalFat = 0;

      foods.forEach((food: any) => {
        const quantity = food.quantity || 100;
        const multiplier = quantity / 100;
        
        totalCalories += food.calories * multiplier;
        totalCarbs += food.carbs * multiplier;
        totalProtein += food.protein * multiplier;
        totalFat += food.fat * multiplier;
      });

      // Créer le scan avec tous les aliments
      const scan = await prisma.scan.create({
        data: {
          userId: req.userId!,
          imageUrl,
          totalCalories,
          totalCarbs,
          totalProtein,
          totalFat,
          mealType,
          notes,
          foods: {
            create: foods.map((food: any) => ({
              name: food.name,
              quantity: food.quantity || 100,
              calories: food.calories,
              carbs: food.carbs,
              protein: food.protein,
              fat: food.fat,
              source: food.source || 'ciqual',
              sourceId: food.sourceId
            }))
          }
        },
        include: {
          foods: true
        }
      });

      res.status(201).json({
        success: true,
        message: 'Scan enregistré avec succès',
        data: { scan }
      });
    } catch (error) {
      next(error);
    }
  }

  // Récupérer l'historique des scans
  async getHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 20, startDate, endDate } = req.query;

      const skip = (Number(page) - 1) * Number(limit);

      const where: any = {
        userId: req.userId
      };

      if (startDate || endDate) {
        where.scannedAt = {};
        if (startDate) where.scannedAt.gte = new Date(startDate as string);
        if (endDate) where.scannedAt.lte = new Date(endDate as string);
      }

      const [scans, total] = await Promise.all([
        prisma.scan.findMany({
          where,
          include: {
            foods: true
          },
          orderBy: {
            scannedAt: 'desc'
          },
          skip,
          take: Number(limit)
        }),
        prisma.scan.count({ where })
      ]);

      res.json({
        success: true,
        data: {
          scans,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / Number(limit))
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Détails d'un scan
  async getScanDetails(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { scanId } = req.params;

      const scan = await prisma.scan.findFirst({
        where: {
          id: scanId,
          userId: req.userId
        },
        include: {
          foods: true
        }
      });

      if (!scan) {
        throw new AppError('Scan non trouvé', 404);
      }

      res.json({
        success: true,
        data: { scan }
      });
    } catch (error) {
      next(error);
    }
  }

  // Mettre à jour un scan
  async updateScan(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { scanId } = req.params;
      const { mealType, notes } = req.body;

      const scan = await prisma.scan.findFirst({
        where: { id: scanId, userId: req.userId }
      });

      if (!scan) {
        throw new AppError('Scan non trouvé', 404);
      }

      const updatedScan = await prisma.scan.update({
        where: { id: scanId },
        data: {
          ...(mealType && { mealType }),
          ...(notes !== undefined && { notes })
        },
        include: {
          foods: true
        }
      });

      res.json({
        success: true,
        message: 'Scan mis à jour',
        data: { scan: updatedScan }
      });
    } catch (error) {
      next(error);
    }
  }

  // Supprimer un scan
  async deleteScan(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { scanId } = req.params;

      const scan = await prisma.scan.findFirst({
        where: { id: scanId, userId: req.userId }
      });

      if (!scan) {
        throw new AppError('Scan non trouvé', 404);
      }

      await prisma.scan.delete({
        where: { id: scanId }
      });

      res.json({
        success: true,
        message: 'Scan supprimé'
      });
    } catch (error) {
      next(error);
    }
  }

  // Statistiques quotidiennes
  async getDailyStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { date } = req.query;
      const targetDate = date ? new Date(date as string) : new Date();
      
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

      const scans = await prisma.scan.findMany({
        where: {
          userId: req.userId,
          scannedAt: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      });

      const stats = {
        totalScans: scans.length,
        totalCalories: scans.reduce((sum, s) => sum + s.totalCalories, 0),
        totalCarbs: scans.reduce((sum, s) => sum + s.totalCarbs, 0),
        totalProtein: scans.reduce((sum, s) => sum + s.totalProtein, 0),
        totalFat: scans.reduce((sum, s) => sum + s.totalFat, 0)
      };

      res.json({
        success: true,
        data: { date: targetDate, stats }
      });
    } catch (error) {
      next(error);
    }
  }

  // Statistiques hebdomadaires
  async getWeeklyStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { startDate } = req.query;
      const start = startDate ? new Date(startDate as string) : new Date();
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - start.getDay()); // Début de semaine

      const end = new Date(start);
      end.setDate(end.getDate() + 7);

      const scans = await prisma.scan.findMany({
        where: {
          userId: req.userId,
          scannedAt: {
            gte: start,
            lt: end
          }
        },
        orderBy: {
          scannedAt: 'asc'
        }
      });

      // Grouper par jour
      const dailyStats = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(start);
        date.setDate(date.getDate() + i);
        
        const dayScans = scans.filter(s => {
          const scanDate = new Date(s.scannedAt);
          return scanDate.toDateString() === date.toDateString();
        });

        return {
          date: date.toISOString().split('T')[0],
          scans: dayScans.length,
          calories: dayScans.reduce((sum, s) => sum + s.totalCalories, 0),
          carbs: dayScans.reduce((sum, s) => sum + s.totalCarbs, 0),
          protein: dayScans.reduce((sum, s) => sum + s.totalProtein, 0),
          fat: dayScans.reduce((sum, s) => sum + s.totalFat, 0)
        };
      });

      res.json({
        success: true,
        data: { dailyStats }
      });
    } catch (error) {
      next(error);
    }
  }

  // Statistiques mensuelles
  async getMonthlyStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { year, month } = req.query;
      const targetDate = new Date();
      
      if (year) targetDate.setFullYear(Number(year));
      if (month) targetDate.setMonth(Number(month) - 1);

      const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59);

      const scans = await prisma.scan.findMany({
        where: {
          userId: req.userId,
          scannedAt: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        }
      });

      const stats = {
        month: targetDate.toLocaleString('fr-FR', { month: 'long', year: 'numeric' }),
        totalScans: scans.length,
        averageCalories: scans.length > 0 ? scans.reduce((sum, s) => sum + s.totalCalories, 0) / scans.length : 0,
        averageCarbs: scans.length > 0 ? scans.reduce((sum, s) => sum + s.totalCarbs, 0) / scans.length : 0,
        totalCalories: scans.reduce((sum, s) => sum + s.totalCalories, 0),
        totalCarbs: scans.reduce((sum, s) => sum + s.totalCarbs, 0),
        totalProtein: scans.reduce((sum, s) => sum + s.totalProtein, 0),
        totalFat: scans.reduce((sum, s) => sum + s.totalFat, 0)
      };

      res.json({
        success: true,
        data: { stats }
      });
    } catch (error) {
      next(error);
    }
  }
}