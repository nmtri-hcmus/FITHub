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

    /** Admin-only endpoints for UC-23 */
    getPending: (): Promise<Recipe[]> =>
      request<Recipe[]>('/api/recipes/pending'),
    moderate: (id: string, approve: boolean): Promise<Recipe> =>
      request<Recipe>(`/api/recipes/${id}/moderate`, {
        method: 'POST',
        body: JSON.stringify({ approve }),
      }),
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
    /**
     * Search all verified coaches with optional specialty/rate filters.
     * Maps to GET /api/coaches
     */
    search: (filters: { specialty?: string; maxRate?: number }): Promise<BackendCoachProfile[]> => {
      const params = new URLSearchParams();
      if (filters.specialty) params.set('specialty', filters.specialty);
      if (filters.maxRate) params.set('maxRate', String(filters.maxRate));
      return request<BackendCoachProfile[]>(`/api/coaches?${params.toString()}`);
    },

    /**
     * Get coaches recommended based on user goal.
     * Maps to GET /api/coaches/recommendations?goal=LOSE_WEIGHT
     */
    getRecommendations: (goal: string): Promise<BackendCoachProfile[]> =>
      request<BackendCoachProfile[]>(`/api/coaches/recommendations?goal=${encodeURIComponent(goal)}`),

    /**
     * Get a single coach's full profile including reviews.
     * Maps to GET /api/coaches/:id
     */
    getProfile: (id: string): Promise<BackendCoachProfile> =>
      request<BackendCoachProfile>(`/api/coaches/${id}`),

    /**
     * Submit a review for a coach (requires active subscription).
     * Maps to POST /api/coaches/:id/reviews
     */
    addReview: (coachId: string, rating: number, text: string): Promise<void> =>
      request(`/api/coaches/${coachId}/reviews`, {
        method: 'POST',
        body: JSON.stringify({ rating, text }),
      }),

    /**
     * Book a free 15-minute consultation.
     * Maps to POST /api/coaches/:id/consultations
     */
    bookConsultation: (coachId: string, scheduledAt: string): Promise<BackendConsultation> =>
      request<BackendConsultation>(`/api/coaches/${coachId}/consultations`, {
        method: 'POST',
        body: JSON.stringify({ scheduledAt }),
      }),

    /**
     * Get the authenticated trainee's own consultation bookings.
     * Maps to GET /api/coaches/consultations/mine
     */
    getMyConsultations: (): Promise<BackendConsultation[]> =>
      request<BackendConsultation[]>('/api/coaches/consultations/mine'),

    /**
     * Check if the authenticated user has an active subscription to a coach.
     * Derived from GET /api/users/me subscriptionsAsClient.
     */
    checkSubscription: async (coachId: string): Promise<boolean> => {
      try {
        const profile = await request<UserProfile>('/api/users/me');
        return (
          Array.isArray(profile.subscriptionsAsClient) &&
          profile.subscriptionsAsClient.some(
            (s: { coachId: string; status: string }) =>
              s.coachId === coachId && s.status === 'active'
          )
        );
      } catch {
        return false;
      }
    },

    /**
     * Initiate Stripe checkout for subscribing to a coach.
     * Maps to POST /api/payment/checkout
     * Returns a Stripe checkout URL to redirect the user to.
     */
    subscribe: (coachId: string): Promise<{ url: string }> =>
      request<{ url: string }>('/api/payment/checkout', {
        method: 'POST',
        body: JSON.stringify({ coachId }),
      }),


    /**
     * Apply to become a coach (UC-21).
     * Maps to POST /api/coaches/apply
     */
    apply: (data: {
      specialty: string;
      hourlyRate: number;
      bio?: string;
      idDocumentUrl: string;
      certDocumentUrl: string;
    }): Promise<any> =>
      request('/api/coaches/apply', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    /**
     * Get user's own application status.
     * Maps to GET /api/coaches/apply/my-status
     */
    getMyApplication: (): Promise<BackendCoachApplication | null> =>
      request<BackendCoachApplication | null>('/api/coaches/apply/my-status'),

    /**
     * List all pending coach applications (Admin only).
     * Maps to GET /api/coaches/applications
     */
    getApplications: (): Promise<BackendCoachApplication[]> =>
      request<BackendCoachApplication[]>('/api/coaches/applications'),
    confirmPayment: (paymentIntentId: string): Promise<any> => request('/api/payment/confirm', { method: 'POST', body: JSON.stringify({ paymentIntentId }) }),

    /**
     * Resolve a pending application (Admin only) (UC-22).
     * Maps to POST /api/coaches/applications/:id/resolve
     */
    resolveApplication: (id: string, approve: boolean): Promise<any> =>
      request(`/api/coaches/applications/${id}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ approve }),
      }),
  },

  coaching: {
    // ── Trainee-side ──────────────────────────────────────────────────────
    /** Get list of coaches the trainee is actively subscribed to */
    getMyCoaches: (): Promise<SubscribedCoach[]> =>
      request<SubscribedCoach[]>('/api/coaches/my-coaches'),

    /** Get all coaching plans assigned to the current trainee */
    getMyPlans: (): Promise<CoachingPlan[]> =>
      request<CoachingPlan[]>('/api/coaches/my-plans'),

    /** Mock-subscribe to a coach (no Stripe, for testing) */
    mockSubscribe: (coachId: string): Promise<any> =>
      request('/api/coaches/mock-subscribe', {
        method: 'POST',
        body: JSON.stringify({ coachId }),
      }),

    /** Mock add a dummy client for a coach (for testing empty states) */
    mockAddClient: (): Promise<any> =>
      request('/api/coaches/mock-add-client', {
        method: 'POST',
      }),

    // ── Coach-side ────────────────────────────────────────────────────────
    /** Get all clients with active subscriptions */
    getClients: (): Promise<ClientProfile[]> =>
      request<ClientProfile[]>('/api/coaches/clients'),

    /** Get a client's meal & progress logs */
    getClientLogs: (clientId: string): Promise<{ mealLogs: MealLog[]; progressLogs: ProgressLog[] }> =>
      request(`/api/coaches/clients/${clientId}/logs`),

    /** Get all coaching plans for a specific client */
    getClientPlans: (clientId: string): Promise<CoachingPlan[]> =>
      request<CoachingPlan[]>(`/api/coaches/clients/${clientId}/plans`),

    /** Assign or overwrite a coaching plan for a client (UC-14) */
    assignPlan: (clientId: string, date: string, workout: string, mealInstructions: string, append = false): Promise<CoachingPlan> =>
      request<CoachingPlan>(`/api/coaches/clients/${clientId}/plan`, {
        method: 'POST',
        body: JSON.stringify({ date, workout, mealInstructions, append }),
      }),

    /** Update a client's daily calorie target */
    updateCalorieTarget: (clientId: string, calories: number): Promise<any> =>
      request(`/api/coaches/clients/${clientId}/calories`, {
        method: 'PUT',
        body: JSON.stringify({ calories }),
      }),

    // ── Chat (both sides) ─────────────────────────────────────────────────
    /** Get chat history with another user */
    getMessages: (otherUserId: string): Promise<CoachingMessage[]> =>
      request<CoachingMessage[]>(`/api/chat/${otherUserId}`),

    /** Send a text or video message */
    sendMessage: (receiverId: string, content: string, mediaUrl?: string, videoDuration?: number): Promise<CoachingMessage> =>
      request<CoachingMessage>('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ receiverId, content, mediaUrl, videoDuration }),
      }),

    /** Get presigned upload signature for Cloudinary */
    getUploadSignature: (): Promise<{ timestamp: number; signature: string; cloudName: string; apiKey: string; folder: string }> =>
      request('/api/chat/upload-url'),

    /** Coach adds timestamped video feedback note (UC-16) */
    addVideoFeedback: (messageId: string, timestamp: number, note: string): Promise<any> =>
      request('/api/chat/feedback', {
        method: 'POST',
        body: JSON.stringify({ messageId, timestamp, note }),
      }),
  },

  community: {
    getPosts: (subCommunityId?: string): Promise<BackendPost[]> => {
      const url = subCommunityId ? `/api/community/posts?subCommunityId=${subCommunityId}` : '/api/community/posts';
      return request<BackendPost[]>(url);
    },
    getPostDetails: (id: string): Promise<BackendPost> => request<BackendPost>(`/api/community/posts/${id}`),
    createPost: (data: { title: string; content: string; subCommunityId?: string; imageUrl?: string }): Promise<BackendPost> =>
      request('/api/community/posts', { method: 'POST', body: JSON.stringify(data) }),
    createComment: (postId: string, content: string): Promise<any> =>
      request(`/api/community/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify({ content }) }),
    getSubCommunities: (): Promise<BackendSubCommunity[]> => request<BackendSubCommunity[]>('/api/community/groups'),
    createSubCommunity: (data: { name: string; description?: string }): Promise<BackendSubCommunity> =>
      request('/api/community/groups', { method: 'POST', body: JSON.stringify(data) }),
    joinSubCommunity: (id: string): Promise<any> =>
      request(`/api/community/groups/${id}/join`, { method: 'POST' }),
    getChallenges: (): Promise<BackendChallenge[]> => request<BackendChallenge[]>('/api/community/challenges'),
    syncChallenges: (): Promise<any> => request('/api/community/challenges/sync', { method: 'POST' }),
    joinChallenge: (id: string): Promise<any> => request(`/api/community/challenges/${id}/join`, { method: 'POST' }),
    getLeaderboards: (): Promise<any[]> => request<any[]>('/api/community/leaderboards'),
  },

  admin: {
    createReport: (reportedUserId: string, reason: string): Promise<any> =>
      request(`/api/admin/reports`, { method: 'POST', body: JSON.stringify({ reportedUserId, reason }) }),
    getReports: (): Promise<BackendReport[]> =>
      request<BackendReport[]>(`/api/admin/reports`),
    resolveReport: (reportId: string, decision: string): Promise<any> =>
      request(`/api/admin/reports/${reportId}/resolve`, { method: 'POST', body: JSON.stringify({ decision }) }),
    banUser: (userId: string): Promise<any> =>
      request(`/api/admin/users/${userId}/ban`, { method: 'POST' }),
    getPendingGroups: (): Promise<BackendSubCommunity[]> =>
      request<BackendSubCommunity[]>('/api/admin/pending-groups'),
    approveGroup: (groupId: string, decision: 'APPROVED' | 'REJECTED'): Promise<any> =>
      request(`/api/admin/approve-group/${groupId}`, { method: 'POST', body: JSON.stringify({ decision }) }),
    createChallenge: (data: { title: string; description: string; startDate: string; endDate: string; criteria?: any }): Promise<any> =>
      request(`/api/admin/challenges`, { method: 'POST', body: JSON.stringify(data) }),
    getPendingPosts: (): Promise<any[]> =>
      request<any[]>('/api/admin/pending-posts'),
    approvePost: (postId: string, decision: 'APPROVED' | 'REJECTED'): Promise<any> =>
      request(`/api/admin/approve-post/${postId}`, { method: 'POST', body: JSON.stringify({ decision }) }),
  }
};


