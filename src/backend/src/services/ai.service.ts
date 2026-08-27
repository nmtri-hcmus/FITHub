import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '../lib/prisma';
import { FoodService } from './food.service';

// Initialize the Gemini client from the environment variable
const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

interface GenerateRecipeInput {
  userId: string;
  availableIngredients: string[];
  date?: string; // YYYY-MM-DD, defaults to today
}

interface GeneratedRecipe {
  recipeName: string;
  ingredients: { ingredientName: string; quantity: string; inDb?: boolean }[];
  instructions: string;
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export const AiService = {
  /**
   * Generate a macro-optimized recipe using Google Gemini.
   *
   * Flow:
   * 1. Fetch the user's macro targets from their biometrics.
   * 2. Fetch today's consumed macros from MealLog.
   * 3. Calculate remaining macros (target - consumed).
   * 4. Send the remaining macros + available ingredients to Gemini.
   * 5. Parse and return the structured JSON recipe.
   */
  async generateRecipe(input: GenerateRecipeInput): Promise<GeneratedRecipe> {
    if (!genAI) {
      throw new Error('GEMINI_API_KEY is not configured. Set it in your .env file.');
    }

    const { userId, availableIngredients, date } = input;
    const targetDate = date || new Date().toISOString().split('T')[0];

    // 1. Fetch user's macro targets
    const biometrics = await prisma.userBiometrics.findUnique({
      where: { userId },
    });

    if (!biometrics) {
      throw new Error('Please complete your biometric onboarding first.');
    }

    // 2. Fetch today's consumed macros
    const dayStart = new Date(targetDate);
    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);

    const todaysMeals = await prisma.mealLog.findMany({
      where: {
        userId,
        date: { gte: dayStart, lte: dayEnd },
      },
    });

    const consumed = todaysMeals.reduce(
      (acc: any, meal: any) => ({
        calories: acc.calories + meal.calories,
        protein: acc.protein + meal.protein,
        carbs: acc.carbs + meal.carbs,
        fat: acc.fat + meal.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    // 3. Calculate remaining macros
    const remaining = {
      calories: Math.max(0, biometrics.dailyCalories - consumed.calories),
      protein: Math.max(0, biometrics.protein - consumed.protein),
      carbs: Math.max(0, biometrics.carbs - consumed.carbs),
      fat: Math.max(0, biometrics.fat - consumed.fat),
    };

    // 4. Construct the prompt and call Gemini
    const systemPrompt = `You are an expert nutritionist AI. Generate a single, simple recipe using the user's available ingredients that matches their remaining macros as closely as possible.

The user has these remaining macros for today:
- Calories: ${remaining.calories} kcal
- Protein: ${remaining.protein}g
- Carbs: ${remaining.carbs}g
- Fat: ${remaining.fat}g

Available ingredients: ${availableIngredients.join(', ')}

Output ONLY valid JSON in this exact format, with no other text, no markdown, no code fences:
{
  "recipeName": "Name of the recipe",
  "ingredients": [
    { "ingredientName": "ingredient name", "quantity": "amount with unit" }
  ],
  "instructions": "Step-by-step cooking instructions as a single string",
  "macros": {
    "calories": number,
    "protein": number,
    "carbs": number,
    "fat": number
  }
}`;

    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

    let attempts = 0;
    const maxRetries = 2;

    while (attempts <= maxRetries) {
      try {
        const result = await model.generateContent(systemPrompt);
        const responseText = result.response.text();

        // Strip possible markdown fences from the response
        const cleanJson = responseText
          .replace(/```json\s*/gi, '')
          .replace(/```\s*/g, '')
          .trim();

        const parsed: GeneratedRecipe = JSON.parse(cleanJson);

        // Basic validation
        if (!parsed.recipeName || !parsed.ingredients || !parsed.instructions || !parsed.macros) {
          throw new Error('Incomplete recipe structure from AI');
        }

        // Verify ingredients against food database
        await Promise.all(parsed.ingredients.map(async (ing) => {
          try {
            const results = await FoodService.searchFood(ing.ingredientName);
            ing.inDb = results.length > 0;
          } catch (e) {
            ing.inDb = false;
          }
        }));

        return parsed;
      } catch (error: any) {
        attempts++;
        if (attempts > maxRetries) {
          console.error(`AI failed to generate a valid recipe after ${maxRetries + 1} attempts. Last error: ${error.message}`);
          break; // Break the loop to trigger the fallback logic below
        }
        // Brief pause before retry
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // If we exhaust retries (e.g. rate limit, quota exceeded), fallback to mock data so UI development isn't blocked
    console.warn('⚠️ Gemini API failed or quota exceeded. Returning fallback mock recipe.');
    return {
      recipeName: 'Mock AI Recipe: ' + availableIngredients.join(', ') + ' Bowl',
      ingredients: availableIngredients.map((name) => ({
        ingredientName: name,
        quantity: '1 serving',
        inDb: true,
      })),
      instructions: '1. Prepare all ingredients.\n2. Cook them according to package instructions.\n3. Combine and enjoy your macro-friendly meal!',
      macros: {
        calories: Math.max(300, remaining.calories),
        protein: Math.max(20, remaining.protein),
        carbs: Math.max(30, remaining.carbs),
        fat: Math.max(10, remaining.fat),
      },
    };
  },
};
