
# FITHub - Technical Specification (Spec)

## 1. User Roles & Permissions
The system identifies users via Authentication JWTs and assigns one of three roles:
*   **`ROLE_TRAINEE`:** Can log food, interact with the AI assistant, browse the coach marketplace, and leave reviews.
*   **`ROLE_COACH`:** Access to the "Coach Portal" to assign plans to clients and view client logs. Inherits basic user functions via 1-to-1 mapping with `User` model. Must have `isVerified: true` to appear in the marketplace.
*   **`ROLE_ADMIN`:** Has access to the Desktop Admin Dashboard. Can verify coach certificates, moderate community recipes, and ban users.

## 2. Core Features & Technical Implementation

### 2.1 Biometric Onboarding & Macro Calculation
*   **Trigger:** First login after registration[cite: 2].
*   **Data Collected:** Age, Gender, Weight, Height, Goal (Cut, Bulk, Maintain), Activity Multiplier[cite: 2].
*   **Logic:** System uses the Mifflin-St Jeor Equation to calculate Base Metabolic Rate (BMR) and outputs `dailyCalorieTarget`, `proteinTarget`, `carbTarget`, and `fatTarget`[cite: 2].

### 2.2 Dietary & Nutritional Tracking
*   **Food Database:** Users search for ingredients. Item is added to `MealLog` table for the current date[cite: 2].
*   **OCR Camera Integration:** Uses a web-based camera API (`<input type="file" capture="environment">`) and a lightweight OCR library (e.g., Tesseract.js) to parse nutritional labels[cite: 2].

### 2.3 AI Assistant (Macro-Math Solver)
*   **Endpoint:** `/api/ai/generate-recipe`[cite: 2].
*   **Payload:** `{ remainingProtein: number, remainingCarbs: number, remainingFats: number, availableIngredients: string[] }`[cite: 2].
*   **System Prompt:** "You are an expert nutritionist AI. Generate a single, simple recipe using the user's available ingredients that perfectly matches their remaining macros. Output ONLY in JSON format: { recipeName, ingredients, instructions, macros }."[cite: 2]

### 2.4 Coach Marketplace & 1-on-1 Portal
*   **Matchmaking:** Simple filtering algorithm comparing Trainee's goal with Coach's tags `specialties: ["Bodybuilding"]`[cite: 2].
*   **Portal:** Real-time chat implemented via WebSockets or Firebase Firestore real-time listeners, storing messages in a `Conversations` table[cite: 2].

## 3. Data Models / Schema Definitions

### 3.1 User Model (`users`)
```typescript
interface User {
  id: string; // UUID[cite: 2]
  email: string;[cite: 2]
  displayName: string;[cite: 2]
  role: "TRAINEE" | "COACH" | "ADMIN";[cite: 2]
  biometrics: {
    weightKg: number;[cite: 2]
    heightCm: number;[cite: 2]
    goal: string;[cite: 2]
  };
  macroTargets: {
    calories: number;[cite: 2]
    protein: number;[cite: 2]
    carbs: number;[cite: 2]
    fats: number;[cite: 2]
  };
  createdAt: Date;[cite: 2]
}
```


### 3.2 Meal Log Model (`meal_logs`)

```typescript
interface MealLog {
  id: string;[cite: 2]
  userId: string; // Foreign Key to User[cite: 2]
  date: string; // YYYY-MM-DD[cite: 2]
  mealType: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";[cite: 2]
  foodItemName: string;[cite: 2]
  calories: number;[cite: 2]
  protein: number;[cite: 2]
  carbs: number;[cite: 2]
  fats: number;[cite: 2]
}
``` 

### 3.3 Coach Model Extension (`coaches`)
```typescript
interface CoachProfile {
  userId: string; // Foreign Key to User (1-to-1 Mapping)[cite: 2]
  bio: string;[cite: 2]
  certifications: string[]; // URLs to PDF buckets[cite: 2]
  isVerified: boolean;[cite: 2]
  hourlyRate: number;[cite: 2]
  rating: number; // 1.0 to 5.0[cite: 2]
  activeTrainees: string[]; // Array of User IDs[cite: 2]
}
```

## 4. UI/UX Specifications (Updated for Cyber-Fitness Neon Dark Mode)
*   **Architecture Framework:** Strictly enforced via Astro 5 and Tailwind CSS v4 theme tokens.
*   **Navigation:** Mobile views utilize a Fixed Bottom Navigation Bar (`Home`, `Log Food`, `AI Chat`, `Coach`, `Profile`)[cite: 2]. Desktop views (Admin) utilize a Fixed Left Sidebar[cite: 2].
*   **Color Palette (Cyber-Fitness Neon Dark):**
    *   **Base Background:** Charcoal Black (`#14151A`) - replacing standard dark surfaces.
    *   **Solid Panels & Secondary Cards:** Medium Slate Grey (`#2D2D35`).
    *   **Premium Interactive Surfaces:** Solid Deep Forest Green or 135-degree gradient (`linear-gradient(135deg, #1a3d28 0%, #0f2518 100%)`) reserved for AI Insights and Pricing Cards.
    *   **Primary/Secondary Accent:** Vibrant Neon Lime (`#D5FF5F`) for primary actions, badges, highlights, and success progress bars.
    *   **Interactive States:** Hover Accent (`#e7ff99`), Active/Pressed Accent (`#aacc22`).
    *   **Input Fields & Borders:** Lighter Grey Border Edge (`#454552`), Overlays (`#3A3A44`).
*   **Typography & Contrast:**
    *   **Headers:** Pure White (`#ffffff`) for crisp readability[cite: 2].
    *   **Body Text:** Soft White/Cream (`#f0f4eb`) for low eye-strain text rendering[cite: 2].
    *   **Muted/Subtle Details:** Off-white Greenish Tint (`#dfe6cc`) and Slate Green/Silver (`#a3ad87`).