// ── Types for API responses ───────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  biometrics: BiometricsResponse | null;
  subscriptionsAsClient?: { coachId: string; status: string; currentPeriodEnd: string }[];
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

// ── Backend Coach Types (shape returned by the real API) ─────────────────────

export interface BackendCoachReview {
  id: string;
  rating: number;
  text?: string;
  createdAt: string;
  user: { name: string };
}

export interface BackendCoachProfile {
  id: string;
  userId: string;
  specialty: string;
  hourlyRate: number;
  bio?: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email?: string;
    reviewsReceived?: BackendCoachReview[];
  };
}

export type ConsultationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED';

export interface BackendConsultation {
  id: string;
  userId: string;
  coachId: string;
  scheduledAt: string;
  status: ConsultationStatus;
  createdAt: string;
  updatedAt: string;
  coach?: {
    id: string;
    name: string;
    coachProfile?: { specialty: string; hourlyRate: number };
  };
}

// ── Legacy mock types kept for reference (no longer used by live API) ─────────

/** @deprecated Use BackendCoachProfile instead */
export interface CoachProfile {
  id: string;
  name: string;
  specialization: string;
  bio: string;
  price: number;
  rating: number;
  certifications: string[];
  experienceYrs: number;
  imageUrl: string;
}

/** @deprecated Reviews are now embedded in BackendCoachProfile.user.reviewsReceived */
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

