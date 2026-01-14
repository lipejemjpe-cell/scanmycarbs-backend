import { Router } from 'express';
import { FoodController } from '../controllers/food.controller';
import { authenticate, optionalAuth } from '../middleware/auth.middleware-fixed';

const router = Router();
const foodController = new FoodController();

// Recherche d'aliments (Ciqual + OpenFoodFacts)
router.get('/search', optionalAuth, foodController.searchFood);

// Détails d'un aliment spécifique
router.get('/:foodId', optionalAuth, foodController.getFoodDetails);

// Scan de code-barre
router.post('/barcode', optionalAuth, foodController.scanBarcode);

// Routes protégées (nécessitent authentification)
router.use(authenticate);

// Ajouter un aliment manuel
router.post('/manual', foodController.addManualFood);

// Récupérer les aliments manuels de l'utilisateur
router.get('/manual/my-foods', foodController.getMyManualFoods);

// Mettre à jour un aliment manuel
router.patch('/manual/:foodId', foodController.updateManualFood);

// Supprimer un aliment manuel
router.delete('/manual/:foodId', foodController.deleteManualFood);

export default router;