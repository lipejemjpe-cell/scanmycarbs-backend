import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CiqualFood {
  id: string;
  name: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
}

export class CiqualService {
  private baseUrl = 'https://ciqual.anses.fr/cms/api/v1';
  
  // Rechercher un aliment dans Ciqual
  async search(query: string, limit: number = 10): Promise<CiqualFood[]> {
    try {
      // Vérifier d'abord le cache local
      const cachedResults = await this.searchCache(query, limit);
      if (cachedResults.length > 0) {
        return cachedResults;
      }

      // Appeler l'API Ciqual
      const response = await axios.get(`${this.baseUrl}/search`, {
        params: {
          query,
          limit
        },
        timeout: 5000
      });

      const foods: CiqualFood[] = [];

      if (response.data && Array.isArray(response.data)) {
        for (const item of response.data.slice(0, limit)) {
          const food = await this.parseFood(item);
          if (food) {
            foods.push(food);
            // Mettre en cache
            await this.cacheFood(food);
          }
        }
      }

      return foods;
    } catch (error: any) {
      console.error('Erreur Ciqual search:', error.message);
      // En cas d'erreur API, retourner les résultats du cache
      return await this.searchCache(query, limit);
    }
  }

  // Obtenir les détails d'un aliment
  async getDetails(ciqualId: string): Promise<CiqualFood | null> {
    try {
      // Vérifier d'abord le cache
      const cached = await prisma.ciqualCache.findUnique({
        where: { ciqualId }
      });

      if (cached) {
        return {
          id: cached.ciqualId,
          name: cached.name,
          calories: cached.calories,
          carbs: cached.carbs,
          protein: cached.protein,
          fat: cached.fat
        };
      }

      // Sinon appeler l'API
      const response = await axios.get(`${this.baseUrl}/food/${ciqualId}`, {
        timeout: 5000
      });

      const food = await this.parseFood(response.data);
      
      if (food) {
        await this.cacheFood(food);
      }

      return food;
    } catch (error: any) {
      console.error('Erreur Ciqual getDetails:', error.message);
      return null;
    }
  }

  // Parser les données Ciqual
  private async parseFood(data: any): Promise<CiqualFood | null> {
    try {
      // Structure de l'API Ciqual
      const id = data.alim_code || data.id;
      const name = data.alim_nom_fr || data.name;
      
      // Extraire les valeurs nutritionnelles (pour 100g)
      const nutrients = data.constituents || data.nutrients || [];
      
      let calories = 0;
      let carbs = 0;
      let protein = 0;
      let fat = 0;

      // Codes des nutriments dans Ciqual
      nutrients.forEach((nutrient: any) => {
        const code = nutrient.const_code || nutrient.code;
        const value = parseFloat(nutrient.teneur || nutrient.value || 0);

        switch (code) {
          case '328': // Énergie (kcal)
            calories = value;
            break;
          case '31': // Glucides
            carbs = value;
            break;
          case '25': // Protéines
            protein = value;
            break;
          case '40': // Lipides
            fat = value;
            break;
        }
      });

      return {
        id,
        name,
        calories,
        carbs,
        protein,
        fat
      };
    } catch (error) {
      console.error('Erreur parsing Ciqual:', error);
      return null;
    }
  }

  // Mettre en cache un aliment
  private async cacheFood(food: CiqualFood): Promise<void> {
    try {
      await prisma.ciqualCache.upsert({
        where: { ciqualId: food.id },
        create: {
          ciqualId: food.id,
          name: food.name,
          calories: food.calories,
          carbs: food.carbs,
          protein: food.protein,
          fat: food.fat
        },
        update: {
          name: food.name,
          calories: food.calories,
          carbs: food.carbs,
          protein: food.protein,
          fat: food.fat,
          cachedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Erreur cache Ciqual:', error);
    }
  }

  // Rechercher dans le cache
  private async searchCache(query: string, limit: number): Promise<CiqualFood[]> {
    try {
      const results = await prisma.ciqualCache.findMany({
        where: {
          name: {
            contains: query,
            mode: 'insensitive'
          }
        },
        take: limit
      });

      return results.map(r => ({
        id: r.ciqualId,
        name: r.name,
        calories: r.calories,
        carbs: r.carbs,
        protein: r.protein,
        fat: r.fat
      }));
    } catch (error) {
      console.error('Erreur searchCache:', error);
      return [];
    }
  }

  // Aliments fréquents (base de données locale pour démarrage rapide)
  async getCommonFoods(): Promise<CiqualFood[]> {
    // Aliments français courants avec valeurs moyennes
    return [
      { id: 'pain_blanc', name: 'Pain blanc', calories: 265, carbs: 49, protein: 9, fat: 3.5 },
      { id: 'riz_blanc', name: 'Riz blanc cuit', calories: 130, carbs: 28, protein: 2.7, fat: 0.3 },
      { id: 'pates', name: 'Pâtes cuites', calories: 131, carbs: 25, protein: 5, fat: 1 },
      { id: 'pomme', name: 'Pomme', calories: 52, carbs: 14, protein: 0.3, fat: 0.2 },
      { id: 'banane', name: 'Banane', calories: 89, carbs: 23, protein: 1.1, fat: 0.3 },
      { id: 'poulet', name: 'Poulet (blanc)', calories: 165, carbs: 0, protein: 31, fat: 3.6 },
      { id: 'boeuf', name: 'Bœuf (steak)', calories: 250, carbs: 0, protein: 26, fat: 15 },
      { id: 'lait', name: 'Lait demi-écrémé', calories: 46, carbs: 4.8, protein: 3.2, fat: 1.5 },
      { id: 'yaourt', name: 'Yaourt nature', calories: 61, carbs: 4, protein: 3.5, fat: 3.3 },
      { id: 'fromage', name: 'Fromage (emmental)', calories: 382, carbs: 1.6, protein: 28, fat: 29 }
    ];
  }
}