// MOCK_COACHES kept for any legacy imports but no longer used in live UI
export const MOCK_COACHES: CoachProfile[] = [];


// ── 1-on-1 Coaching Portal Types ───────────────────────────────────────────────

export interface SubscribedCoach {
  coachId: string;
  coachName: string;
  specialty: string;
  subscriptionId: string;
}

export interface ClientProfile {
  userId: string;
  name: string;
  email: string;
  goal: string;
  adherenceScore: number;
  biometrics: {
    dailyCalories: number;
    protein: number;
    carbs: number;
    fat: number;
    goal: string;
  } | null;
  weightLogs: { date: string; weight: number }[];
}

export interface CoachingPlan {
  id: string;
  coachId: string;
  traineeId: string;
  date: string;
  workout: string | null;
  mealInstructions: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CoachingVideoFeedback {
  id: string;
  receiverId: string;
  content: string;
  mediaUrl?: string | null;
  videoDuration?: number | null;
  isRead: boolean;
  createdAt: string;
  sender: { id: string; name: string };
  feedbackNotes: CoachingVideoFeedback[];
}

export interface BackendCoachApplication {
  id: string;
  userId: string;
  specialty: string;
  hourlyRate: number;
  bio: string | null;
  idDocumentUrl: string;
  certDocumentUrl: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}


export interface BackendPost {
  id: string;
  title: string;
  content: string;
  authorId: string;
  subCommunityId: string | null;
  subCommunity?: { id: string; name: string } | null;
  status?: string;
  createdAt: string;
  updatedAt: string;
  imageUrl?: string;
  user: { id: string; name: string; role: string };
  author?: { name: string; id: string };
  _count?: { comments: number };
  comments?: any[];
}

export interface BackendSubCommunity {
  id: string;
  name: string;
  description: string | null;
  createdById: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count?: { members: number; posts: number };
}

export interface BackendChallenge {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  criteria: any;
  createdAt: string;
  updatedAt: string;
  participants?: any[];
  _count?: { participants: number };
}

export interface BackendReport {
  id: string;
  reporterId: string;
  reportedUserId: string;
  reason: string;
  status: string;
  createdAt: string;
  reporter: { name: string; email: string };
  reportedUser: { name: string; email: string };
}


export interface BackendPost {
  id: string;
  title: string;
  content: string;
  authorId: string;
  subCommunityId: string | null;
  subCommunity?: { id: string; name: string } | null;
  status?: string;
  createdAt: string;
  updatedAt: string;
  imageUrl?: string;
  user: { id: string; name: string; role: string };
  author?: { name: string; id: string };
  _count?: { comments: number };
  comments?: any[];
}

export interface BackendSubCommunity {
  id: string;
  name: string;
  description: string | null;
  createdById: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count?: { members: number; posts: number };
}

export interface BackendChallenge {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  criteria: any;
  createdAt: string;
  updatedAt: string;
  participants?: any[];
  _count?: { participants: number };
}

export interface BackendReport {
  id: string;
  reporterId: string;
  reportedUserId: string;
  reason: string;
  status: string;
  createdAt: string;
  reporter: { name: string; email: string };
  reportedUser: { name: string; email: string };
}
