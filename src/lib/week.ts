import {
  startOfWeek,
  addDays,
  format,
  isSameDay,
  parseISO,
  type Locale,
} from "date-fns";
import { enUS, ro } from "date-fns/locale";
import type { DayPlan, DayMeals, MealSlot } from "@/types";

const locales = {
  en: enUS,
  ro: ro,
};

export const MEAL_KEYS = ["breakfast", "lunch", "dinner", "togo", "dessert"] as const;
export const MEAL_LABELS: Record<(typeof MEAL_KEYS)[number], string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  togo: "To-Go",
  dessert: "Dessert",
};

export function getWeekStart(date: Date = new Date()): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function getWeekDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function formatWeekRange(weekStart: Date, lang: "en" | "ro" = "en"): string {
  const end = addDays(weekStart, 6);
  const locale = locales[lang];
  return `${format(weekStart, "d MMM", { locale })} – ${format(end, "d MMM yyyy", { locale })}`;
}

export function toDateString(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function emptyMeals(): DayMeals {
  return {
    breakfast: [{ recipe_id: null }],
    lunch: [{ recipe_id: null }],
    dinner: [{ recipe_id: null }],
    togo: [{ recipe_id: null }],
    dessert: [{ recipe_id: null }],
  };
}

export function emptyDayPlan(date: Date): DayPlan {
  return {
    date: toDateString(date),
    meals: emptyMeals(),
  };
}

export function emptyWeekDays(weekStart: Date): DayPlan[] {
  return getWeekDates(weekStart).map((d) => emptyDayPlan(d));
}

export function findDayPlan(days: DayPlan[], date: Date): DayPlan | undefined {
  const ds = toDateString(date);
  return days.find((d) => d.date === ds);
}

export function getOrCreateDayPlan(days: DayPlan[], date: Date): DayPlan {
  const existing = findDayPlan(days, date);
  if (existing) return existing;
  return emptyDayPlan(date);
}
