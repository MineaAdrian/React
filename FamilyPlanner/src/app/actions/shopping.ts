"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserAndFamily } from "@/lib/auth";
import type { DayPlan, Recipe, ShoppingItem } from "@/types";
import type { MealType } from "@/types";

const MEAL_KEYS: MealType[] = ["breakfast", "lunch", "dinner", "togo", "dessert"];

function aggregateIngredients(days: DayPlan[], recipeMap: Map<string, Recipe>): ShoppingItem[] {
  const map = new Map<string, { quantity: number; unit: string; recipeIds: Set<string> }>();

  for (const day of days) {
    for (const key of MEAL_KEYS) {
      const slots = day.meals[key] ?? [];
      for (const slot of slots) {
        const rid = slot.recipe_id;
        if (!rid) continue;
        const recipe = recipeMap.get(rid);
        if (!recipe?.ingredients) continue;
        for (const ing of recipe.ingredients) {
          // Ensure quantity is always a number (handle malformed data)
          let quantity = 0;
          if (typeof ing.quantity === 'number') {
            quantity = ing.quantity;
          } else if (typeof ing.quantity === 'string') {
            const parsed = parseFloat(ing.quantity);
            if (!isNaN(parsed)) {
              quantity = parsed;
            } else {
              console.warn(`[aggregateIngredients] Invalid quantity for ingredient "${ing.name}": "${ing.quantity}". Using 0.`);
            }
          }

          const k = `${ing.name.toLowerCase().trim()}|${ing.unit}`;
          const cur = map.get(k);
          if (cur) {
            cur.quantity += quantity;
            cur.recipeIds.add(rid);
          } else {
            map.set(k, {
              quantity,
              unit: ing.unit,
              recipeIds: new Set([rid]),
            });
          }
        }
      }
    }
  }

  return Array.from(map.entries()).map(([k, v]) => {
    const [ingredient_name] = k.split("|");
    return {
      ingredient_name,
      total_quantity: v.quantity,
      unit: v.unit,
      checked: false,
      checked_by: [] as string[],
      recipe_ids: Array.from(v.recipeIds),
    };
  });
}

function rowToItemFromSupabase(row: Record<string, unknown>): ShoppingItem {
  return {
    ingredient_name: row.ingredient_name as string,
    total_quantity: Number(row.total_quantity),
    unit: row.unit as string,
    checked: row.checked as boolean,
    checked_by: (row.checked_by as string[]) ?? [],
    recipe_ids: (row.recipe_ids as string[]) ?? [],
  };
}

export async function getShoppingList(weekStartStr: string): Promise<{ week_start: string; items: ShoppingItem[] }> {
  const { familyId } = await getCurrentUserAndFamily();
  if (!familyId) return { items: [], week_start: weekStartStr };

  const weekStart = new Date(weekStartStr);
  try {
    const rows = await prisma.shoppingItem.findMany({
      where: { familyId, weekStart },
      orderBy: { ingredientName: "asc" },
    });
    return { week_start: weekStartStr, items: rows.map(rowToItem) };
  } catch (err) {
    console.error("Prisma getShoppingList error, falling back to Supabase", err);
    const supabase = await createClient();
    const { data: rows, error } = await supabase
      .from("shopping_items")
      .select("*")
      .eq("family_id", familyId)
      .eq("week_start", weekStartStr)
      .order("ingredient_name");

    if (error) throw error;
    return {
      week_start: weekStartStr,
      items: (rows ?? []).map(rowToItemFromSupabase),
    };
  }
}

