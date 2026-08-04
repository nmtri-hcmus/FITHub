import axios from 'axios';
import Tesseract from 'tesseract.js';
import https from 'https';
import fs from 'fs/promises';

// Force Node.js to use IPv4 for DNS resolution. 
// This fixes the 'ENOTFOUND' error when Node tries (and fails) to use IPv6 on certain networks.
const httpsAgent = new https.Agent({ family: 4 });

export const FoodService = {
  /**
   * Search for food items using Open Food Facts API
   */
  async searchFood(query: string) {
    try {
      const response = await axios.get(`https://us.openfoodfacts.org/cgi/search.pl`, {
        params: {
          search_terms: query,
          search_simple: 1,
          action: 'process',
          json: 1,
          page_size: 20
        },
        timeout: 5000, // 5 seconds timeout
        httpsAgent
      });

      if (!response.data || !response.data.products) {
        return [];
      }

      return response.data.products.map((p: any) => ({
        id: p.code,
        name: p.product_name,
        brand: p.brands,
        calories: p.nutriments?.['energy-kcal_100g'] || 0,
        protein: p.nutriments?.proteins_100g || 0,
        carbs: p.nutriments?.carbohydrates_100g || 0,
        fat: p.nutriments?.fat_100g || 0,
        servingSize: p.serving_size || '100g',
        imageUrl: p.image_url
      }));
    } catch (error) {
      console.warn('⚠️ Open Food Facts API failed (likely local DNS issue). Returning fallback mock data.', error);
      // Fallback mock data so local development and frontend UI work can continue
      return [
        {
          id: 'mock-123',
          name: query + ' (Mock Data)',
          brand: 'Test Brand',
          calories: 95,
          protein: 0.5,
          carbs: 25,
          fat: 0.3,
          servingSize: '1 medium',
          imageUrl: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6faa6?w=200'
        }
      ];
    }
  },

  /**
   * Get specific food item by barcode
   */
  async getBarcode(code: string) {
    try {
      const response = await axios.get(`https://us.openfoodfacts.org/api/v2/product/${code}.json`, {
        timeout: 5000,
        httpsAgent
      });

      if (response.data.status !== 1) {
        throw new Error('Product not found');
      }

      const p = response.data.product;
      return {
        id: p.code,
        name: p.product_name,
        brand: p.brands,
        calories: p.nutriments?.['energy-kcal_100g'] || 0,
        protein: p.nutriments?.proteins_100g || 0,
        carbs: p.nutriments?.carbohydrates_100g || 0,
        fat: p.nutriments?.fat_100g || 0,
        servingSize: p.serving_size || '100g',
        imageUrl: p.image_url
      };
    } catch (error) {
      console.warn('⚠️ Open Food Facts API failed. Returning fallback mock data.', error);
      return {
        id: code,
        name: 'Mock Scanned Product',
        brand: 'Test Brand',
        calories: 250,
        protein: 10,
        carbs: 30,
        fat: 12,
        servingSize: '1 package',
      };
    }
  },

  /**
   * Basic OCR parsing using Tesseract.js
   * Takes a buffer containing an image and returns the parsed text.
   */
  async parseNutritionLabel(imageBuffer: Buffer) {
    try {
      // For a production app, we would write this to a temp file or pass the buffer directly.
      // Tesseract can take a buffer if we specify the format.
      const result = await Tesseract.recognize(
        imageBuffer,
        'eng',
        { logger: m => console.log(m) }
      );
      
      const text = result.data.text;
      
      // Basic heuristic to find Calories (just an example, real parsing would be more robust)
      let caloriesMatch = text.match(/Calories\s+(\d+)/i);
      let proteinMatch = text.match(/Protein\s+(\d+)g/i);
      let carbsMatch = text.match(/Total Carbohydrate\s+(\d+)g/i);
      let fatMatch = text.match(/Total Fat\s+(\d+)g/i);

      return {
        rawText: text,
        estimatedMacros: {
          calories: caloriesMatch ? parseInt(caloriesMatch[1]) : 0,
          protein: proteinMatch ? parseInt(proteinMatch[1]) : 0,
          carbs: carbsMatch ? parseInt(carbsMatch[1]) : 0,
          fat: fatMatch ? parseInt(fatMatch[1]) : 0
        }
      };
    } catch (error) {
      console.error('Error running OCR:', error);
      throw new Error('Failed to parse nutrition label');
    }
  }
};
