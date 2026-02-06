# Code Review Report – Family Planner

**Date:** February 2, 2025  
**Scope:** Full codebase (39 source files)  
**Stack:** Next.js 16, React 19, Prisma, Supabase, Zustand  
**Dimensions:** Security, Performance, Typing & Safety, Clean Code, Next.js/React standards

---

## Executive Summary

The Family Planner app is structured with clear separation of server actions, client components, and shared libs. The review identified **2 high-severity security issues** (open redirect and missing authorization in family request handling), **2 medium** (middleware not active, getPendingRequests scope), and several **typing**, **performance**, and **clean-code** improvements to align with Next.js and React best practices.

**Code score: 6.5 / 10**

- **Security:** 2 critical/high, 2 medium — must fix before production.
- **Architecture:** App Router used correctly; server vs client split is clear.
- **Typing:** Multiple `any` usages and missing types; improve for maintainability.
- **Patterns:** One large client component; middleware wiring incorrect.

---

## 1. Security & Critical Bugs

### 1.1 Open redirect (High) – `src/app/auth/callback/route.ts`

**Lines:** 7–14

**Issue:** The `next` query parameter is used in the redirect URL without validation. An attacker can craft a link such as:

- `?next=//evil.com`
- `?next=https://evil.com`

and have users sent to an external site after OAuth callback.

**Fix:** Allow only relative paths. For example:

```ts
const rawNext = searchParams.get("next") ?? "/week";
const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/week";
return NextResponse.redirect(`${origin}${next}`);
```

---

### 1.2 Missing authorization in `handleRequestAction` (High) – `src/app/actions/family.ts`

**Lines:** 135–170

**Issue:** `handleRequestAction(requestId, action)` does not verify that the current user is allowed to perform the action:

- **Invites:** Only the user whose email matches `request.email` should be able to accept or reject their invite. Any authenticated user who knows the request ID could accept on behalf of another user (adding them to a family without consent) or reject their invite.
- **Join requests:** Only an admin of `request.family_id` should be able to accept or reject a join request. Any user could approve/reject requests for any family.

**Fix:** Before applying the action:

- If `request.type === "invite"`: require `request.email === user.email`.
- If `request.type === "request"`: require the current user to be admin of `request.family_id` (e.g. profile for `user.id` has `family_id === request.family_id` and `role === "admin"`).

Return 403 or throw an error if the check fails.

---

### 1.3 `getPendingRequests` scope (Medium) – `src/app/actions/family.ts`

**Lines:** 172–181

**Issue:** The server action does not enforce that the caller is allowed to see the data:

- When called with `familyId`, the caller could be any user; they could enumerate family IDs and see pending join requests for other families.
- When called with `email`, the caller could pass any email and see pending invites for that email.

**Fix:** In the action, resolve the current user (e.g. via Supabase auth). When `familyId` is provided, verify the user is a member (or admin) of that family. When `email` is provided, verify `email === currentUser.email`. Otherwise return an empty list or throw.

---

### 1.4 Middleware not active (Medium) – `src/proxy.ts` & project layout

**Issue:** Supabase session refresh is implemented in `src/proxy.ts` (exporting `proxy` and `config`). Next.js only runs a file named `middleware.ts` (or `middleware.js`) at the project root or under `src/`. Because the file is named `proxy.ts`, it is never executed. Session cookies are not refreshed on each request, which can lead to stale or incorrect auth state.

**Fix:** Rename `src/proxy.ts` to `src/middleware.ts` and export the middleware as the default:

