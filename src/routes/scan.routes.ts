import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// POST /api/scans - Sauvegarder un scan
router.post('/', async (req, res) => {
  try {
    const { type, foods, totalCarbs, totalCalories, imageUrl } = req.body;
    
    const scan = await prisma.scan.create({
      data: {
        type,
        foods,
        totalCarbs,
        totalCalories,
        imageUrl,
      },
    });
    
    res.json(scan);
  } catch (error: any) {
    console.error('Erreur sauvegarde scan:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/scans - Récupérer l'historique
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    
    const scans = await prisma.scan.findMany({
      orderBy: { scannedAt: 'desc' },
      take: limit,
    });
    
    res.json(scans);
  } catch (error: any) {
    console.error('Erreur récupération scans:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/scans/stats - Statistiques
router.get('/stats', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayScans = await prisma.scan.findMany({
      where: {
        scannedAt: { gte: today },
      },
    });
    
    const totalCarbsToday = todayScans.reduce((sum, scan) => sum + scan.totalCarbs, 0);
    const totalCaloriesToday = todayScans.reduce((sum, scan) => sum + scan.totalCalories, 0);
    
    res.json({
      scansToday: todayScans.length,
      totalCarbsToday: Math.round(totalCarbsToday * 10) / 10,
      totalCaloriesToday: Math.round(totalCaloriesToday),
    });
  } catch (error: any) {
    console.error('Erreur stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/scans/:id - Supprimer un scan
router.delete('/:id', async (req, res) => {
  try {
    await prisma.scan.delete({
      where: { id: req.params.id },
    });
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('Erreur suppression scan:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;