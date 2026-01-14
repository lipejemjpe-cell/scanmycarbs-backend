import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware-fixed';

const router = Router();
const authController = new AuthController();

// Inscription
router.post('/register', authController.register);

// Connexion
router.post('/login', authController.login);

// Login social (Google)
router.post('/google', authController.googleLogin);

// Login social (Apple)
router.post('/apple', authController.appleLogin);

// Vérifier le token (protégé)
router.get('/verify', authenticate, authController.verifyToken);

// Rafraîchir le token
router.post('/refresh', authenticate, authController.refreshToken);

// Déconnexion (optionnel, pour invalidation côté serveur si nécessaire)
router.post('/logout', authenticate, authController.logout);

export default router;