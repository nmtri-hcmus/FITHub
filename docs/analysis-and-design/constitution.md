# FITHub - Project Constitution

## 1. Project Overview
**Name:** FITHub
**Description:** A mobile-first Progressive Web Application (PWA) that combines precise dietary tracking, AI-assisted meal curation, and a dedicated 1-on-1 marketplace for fitness coaches and trainees.
**Architecture:** Client-Server, Service-Oriented Architecture (SOA) with a separate Node.js/Express backend.

## 2. Tech Stack & Technologies
The AI and development team must strictly adhere to the following stack:
*   **Frontend Framework:** Astro 5 (Static / SSR Hybrid) integrated with React
*   **Language:** TypeScript (Strict mode enabled)
*   **Styling:** Tailwind CSS v4 (Mobile-first responsive design using modern @theme tokens)
*   **Animation:** Framer Motion (for interactive React components/Islands)
*   **Icons & UI Components:** Strict SVG icons (No emojis), standard responsive primitives
*   **Backend Framework:** Node.js with Express.js, Socket.io
*   **Database:** PostgreSQL (via Prisma ORM)
*   **AI Integration:** Gemini 3.1 Flash Lite (Google)
*   **OCR:** Tesseract.js (open-source, runs on Node.js)
*   **External APIs:** Open Food Facts (OFF), Cloudinary (cloud storage)

## 3. Core Engineering Principles
1.  **Mobile-First PWA:** All UI designs and components must be built for mobile screens (`375px`) first, then scaled up with Tailwind breakpoints (`md:`, `lg:`) for desktop admin dashboards.
2.  **Single Source of Truth:** Do not duplicate state. Utilize React Context or Zustand for global state management (e.g., User Authentication state, Daily Macro state).
3.  **Fail Gracefully:** Third-party integrations (like the Gemini API) must have fallback states. If the AI fails, display a user-friendly error message, not a system crash.
4.  **Secure by Default:** Never expose API keys or database secrets in the frontend code. All AI prompts and secure database writes must occur in server-side API routes.

## 4. Coding Standards & Conventions
### 4.1 TypeScript Rules
*   Do not use `any`. Always define explicit `type` or `interface` for props, state, and API responses.
*   Prefer `interface` for object shapes and `type` for unions/intersections.

### 4.2 Component Structure
*   Use Functional Components with React Hooks. Do not use Class Components.
*   Keep components small and modular. If a component exceeds 200 lines, extract sub-components.
*   **File Naming:** Use PascalCase for components (e.g., `DietCalendar.tsx`) and camelCase for utilities/hooks (e.g., `useAuth.ts`).

### 4.3 Styling (Tailwind)
*   Avoid inline styles `style={{...}}`. Strictly use Tailwind classes[cite: 1].
*   **Color Tokens Rule:** Do NOT hardcode raw hex values (e.g., `bg-[#D5FF5F]`) inside UI components. You must map these values inside the Tailwind v4 `@theme` directive (e.g., using functional color names like `bg-accent`, `bg-surface-base`, `bg-forest-gradient`, `text-contrast-high`).
*   Group utility classes logically (Layout -> Spacing -> Typography -> Colors)[cite: 1].

## 5. Git & Workflow Rules
*   **Branching:** Use `feature/[feature-name]`, `bugfix/[bug-name]`, `hotfix/[issue]`.
*   **Commits:** Follow Conventional Commits format (e.g., `feat: add macro progress bar`, `fix: resolve AI timeout error`).
*   **Reviews:** No code is pushed directly to `main`. All PRs must pass type-checking and be reviewed by at least one other team member.