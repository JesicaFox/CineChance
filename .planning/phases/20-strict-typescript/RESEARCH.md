# Phase 20 Research: Strict TypeScript

## Current State
- **TypeScript config** (`tsconfig.json`): Already in desired state.
  - `target`: es2017
  - `strict`: true
  - `noImplicitAny`: true
  - `strictNullChecks`: true
- **ESLint** (`.eslintrc.json`): Already has error-level rules.
  - `@typescript-eslint/no-explicit-any`: "error"
  - `no-unused-vars`: "error"
  - `@typescript-eslint/no-unused-vars`: "error"
- **Next.js** (`next.config.ts`): `typescript.ignoreBuildErrors: false` (build errors not ignored).
- **Vitest** (`vitest.config.ts`): Coverage configured under `test` namespace, correct structure.

## Baseline Metrics
- **TypeScript compilation errors** (`npx tsc --noEmit`): 6 errors
- **`any` type usages** in source (`src/**/*.ts`, `src/**/*.tsx`): 194 occurrences
- **ESLint**: Many violations (any and unused vars) — exit code non-zero.

## Affected Files (from plans)
- **Configuration**: Already in desired state, but verification needed to ensure no misconfigurations.
- **Critical type fixes (Plan 20‑01)**:
  - `src/lib/taste-map/types.ts` (add `ActorData`, `DirectorData` interfaces)
  - `src/app/profile/taste-map/TasteMapClient.tsx` (import and use new types)
  - `src/app/api/collection/[id]/route.ts` (fix `collectionId` scoping in catch block)
  - `src/lib/taste-map/similarity.ts` (complete `RatingMatchPatterns` object with missing properties)
  - `src/lib/taste-map/person-profile-v2.ts` (replace unsafe JSON casts with type‑safe assertions)
- **Any elimination (Plan 20‑02)**: All API routes, hooks, components, and utilities must replace `any` with explicit types or `unknown`. Key files include:
  - API routes (`src/app/api/**/*.ts`)
  - Hooks (`src/hooks/**/*.ts`)
  - Components (`src/app/components/**/*.tsx`)
  - Lib modules (`src/lib/**/*.ts`)
- **Final verification (Plan 20‑03)**: Ensure zero TypeScript errors, successful production build, lint passes, and manual smoke tests.

## Risk Assessment
- High volume of `any` violations (194) requires systematic refactoring.
- Strict null checks may reveal hidden runtime issues.
- Some third‑party library typings might be incomplete.
- Must keep all tests passing throughout.

## Dependencies
- **Plan 20‑01**: Resolve the 6 current TypeScript errors and missing types (expected ~13 critical issues total, but current TS errors are 6; remaining issues likely `any`‑related or missing imports).
- **Plan 20‑02**: Eliminate all `any` usages.
- **Plan 20‑03**: Final polish, documentation, and verification.

## Recommended Execution Order
Sequential: **20‑01 → 20‑02 → 20‑03** (each depends on the previous).

---