import rateLimit from 'express-rate-limit';
# 🍽️ ScanMyCarbs Backend

API REST pour l'application ScanMyCarbs - Calcul nutritionnel intelligent.

## 🚀 Installation

### Prérequis
- Node.js 18+ 
- PostgreSQL (ou compte Railway.app gratuit)
- npm ou yarn

### Étapes

1. **Installer les dépendances**
```bash
cd backend
npm install
```

2. **Configuration**
```bash
# Copier le fichier .env.example
cp .env.example .env

# Éditer .env et remplir vos variables
```

3. **Base de données**

**Option A - Railway.app (Gratuit & Recommandé):**
- Aller sur https://railway.app
- Créer un compte
- Nouveau projet → PostgreSQL
- Copier DATABASE_URL dans votre .env

**Option B - PostgreSQL Local:**
```bash
# Créer une base de données
createdb scanmycarbs

# Modifier DATABASE_URL dans .env
DATABASE_URL="postgresql://user:password@localhost:5432/scanmycarbs"
```

4. **Prisma - Générer le client et créer les tables**
```bash
npm run prisma:generate
npm run prisma:push
```

5. **Générer JWT_SECRET**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copier le résultat dans .env JWT_SECRET
```

## 🎮 Lancement

### Développement (avec hot-reload)
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

Le serveur démarre sur http://localhost:3000

## 📡 Endpoints API

### Auth
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `POST /api/auth/google` - Login Google
- `POST /api/auth/apple` - Login Apple
- `GET /api/auth/verify` - Vérifier token (protégé)

### Scan
- `POST /api/scan` - Créer un scan (protégé)
- `GET /api/scan/history` - Historique (protégé)
- `GET /api/scan/:scanId` - Détails scan (protégé)
- `PATCH /api/scan/:scanId` - Modifier scan (protégé)
- `DELETE /api/scan/:scanId` - Supprimer scan (protégé)
- `GET /api/scan/stats/daily` - Stats quotidiennes (protégé)
- `GET /api/scan/stats/weekly` - Stats hebdomadaires (protégé)
- `GET /api/scan/stats/monthly` - Stats mensuelles (protégé)

### Food
- `GET /api/food/search?query=pomme` - Rechercher aliment
- `GET /api/food/:foodId` - Détails aliment
- `POST /api/food/barcode` - Scanner code-barre
- `POST /api/food/manual` - Ajouter aliment manuel (protégé)
- `GET /api/food/manual/my-foods` - Mes aliments manuels (protégé)

### User
- `GET /api/user/profile` - Mon profil (protégé)
- `PATCH /api/user/profile` - Modifier profil (protégé)
- `PATCH /api/user/password` - Changer mot de passe (protégé)
- `PATCH /api/user/preferences` - Modifier préférences (protégé)
- `DELETE /api/user/account` - Supprimer compte (protégé)

### Export
- `GET /api/export/csv` - Export CSV (protégé)
- `GET /api/export/pdf` - Export PDF (protégé)
- `POST /api/export/share/:scanId` - Partager scan (protégé)

## 🔐 Authentification

Les routes protégées nécessitent un header Authorization:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

## 🗄️ Base de données

### Modèles Prisma
- **User** - Utilisateurs
- **Scan** - Historique des scans
- **ScannedFood** - Aliments dans un scan
- **ManualFood** - Aliments ajoutés manuellement
- **CiqualCache** - Cache des données Ciqual

### Migrations
```bash
# Créer une migration
npm run prisma:migrate

# Pousser le schema sans migration
npm run prisma:push
```

## 🌐 APIs Externes

### Ciqual (France)
- Base de données nutritionnelles française
- Gratuit, pas de clé API requise
- https://ciqual.anses.fr

### OpenFoodFacts (Mondial)
- Base collaborative de produits
- Gratuit, pas de clé API requise
- https://world.openfoodfacts.org

## 🔧 Scripts

```bash
npm run dev          # Développement avec nodemon
npm run build        # Compilation TypeScript
npm start            # Production
npm run prisma:generate   # Générer client Prisma
npm run prisma:migrate    # Créer migration
npm run prisma:push       # Appliquer schema
```

## 📦 Déploiement Railway

1. Push votre code sur GitHub
2. Aller sur https://railway.app
3. New Project → Deploy from GitHub
4. Sélectionner le repo
5. Ajouter PostgreSQL
6. Configurer les variables d'environnement
7. Deploy!

Railway détecte automatiquement le backend et le déploie.

## 🐛 Debug

### Vérifier la connexion DB
```bash
npx prisma studio
```

### Logs détaillés
Mettre NODE_ENV=development dans .env

## 📝 Licence

MIT