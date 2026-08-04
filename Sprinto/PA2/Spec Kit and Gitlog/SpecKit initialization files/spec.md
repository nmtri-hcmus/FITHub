
# FITHub - Technical Specification (Spec)

## 1. User Roles & Permissions
The system identifies users via Authentication JWTs and assigns one of three roles:
*   **`ROLE_TRAINEE`:** Can log food, interact with the AI assistant, browse the coach marketplace, and leave reviews.
*   **`ROLE_COACH`:** Has all Trainee privileges, plus access to the "Coach Portal" to assign plans to clients and view client logs. Must have `isVerified: true` to appear in the marketplace.
*   **`ROLE_ADMIN`:** Has access to the Desktop Admin Dashboard. Can verify coach certificates, moderate community recipes, and ban users.

## 2. Core Features & Technical Implementation

### 2.1 Biometric Onboarding & Macro Calculation
*   **Trigger:** First login after registration.
*   **Data Collected:** Age, Gender, Weight, Height, Goal (Cut, Bulk, Maintain), Activity Multiplier.
*   **Logic:** System uses the Mifflin-St Jeor Equation to calculate Base Metabolic Rate (BMR) and outputs `dailyCalorieTarget`, `proteinTarget`, `carbTarget`, and `fatTarget`.

### 2.2 Dietary & Nutritional Tracking
*   **Food Database:** Users search for ingredients. Upon selection, the item is added to the `MealLog` table for the current date.
*   **OCR Camera Integration:** Uses a web-based camera API (`<input type="file" capture="environment">`) and a lightweight OCR library (e.g., Tesseract.js or Google Cloud Vision) to parse nutritional labels.

### 2.3 AI Assistant (Macro-Math Solver)
*   **Endpoint:** `/api/ai/generate-recipe`
*   **Payload:** `{ remainingProtein: number, remainingCarbs: number, remainingFats: number, availableIngredients: string[] }`
*   **System Prompt:** "You are an expert nutritionist AI. Generate a single, simple recipe using the user's available ingredients that perfectly matches their remaining macros. Output ONLY in JSON format: { recipeName, ingredients, instructions, macros }."

### 2.4 Coach Marketplace & 1-on-1 Portal
*   **Matchmaking:** Simple filtering algorithm comparing Trainee's goal (e.g., "Bodybuilding") with the Coach's tags `specialties: ["Bodybuilding"]`.
*   **Portal:** Real-time chat implemented via WebSockets or Firebase Firestore real-time listeners. Stores messages in a `Conversations` table.

## 3. Data Models / Schema Definitions

### 3.1 User Model (`users`)
```typescript
interface User {
  id: string; // UUID
  email: string;
  displayName: string;
  role: "TRAINEE" | "COACH" | "ADMIN";
  biometrics: {
    weightKg: number;
    heightCm: number;
    goal: string;
  };
  macroTargets: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  createdAt: Date;
}
```


### 3.2 Meal Log Model (`meal_logs`)

```typescript
interface MealLog {
  id: string;
  userId: string; // Foreign Key to User
  date: string; // YYYY-MM-DD
  mealType: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";
  foodItemName: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}
``` 

### 3.3 Coach Model Extension (`coaches`)
```typescript
interface CoachProfile {
  userId: string; // Foreign Key to User
  bio: string;
  certifications: string[]; // URLs to PDF buckets
  isVerified: boolean;
  hourlyRate: number;
  rating: number; // 1.0 to 5.0
  activeTrainees: string[]; // Array of User IDs
}
```

## 4. UI/UX Specifications
*   **Navigation:** Mobile views utilize a Fixed Bottom Navigation Bar (`Home`, `Log Food`, `AI Chat`, `Coach`, `Profile`). Desktop views (Admin) utilize a Fixed Left Sidebar.
*   **Color Palette:**
    *   Primary: Deep Blue (`#1E3A8A`) for trust and professionalism.
    *   Accent: Vibrant Green (`#10B981`) for health, progress bars, and success states.
    *   Background: Light Gray (`#F3F4F6`) for low eye-strain reading.
*   **Typography:** 'Inter' or 'Roboto' for clean, readable data tables.
