import { Request, Response } from 'express';
import { FoodService } from '../services/food.service';

export const FoodController = {
  async search(req: Request, res: Response) {
    const q = req.query.q as string;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }
    try {
      const results = await FoodService.searchFood(q.trim());
      return res.json(results);
    } catch (error: any) {
      return res.status(503).json({ error: error.message || 'Food search service unavailable' });
    }
  },

  async barcode(req: Request, res: Response) {
    const code = req.params.code as string;
    if (!code) {
      return res.status(400).json({ error: 'Barcode is required' });
    }
    try {
      const result = await FoodService.getBarcode(code);
      return res.json(result);
    } catch (error: any) {
      return res.status(404).json({ error: error.message || 'Product not found' });
    }
  },

  async ocr(req: Request, res: Response) {
    // Expect image file as multipart/form-data upload
    // In production, use multer middleware to handle the upload
    // For now we handle as raw buffer from base64 body
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }
    try {
      const buffer = Buffer.from(imageBase64, 'base64');
      const result = await FoodService.parseNutritionLabel(buffer);
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'OCR processing failed' });
    }
  },
};
