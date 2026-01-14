import {ClarifaiStub, grpc} from 'clarifai-nodejs-grpc';
import {CiqualService} from './ciqual.service';

const ciqualService = new CiqualService();

export class ImageRecognitionService {
  private stub: any;

  constructor() {
    this.stub = ClarifaiStub.grpc();
    const metadata = new grpc.Metadata();
    metadata.set('authorization', `Key ${process.env.CLARIFAI_API_KEY}`);
    this.stub.metadata = metadata;
  }

  async analyzeFoodImage(imageBase64: string): Promise<{
    foods: Array<{
      name: string;
      quantity: number;
      carbs: number;
      calories: number;
    }>;
    totalCarbs: number;
    totalCalories: number;
  }> {
    try {
      const response = await this.stub.PostModelOutputs({
        model_id: 'food-item-recognition',
        inputs: [{data: {image: {base64: imageBase64}}}],
      });

      const concepts = response.outputs[0].data.concepts;
      const detectedFoods = [];

      // Prendre les 5 aliments les plus probables
      for (const concept of concepts.slice(0, 5)) {
        if (concept.value > 0.5) {
          // Confiance > 50%
          detectedFoods.push({
            name: concept.name,
            quantity: 100, // Par défaut 100g, à ajuster
          });
        }
      }

      // Enrichir avec CIQUAL
      const enrichedFoods = [];
      let totalCarbs = 0;
      let totalCalories = 0;

      for (const food of detectedFoods) {
        const ciqualResults = await ciqualService.search(food.name, 1);

        if (ciqualResults.length > 0) {
          const ciqualFood = ciqualResults[0];
          const quantity = food.quantity;

          const carbsForQuantity = (ciqualFood.carbs * quantity) / 100;
          const caloriesForQuantity = (ciqualFood.calories * quantity) / 100;

          enrichedFoods.push({
            name: ciqualFood.name,
            quantity,
            carbs: Math.round(carbsForQuantity * 10) / 10,
            calories: Math.round(caloriesForQuantity),
          });

          totalCarbs += carbsForQuantity;
          totalCalories += caloriesForQuantity;
        }
      }

      return {
        foods: enrichedFoods,
        totalCarbs: Math.round(totalCarbs * 10) / 10,
        totalCalories: Math.round(totalCalories),
      };
    } catch (error: any) {
      console.error('Erreur Clarifai:', error);
      throw new Error(`Échec analyse: ${error.message}`);
    }
  }
}
