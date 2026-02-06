"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserAndFamily } from "@/lib/auth";
import type { DayPlan, Recipe, ShoppingItem, Ingredient } from "@/types";
import type { MealType } from "@/types";

const MEAL_KEYS: MealType[] = ["breakfast", "lunch", "dinner", "togo", "dessert"];

// Helper to normalize strings for comparison (remove punctuation, standard case)
function normalizeString(s: string): string {
  return s.toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "") // Remove punctuation
    .replace(/\s{2,}/g, " ") // Normalize spaces
    .trim();
}

// Helper to normalize units
function normalizeUnit(u: string): string {
  const s = normalizeString(u);
  // Map common variations
  const map: Record<string, string> = {
    "tsp": "tsp", "teaspoon": "tsp", "teaspoons": "tsp",
    "tbsp": "tbsp", "tablespoon": "tbsp", "tablespoons": "tbsp", "tbs": "tbsp", "tbl": "tbsp",
    "g": "g", "gr": "g", "gram": "g", "grams": "g",
    "kg": "kg", "kilogram": "kg", "kilograms": "kg",
    "mg": "mg", "milligram": "mg", "milligrams": "mg",
    "ml": "ml", "milliliter": "ml", "milliliters": "ml",
    "l": "l", "liter": "l", "liters": "l", "lit": "l",
    "oz": "oz", "ounce": "oz", "ounces": "oz",
    "lb": "lb", "lbs": "lb", "pound": "lb", "pounds": "lb",
    "cup": "cup", "cups": "cup", "c": "cup",
    "pcs": "pcs", "piece": "pcs", "pieces": "pcs", "pc": "pcs",
    "pinch": "pinch", "pinches": "pinch",
    "pkg": "pkg", "pack": "pkg", "packet": "pkg", "package": "pkg", "packages": "pkg",
    "jar": "jar", "jars": "jar",
    "can": "can", "cans": "can",
    "bottle": "bottle", "bottles": "bottle",
    "slice": "slice", "slices": "slice",
    "clove": "clove", "cloves": "clove",
    "bag": "bag", "bags": "bag",
    "bunch": "bunch", "bunches": "bunch"
  };
  return map[s] || s; // Return mapped value or original normalized value
}

