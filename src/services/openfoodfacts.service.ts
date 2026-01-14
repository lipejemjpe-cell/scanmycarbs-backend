import axios from 'axios';

interface OpenFoodFactsFood {
  id: string;
  name: string;
  brand?: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  barcode?: string;
}

export class OpenFoodFactsService {
  private baseUrl = 'https://world.openfoodfacts.org/api/v2';
  
  // Rechercher un produit
  async search(query: string, limit: number = 10): Promise<OpenFoodFactsFood[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/search`, {
        params: {
          search_terms: query,
          page_size: limit,
          fields: 'code,product_name,brands,nutriments',
          countries_tags_fr: 'france', // Priorité France
          json: 1
        },
        timeout: 5000,
        headers: {
          'User-Agent': 'ScanMyCarbs/1.0'
        }
      });

      const foods: OpenFoodFactsFood[] = [];

      if (response.data && response.data.products) {
        for (const product of response.data.products) {
          const food = this.parseProduct(product);
          if (food) {
            foods.push(food);
          }
        }
      }

      return foods;
    } catch (error: any) {
      console.error('Erreur OpenFoodFacts search:', error.message);
      return [];
    }
  }

  // Obtenir un produit par code-barre
  async getByBarcode(barcode: string): Promise<OpenFoodFactsFood | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/product/${barcode}`, {
        params: {
          fields: 'code,product_name,brands,nutriments'
        },
        timeout: 5000,
        headers: {
          'User-Agent': 'ScanMyCarbs/1.0'
        }
      });

      if (response.data && response.data.product) {
        return this.parseProduct(response.data.product);
      }

      return null;
    } catch (error: any) {
      console.error('Erreur OpenFoodFacts getByBarcode:', error.message);
      return null;
    }
  }

  // Obtenir les détails d'un produit
  async getDetails(productId: string): Promise<OpenFoodFactsFood | null> {
    return await this.getByBarcode(productId);
  }

  // Parser un produit OpenFoodFacts
  private parseProduct(product: any): OpenFoodFactsFood | null {
    try {
      const code = product.code || product._id;
      const name = product.product_name || product.product_name_fr || 'Produit sans nom';
      const brand = product.brands || undefined;
      
      const nutriments = product.nutriments || {};

      // Extraire les valeurs pour 100g
      const calories = parseFloat(nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || 0);
      const carbs = parseFloat(nutriments['carbohydrates_100g'] || nutriments['carbohydrates'] || 0);
      const protein = parseFloat(nutriments['proteins_100g'] || nutriments['proteins'] || 0);
      const fat = parseFloat(nutriments['fat_100g'] || nutriments['fat'] || 0);

      // Ne retourner que si on a au moins le nom et une valeur nutritionnelle
      if (!name || (calories === 0 && carbs === 0 && protein === 0 && fat === 0)) {
        return null;
      }

      return {
        id: code,
        name: brand ? `${name} - ${brand}` : name,
        brand,
        calories,
        carbs,
        protein,
        fat,
        barcode: code
      };
    } catch (error) {
      console.error('Erreur parsing OpenFoodFacts:', error);
      return null;
    }
  }

  // Recherche avancée avec filtres
  async searchAdvanced(query: string, options: {
    brands?: string;
    categories?: string;
    labels?: string;
  } = {}): Promise<OpenFoodFactsFood[]> {
    try {
      const params: any = {
        search_terms: query,
        page_size: 20,
        fields: 'code,product_name,brands,nutriments',
        json: 1
      };

      if (options.brands) params.brands_tags = options.brands;
      if (options.categories) params.categories_tags = options.categories;
      if (options.labels) params.labels_tags = options.labels;

      const response = await axios.get(`${this.baseUrl}/search`, {
        params,
        timeout: 5000,
        headers: {
          'User-Agent': 'ScanMyCarbs/1.0'
        }
      });

      const foods: OpenFoodFactsFood[] = [];

      if (response.data && response.data.products) {
        for (const product of response.data.products) {
          const food = this.parseProduct(product);
          if (food) {
            foods.push(food);
          }
        }
      }

      return foods;
    } catch (error: any) {
      console.error('Erreur OpenFoodFacts searchAdvanced:', error.message);
      return [];
    }
  }

  // Vérifier si l'API est disponible
  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/search`, {
        params: { search_terms: 'test', page_size: 1 },
        timeout: 3000,
        headers: {
          'User-Agent': 'ScanMyCarbs/1.0'
        }
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}