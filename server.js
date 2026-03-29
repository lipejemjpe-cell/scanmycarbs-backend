const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ycyukrdmgkcxiczgbtwu.supabase.co',
  're_R2kCro1s_JDyFjPJpqCAs8xE1CNQCBGE4' /* supabase key */
);

const express = require('express');
const cors = require('cors');

const path = require('path');
const app = express();

// Servir le dossier public
app.use(express.static(path.join(__dirname, 'public')));

// Route test pour vérifier que le serveur fonctionne
app.get('/', (req, res) => {
  res.send('Backend OK');
});

const PORT = process.env.PORT || 3000;


// Middleware
app.use(cors());
app.use(express.json({limit: '50mb'}));

// Route de santé
app.get('/health', (req, res) => {
  res.json({status: 'OK', timestamp: new Date().toISOString()});
});

// Route principale
app.get('/', (req, res) => {
  res.json({
    message: 'ScanMyCarbs API',
    version: '1.0.0',
    endpoints: ['/api/scans', '/api/ciqual/search', '/api/barcode/:code'],
  });
});

// Sauvegarder un scan
app.post('/api/scans', async (req, res) => {
  try {
    const {type, foods, totalCarbs, totalCalories, scannedAt} = req.body;
    
    // Sauvegarder dans Supabase
    const { data, error } = await supabase
      .from('scans')
      .insert([{
        user_id: 'user_id_temporaire', // TODO: récupérer du JWT
        type,
        foods,
        total_carbs: totalCarbs,
        total_calories: totalCalories,
        scanned_at: scannedAt || new Date().toISOString(),
      }]);

    if (error) {
      console.error('Erreur Supabase:', error);
      return res.status(500).json({error: error.message});
    }

    console.log('✅ Scan sauvegardé dans Supabase');
    res.json({success: true, data});
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({error: error.message});
  }
});
// Stats du jour
app.get('/api/scans', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('scans')
      .select('*')
      .order('scanned_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    res.json(data || []);
  } catch (error) {
    console.error('Erreur:', error);
    res.json([]);
  }
});

// Recherche CIQUAL
app.get('/api/ciqual/search', (req, res) => {
  const {query} = req.query;
  
  const foods = {
    pain: {carbs: 50, calories: 265, protein: 9, fat: 3},
    riz: {carbs: 28, calories: 130, protein: 2.7, fat: 0.3},
    pates: {carbs: 25, calories: 131, protein: 5, fat: 1},
    pomme: {carbs: 14, calories: 52, protein: 0.3, fat: 0.2},
    banane: {carbs: 23, calories: 89, protein: 1, fat: 0.3},
    poulet: {carbs: 0, calories: 165, protein: 31, fat: 3.6},
    oeuf: {carbs: 1, calories: 155, protein: 13, fat: 11},
  };

  const match = Object.keys(foods).find(k => query.toLowerCase().includes(k));
  res.json(match ? foods[match] : {carbs: 20, calories: 100, protein: 2, fat: 1});
});

// Code-barres OpenFoodFacts
app.get('/api/barcode/:code', async (req, res) => {
  try {
    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${req.params.code}.json`);
    const data = await response.json();

    if (data.status === 1) {
      const p = data.product;
      res.json({
        name: p.product_name || 'Produit inconnu',
        carbs: parseFloat(p.nutriments.carbohydrates_100g || 0),
        calories: parseFloat(p.nutriments['energy-kcal_100g'] || 0),
        protein: parseFloat(p.nutriments.proteins_100g || 0),
        fat: parseFloat(p.nutriments.fat_100g || 0),
      });
    } else {
      res.status(404).json({error: 'Produit non trouvé'});
    }
  } catch (error) {
    res.status(500).json({error: error.message});
  }
});

// Démarrer le serveur
// Stats globales
app.get('/api/stats', (req, res) => {
  res.json({
    totalScans: 0,
    totalCalories: 0,
    totalCarbs: 0,
  });
});

// Variables d'environnement (à configurer sur Render.com)
const GOOGLE_VISION_API_KEY = process.env.GOOGLE_VISION_API_KEY || '';

// Route proxy pour Google Vision
app.post('/api/vision/analyze', async (req, res) => {
  try {
    const {base64Image} = req.body;

    if (!base64Image) {
      return res.status(400).json({error: 'Image requise'});
    }

    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`,
      {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          requests: [{
            image: {content: base64Image},
            features: [
              {type: 'LABEL_DETECTION', maxResults: 10},
              {type: 'OBJECT_LOCALIZATION', maxResults: 5},
            ],
          }],
        }),
      },
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Vision API error:', errorData);
      return res.status(response.status).json({error: 'Vision API error'});
    }

    const data = await response.json();
    res.json(data);

  } catch (error) {
    console.error('Erreur Vision API:', error);
    res.status(500).json({error: error.message});
  }
});
/* =========================
   🤖 NOUVELLE ROUTE IA
========================= */

app.post('/api/predict', async (req, res) => {
  try {
    const { glucose, carbs } = req.body;

    // 🔥 fallback simple (fiable)
    let prediction = glucose + carbs * 0.02;

    // 🔥 tentative IA (optionnelle)
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          messages: [
            {
              role: 'system',
              content: 'Répond uniquement avec un nombre (glycémie future).',
            },
            {
              role: 'user',
              content: `Glycémie: ${glucose}, glucides: ${carbs}`,
            },
          ],
        }),
      });

      const data = await response.json();
      const aiValue = parseFloat(data.choices?.[0]?.message?.content);

      if (!isNaN(aiValue)) {
        prediction = aiValue;
      }
    } catch (e) {
      console.log('⚠️ fallback utilisé');
    }

    res.json({ prediction });

  } catch (error) {
    console.error('Erreur IA:', error);
    res.status(500).json({ error: 'Erreur IA' });
  }
});

/* =========================
   🚀 LANCEMENT SERVEUR
========================= */

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ ScanMyCarbs API démarrée sur le port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});