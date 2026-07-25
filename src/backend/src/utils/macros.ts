export function calculateMacros(
  weight: number, // in kg
  height: number, // in cm
  age: number,
  gender: 'MALE' | 'FEMALE',
  activityLevel: 'SEDENTARY' | 'LIGHTLY_ACTIVE' | 'MODERATELY_ACTIVE' | 'VERY_ACTIVE' | 'EXTRA_ACTIVE',
  goal: 'LOSE_WEIGHT' | 'MAINTAIN' | 'BUILD_MUSCLE'
) {
  // 1. Calculate Basal Metabolic Rate (BMR) using Mifflin-St Jeor Equation
  let bmr = (10 * weight) + (6.25 * height) - (5 * age);
  bmr = gender === 'MALE' ? bmr + 5 : bmr - 161;

  // 2. Apply Activity Multiplier to get Total Daily Energy Expenditure (TDEE)
  const activityMultipliers = {
    SEDENTARY: 1.2,
    LIGHTLY_ACTIVE: 1.375,
    MODERATELY_ACTIVE: 1.55,
    VERY_ACTIVE: 1.725,
    EXTRA_ACTIVE: 1.9,
  };
  let tdee = bmr * activityMultipliers[activityLevel];

  // 3. Adjust calories based on Goal
  let dailyCalories = Math.round(tdee);
  if (goal === 'LOSE_WEIGHT') {
    dailyCalories -= 500; // standard 500 deficit
  } else if (goal === 'BUILD_MUSCLE') {
    dailyCalories += 300; // slight surplus for lean bulk
  }

  // 4. Calculate Macronutrients (Protein, Fat, Carbs)
  // Protein: 2g per kg of bodyweight
  const protein = Math.round(weight * 2);
  
  // Fat: 25% of total calories (9 calories per gram of fat)
  const fat = Math.round((dailyCalories * 0.25) / 9);
  
  // Carbs: The rest of the calories (4 calories per gram of carb/protein)
  const remainingCalories = dailyCalories - (protein * 4) - (fat * 9);
  const carbs = Math.round(remainingCalories / 4);

  return { dailyCalories, protein, carbs, fat };
}