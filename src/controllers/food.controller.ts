import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware-fixed';
import { CiqualService } from '../services/ciqual.service';
import { OpenFoodFactsService } from '../services/openfoodfacts.service';

const prisma = new PrismaClient();
const ciqualService = new CiqualService();
const offService = new OpenFoodFactsService();

export class FoodController {
  // Rechercher un aliment
  async searchFood(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { query, limit = 10 } = req.query;

      if (!query || typeof query !== 'string') {
        throw new AppError('Terme de recherche requis', 400);
      }

      // Recherche parallèle dans Ciqual et OpenFoodFacts
      const [ciqualResults, offResults] = await Promise.all([
        ciqualService.search(query as string, Number(limit)),
        offService.search(query as string, Number(limit))
      ]);

      // Combiner et dédupliquer les résultats
      const allResults = [
        ...ciqualResults.map((r: any) => ({ ...r, source: 'ciqual' })),
        ...offResults.map((r: any) => ({ ...r, source: 'openfoodfacts' }))
      ].slice(0, Number(limit));

      res.json({
        success: true,
        data: {
          results: allResults,
          total: allResults.length
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Détails d'un aliment
  async getFoodDetails(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { foodId } = req.params;
      const { source = 'ciqual' } = req.query;

      let foodDetails;

      if (source === 'ciqual') {
        foodDetails = await ciqualService.getDetails(foodId);
      } else if (source === 'openfoodfacts') {
        foodDetails = await offService.getDetails(foodId);
      } else {
        throw new AppError('Source invalide', 400);
      }

      if (!foodDetails) {
        throw new AppError('Aliment non trouvé', 404);
      }

      res.json({
        success: true,
        data: { food: foodDetails }
      });
    } catch (error) {
      next(error);
    }
  }

  // Scanner un code-barre
  async scanBarcode(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { barcode } = req.body;

      if (!barcode) {
        throw new AppError('Code-barre requis', 400);
      }

      // Chercher d'abord dans les aliments manuels de l'utilisateur
      if (req.userId) {
        const manualFood = await prisma.manualFood.findFirst({
          where: {
            barcode,
            userId: req.userId
          }
        });

        if (manualFood) {
          return res.json({
            success: true,
            data: {
              food: {
                id: manualFood.id,
                name: manualFood.name,
                brand: manualFood.brand,
                calories: manualFood.calories,
                carbs: manualFood.carbs,
                protein: manualFood.protein,
                fat: manualFood.fat,
                source: 'manual',
                barcode: manualFood.barcode
              }
            }
          });
        }
      }

      // Sinon chercher dans OpenFoodFacts
      const food = await offService.getByBarcode(barcode);

      if (!food) {
        throw new AppError('Produit non trouvé', 404);
      }

      res.json({
        success: true,
        data: { food }
      });
    } catch (error) {
      next(error);
    }
  }

  // Ajouter un aliment manuel
  async addManualFood(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { name, brand, calories, carbs, protein, fat, category, barcode } = req.body;

      if (!name || calories === undefined || carbs === undefined || protein === undefined || fat === undefined) {
        throw new AppError('Informations nutritionnelles incomplètes', 400);
      }

      const manualFood = await prisma.manualFood.create({
        data: {
          userId: req.userId!,
          name,
          brand,
          calories: Number(calories),
          carbs: Number(carbs),
          protein: Number(protein),
          fat: Number(fat),
          category,
          barcode
        }
      });

      res.status(201).json({
        success: true,
        message: 'Aliment ajouté avec succès',
        data: { food: manualFood }
      });
    } catch (error) {
      next(error);
    }
  }

  // Récupérer les aliments manuels de l'utilisateur
  async getMyManualFoods(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const foods = await prisma.manualFood.findMany({
        where: {
          userId: req.userId
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      res.json({
        success: true,
        data: { foods }
      });
    } catch (error) {
      next(error);
    }
  }

  // Mettre à jour un aliment manuel
  async updateManualFood(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { foodId } = req.params;
      const { name, brand, calories, carbs, protein, fat, category } = req.body;

      const food = await prisma.manualFood.findFirst({
        where: {
          id: foodId,
          userId: req.userId
        }
      });

      if (!food) {
        throw new AppError('Aliment non trouvé', 404);
      }

      const updatedFood = await prisma.manualFood.update({
        where: { id: foodId },
        data: {
          ...(name && { name }),
          ...(brand !== undefined && { brand }),
          ...(calories !== undefined && { calories: Number(calories) }),
          ...(carbs !== undefined && { carbs: Number(carbs) }),
          ...(protein !== undefined && { protein: Number(protein) }),
          ...(fat !== undefined && { fat: Number(fat) }),
          ...(category && { category })
        }
      });

      res.json({
        success: true,
        message: 'Aliment mis à jour',
        data: { food: updatedFood }
      });
    } catch (error) {
      next(error);
    }
  }

  // Supprimer un aliment manuel
  async deleteManualFood(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { foodId } = req.params;

      const food = await prisma.manualFood.findFirst({
        where: {
          id: foodId,
          userId: req.userId
        }
      });

      if (!food) {
        throw new AppError('Aliment non trouvé', 404);
      }

      await prisma.manualFood.delete({
        where: { id: foodId }
      });

      res.json({
        success: true,
        message: 'Aliment supprimé'
      });
    } catch (error) {
      next(error);
    }
  }
}