function aggregateIngredients(days: DayPlan[], recipeMap: Map<string, Recipe>): ShoppingItem[] {
  // Step 1: Aggregate by (NormalizedName + NormalizedUnit)
  const map = new Map<string, { quantity: number; unit: string; recipeIds: Set<string>; nameEn: string; nameRo?: string, baseKey: string }>();

  for (const day of days) {
    for (const key of MEAL_KEYS) {
      const slots = day.meals[key] ?? [];
      for (const slot of slots) {
        const rid = slot.recipe_id;
        if (!rid) continue;
        const recipe = recipeMap.get(rid);
        if (!recipe?.ingredients) continue;

        const getRoName = (index: number, ing: Ingredient) => {
          if (ing.name_ro) return ing.name_ro;
          if (recipe.ingredients_ro && Array.isArray(recipe.ingredients_ro)) {
            return recipe.ingredients_ro[index]?.name;
          }
          return undefined;
        };

        recipe.ingredients.forEach((ing, index) => {
          let quantity = 0;
          if (typeof ing.quantity === 'number') {
            quantity = ing.quantity;
          } else if (typeof ing.quantity === 'string') {
            const s = (ing.quantity as string).trim();
            if (s === "") {
              quantity = 0;
            } else {
              const parsed = parseFloat(s);
              if (!isNaN(parsed)) {
                quantity = parsed;
              } else {
                console.warn(`[aggregateIngredients] Invalid quantity: "${ing.quantity}". Using 0.`);
              }
            }
          }

          const roName = getRoName(index, ing);

          // Use aggressive normalization for key generation
          const normalizedEnName = normalizeString(ing.name);
          const normalizedRoName = roName ? normalizeString(roName) : undefined;

          const names = [normalizedEnName, normalizedRoName].filter(Boolean).sort();
          const baseKey = names.join('||'); // This key identifies the distinct ingredient

          const normUnit = normalizeUnit(ing.unit);
          const k = `${baseKey}|${normUnit}`; // Key discriminates by NORMALIZED unit

          const cur = map.get(k);
          if (cur) {
            cur.quantity += quantity;
            cur.recipeIds.add(rid);
            if (!cur.nameRo && roName) cur.nameRo = roName;
          } else {
            map.set(k, {
              quantity,
              unit: normUnit, // Store the normalized unit for consistency
              recipeIds: new Set([rid]),
              nameEn: ing.name, // Keep original display name
              nameRo: roName,
              baseKey
            });
          }
        });
      }
    }
  }

  // Step 2: Post-process to merge/cleanup duplicates for the same ingredient (baseKey)
  // Group all entries by baseKey
  const byBaseKey = new Map<string, typeof map extends Map<any, infer V> ? V[] : never>();
  for (const val of map.values()) {
    const list = byBaseKey.get(val.baseKey) ?? [];
    list.push(val);
    byBaseKey.set(val.baseKey, list);
  }

  const finalItems: ShoppingItem[] = [];

  for (const [_, entries] of byBaseKey) {
    // If we have multiple entries for the same ingredient (e.g. different units),
    // we try to clean up "0" quantities if a better alternative exists.

    const hasPositiveQty = entries.some(e => e.quantity > 0);

    if (entries.length > 1 && hasPositiveQty) {
      // Filter out entries with 0 quantity if we have valid ones
      const validEntries = entries.filter(e => e.quantity > 0);
      validEntries.forEach(val => {
        finalItems.push({
          ingredient_name: val.nameEn,
          ingredient_name_ro: val.nameRo,
          total_quantity: val.quantity,
          unit: val.unit,
          checked: false,
          checked_by: [] as string[],
          recipe_ids: Array.from(val.recipeIds),
        });
      });
    } else {
      // Either single entry OR all are 0. Keep all (or the single one).
      // If we have multiple 0s with different units (e.g. tsp vs tbsp) but all 0 quantity,
      // we might want to consolidate them, but it's simpler to keep one to avoid data loss.
      // Prioritize the one with the most common unit if possible, or just the first.

      // Better yet, if we have "salt tsp: 0" and "salt pinch: 0", just show one.
      const uniqueEntries = entries.length > 1 && !hasPositiveQty ? [entries[0]] : entries;

      uniqueEntries.forEach(val => {
        finalItems.push({
          ingredient_name: val.nameEn,
          ingredient_name_ro: val.nameRo,
          total_quantity: val.quantity,
          unit: val.unit,
          checked: false,
          checked_by: [] as string[],
          recipe_ids: Array.from(val.recipeIds),
        });
      });
    }
  }

  return finalItems;
}

