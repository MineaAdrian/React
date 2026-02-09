"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserAndFamily } from "@/lib/auth";
import type { Recipe, MealType, IngredientRo } from "@/types";

function toRecipe(r: {
  id: string;
  name: string;
  name_ro?: string;
  mealType?: string;
  meal_type?: string;
  ingredients: unknown;
  ingredients_ro?: unknown;
  instructions: string;
  instructions_ro?: string;
  familyId?: string | null;
  family_id?: string | null;
  cookingTimeMinutes?: number | null;
  cooking_time_minutes?: number | null;
  difficulty?: string | null;
  tags?: string[];
  photoUrl?: string | null;
  photo_url?: string | null;
  userId?: string | null;
  user_id?: string | null;
  createdAt?: Date;
  created_at?: string;
}): Recipe {
  const primaryMt = r.mealType ?? r.meal_type ?? "dinner";
  // The DB stores the full array in tags. We prefer that for the multi-label UI.
  const meal_type = (r.tags && r.tags.length > 0) ? r.tags : [primaryMt];

  const created = r.createdAt ?? (r.created_at ? new Date(r.created_at) : new Date());
  return {
    id: r.id,
    name: r.name,
    name_ro: r.name_ro,
    meal_type: meal_type as MealType[],
    ingredients: (r.ingredients as Recipe["ingredients"]) ?? [],
    ingredients_ro: r.ingredients_ro as Recipe["ingredients_ro"],
    instructions: r.instructions ?? "",
    instructions_ro: r.instructions_ro,
    family_id: r.familyId ?? r.family_id ?? null,
    cooking_time_minutes: r.cookingTimeMinutes ?? r.cooking_time_minutes ?? undefined,
    difficulty: (r.difficulty as Recipe["difficulty"]) ?? undefined,
    tags: r.tags?.length ? r.tags : undefined,
    photo_url: r.photoUrl ?? r.photo_url ?? undefined,
    created_by: r.userId ?? r.user_id ?? null,
    created_at: typeof created === "string" ? created : created.toISOString(),
  };
}

export async function getRecipes(): Promise<Recipe[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .order("name");

  if (error) {
    console.error("Error fetching recipes via Supabase:", error);
    throw error;
  }
  return (data ?? []).map((row) => toRecipe(row as Parameters<typeof toRecipe>[0]));
}

export async function createRecipe(
  name: string,
  mealType: MealType | MealType[],
  ingredients: Recipe["ingredients"],
  instructions: string,
  familyIdInput: string | null,
  photoUrl?: string,
  name_ro?: string,
  instructions_ro?: string,
  ingredients_ro?: IngredientRo[]
): Promise<Recipe | string> {
  const { userId, familyId: userFamilyId } = await getCurrentUserAndFamily();
  // If familyIdInput is explicitly null, it means its a public recipe.
  // if its undefined (not passed), we use the user's family.
  const fid = familyIdInput === undefined ? userFamilyId : familyIdInput;

  const supabase = await createClient();

  // --- DUPLICATE PROTECTION ---
  // Check if a recipe with the same name and instructions by this user was created in the last 60 seconds.
  const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
  const { data: existingRecipe } = await supabase
    .from("recipes")
    .select("*")
    .eq("user_id", userId)
    .eq("name", name)
    .eq("instructions", instructions)
    .gt("created_at", oneMinuteAgo)
    .maybeSingle();

  if (existingRecipe) {
    console.warn("[DUPLICATE PREVENTED] Recipe already exists, returning existing one:", existingRecipe.id);
    return toRecipe(existingRecipe as any);
  }

  const { data, error } = await supabase
    .from("recipes")
    .insert({
      family_id: fid,
      user_id: userId,
      name,
      name_ro,
      // For DB compatibility: send first item to a column with string constraint
      meal_type: Array.isArray(mealType) ? (mealType[0] || 'dinner') : mealType,
      ingredients,
      ingredients_ro,
      instructions,
      instructions_ro,
      photo_url: photoUrl || null,
      // Store full list in tags (no constraint)
      tags: Array.isArray(mealType) ? mealType : [mealType],
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating recipe via Supabase:", error);
    throw error;
  }

  const { data: fullRecipe, error: fetchError } = await supabase
    .from("recipes")
    .select("*")
    .eq("id", data.id)
    .single();

  if (fetchError || !fullRecipe) {
    console.error("Error fetching created recipe:", fetchError);
    return data.id;
  }

  return toRecipe(fullRecipe as any);
}


export async function updateRecipe(
  id: string,
  name: string,
  mealType: MealType | MealType[],
  ingredients: Recipe["ingredients"],
  instructions: string,
  photoUrl?: string,
  familyId: string | null = null,
  name_ro?: string,
  instructions_ro?: string,
  ingredients_ro?: IngredientRo[]
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("recipes")
    .update({
      name,
      name_ro,
      // DB single value compatibility
      meal_type: Array.isArray(mealType) ? (mealType[0] || 'dinner') : mealType,
      ingredients,
      ingredients_ro,
      instructions,
      instructions_ro,
      photo_url: photoUrl || null,
      family_id: familyId,
      // DB full list
      tags: Array.isArray(mealType) ? mealType : [mealType],
    })
    .eq("id", id);

  if (error) {
    console.error("Error updating recipe via Supabase:", error);
    throw error;
  }
}

export async function deleteRecipe(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("recipes")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting recipe via Supabase:", error);
    throw error;
  }
}
export async function reportRecipe(recipeId: string, reason: string): Promise<void> {
  try {
    const { userId, familyId } = await getCurrentUserAndFamily();
    if (!userId) throw new Error("Unauthorized");

    const supabase = await createClient();

    // Get reporting user's name/email - use maybeSingle to avoid throw if profile missing
    const { data: profile } = await supabase
      .from("profiles")
      .select("name, email")
      .eq("id", userId)
      .maybeSingle();

    // Get recipe details for the report
    const { data: recipe } = await supabase
      .from("recipes")
      .select("name")
      .eq("id", recipeId)
      .maybeSingle();

    if (!recipe) throw new Error("Recipe not found");

    // Attempt to send email but don't fail the whole action if it fails
    try {
      const { sendEmail } = await import("@/lib/email");

      const reportEmail = process.env.ADMIN_EMAIL;
      if (!reportEmail) {
        console.warn("ADMIN_EMAIL not set; skipping report email.");
      } else {
        await sendEmail({
          to: reportEmail,
          subject: `🚩 Recipe Reported: ${recipe.name}`,
          html: `
          <h2>Recipe Report Received</h2>
          <p><strong>Recipe:</strong> ${recipe.name} (ID: ${recipeId})</p>
          <p><strong>Reported by:</strong> ${profile?.name || "Unknown"} (${profile?.email || "No email"})</p>
          <p><strong>Reason:</strong> ${reason}</p>
          <p>Please review this recipe in the dashboard.</p>
        `,
        });
      }
    } catch (emailErr) {
      console.warn("Failed to send report email:", emailErr);
    }

    // Always log the report for server-side traceability
    console.log(`[REPORT SUCCESS] Recipe ${recipeId} reported by ${userId}. Reason: ${reason}`);

  } catch (err: unknown) {
    console.error("reportRecipe critically failed:", err);
    throw new Error(err instanceof Error ? err.message : "Failed to process report");
  }
}
