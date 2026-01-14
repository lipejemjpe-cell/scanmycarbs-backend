import { Router } from 'express';
import { ImageRecognitionService } from '../services/imageRecognition.service';

const router = Router();
const imageService = new ImageRecognitionService();

// POST /api/image/analyze
router.post('/analyze', async (req, res) => {
  try {
    const { image } = req.body; // base64 string
    
    if (!image) {
      return res.status(400).json({ error: 'Image manquante' });
    }

    const result = await imageService.analyzeFoodImage(image);
    
    res.json(result);
  } catch (error: any) {
    console.error('Erreur /api/image/analyze:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;