function rowToItemFromSupabase(row: Record<string, unknown>): ShoppingItem {
  return {
    ingredient_name: row.ingredient_name as string,
    ingredient_name_ro: row.ingredient_name_ro as string | undefined,
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

  // 1. Get Plan and Recipes - Use Supabase directly for consistency (Recipies) but Prisma for Plan (Consistency with write)
  let days: DayPlan[] = [];
  const recipeMap = new Map<string, Recipe>();

  // Use Prisma to fetch the plan ensuring Read-Your-Writes consistency
  // assignMeal writes via Prisma, so we must read via Prisma to see the change immediately.
  const plan = await prisma.weekPlan.findUnique({
    where: {
      familyId_startDate: {
        familyId,
        startDate: new Date(weekStartStr)
      }
    }
  });

  days = (plan?.days as unknown as DayPlan[]) ?? [];
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

  // Fetch recipes from Supabase (Recipes are less mutable, Supabase is fine/better for potentially large list)
  const supabase = await createClient();
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
      recipeMap.set(r.id, {
        id: r.id,
        name: r.name,
        name_ro: r.name_ro,
        meal_type: r.meal_type,
        ingredients: r.ingredients ?? [],
        ingredients_ro: r.ingredients_ro,
        instructions: r.instructions ?? "",
        instructions_ro: r.instructions_ro,
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
  console.log("[syncShoppingList] Fetching current list from DB...");
  const currentList = await getShoppingList(weekStartStr);
  console.log("[syncShoppingList] Fetched current list, items:", currentList.items.length);

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
    console.log("[syncShoppingList] Processing deletions...");
    // Delete items by creating sets of names and units to match
    // Supabase doesn't support multiple filters in a single call easily for (name AND unit), 
    // but we can delete them in a way that targets the specific combinations.
    // For simplicity and since we want to be safe, we'll delete by IDs if we had them, 
    // but here we use ingredient_name and unit.

    // We can use a single delete with OR if Supabase allowed it easily, but .in() is better for single columns.
    // Since we have composite keys, we can use a single call with a match if we use an array of objects for the filter in postgrest, but supabase-js delete doesn't support that directly in one call for multiple rows easily without multiple calls or a RPC.

    // HOWEVER, we can at least group them by something.
    // Given the abort error, let's just make them parallel instead of sequential to speed up,
    // and use more efficient Supabase syntax where possible.
    try {
      await Promise.all(itemsToDelete.map(item =>
        supabase
          .from("shopping_items")
          .delete()
          .eq("family_id", familyId)
          .eq("week_start", weekStartStr)
          .eq("ingredient_name", item.ingredient_name)
          .eq("unit", item.unit)
      ));
    } catch (delErr) {
      console.warn("Batch delete failed", delErr);
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
          ingredient_name_ro: item.ingredient_name_ro,
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

  revalidatePath("/shopping");
  return getShoppingList(weekStartStr);
}

export async function refreshShoppingList(weekStartStr: string) {
  return syncShoppingList(weekStartStr);
}

function rowToItem(row: {
  ingredientName: string;
  ingredientNameRo: string | null;
  totalQuantity: unknown;
  unit: string;
  checked: boolean;
  checkedBy: string[];
  recipeIds: string[];
}): ShoppingItem {
  const total_quantity = Number(row.totalQuantity);
  return {
    ingredient_name: row.ingredientName,
    ingredient_name_ro: row.ingredientNameRo ?? undefined,
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
    revalidatePath("/shopping");
    return { ok: true };
  }
}
export async function addManualShoppingItem(
  weekStartStr: string,
  ingredientName: string,
  quantity: number,
  unit: string,
  ingredientNameRo?: string
) {
  const { familyId } = await getCurrentUserAndFamily();
  if (!familyId) throw new Error("No family found");

  const weekStart = new Date(weekStartStr);
  const ingredient = ingredientName.trim();
  const u = unit.trim() || "pcs";

  // --- DUPLICATE PROTECTION ---
  // If the same item was modified in the last 5 seconds, ignore to prevent spam incrementing
  try {
    const fiveSecondsAgo = new Date(Date.now() - 5000);
    const recent = await prisma.shoppingItem.findFirst({
      where: {
        familyId,
        weekStart,
        ingredientName: ingredient,
        unit: u,
        createdAt: { gte: fiveSecondsAgo }
      }
    });
    if (recent) {
      console.warn("[DUPLICATE PREVENTED] Shopping item recently updated, ignoring spam request.");
      return { ok: true };
    }
  } catch (e) {
    // ignore lookup errors
  }

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
        ingredientNameRo: ingredientNameRo || null,
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
        ingredient_name_ro: ingredientNameRo || null,
        total_quantity: quantity,
        unit: u,
        checked: false,
        checked_by: [],
        recipe_ids: [],
      });
    }
    revalidatePath("/shopping");
    return { ok: true };
  }
}

export async function deleteShoppingItem(
  weekStartStr: string,
  ingredientName: string,
  unit: string
) {
  const { familyId } = await getCurrentUserAndFamily();
  if (!familyId) throw new Error("No family found");

  const weekStart = new Date(weekStartStr);

  try {
    await prisma.shoppingItem.delete({
      where: {
        familyId_weekStart_ingredientName_unit: {
          familyId,
          weekStart,
          ingredientName,
          unit,
        },
      },
    });
    return { ok: true };
  } catch (err) {
    console.error("Prisma deleteShoppingItem error, falling back to Supabase", err);
    const supabase = await createClient();
    await supabase
      .from("shopping_items")
      .delete()
      .eq("family_id", familyId)
      .eq("week_start", weekStartStr)
      .eq("ingredient_name", ingredientName)
      .eq("unit", unit);
    revalidatePath("/shopping");
    return { ok: true };
  }
}
