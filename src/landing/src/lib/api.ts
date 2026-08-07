/**
 * FITHub API Client
 * Central helper for all HTTP calls to the Express backend.
 * Auto-attaches the JWT token and handles errors consistently.
 */

const API_BASE = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';

function getToken(): string | null {
  return localStorage.getItem('fithub_token');
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  // 204 No Content (e.g. DELETE) has no body — skip JSON parsing
  if (res.status === 204 || res.status === 205) {
    return undefined as T;
  }

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data as T;
}

// ── Auth endpoints ────────────────────────────────────────────────────────────

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export const api = {
  auth: {
    register: (email: string, password: string, name: string) =>
      request<AuthResponse>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, name }),
      }),

    login: (email: string, password: string) =>
      request<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
  },

  users: {
    me: () => request<UserProfile>('/api/users/me'),

    onboard: (data: OnboardPayload) =>
      request<BiometricsResponse>('/api/users/onboard', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },

  progress: {
    log: (bodyWeight: number, bodyFatPercent?: number, photoUrl?: string) =>
      request<ProgressLog>('/api/progress/log', {
        method: 'POST',
        body: JSON.stringify({ bodyWeight, bodyFatPercent, photoUrl }),
      }),

    history: () => request<ProgressLog[]>('/api/progress/history'),
  },

  food: {
    search: (q: string) => request<FoodSearchResult[]>(`/api/food/search?q=${encodeURIComponent(q)}`),
    barcode: (code: string) => request<FoodSearchResult>(`/api/food/barcode/${code}`),
  },

  meals: {
    log: (data: LogMealInput) =>
      request<MealLog>('/api/meals/log', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getDaily: (date: string) => request<MealLog[]>(`/api/meals/daily?date=${date}`),
    getDashboard: (date: string) => request<DailyDashboard>(`/api/meals/dashboard?date=${date}`),
    delete: (id: string) =>
      request(`/api/meals/${id}`, { method: 'DELETE' }),
  },

  recipes: {
    create: (data: CreateRecipeInput) =>
      request<Recipe>('/api/recipes', { method: 'POST', body: JSON.stringify(data) }),
    getApproved: () => request<Recipe[]>('/api/recipes/approved'),
    getMine: () => request<Recipe[]>('/api/recipes/mine'),
    getById: (id: string) => request<Recipe>(`/api/recipes/${id}`),
    update: (id: string, data: Partial<CreateRecipeInput>) =>
      request<Recipe>(`/api/recipes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/api/recipes/${id}`, { method: 'DELETE' }),
  },

  calendar: {
    schedule: (data: { recipeId: string; date: string; mealType: MealType }) =>
      request<DietCalendarEntry>('/api/calendar/entries', { method: 'POST', body: JSON.stringify(data) }),
    getWeek: (week: string) => request<DietCalendarEntry[]>(`/api/calendar?week=${week}`),
    deleteEntry: (id: string) => request(`/api/calendar/entries/${id}`, { method: 'DELETE' }),
    groceryList: (week: string) => request<GroceryItem[]>(`/api/calendar/grocery-list?week=${week}`),
  },

  ai: {
    generateRecipe: (data: { availableIngredients: string[]; date: string }) =>
      request<Recipe>('/api/ai/generate-recipe', { method: 'POST', body: JSON.stringify(data) }),
  },
};

// ── Types for API responses ───────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  biometrics: BiometricsResponse | null;
}

export interface BiometricsResponse {
  id: string;
  userId: string;
  height: number;
  weight: number;
  age: number;
  gender: string;
  activityLevel: string;
  goal: string;
  dailyCalories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface FoodSearchResult {
  id: string;
  name: string;
  brand?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: string;
  imageUrl?: string;
}

export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';

export interface LogMealInput {
  date: string;           // YYYY-MM-DD
  mealType: MealType;
  foodItemName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MealLog extends LogMealInput {
  id: string;
  userId: string;
  createdAt: string;
}

export interface MacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface DailyDashboard {
  date: string;
  consumed: MacroTotals;
  targets: MacroTotals | null;
  meals: MealLog[];
}

export interface ProgressLog {
  id: string;
  userId: string;
  bodyWeight: number;
  bodyFatPercent?: number;
  photoUrl?: string;
  date: string;
  createdAt: string;
}

// ── Enum mapping: frontend shorthand → backend Prisma enums ──────────────────

export type FrontendGender = 'male' | 'female' | 'other';
export type FrontendGoal = 'cut' | 'maintain' | 'bulk';
export type FrontendActivity = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export interface OnboardPayload {
  height: number;
  weight: number;
  age: number;
  gender: 'MALE' | 'FEMALE';
  activityLevel: 'SEDENTARY' | 'LIGHTLY_ACTIVE' | 'MODERATELY_ACTIVE' | 'VERY_ACTIVE' | 'EXTRA_ACTIVE';
  goal: 'LOSE_WEIGHT' | 'MAINTAIN' | 'BUILD_MUSCLE';
}

export function mapGender(g: FrontendGender): OnboardPayload['gender'] {
  // 'other' maps to MALE as a neutral fallback (backend only has MALE/FEMALE)
  return g === 'female' ? 'FEMALE' : 'MALE';
}

export function mapGoal(g: FrontendGoal): OnboardPayload['goal'] {
  const map: Record<FrontendGoal, OnboardPayload['goal']> = {
    cut: 'LOSE_WEIGHT',
    maintain: 'MAINTAIN',
    bulk: 'BUILD_MUSCLE',
  };
  return map[g];
}

export function mapActivity(a: FrontendActivity): OnboardPayload['activityLevel'] {
  const map: Record<FrontendActivity, OnboardPayload['activityLevel']> = {
    sedentary: 'SEDENTARY',
    light: 'LIGHTLY_ACTIVE',
    moderate: 'MODERATELY_ACTIVE',
    active: 'VERY_ACTIVE',
    very_active: 'EXTRA_ACTIVE',
  };
  return map[a];
}

// ── Recipe types ──────────────────────────────────────────────────────────────

export type RecipeStatus = 'PRIVATE' | 'PENDING' | 'APPROVED';

export interface RecipeIngredient {
  id: string;
  recipeId: string;
  ingredientName: string;
  quantity: string;
}

export interface Recipe {
  id: string;
  userId: string;
  recipeName: string;
  instructions: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  status: RecipeStatus;
  createdAt: string;
  updatedAt: string;
  ingredients: RecipeIngredient[];
  user?: { id: string; name: string };
}

export interface CreateRecipeInput {
  recipeName: string;
  instructions: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: { ingredientName: string; quantity: string }[];
  status?: 'PRIVATE' | 'PENDING';
}

// ── Calendar types ────────────────────────────────────────────────────────────

export interface DietCalendarEntry {
  id: string;
  userId: string;
  recipeId: string;
  date: string;
  mealType: MealType;
  createdAt: string;
  recipe: Recipe;
}

export interface GroceryItem {
  ingredientName: string;
  quantities: string[];
  totalOccurrences: number;
}

// ── Calendar helpers ──────────────────────────────────────────────────────────

/** Returns the ISO week string (e.g. "2026-W32") for any given Date */
export function getISOWeek(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

/** Returns the Monday Date of a given ISO week string */
export function getMondayOfWeek(weekStr: string): Date {
  const [yearStr, wStr] = weekStr.split('-W');
  const year = parseInt(yearStr);
  const week = parseInt(wStr);
  const jan4 = new Date(year, 0, 4);
  const dow = jan4.getDay() || 7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - dow + 1 + (week - 1) * 7);
  return monday;
}
