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

  coaches: {
    getRecommendations: async (filters: { goal?: string; maxPrice?: number }): Promise<CoachProfile[]> => {
      await new Promise(r => setTimeout(r, 500));
      let coaches = [...MOCK_COACHES];
      if (filters.goal) {
        coaches = coaches.filter(c => c.specialization === filters.goal);
      }
      if (filters.maxPrice) {
        coaches = coaches.filter(c => c.price <= filters.maxPrice!);
      }
      return coaches;
    },
    getProfile: async (id: string): Promise<CoachProfile> => {
      await new Promise(r => setTimeout(r, 300));
      const coach = MOCK_COACHES.find(c => c.id === id);
      if (!coach) throw new Error('Coach not found');
      return coach;
    },
    getReviews: async (coachId: string): Promise<CoachReview[]> => {
      await new Promise(r => setTimeout(r, 300));
      const stored = localStorage.getItem(`fithub_reviews_${coachId}`);
      if (stored) return JSON.parse(stored);
      return [
        { id: '1', coachId, traineeName: 'Alex D.', rating: 5, comment: 'Amazing coach! Really helped me hit my macros.', date: '2026-07-15' },
        { id: '2', coachId, traineeName: 'Sam T.', rating: 4, comment: 'Great communication and solid routines.', date: '2026-08-01' }
      ];
    },
    addReview: async (coachId: string, rating: number, comment: string): Promise<void> => {
      await new Promise(r => setTimeout(r, 500));
      const reviews = await api.coaches.getReviews(coachId);
      reviews.unshift({
        id: Math.random().toString(),
        coachId,
        traineeName: 'You',
        rating,
        comment,
        date: new Date().toISOString().split('T')[0]
      });
      localStorage.setItem(`fithub_reviews_${coachId}`, JSON.stringify(reviews));
    },
    checkSubscription: async (coachId: string): Promise<boolean> => {
      const subs = JSON.parse(localStorage.getItem('fithub_subs') || '[]');
      return subs.some((s: CoachingSubscription) => s.coachId === coachId);
    },
    subscribe: async (coachId: string, tier: string, payment: any): Promise<void> => {
      await new Promise(r => setTimeout(r, 1500));
      if (payment.cardNumber?.startsWith('4000')) throw new Error('Card declined for testing purposes.');
      const subs = JSON.parse(localStorage.getItem('fithub_subs') || '[]');
      subs.push({ coachId, tier, pricePaid: payment.amount, date: new Date().toISOString() });
      localStorage.setItem('fithub_subs', JSON.stringify(subs));
    },
    bookConsultation: async (coachId: string): Promise<void> => {
      await new Promise(r => setTimeout(r, 800));
    }
  },

  coaching: {
    getClients: async (): Promise<ClientProfile[]> => {
      await new Promise(r => setTimeout(r, 500));
      const stored = localStorage.getItem('fithub_coaching_clients');
      if (stored) return JSON.parse(stored);
      
      const defaultClients: ClientProfile[] = [
        {
          userId: 'user_alex',
          name: 'Alex Johnson',
          goal: 'LOSE_WEIGHT',
          biometrics: { height: 175, weight: 82, targetWeight: 75, dailyCalories: 1800, protein: 140, carbs: 160, fat: 60 },
          weightLogs: [
            { date: '2026-08-01', weight: 84.5 },
            { date: '2026-08-04', weight: 83.8 },
            { date: '2026-08-07', weight: 83.0 },
            { date: '2026-08-10', weight: 82.5 },
            { date: '2026-08-13', weight: 82.0 },
          ],
          macroAdherence: [
            { date: '2026-08-11', consumed: 1750, target: 1800 },
            { date: '2026-08-12', consumed: 1820, target: 1800 },
            { date: '2026-08-13', consumed: 1200, target: 1800 }, // low adherence day
            { date: '2026-08-14', consumed: 1780, target: 1800 },
          ],
          adherenceScore: 78
        },
        {
          userId: 'user_sarah_client',
          name: 'Sarah Connor',
          goal: 'BUILD_MUSCLE',
          biometrics: { height: 168, weight: 58, targetWeight: 62, dailyCalories: 2200, protein: 120, carbs: 250, fat: 80 },
          weightLogs: [
            { date: '2026-08-01', weight: 57.5 },
            { date: '2026-08-07', weight: 58.0 },
          ],
          macroAdherence: [
            { date: '2026-08-12', consumed: 2150, target: 2200 },
            { date: '2026-08-13', consumed: 2210, target: 2200 },
            { date: '2026-08-14', consumed: 2190, target: 2200 },
          ],
          adherenceScore: 95
        },
        {
          userId: 'user_low_adherence',
          name: 'John Doe (Stub)',
          goal: 'LOSE_WEIGHT',
          biometrics: { height: 180, weight: 95, targetWeight: 85, dailyCalories: 2000, protein: 150, carbs: 200, fat: 70 },
          weightLogs: [
            { date: '2026-08-01', weight: 96.0 },
            { date: '2026-08-10', weight: 95.0 },
          ],
          macroAdherence: [
            { date: '2026-08-12', consumed: 900, target: 2000 },
            { date: '2026-08-13', consumed: 800, target: 2000 },
            { date: '2026-08-14', consumed: 950, target: 2000 },
          ],
          adherenceScore: 40 // Triggers low adherence red badge
        }
      ];
      localStorage.setItem('fithub_coaching_clients', JSON.stringify(defaultClients));
      return defaultClients;
    },

    assignPlan: async (clientUserId: string, date: string, workout: string, mealInstructions: string): Promise<CoachingPlan> => {
      await new Promise(r => setTimeout(r, 600));
      const plans = JSON.parse(localStorage.getItem(`fithub_coaching_plans_${clientUserId}`) || '[]');
      
      const existingIdx = plans.findIndex((p: CoachingPlan) => p.date === date);
      const newPlan = { date, workout, mealInstructions };
      
      if (existingIdx > -1) {
        // Will be controlled via option override in UI
        plans[existingIdx] = newPlan;
      } else {
        plans.push(newPlan);
      }
      
      localStorage.setItem(`fithub_coaching_plans_${clientUserId}`, JSON.stringify(plans));
      return newPlan;
    },

    getAssignedPlans: async (clientUserId: string): Promise<CoachingPlan[]> => {
      await new Promise(r => setTimeout(r, 300));
      return JSON.parse(localStorage.getItem(`fithub_coaching_plans_${clientUserId}`) || '[]');
    },

    updateCalorieTarget: async (clientUserId: string, targetCalories: number): Promise<void> => {
      await new Promise(r => setTimeout(r, 500));
      const clients = await api.coaching.getClients();
      const client = clients.find(c => c.userId === clientUserId);
      if (client) {
        client.biometrics.dailyCalories = targetCalories;
        localStorage.setItem('fithub_coaching_clients', JSON.stringify(clients));
      }
    },

    sendMessage: async (recipientId: string, text: string, videoUrl?: string, videoDuration?: number): Promise<CoachingMessage> => {
      await new Promise(r => setTimeout(r, 400));
      const messages = JSON.parse(localStorage.getItem(`fithub_chat_${recipientId}`) || '[]');
      const newMsg: CoachingMessage = {
        id: Math.random().toString(),
        senderId: 'me',
        recipientId,
        text,
        videoUrl,
        videoDuration,
        createdAt: new Date().toISOString(),
        feedbackNotes: []
      };
      messages.push(newMsg);
      localStorage.setItem(`fithub_chat_${recipientId}`, JSON.stringify(messages));
      return newMsg;
    },

    getMessages: async (partnerId: string): Promise<CoachingMessage[]> => {
      await new Promise(r => setTimeout(r, 200));
      const stored = localStorage.getItem(`fithub_chat_${partnerId}`);
      if (stored) return JSON.parse(stored);
      
      // Default welcome chat content
      const defaults: CoachingMessage[] = [
        {
          id: 'w1',
          senderId: partnerId,
          recipientId: 'me',
          text: 'Hello! I am excited to work together on your fitness journey. Let me know if you have any questions or upload a workout form-check video anytime!',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          feedbackNotes: []
        }
      ];
      localStorage.setItem(`fithub_chat_${partnerId}`, JSON.stringify(defaults));
      return defaults;
    },

    addVideoFeedback: async (partnerId: string, messageId: string, timestamp: number, note: string): Promise<void> => {
      await new Promise(r => setTimeout(r, 400));
      const messages = await api.coaching.getMessages(partnerId);
      const msg = messages.find(m => m.id === messageId);
      if (msg) {
        if (!msg.feedbackNotes) msg.feedbackNotes = [];
        msg.feedbackNotes.push({ id: Math.random().toString(), timestamp, note });
        localStorage.setItem(`fithub_chat_${partnerId}`, JSON.stringify(messages));
      }
    }
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

// ── Coach Types & Mock Data ───────────────────────────────────────────────────

export interface CoachProfile {
  id: string;
  name: string;
  specialization: string; // e.g. LOSE_WEIGHT, BUILD_MUSCLE, MAINTAIN
  bio: string;
  price: number;
  rating: number;
  certifications: string[];
  experienceYrs: number;
  imageUrl: string;
}

export interface CoachReview {
  id: string;
  coachId: string;
  traineeName: string;
  rating: number;
  comment: string;
  date: string;
}

export interface CoachingSubscription {
  coachId: string;
  tier: string;
  pricePaid: number;
  date: string;
}

export const MOCK_COACHES: CoachProfile[] = [
  {
    id: 'coach_1',
    name: 'Sarah Jenkins',
    specialization: 'LOSE_WEIGHT',
    bio: 'Certified nutritionist and personal trainer specializing in sustainable fat loss and healthy habit building.',
    price: 150,
    rating: 4.9,
    certifications: ['NASM CPT', 'Precision Nutrition L1'],
    experienceYrs: 7,
    imageUrl: 'https://i.pravatar.cc/150?u=sarahj'
  },
  {
    id: 'coach_2',
    name: 'Marcus Thorne',
    specialization: 'BUILD_MUSCLE',
    bio: 'Former competitive bodybuilder. I help clients pack on lean mass with scientifically backed hypertrophy programming.',
    price: 200,
    rating: 4.8,
    certifications: ['ISSA Strength & Conditioning', 'CSCS'],
    experienceYrs: 10,
    imageUrl: 'https://i.pravatar.cc/150?u=marcust'
  },
  {
    id: 'coach_3',
    name: 'Elena Rodriguez',
    specialization: 'MAINTAIN',
    bio: 'Focusing on athletic performance, mobility, and long-term metabolic health for active individuals.',
    price: 120,
    rating: 4.7,
    certifications: ['ACE Personal Trainer', 'CrossFit L2'],
    experienceYrs: 5,
    imageUrl: 'https://i.pravatar.cc/150?u=elenar'
  },
  {
    id: 'coach_4',
    name: 'David Kim',
    specialization: 'LOSE_WEIGHT',
    bio: 'Helping busy professionals lose weight efficiently without giving up their favorite foods.',
    price: 90,
    rating: 4.6,
    certifications: ['NASM Weight Loss Specialist'],
    experienceYrs: 4,
    imageUrl: 'https://i.pravatar.cc/150?u=davidk'
  },
  {
    id: 'coach_5',
    name: 'Jessica Alba', // Using a generic name
    specialization: 'BUILD_MUSCLE',
    bio: 'Empowering women to lift heavy and build strong, resilient bodies.',
    price: 175,
    rating: 5.0,
    certifications: ['NSCA-CPT', 'USA Weightlifting L1'],
    experienceYrs: 8,
    imageUrl: 'https://i.pravatar.cc/150?u=jessica'
  }
];

// ── 1-on-1 Coaching Portal Types ───────────────────────────────────────────────

export interface ClientProfile {
  userId: string;
  name: string;
  goal: string;
  biometrics: {
    height: number;
    weight: number;
    targetWeight: number;
    dailyCalories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  weightLogs: { date: string; weight: number }[];
  macroAdherence: { date: string; consumed: number; target: number }[];
  adherenceScore: number;
}

export interface CoachingPlan {
  date: string; // YYYY-MM-DD
  workout: string;
  mealInstructions: string;
}

export interface CoachingVideoFeedback {
  id: string;
  timestamp: number; // in seconds
  note: string;
}

export interface CoachingMessage {
  id: string;
  senderId: string;
  recipientId: string;
  text: string;
  videoUrl?: string;
  videoDuration?: number; // duration in seconds if it is a video check
  createdAt: string;
  feedbackNotes?: CoachingVideoFeedback[];
}


