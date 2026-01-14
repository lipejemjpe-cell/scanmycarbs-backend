import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware-fixed';

const router = Router();
const userController = new UserController();

// Toutes les routes nécessitent l'authentification
router.use(authenticate);

// Récupérer le profil
router.get('/profile', userController.getProfile);

// Mettre à jour le profil
router.patch('/profile', userController.updateProfile);

// Changer le mot de passe
router.patch('/password', userController.changePassword);

// Mettre à jour les préférences
router.patch('/preferences', userController.updatePreferences);

// Supprimer le compte
router.delete('/account', userController.deleteAccount);

export default router;