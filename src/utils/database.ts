import { PrismaClient } from '@prisma/client';

// Singleton Prisma Client
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Fonction pour tester la connexion
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$connect();
    console.log('✅ Connexion à la base de données réussie');
    return true;
  } catch (error) {
    console.error('❌ Erreur de connexion à la base de données:', error);
    return false;
  }
}

// Fonction pour déconnecter proprement
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}

// Gestion de la fermeture propre
process.on('beforeExit', async () => {
  await disconnectDatabase();
});

export default prisma;