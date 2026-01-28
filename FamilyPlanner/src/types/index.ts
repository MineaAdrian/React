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

// Recipe
export type MealType = "breakfast" | "lunch" | "dinner" | "togo" | "dessert";

export interface Ingredient {
  name: string;
  quantity: number;
  unit: string; // g, ml, pcs, etc.
}

export interface Recipe {
  id: string;
  name: string;
  meal_type: MealType;
  ingredients: Ingredient[];
  instructions: string;
  family_id: string | null; // null = global
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
