import { Router } from 'express';
import { ExportController } from '../controllers/export.controller';
import { authenticate } from '../middleware/auth.middleware-fixed';

const router = Router();
const exportController = new ExportController();

// Toutes les routes nécessitent l'authentification
router.use(authenticate);

// Exporter l'historique en CSV
router.get('/csv', exportController.exportCSV);

// Exporter l'historique en PDF
router.get('/pdf', exportController.exportPDF);

// Partager un scan spécifique
router.post('/share/:scanId', exportController.shareReport);

export default router;