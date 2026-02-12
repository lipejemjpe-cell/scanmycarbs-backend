import express from 'express';
import cors from 'cors';
import path from 'path';
import {fileURLToPath} from 'url';
import scansRoutes from './routes/scans.routes'; // Assure-toi que ce fichier existe

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors()); // Autorise toutes les connexions (wifi, LAN, 4G, etc.)
app.use(express.json());

// 📦 Servir les APK
app.use('/download', express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/scans', scansRoutes);

// Optionnel : route test
app.get('/', (req, res) => {
  res.send('ScanMyCarbs backend is running ✅');
});

// PORT correct pour React Native / Render
const PORT = Number(process.env.PORT) || 3000;

// Écoute sur 0.0.0.0 pour être accessible depuis ton téléphone
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
