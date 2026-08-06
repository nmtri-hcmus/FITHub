import { Router } from 'express';
import { CalendarController } from '../controllers/calendar.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

// All calendar routes require authentication
router.post('/entries', requireAuth, CalendarController.schedule);
router.get('/', requireAuth, CalendarController.getWeek);
router.delete('/entries/:id', requireAuth, CalendarController.deleteEntry);
router.get('/grocery-list', requireAuth, CalendarController.groceryList);

export default router;
