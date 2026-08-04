# Dual-Theme Architecture Plan (Landing vs. App)

## Goal
Implement a dual-theme system where the **Landing Page remains exactly as it is** (Premium Dark Mode / Neon), while the **rest of the app (Login, Survey, Dashboard)** transitions to a refined Light Theme. 
The Light Theme will follow a **60/20/20 color ratio**:
- **60% White:** Clean, spacious backgrounds and card surfaces.
- **20% Green:** Used for secondary elements, badges, and highlights. The green will be adjusted to a softer, deeper shade (e.g., Forest/Emerald) so it doesn't clash harshly with the white background like the neon lime would.
- **20% Black:** Used for high-contrast accents (primary buttons, active states) and typography.

## Plan

### Step 1 — Dual-Theme CSS Setup
- **Files:** `src/landing/src/styles/global.css`
- **Change:** Migrate global tokens to a `.theme-light` context. Create a `.theme-dark` block retaining the current neon/dark tokens. Set default body background and text colors to the `.theme-light` variables. Update primary (black), secondary (emerald green), and surface (white/gray) variables in `.theme-light`.
- **Verify:** `npm run dev` to verify CSS compiles.

### Step 2 — Base Layout & Landing Page Update
- **Files:** `src/landing/src/layouts/BaseLayout.astro`, `src/landing/src/pages/index.astro`
- **Change:** Accept a `theme` prop in `BaseLayout` defaulting to `'light'`. In `index.astro`, pass `theme="dark"` so the body/wrapper gets `.theme-dark`.
- **Verify:** Load `/` and ensure it retains the dark theme. Load `/login` and ensure it has a white background.

### Step 3 — Refactor LoginForm.tsx
- **Files:** `src/landing/src/components/LoginForm.tsx`
- **Change:** Remove hardcoded `text-white` classes. Change input `bg-surface/50` to `bg-white` and borders to `border-surface-edge`. Remove the `bg-[image:var(--background-image-gradient-forest)]` or dark glassmorphism effects. Update the Social buttons to light mode variants.
- **Verify:** Load `/login` and verify form is visible and high contrast on white background.

### Step 4 — Refactor OnboardingSurvey.tsx & survey.astro
- **Files:** `src/landing/src/components/OnboardingSurvey.tsx`, `src/landing/src/pages/survey.astro`
- **Change:** Remove hardcoded `text-white`. Ensure step indicators, radio tiles, and navigation buttons use the new primary (black) and secondary (green) colors. Remove dark gradients from the wrapper card.
- **Verify:** Load `/survey` and verify readability and 60-20-20 balance.

### Step 5 — Refactor DashboardGreeting.tsx & dashboard.astro
- **Files:** `src/landing/src/components/DashboardGreeting.tsx`, `src/landing/src/pages/dashboard.astro`
- **Change:** Update empty state card (remove neon glow, add soft shadow). Update the 4 macro stat tiles to use dark text for values. Remove hardcoded `text-white`.
- **Verify:** Load `/dashboard` and verify light theme appearance.

### Step 6 — Navbar Adaptation
- **Files:** `src/landing/src/components/Navbar.astro`
- **Change:** Update `nav.nav-adaptive.nav-light` CSS to ensure black text and visible borders against white backgrounds on app pages, while retaining glassmorphic dark mode on the landing page hero.
- **Verify:** Scroll the landing page to trigger the adaptive navbar, and check navbar on `/dashboard`.

### Step 7 — Final Build Verification
- **Files:** None
- **Change:** Full production build test.
- **Verify:** `npx astro build` passes without errors.
