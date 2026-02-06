// User & Family
export type UserRole = "admin" | "member";

export interface User {
  id: string;
  email: string;
  name: string | null;
  family_id: string | null;
  role: UserRole;
  created_at: string;
}

export interface Family {
  id: string;
  name: string;
  created_at: string;
}

/** Profile row as returned for settings members list */
export interface FamilyMemberRow {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
}

/** Family request/invitation row from DB (with optional families relation) */
export interface FamilyRequestRow {
  id: string;
  family_id: string;
  email: string;
  type: "request" | "invite";
  status: string;
  families?: { name: string } | null;
}

// Recipe
export type MealType = "breakfast" | "lunch" | "dinner" | "togo" | "dessert";

export interface Ingredient {
  name: string;
  name_ro?: string;
  quantity: number;
  unit: string; // g, ml, pcs, etc.
}

/** Romanian/localized ingredient row (same shape as Ingredient) */
export type IngredientRo = { name: string; quantity: number; unit: string };

export interface Recipe {
  id: string;
  name: string;
  name_ro?: string;
  meal_type: MealType | MealType[]; // Support both single and multiple meal types for backwards compatibility
  ingredients: Ingredient[];
  ingredients_ro?: IngredientRo[];
  instructions: string;
  instructions_ro?: string;
  family_id: string | null; // null = global
  created_by: string | null;
  cooking_time_minutes?: number;
  difficulty?: "easy" | "medium" | "hard";
  tags?: string[];
  photo_url?: string;
  created_at: string;
}

// Week plan
export interface MealSlot {
  recipe_id: string | null;
  recipe?: Recipe | null;
}

export interface DayMeals {
  breakfast: MealSlot[];
  lunch: MealSlot[];
  dinner: MealSlot[];
  togo: MealSlot[];
  dessert: MealSlot[];
}

export interface DayPlan {
  date: string; // YYYY-MM-DD
  meals: DayMeals;
}

export interface WeekPlan {
  id: string;
  family_id: string;
  start_date: string; // Monday of week YYYY-MM-DD
  days: DayPlan[];
  created_at: string;
  updated_at: string;
}

// Shopping list
export interface ShoppingItem {
  ingredient_name: string;
  ingredient_name_ro?: string;
  total_quantity: number;
  unit: string;
  checked: boolean;
  checked_by: string[]; // user IDs
  recipe_ids: string[]; // for grouping / tooltip
}

export interface ShoppingList {
  week_start: string;
  family_id: string;
  items: ShoppingItem[];
}