```ts
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

---

## 2. Performance & Optimization

| File | Issue | Recommendation |
|------|--------|----------------|
| **app/recipes/RecipesPageClient.tsx** | `getRecipes()` runs once in `useEffect([])`. If `familyId` or permissions change, the list can be stale. | Add `familyId` (and any other relevant deps) to the effect deps, or refetch when `familyId` changes. Prefer server-driven data where possible. |
| **components/providers/AuthProvider.tsx** | In `onAuthStateChange`, after `fetchProfile(session.user.id)` the code never calls `setLoading(false)`. | Call `setLoading(false)` in the same branch after profile fetch (and in the branch where there is no session). |
| **app/recipes/RecipesPageClient.tsx** | Single ~430-line client component. | Split into smaller components (e.g. recipe form, recipe view panel, filter bar) and/or custom hooks (e.g. recipe form state, search/filter) for readability and reuse. |

---

## 3. Refactoring & Best Practices

### 3.1 Typing & safety

- **app/settings/page.tsx (17, 51–52):** Replace `members: any[]` and `invitations as any` / `requests as any` with proper types (e.g. from `@/types` or Supabase-generated types).
- **app/settings/SettingsForm.tsx:** Type `invitations`, `requests`, and callback args (`req`, `inv`). In `catch`, use `unknown` and type-narrow or map to a known error shape instead of `error: any`.
- **app/actions/auth.ts (9–14):** Validate or coerce FormData values (e.g. trim, non-empty string) before passing to Supabase instead of blind `as string`.
- **app/actions/recipes.ts:** Replace `ingredients_ro?: any` and `err: any` with concrete types and `unknown` in catch.
- **app/actions/shopping.ts (25):** Type the `ing` parameter of `getRoName` (e.g. `Ingredient`).
- **lib/supabase/server.ts & middleware.ts:** Replace `options: any` in cookie `setAll` with the proper type from `@supabase/ssr` if available.
- **types/index.ts (35):** Replace `Recipe.ingredients_ro?: any` with a defined type (e.g. array of `{ name: string; quantity: number; unit: string }`).
- **RecipesPageClient.tsx (222), MealSection.tsx (207, 214, 224, 302):** Remove `as any` on `ingredients_ro` and translation keys; use typed `Recipe` and a type-safe `t()` or union for keys.

### 3.2 Clean code

- **app/recipes/RecipesPageClient.tsx (52–53):** Remove duplicate `setPhotoUrl(recipe.photo_url || "");`.
- **app/actions/recipes.ts (211):** Remove hardcoded fallback email; use only `process.env.ADMIN_EMAIL` and fail or log if missing.
- **app/settings/SettingsForm.tsx (216):** Replace hardcoded Romanian string with a translation key in `lib/translations.ts`.
- **components/week/MealSection.tsx (168):** Fix placeholder character (intended emoji may be mis-encoded).
- **AddShoppingItem.tsx:** Validate or default `quantity` (e.g. empty string → 1) before `Number(quantity)` to avoid silent `0`.

### 3.3 Next.js / React alignment

- **Server vs client:** Layout and pages correctly use server components where appropriate; client boundaries are explicit with `"use client"`.
- **Data fetching:** Prefer server-side data (e.g. server components or server actions called from server) for initial recipe/week/settings data where possible to reduce client bundle and improve first load.
- **Forms:** Form actions and server actions are used consistently; consider `useFormStatus` for pending state on submit buttons where applicable.

---

## 4. Issue Count by Category

| Category | Count |
|----------|-------|
| Security (high/critical) | 2 |
| Security (medium) | 2 |
| Performance / patterns | 3 |
| Typing & safety | 12 |
| Clean code & i18n | 5 |
| **Total** | **24** |

---

## 5. Files Reviewed (39)

**App:** `layout.tsx`, `page.tsx`, `login/page.tsx`, `register/page.tsx`, `settings/page.tsx`, `SettingsForm.tsx`, `recipes/page.tsx`, `RecipesPageClient.tsx`, `shopping-list/page.tsx`, `week/page.tsx`, `auth/callback/route.ts`

**Actions:** `auth.ts`, `family.ts`, `recipes.ts`, `shopping.ts`, `week.ts`

**Components:** `Nav.tsx`, `AuthProvider.tsx`, `RecipeCard.tsx`, `RecipeSearchModal.tsx`, `AddShoppingItem.tsx`, `ShoppingItemRow.tsx`, `ShoppingList.tsx`, `DaySelector.tsx`, `MealSection.tsx`, `WeekCalendar.tsx`

**Lib:** `auth.ts`, `email.ts`, `prisma.ts`, `week.ts`, `translations.ts`, `supabase/client.ts`, `supabase/middleware.ts`, `supabase/server.ts`

**Hooks / store / types:** `useTranslation.ts`, `languageStore.ts`, `weekStore.ts`, `types/index.ts`, `proxy.ts`

---

## 6. Recommended Order of Work

1. **Immediate (before production):** Fix open redirect (auth callback) and add authorization checks in `handleRequestAction` and `getPendingRequests`.
2. **Short term:** Rename `proxy.ts` → `middleware.ts` and export default middleware; fix AuthProvider `loading` state in `onAuthStateChange`.
3. **Next:** Replace `any` and add types in settings, recipes, shopping, and types; remove duplicate line and hardcoded email/strings.
4. **Ongoing:** Split `RecipesPageClient` into smaller components/hooks; consider more server-driven data for recipes and week.

---

*Code review complete. Confirm that this report reflects your expectations or request changes to priorities/sections.*
