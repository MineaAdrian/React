# Task 001: Fix All Code Review Issues

## 1. Description

Address all findings from the Family Planner code review (CODE_REVIEW_REPORT.md): security vulnerabilities (open redirect, missing authorization in family request handling, getPendingRequests scope, inactive middleware), performance and loading-state fixes, typing and safety improvements, and clean-code / i18n fixes. Work should follow the recommended order: security first, then middleware and AuthProvider, then typing and clean code, then component refactors.

## 2. Acceptance Criteria

### Security (must complete before production)

- [ ] **Open redirect:** `src/app/auth/callback/route.ts` validates `next` so only relative paths are allowed (starts with `/`, not `//`); otherwise default to `/week`.
- [ ] **handleRequestAction:** In `src/app/actions/family.ts`, before applying action: if `request.type === "invite"`, require `request.email === user.email`; if `request.type === "request"`, require current user is admin of `request.family_id`. Throw or return error if unauthorized.
- [ ] **getPendingRequests:** In `src/app/actions/family.ts`, resolve current user; when `familyId` is provided verify user is member/admin of that family; when `email` is provided verify `email === currentUser.email`. Return empty list or throw if unauthorized.
- [ ] **Middleware:** Rename `src/proxy.ts` to `src/middleware.ts` and export default middleware that calls `updateSession`; ensure Next.js runs session refresh on each request.

### Performance & loading

- [ ] **AuthProvider:** In `onAuthStateChange`, call `setLoading(false)` after profile fetch and in the branch where there is no session.
- [ ] **RecipesPageClient:** Add `familyId` (and any relevant deps) to the `useEffect` that calls `getRecipes()` so list refetches when family/permissions change.
- [ ] **RecipesPageClient refactor:** Split the ~430-line component into smaller components (e.g. recipe form, recipe view panel, filter bar) and/or custom hooks (e.g. recipe form state, search/filter) for readability and reuse.

### Typing & safety

- [ ] **Settings:** In `app/settings/page.tsx`, replace `members: any[]` and `invitations as any` / `requests as any` with proper types (e.g. from `@/types` or Supabase).
- [ ] **SettingsForm:** Type `invitations`, `requests`, and map callback args (`req`, `inv`); use `unknown` in catch and type-narrow or map to known error shape instead of `error: any`.
- [ ] **auth.ts:** Validate or coerce FormData values (trim, non-empty string) before passing to Supabase; avoid blind `as string`.
- [ ] **recipes.ts:** Replace `ingredients_ro?: any` and `err: any` in catch with concrete types and `unknown`.
- [ ] **shopping.ts:** Type the `ing` parameter of `getRoName` (e.g. `Ingredient`).
- [ ] **Supabase:** In `lib/supabase/server.ts` and `lib/supabase/middleware.ts`, replace `options: any` in cookie `setAll` with proper type from `@supabase/ssr` if available.
- [ ] **types/index.ts:** Replace `Recipe.ingredients_ro?: any` with a defined type (e.g. array of `{ name: string; quantity: number; unit: string }`).
- [ ] **RecipesPageClient & MealSection:** Remove `as any` on `ingredients_ro` and translation keys; use typed `Recipe` and type-safe `t()` or union for keys.

### Clean code & i18n

- [ ] **RecipesPageClient:** Remove duplicate `setPhotoUrl(recipe.photo_url || "");` (lines 52–53).
- [ ] **recipes.ts reportRecipe:** Remove hardcoded fallback email; use only `process.env.ADMIN_EMAIL` and fail or log if missing.
- [ ] **SettingsForm:** Replace hardcoded Romanian string ("Ai fost invitat...") with a translation key in `lib/translations.ts`.
- [ ] **MealSection.tsx:** Fix placeholder character at line 168 (intended emoji may be mis-encoded).
- [ ] **AddShoppingItem:** Validate or default `quantity` (e.g. empty string → 1) before `Number(quantity)` to avoid silent `0`.

### Verification

- [ ] Implementation matches CODE_REVIEW_REPORT.md recommendations.
- [ ] No new linter errors; existing conventions (App Router, server vs client, `@/` alias) preserved.
- [ ] Manual smoke test: auth callback redirect, family invite/join flow, settings, recipes, shopping list.

## 3. Technical Implementation

* **Frontend:** `src/app/auth/callback/route.ts`, `src/app/settings/page.tsx`, `src/app/settings/SettingsForm.tsx`, `src/app/recipes/RecipesPageClient.tsx`, `src/components/providers/AuthProvider.tsx`, `src/components/week/MealSection.tsx`, `src/components/shopping/AddShoppingItem.tsx`. Add types in `src/types/index.ts`; add translation key in `src/lib/translations.ts`.
* **Backend:** `src/app/actions/auth.ts`, `src/app/actions/family.ts`, `src/app/actions/recipes.ts`, `src/app/actions/shopping.ts`; `src/lib/supabase/server.ts`, `src/lib/supabase/middleware.ts`. Rename `src/proxy.ts` → `src/middleware.ts` and export default middleware.
* **Database:** No schema changes required.

## 4. Dependencies

* **Reference:** CODE_REVIEW_REPORT.md (source of all issues and fix details).
* **Blocking:** None. Security items should be completed first; typing and refactors can be done in parallel after security and middleware.
