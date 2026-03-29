# Image Node.js officielle
FROM node:18-alpine

# Répertoire de travail
WORKDIR /app

# Copie des fichiers de dépendances
COPY package*.json ./

# Installation des dépendances
RUN npm ci --only=production

# Copie du code source
COPY . .

# Exposition du port
EXPOSE 3000

# Variables d'environnement (exemples)
ENV NODE_ENV=production

# Commande de démarrage
CMD ["node", "server.js"]