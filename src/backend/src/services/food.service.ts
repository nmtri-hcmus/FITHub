import axios from 'axios';
import Tesseract from 'tesseract.js';
import https from 'https';
import fs from 'fs/promises';
import { createClient } from 'redis';

const redisClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
redisClient.on('error', (err: any) => console.error('Redis Client Error:', err));
redisClient.connect().catch(console.error);

// Optional: Map USDA nutrient IDs or names to our macro fields.
// Energy (kcal), Protein (g), Carbohydrate (g), Total lipid (fat) (g)
const extractUSDAMacro = (nutrients: any[], nameRegex: RegExp) => {
  const nutrient = nutrients.find(n => nameRegex.test(n.nutrientName));
  return nutrient ? nutrient.value : 0;
};

// Force Node.js to use IPv4 for DNS resolution. 
// This fixes the 'ENOTFOUND' error when Node tries (and fails) to use IPv6 on certain networks.
const httpsAgent = new https.Agent({ family: 4 });

export const FoodService = {
  /**
   * Primary entry point for searching foods (Autocomplete).
   * 1. Checks Redis cache.
   * 2. Queries USDA.
   * 3. Falls back to OFF if USDA is empty.
   */
  async searchFood(query: string) {
    const cacheKey = `food_search:${query.toLowerCase()}`;
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err) {
      console.warn('Redis cache read error:', err);
    }

    let results = [];
    
    // 1. Query USDA First
    try {
      results = await this.searchUSDA(query);
    } catch (err) {
      console.error('USDA search failed:', err);
    }

    // 2. Fallback: If USDA returns 0 results, fall back to OFF.
    if (results.length === 0) {
      console.log(`USDA returned 0 results for "${query}". Fetching from OFF as fallback.`);
      try {
        const offResults = await this.searchOFF(query);
        results = offResults;
      } catch (err) {
        console.error('OFF search failed during fallback:', err);
      }
    }

    // 3. Re-rank results by relevance to query
    results = this.rankResults(results, query);

    // 4. Cache the results for 24 hours (86400 seconds)
    try {
      await redisClient.setEx(cacheKey, 86400, JSON.stringify(results));
    } catch (err) {
      console.warn('Redis cache write error:', err);
    }

    return results;
  },

  /**
   * Relevance ranking: score each result so the most relevant items appear first.
   * Priority (highest to lowest):
   *  1. Exact name match (case-insensitive)
   *  2. Name starts with the query
   *  3. Every query word appears in the name
   *  4. At least one query word appears in the name
   *  5. Query appears in brand name
   */
  rankResults(results: any[], query: string): any[] {
    const q = query.toLowerCase().trim();
    const words = q.split(/\s+/).filter(Boolean);

    const score = (item: any): number => {
      const name = (item.name || '').toLowerCase();
      const brand = (item.brand || '').toLowerCase();

      if (name === q) return 100;                              // exact match
      if (name.startsWith(q)) return 90;                      // starts with full query
      if (words.length > 1 && words.every(w => name.includes(w))) return 80; // all words present
      if (words.some(w => name.startsWith(w))) return 70;     // name starts with any query word
      if (words.every(w => name.includes(w) || brand.includes(w))) return 60; // all words somewhere
      if (words.some(w => name.includes(w))) return 40;       // partial match
      if (brand.includes(q)) return 20;                       // brand match only
      return 0;
    };

    return [...results].sort((a, b) => score(b) - score(a));
  },

  /**
   * Search USDA FoodData Central
   */
  async searchUSDA(query: string) {
    if (!process.env.USDA_API_KEY) {
      console.warn('No USDA_API_KEY provided. Skipping USDA search.');
      return [];
    }

    const response = await axios.get('https://api.nal.usda.gov/fdc/v1/foods/search', {
      params: {
        api_key: process.env.USDA_API_KEY,
        query,
        dataType: 'Foundation,SR Legacy,Branded',
        pageSize: 50
      },
      timeout: 5000,
      httpsAgent
    });

    if (!response.data || !response.data.foods) {
      return [];
    }

    return response.data.foods
      .filter((f: any) => {
        // Basic filtering to ensure we have valid macros
        const kcal = extractUSDAMacro(f.foodNutrients || [], /Energy/i);
        return kcal > 0;
      })
      .map((f: any) => ({
        id: `usda-${f.fdcId}`,
        name: f.description,
        brand: f.brandOwner || undefined,
        calories: extractUSDAMacro(f.foodNutrients || [], /Energy/i),
        protein: extractUSDAMacro(f.foodNutrients || [], /Protein/i),
        carbs: extractUSDAMacro(f.foodNutrients || [], /Carbohydrate/i),
        fat: extractUSDAMacro(f.foodNutrients || [], /Total lipid/i),
        servingSize: f.servingSize ? `${f.servingSize}${f.servingSizeUnit}` : '100g',
        imageUrl: undefined // USDA doesn't provide standard images
      }));
  },

  /**
   * Search for food items using Open Food Facts API (Fallback)
   */
  async searchOFF(query: string) {
    try {
      // Use world.openfoodfacts.org — more stable than regional US endpoint
      const response = await axios.get(`https://world.openfoodfacts.org/cgi/search.pl`, {
        params: {
          search_terms: query,
          search_simple: 1,
          action: 'process',
          json: 1,
          page_size: 50
        },
        timeout: 8000, // Increased to 8 seconds
        httpsAgent
      });

      if (!response.data || !response.data.products) {
        return [];
      }

      const results = response.data.products
        // Filter out products with no name or zero calories
        .filter((p: any) => {
          const name = (p.product_name || '').trim();
          if (!name) return false;
          const kcal =
            p.nutriments?.['energy-kcal_100g'] ??
            p.nutriments?.['energy-kcal_serving'] ??
            0;
          if (kcal <= 0) return false;
          return true;
        })
        .map((p: any) => ({
          id: p.code,
          name: p.product_name.trim(),
          brand: p.brands || undefined,
          calories:
            p.nutriments?.['energy-kcal_100g'] ??
            p.nutriments?.['energy-kcal_serving'] ??
            0,
          protein: p.nutriments?.proteins_100g ?? 0,
          carbs: p.nutriments?.carbohydrates_100g ?? 0,
          fat: p.nutriments?.fat_100g ?? 0,
          servingSize: p.serving_size || '100g',
          imageUrl: p.image_url || undefined,
        }));

      return results;
    } catch (error: any) {
      // Log and return empty — never return fake mock data to users
      console.warn('⚠️ Open Food Facts API failed:', error?.message || error);
      return [];
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
