/**
 * FITHub — Biometrics & Macro Calculation Utility
 * Uses the Mifflin-St Jeor equation to calculate BMR and daily macro targets.
 */

export type Gender = 'male' | 'female' | 'other';
export type FitnessGoal = 'cut' | 'maintain' | 'bulk';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type MedicalCondition = 'diabetes' | 'hypertension' | 'vegetarian' | 'vegan' | 'none';

export interface BiometricInput {
  age: number;
  gender: Gender;
  weightKg: number;
  heightCm: number;
  bodyFatPercent?: number; // optional
  goal: FitnessGoal;
  activityLevel: ActivityLevel;
  medicalConditions: MedicalCondition[];
}

export interface MacroResult {
  calories: number;
  protein: number; // grams
  carbs: number;   // grams
  fat: number;     // grams
}

/** Activity multipliers per activity level */
const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary:   1.2,
  light:       1.375,
  moderate:    1.55,
  active:      1.725,
  very_active: 1.9,
};

/** Caloric adjustment per goal */
const GOAL_ADJUSTMENTS: Record<FitnessGoal, number> = {
  cut:      -500, // caloric deficit
  maintain:    0,
  bulk:      +300, // caloric surplus
};

/**
 * Calculate daily macro targets using the Mifflin-St Jeor equation.
 * Returns calories, protein (g), carbs (g), and fat (g).
 * Minimum calorie floor of 1200 kcal to avoid dangerous deficits.
 */
export function calculateMacros(input: BiometricInput): MacroResult {
  const { age, gender, weightKg, heightCm, goal, activityLevel } = input;

  // --- 1. BMR (Mifflin-St Jeor) ---
  let bmr: number;
  if (gender === 'male') {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  } else if (gender === 'female') {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  } else {
    // 'other': average of male and female formulas
    const maleBmr   = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
    const femaleBmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
    bmr = (maleBmr + femaleBmr) / 2;
  }

  // Guard: ensure BMR is a valid positive number
  if (!isFinite(bmr) || bmr <= 0) {
    bmr = 1500; // sensible fallback
  }

  // --- 2. TDEE (Total Daily Energy Expenditure) ---
  const tdee = bmr * ACTIVITY_MULTIPLIERS[activityLevel];

  // --- 3. Target calories (apply goal adjustment, floor at 1200) ---
  const rawCalories = tdee + GOAL_ADJUSTMENTS[goal];
  const calories = Math.max(1200, Math.round(rawCalories));

  // --- 4. Macro split ---
  // Protein: 2g per kg of bodyweight (high-protein approach for fitness)
  const protein = Math.round(weightKg * 2);

  // Fat: ~25% of total calories
  const fat = Math.round((calories * 0.25) / 9);

  // Carbs: remaining calories after protein and fat
  const proteinCalories = protein * 4;
  const fatCalories     = fat * 9;
  const carbs = Math.max(0, Math.round((calories - proteinCalories - fatCalories) / 4));

  return { calories, protein, carbs, fat };
}

/** Human-readable labels for display in the UI */
export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary:   'Sedentary (desk job, no exercise)',
  light:       'Lightly Active (1–3 days/week)',
  moderate:    'Moderately Active (3–5 days/week)',
  active:      'Very Active (6–7 days/week)',
  very_active: 'Extremely Active (athlete / physical job)',
};

export const GOAL_LABELS: Record<FitnessGoal, { label: string; description: string }> = {
  cut:      { label: 'Cut',      description: 'Lose fat while preserving muscle' },
  maintain: { label: 'Maintain', description: 'Keep current weight and composition' },
  bulk:     { label: 'Bulk',     description: 'Build muscle with a caloric surplus' },
};
