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
