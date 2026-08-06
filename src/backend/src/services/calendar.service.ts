import { prisma } from '../lib/prisma';
import { MealType } from '../generated/prisma/enums';

interface ScheduleEntryInput {
  userId: string;
  recipeId: string;
  date: string;       // YYYY-MM-DD
  mealType: MealType;
}

export const CalendarService = {
  /**
   * Schedule a recipe on the user's diet calendar for a specific date and meal slot.
   */
  async scheduleEntry(input: ScheduleEntryInput) {
    return prisma.dietCalendarEntry.create({
      data: {
        userId: input.userId,
        recipeId: input.recipeId,
        date: new Date(input.date),
        mealType: input.mealType,
      },
      include: {
        recipe: { include: { ingredients: true } },
      },
    });
  },

  /**
   * Get all scheduled entries for a specific week.
   * weekStr format: "YYYY-Www" (e.g., "2026-W32")
   */
  async getWeekEntries(userId: string, weekStr: string) {
    const { start, end } = parseWeek(weekStr);

    return prisma.dietCalendarEntry.findMany({
      where: {
        userId,
        date: { gte: start, lte: end },
      },
      include: {
        recipe: { include: { ingredients: true } },
      },
      orderBy: { date: 'asc' },
    });
  },

  /**
   * Delete a calendar entry. Only the owner can delete.
   */
  async deleteEntry(id: string, userId: string) {
    const entry = await prisma.dietCalendarEntry.findUnique({ where: { id } });
    if (!entry) throw new Error('Entry not found');
    if (entry.userId !== userId) throw new Error('Forbidden');

    return prisma.dietCalendarEntry.delete({ where: { id } });
  },

  /**
   * Generate a grocery list for a given week by aggregating all recipe ingredients.
   * Groups by ingredient name and sums up quantities.
   */
  async getGroceryList(userId: string, weekStr: string) {
    const { start, end } = parseWeek(weekStr);

    const entries = await prisma.dietCalendarEntry.findMany({
      where: {
        userId,
        date: { gte: start, lte: end },
      },
      include: {
        recipe: { include: { ingredients: true } },
      },
    });

    // Aggregate ingredients across all scheduled recipes for the week
    const groceryMap = new Map<string, string[]>();

    for (const entry of entries) {
      for (const ing of entry.recipe.ingredients) {
        const key = ing.ingredientName.toLowerCase();
        if (!groceryMap.has(key)) {
          groceryMap.set(key, []);
        }
        groceryMap.get(key)!.push(ing.quantity);
      }
    }

    // Convert map to a sorted array
    return Array.from(groceryMap.entries())
      .map(([ingredientName, quantities]) => ({
        ingredientName,
        quantities,
        totalOccurrences: quantities.length,
      }))
      .sort((a, b) => a.ingredientName.localeCompare(b.ingredientName));
  },
};

/**
 * Parse an ISO week string (e.g., "2026-W32") into start (Monday) and end (Sunday) dates.
 */
function parseWeek(weekStr: string): { start: Date; end: Date } {
  const match = weekStr.match(/^(\d{4})-W(\d{2})$/);
  if (!match) throw new Error('Invalid week format. Expected YYYY-Www (e.g. 2026-W32)');

  const year = parseInt(match[1]);
  const week = parseInt(match[2]);

  // ISO 8601: Week 1 contains January 4th
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7; // Convert Sunday=0 to 7
  const mondayOfWeek1 = new Date(jan4);
  mondayOfWeek1.setDate(jan4.getDate() - dayOfWeek + 1);

  const start = new Date(mondayOfWeek1);
  start.setDate(mondayOfWeek1.getDate() + (week - 1) * 7);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}
