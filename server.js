const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ycyukrdmgkcxiczgbtwu.supabase.co',
  're_R2kCro1s_JDyFjPJpqCAs8xE1CNQCBGE4' ./* supabase key */
);

const express = require('express');
const cors = require('cors');

const app = express();
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
// Historique des scans
app.get('/api/scans', (req, res) => {
  res.json([]);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ ScanMyCarbs API démarrée sur le port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});