export async function syncShoppingList(weekStartStr: string) {
  console.log("[syncShoppingList] Starting sync for week:", weekStartStr);

  const { familyId } = await getCurrentUserAndFamily();
  if (!familyId) {
    console.warn("[syncShoppingList] No family found, skipping sync");
    return { week_start: weekStartStr, items: [] };
  }
  console.log("[syncShoppingList] Family ID:", familyId);

  const weekStart = new Date(weekStartStr);

  // 1. Get Plan and Recipes - Use Supabase directly for consistency
  // (Recipes are created via Supabase, so we should read from Supabase too)
  let days: DayPlan[] = [];
  const recipeMap = new Map<string, Recipe>();

  const supabase = await createClient();

  // Fetch week plan from Supabase
  const { data: plan, error: planError } = await supabase
    .from("week_plans")
    .select("days")
    .eq("family_id", familyId)
    .eq("start_date", weekStartStr)
    .maybeSingle();

  if (planError) {
    console.error("[syncShoppingList] Error fetching week plan:", planError);
  }

  days = (plan?.days as DayPlan[]) ?? [];
  console.log("[syncShoppingList] Found", days.length, "days in plan");

  // Extract recipe IDs from the plan
  const recipeIds = new Set<string>();
  days.forEach(d => {
    if (!d.meals) return;
    MEAL_KEYS.forEach(key => {
      (d.meals[key] ?? []).forEach(slot => {
        if (slot.recipe_id) recipeIds.add(slot.recipe_id);
      });
    });
  });
  console.log("[syncShoppingList] Recipe IDs in plan:", Array.from(recipeIds));

  // Fetch recipes from Supabase
  if (recipeIds.size > 0) {
    const { data: dbRecipes, error: recipeError } = await supabase
      .from("recipes")
      .select("*")
      .in("id", Array.from(recipeIds));

    if (recipeError) {
      console.error("[syncShoppingList] Error fetching recipes:", recipeError);
    }

    console.log("[syncShoppingList] Found", dbRecipes?.length ?? 0, "recipes");

    (dbRecipes ?? []).forEach(r => {
      console.log("[syncShoppingList] Recipe", r.name, "has", r.ingredients?.length ?? 0, "ingredients");
      recipeMap.set(r.id, {
        id: r.id,
        name: r.name,
        meal_type: r.meal_type,
        ingredients: r.ingredients ?? [],
        instructions: r.instructions ?? "",
        family_id: r.family_id,
        created_by: r.user_id ?? null,
        created_at: r.created_at,
      });
    });
  }

  // 2. Aggregate
  const aggregated = aggregateIngredients(days, recipeMap);
  console.log("[syncShoppingList] Aggregated", aggregated.length, "ingredients");
  if (aggregated.length > 0) {
    console.log("[syncShoppingList] Sample:", aggregated[0]);
  }

  // 3. Get existing to preserve checked status and identify deletions
  const currentList = await getShoppingList(weekStartStr);
  const existingByKey = new Map(
    currentList.items.map(item => [`${item.ingredient_name}|${item.unit}`, item])
  );

  const itemsToUpsert = aggregated.map(item => {
    const existing = existingByKey.get(`${item.ingredient_name}|${item.unit}`);
    return {
      ...item,
      checked: existing?.checked ?? false,
      checked_by: existing?.checked_by ?? [],
    };
  });

  // Identify items to delete:
  // These are items that EXIST in the DB, have recipe_ids (not manual),
  // but are NOT in the new aggregated list.
  const newAggregatedKeys = new Set(aggregated.map(item => `${item.ingredient_name}|${item.unit}`));
  const itemsToDelete = currentList.items.filter(item => {
    const key = `${item.ingredient_name}|${item.unit}`;
    const isManual = item.recipe_ids.length === 0;
    return !isManual && !newAggregatedKeys.has(key);
  });

  console.log("[syncShoppingList] Items to upsert:", itemsToUpsert.length, "| Items to delete:", itemsToDelete.length);

  // 4. Execute changes via Supabase (reuse client from above)

  // Deletions
  if (itemsToDelete.length > 0) {
    for (const item of itemsToDelete) {
      try {
        await supabase
          .from("shopping_items")
          .delete()
          .eq("family_id", familyId)
          .eq("week_start", weekStartStr)
          .eq("ingredient_name", item.ingredient_name)
          .eq("unit", item.unit);
      } catch (delErr) {
        console.warn("Failed to delete shopping item:", item.ingredient_name, delErr);
      }
    }
  }

  // Upserts
  if (itemsToUpsert.length > 0) {
    const upsertData = itemsToUpsert
      .map(item => {
        // Ensure total_quantity is a valid number
        const quantity = typeof item.total_quantity === 'number'
          ? item.total_quantity
          : parseFloat(String(item.total_quantity));

        if (isNaN(quantity)) {
          console.warn(`[syncShoppingList] Skipping item with invalid quantity: ${item.ingredient_name} - ${item.total_quantity}`);
          return null;
        }

        return {
          family_id: familyId,
          week_start: weekStartStr,
          ingredient_name: item.ingredient_name,
          total_quantity: quantity,
          unit: item.unit,
          checked: item.checked,
          checked_by: item.checked_by,
          recipe_ids: item.recipe_ids,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const { error } = await supabase
      .from("shopping_items")
      .upsert(upsertData, {
        onConflict: "family_id,week_start,ingredient_name,unit"
      });
    if (error) {
      console.error("[syncShoppingList] Upsert error:", error);
    } else {
      console.log("[syncShoppingList] Upsert successful!");
    }
  }

  return getShoppingList(weekStartStr);
}

export async function refreshShoppingList(weekStartStr: string) {
  return syncShoppingList(weekStartStr);
}

function rowToItem(row: {
  ingredientName: string;
  totalQuantity: unknown;
  unit: string;
  checked: boolean;
  checkedBy: string[];
  recipeIds: string[];
}): ShoppingItem {
  const total_quantity = Number(row.totalQuantity);
  return {
    ingredient_name: row.ingredientName,
    total_quantity,
    unit: row.unit,
    checked: row.checked,
    checked_by: row.checkedBy ?? [],
    recipe_ids: row.recipeIds ?? [],
  };
}

export async function toggleShoppingItem(
  weekStartStr: string,
  ingredientName: string,
  unit: string,
  checked: boolean
) {
  const { userId, familyId } = await getCurrentUserAndFamily();
  if (!userId || !familyId) throw new Error("Not authenticated or no family");

  const weekStart = new Date(weekStartStr);
  try {
    const row = await prisma.shoppingItem.findUnique({
      where: {
        familyId_weekStart_ingredientName_unit: {
          familyId,
          weekStart,
          ingredientName,
          unit,
        },
      },
      select: { checkedBy: true },
    });
    let checkedBy: string[] = (row?.checkedBy as string[]) ?? [];
    if (checked) {
      if (!checkedBy.includes(userId)) checkedBy = [...checkedBy, userId];
    } else {
      checkedBy = checkedBy.filter((id) => id !== userId);
    }
    const newChecked = checkedBy.length > 0;
    await prisma.shoppingItem.update({
      where: {
        familyId_weekStart_ingredientName_unit: {
          familyId,
          weekStart,
          ingredientName,
          unit,
        },
      },
      data: { checked: newChecked, checkedBy },
    });
    return { ok: true };
  } catch {
    const supabase = await createClient();
    const { data: row } = await supabase
      .from("shopping_items")
      .select("checked_by")
      .eq("family_id", familyId)
      .eq("week_start", weekStartStr)
      .eq("ingredient_name", ingredientName)
      .eq("unit", unit)
      .single();
    let checked_by: string[] = (row?.checked_by as string[]) ?? [];
    if (checked) {
      if (!checked_by.includes(userId)) checked_by = [...checked_by, userId];
    } else {
      checked_by = checked_by.filter((id) => id !== userId);
    }
    const newChecked = checked_by.length > 0;
    await supabase
      .from("shopping_items")
      .update({ checked: newChecked, checked_by })
      .eq("family_id", familyId)
      .eq("week_start", weekStartStr)
      .eq("ingredient_name", ingredientName)
      .eq("unit", unit);
    return { ok: true };
  }
}
export async function addManualShoppingItem(
  weekStartStr: string,
  ingredientName: string,
  quantity: number,
  unit: string
) {
  const { familyId } = await getCurrentUserAndFamily();
  if (!familyId) throw new Error("No family found");

  const weekStart = new Date(weekStartStr);
  const ingredient = ingredientName.trim();
  const u = unit.trim() || "pcs";

  try {
    await prisma.shoppingItem.upsert({
      where: {
        familyId_weekStart_ingredientName_unit: {
          familyId,
          weekStart,
          ingredientName: ingredient,
          unit: u,
        },
      },
      update: {
        totalQuantity: { increment: quantity },
      },
      create: {
        familyId,
        weekStart,
        ingredientName: ingredient,
        totalQuantity: quantity,
        unit: u,
        checked: false,
        checkedBy: [],
        recipeIds: [],
      },
    });
    return { ok: true };
  } catch (err) {
    console.error("Prisma addManualShoppingItem error, falling back to Supabase", err);
    const supabase = await createClient();

    // Manual upsert logic for Supabase since increment is tricky in a single upsert call
    const { data: existing } = await supabase
      .from("shopping_items")
      .select("total_quantity")
      .eq("family_id", familyId)
      .eq("week_start", weekStartStr)
      .eq("ingredient_name", ingredient)
      .eq("unit", u)
      .single();

    if (existing) {
      await supabase
        .from("shopping_items")
        .update({ total_quantity: Number(existing.total_quantity) + quantity })
        .eq("family_id", familyId)
        .eq("week_start", weekStartStr)
        .eq("ingredient_name", ingredient)
        .eq("unit", u);
    } else {
      await supabase.from("shopping_items").insert({
        family_id: familyId,
        week_start: weekStartStr,
        ingredient_name: ingredient,
        total_quantity: quantity,
        unit: u,
        checked: false,
        checked_by: [],
        recipe_ids: [],
      });
    }
    return { ok: true };
  }
}
