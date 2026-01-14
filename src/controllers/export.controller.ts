import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware-fixed';

const prisma = new PrismaClient();

export class ExportController {
  // Exporter en CSV
  async exportCSV(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query;

      const where: any = {
        userId: req.userId
      };

      if (startDate || endDate) {
        where.scannedAt = {};
        if (startDate) where.scannedAt.gte = new Date(startDate as string);
        if (endDate) where.scannedAt.lte = new Date(endDate as string);
      }

      const scans = await prisma.scan.findMany({
        where,
        include: {
          foods: true
        },
        orderBy: {
          scannedAt: 'desc'
        }
      });

      // Générer le CSV
      let csv = 'Date,Type de repas,Aliment,Quantité (g),Calories,Glucides (g),Protéines (g),Lipides (g)\n';

      scans.forEach(scan => {
        const date = new Date(scan.scannedAt).toLocaleDateString('fr-FR');
        const mealType = scan.mealType || 'Non spécifié';

        scan.foods.forEach(food => {
          csv += `${date},${mealType},"${food.name}",${food.quantity},${food.calories},${food.carbs},${food.protein},${food.fat}\n`;
        });
      });

      // Envoyer le fichier
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="scanmycarbs_export_${Date.now()}.csv"`);
      res.send('\uFEFF' + csv); // BOM pour Excel
    } catch (error) {
      next(error);
    }
  }

  // Exporter en PDF (simplifié - retourne HTML que le client convertira)
  async exportPDF(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query;

      const where: any = {
        userId: req.userId
      };

      if (startDate || endDate) {
        where.scannedAt = {};
        if (startDate) where.scannedAt.gte = new Date(startDate as string);
        if (endDate) where.scannedAt.lte = new Date(endDate as string);
      }

      const [scans, user] = await Promise.all([
        prisma.scan.findMany({
          where,
          include: {
            foods: true
          },
          orderBy: {
            scannedAt: 'desc'
          }
        }),
        prisma.user.findUnique({
          where: { id: req.userId },
          select: { name: true, email: true }
        })
      ]);

      // Calculer les totaux
      const totals = {
        scans: scans.length,
        calories: scans.reduce((sum, s) => sum + s.totalCalories, 0),
        carbs: scans.reduce((sum, s) => sum + s.totalCarbs, 0),
        protein: scans.reduce((sum, s) => sum + s.totalProtein, 0),
        fat: scans.reduce((sum, s) => sum + s.totalFat, 0)
      };

      // Générer HTML pour PDF
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Rapport ScanMyCarbs</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { color: #2c3e50; }
    .header { margin-bottom: 30px; }
    .summary { background: #ecf0f1; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background-color: #3498db; color: white; }
    .footer { margin-top: 40px; text-align: center; color: #7f8c8d; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 Rapport ScanMyCarbs</h1>
    <p><strong>Utilisateur:</strong> ${user?.name || user?.email}</p>
    <p><strong>Période:</strong> ${startDate ? new Date(startDate as string).toLocaleDateString('fr-FR') : 'Début'} - ${endDate ? new Date(endDate as string).toLocaleDateString('fr-FR') : 'Fin'}</p>
    <p><strong>Généré le:</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
  </div>

  <div class="summary">
    <h2>Résumé</h2>
    <p><strong>Nombre de scans:</strong> ${totals.scans}</p>
    <p><strong>Calories totales:</strong> ${totals.calories.toFixed(0)} kcal</p>
    <p><strong>Glucides totaux:</strong> ${totals.carbs.toFixed(1)} g</p>
    <p><strong>Protéines totales:</strong> ${totals.protein.toFixed(1)} g</p>
    <p><strong>Lipides totaux:</strong> ${totals.fat.toFixed(1)} g</p>
  </div>

  <h2>Historique détaillé</h2>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Type</th>
        <th>Aliments</th>
        <th>Calories</th>
        <th>Glucides</th>
        <th>Protéines</th>
        <th>Lipides</th>
      </tr>
    </thead>
    <tbody>
      ${scans.map(scan => `
        <tr>
          <td>${new Date(scan.scannedAt).toLocaleDateString('fr-FR')}</td>
          <td>${scan.mealType || '-'}</td>
          <td>${scan.foods.map(f => f.name).join(', ')}</td>
          <td>${scan.totalCalories.toFixed(0)} kcal</td>
          <td>${scan.totalCarbs.toFixed(1)} g</td>
          <td>${scan.totalProtein.toFixed(1)} g</td>
          <td>${scan.totalFat.toFixed(1)} g</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="footer">
    <p>ScanMyCarbs - Votre assistant nutritionnel</p>
  </div>
</body>
</html>
      `;

      res.json({
        success: true,
        data: { html, totals }
      });
    } catch (error) {
      next(error);
    }
  }

  // Partager un rapport de scan
  async shareReport(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { scanId } = req.params;
      const { recipientEmail } = req.body;

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

      // Ici vous pouvez implémenter l'envoi par email
      // Pour l'instant on retourne juste les données formatées

      const shareData = {
        date: new Date(scan.scannedAt).toLocaleDateString('fr-FR'),
        mealType: scan.mealType,
        foods: scan.foods.map(f => ({
          name: f.name,
          quantity: f.quantity,
          calories: f.calories,
          carbs: f.carbs,
          protein: f.protein,
          fat: f.fat
        })),
        totals: {
          calories: scan.totalCalories,
          carbs: scan.totalCarbs,
          protein: scan.totalProtein,
          fat: scan.totalFat
        }
      };

      res.json({
        success: true,
        message: 'Rapport préparé pour le partage',
        data: { shareData }
      });
    } catch (error) {
      next(error);
    }
  }
}