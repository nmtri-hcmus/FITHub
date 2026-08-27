import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
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

    // 2. Combine with Open Food Facts if USDA returned too few results
    const MIN_RESULTS = 10;
    if (results.length < MIN_RESULTS) {
      console.log(`USDA returned only ${results.length} results for "${query}". Fetching from OFF to combine.`);
      try {
        const offResults = await this.searchOFF(query);
        
        // Combine and deduplicate based on normalized brand + name
        const combined = [...results, ...offResults];
        const seen = new Set();
        
        results = combined.filter((item: any) => {
          const brandStr = item.brand ? item.brand.toLowerCase().trim() : '';
          const nameStr = item.name ? item.name.toLowerCase().trim() : '';
          const uniqueKey = `${brandStr}::${nameStr}`;
          
          if (seen.has(uniqueKey)) {
            return false; // Skip duplicates
          }
          seen.add(uniqueKey);
          return true;
        });
      } catch (err) {
        console.error('OFF search failed during combination:', err);
      }
    }

    // 3. Cache the results for 24 hours (86400 seconds)
    try {
      await redisClient.setEx(cacheKey, 86400, JSON.stringify(results));
    } catch (err) {
      console.warn('Redis cache write error:', err);
    }

    return results;
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
      const response = await axios.get(`https://us.openfoodfacts.org/cgi/search.pl`, {
        params: {
          search_terms: query,
          search_simple: 1,
          action: 'process',
          json: 1,
          page_size: 50   // Fetch more to compensate for quality filtering below
        },
        timeout: 5000, // 5 seconds timeout
        httpsAgent
      });

      if (!response.data || !response.data.products) {
        return [];
      }

      const results = response.data.products
        // Step 1: Filter out products with no name or incomplete nutritional data
        .filter((p: any) => {
          const name = (p.product_name || '').trim();
          // Must have a real name
          if (!name) return false;
          // Must have at least some caloric value (ignore condiments, spices, water, etc.)
          const kcal =
            p.nutriments?.['energy-kcal_100g'] ??
            p.nutriments?.['energy-kcal_serving'] ??
            0;
          if (kcal <= 0) return false;
          return true;
        })
        // Step 2: Map to our clean schema
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
   * Parses a nutrition label image using Gemini 1.5 Flash Vision.
   * Takes a buffer containing an image and returns the parsed macros.
   */
  async parseNutritionLabel(imageBuffer: Buffer) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured on the server.');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });

    const prompt = `You are a nutrition label parser. Analyze the provided food nutrition label image.
Extract the following information per serving:
- calories (number, kcal)
- protein (number, grams)
- carbs (number, total carbohydrates in grams)
- fat (number, total fat in grams)
- servingSize (string, e.g. "1 cup (240g)" or "30g")
- productName (string, the product name if visible on the label, otherwise null)

Return ONLY a valid JSON object with these exact keys. Do not include markdown, code blocks, or any extra text.
Example: {"calories":250,"protein":10,"carbs":30,"fat":8,"servingSize":"1 cup (240g)","productName":"Granola"}`;

    const base64Image = imageBuffer.toString('base64');

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Image,
        },
      },
    ]);

    const responseText = result.response.text().trim();

    // Strip any accidental markdown fences Gemini sometimes adds
    const cleaned = responseText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();

    let macros: any;
    try {
      macros = JSON.parse(cleaned);
    } catch {
      console.error('[OCR] Gemini returned non-JSON:', responseText);
      throw new Error('Could not parse nutrition data from the image. Please ensure the label is clear and well-lit.');
    }

    return {
      estimatedMacros: {
        calories: Number(macros.calories) || 0,
        protein: Number(macros.protein) || 0,
        carbs: Number(macros.carbs) || 0,
        fat: Number(macros.fat) || 0,
      },
      servingSize: macros.servingSize || null,
      productName: macros.productName || null,
    };
  }
};

