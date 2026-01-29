"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserAndFamily } from "@/lib/auth";
import {
  toDateString,
  emptyWeekDays,
  getOrCreateDayPlan,
} from "@/lib/week";
import type { DayPlan } from "@/types";

export async function getWeekPlan(weekStartStr: string): Promise<{ id: string; days: DayPlan[] } | null> {
  const { familyId } = await getCurrentUserAndFamily();
  if (!familyId) return null;

  const weekStart = new Date(weekStartStr);
  try {
    let plan = await prisma.weekPlan.findUnique({
      where: {
        familyId_startDate: { familyId, startDate: weekStart },
      },
    });
    if (!plan) {
      const days = emptyWeekDays(weekStart);
      plan = await prisma.weekPlan.create({
        data: {
          familyId,
          startDate: weekStart,
          days: days as unknown as object,
        },
      });
    }
    return { id: plan.id, days: plan.days as unknown as DayPlan[] };
  } catch {
    const supabase = await createClient();
    const { data: existing, error: fetchErr } = await supabase
      .from("week_plans")
      .select("id, days")
      .eq("family_id", familyId)
      .eq("start_date", weekStartStr)
      .single();
    if (fetchErr && fetchErr.code !== "PGRST116") throw fetchErr;
    if (existing) return { id: existing.id, days: (existing.days as DayPlan[]) ?? [] };
    const days = emptyWeekDays(weekStart);
    const { data: inserted, error: insertErr } = await supabase
      .from("week_plans")
      .insert({
        family_id: familyId,
        start_date: toDateString(weekStart),
        days,
      })
      .select("id")
      .single();
    if (insertErr || !inserted) throw insertErr ?? new Error("Failed to create week plan");
    return { id: inserted.id, days };
  }
}

export async function assignMeal(
  weekStartStr: string,
  dateStr: string,
  mealKey: "breakfast" | "lunch" | "dinner" | "togo" | "dessert",
  slotIndex: number,
  recipeId: string | null
) {
  const { familyId } = await getCurrentUserAndFamily();
  if (!familyId) throw new Error("No family");

  const weekStart = new Date(weekStartStr);
  try {
    const plan = await prisma.weekPlan.findUnique({
      where: {
        familyId_startDate: { familyId, startDate: weekStart },
      },
    });
    if (!plan) throw new Error("Week plan not found");
    const days = (plan.days as unknown as DayPlan[]) ?? emptyWeekDays(weekStart);
    const date = new Date(dateStr);
    const day = getOrCreateDayPlan(days, date);
    const slots = day.meals[mealKey];
    if (!slots[slotIndex]) {
      while (slots.length <= slotIndex) slots.push({ recipe_id: null });
    }
    slots[slotIndex] = { recipe_id: recipeId };
    const updatedDays = days.map((d) =>
      d.date === dateStr ? { ...d, meals: { ...day.meals } } : d
    );
    if (!updatedDays.find((d) => d.date === dateStr)) {
      updatedDays.push(day);
      updatedDays.sort((a, b) => a.date.localeCompare(b.date));
    }
    await prisma.weekPlan.update({
      where: { id: plan.id },
      data: { days: updatedDays as unknown as object },
    });

    // Automatically sync shopping list
    const { syncShoppingList } = await import("./shopping");
    await syncShoppingList(weekStartStr);

    return { ok: true };
  } catch (e) {
    if (typeof e === "object" && e !== null && "message" in e && (e as Error).message === "Week plan not found") throw e;
    const supabase = await createClient();
    const { data: plan, error: fetchErr } = await supabase
      .from("week_plans")
      .select("id, days")
      .eq("family_id", familyId)
      .eq("start_date", weekStartStr)
      .single();
    if (fetchErr || !plan) throw new Error("Week plan not found");
    const days = (plan.days as DayPlan[]) ?? emptyWeekDays(weekStart);
    const date = new Date(dateStr);
    const day = getOrCreateDayPlan(days, date);
    const slots = day.meals[mealKey];
    if (!slots[slotIndex]) {
      while (slots.length <= slotIndex) slots.push({ recipe_id: null });
    }
    slots[slotIndex] = { recipe_id: recipeId };
    const updatedDays = days.map((d) =>
      d.date === dateStr ? { ...d, meals: { ...day.meals } } : d
    );
    if (!updatedDays.find((d) => d.date === dateStr)) {
      updatedDays.push(day);
      updatedDays.sort((a, b) => a.date.localeCompare(b.date));
    }
    const { error: updateErr } = await supabase
      .from("week_plans")
      .update({ days: updatedDays, updated_at: new Date().toISOString() })
      .eq("id", plan.id);
    if (updateErr) throw updateErr;

    // Automatically sync shopping list
    const { syncShoppingList } = await import("./shopping");
    await syncShoppingList(weekStartStr);

    return { ok: true };
  }
}
