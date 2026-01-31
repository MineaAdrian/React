"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserAndFamily } from "@/lib/auth";
import type { Recipe, MealType } from "@/types";

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
  const mt = r.mealType ?? r.meal_type ?? "dinner";
  const created = r.createdAt ?? (r.created_at ? new Date(r.created_at) : new Date());
  return {
    id: r.id,
    name: r.name,
    name_ro: r.name_ro,
    meal_type: mt as MealType,
    ingredients: (r.ingredients as Recipe["ingredients"]) ?? [],
    ingredients_ro: r.ingredients_ro,
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
  mealType: MealType,
  ingredients: Recipe["ingredients"],
  instructions: string,
  familyIdInput: string | null,
  photoUrl?: string,
  name_ro?: string,
  instructions_ro?: string,
  ingredients_ro?: any
): Promise<string> {
  const { userId, familyId: userFamilyId } = await getCurrentUserAndFamily();
  // If familyIdInput is explicitly null, it means its a public recipe.
  // if its undefined (not passed), we use the user's family.
  const fid = familyIdInput === undefined ? userFamilyId : familyIdInput;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .insert({
      family_id: fid,
      user_id: userId,
      name,
      name_ro,
      meal_type: mealType,
      ingredients,
      ingredients_ro,
      instructions,
      instructions_ro,
      photo_url: photoUrl || null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating recipe via Supabase:", error);
    throw error;
  }
  if (!data?.id) throw new Error("Failed to create recipe");
  return data.id;
}

export async function uploadRecipePhoto(formData: FormData): Promise<string> {
  const file = formData.get("file") as File;
  if (!file) throw new Error("No file provided");

  try {
    const supabase = await createClient();
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    // Store in a flat structure or specific folder
    const filePath = `recipe-photos/${fileName}`;

    const { data, error } = await supabase.storage
      .from("recipes")
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error("Supabase Storage Error:", error);
      throw new Error(`Storage error: ${error.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from("recipes")
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (err) {
    console.error("uploadRecipePhoto exception:", err);
    throw err;
  }
}

export async function updateRecipe(
  id: string,
  name: string,
  mealType: MealType,
  ingredients: Recipe["ingredients"],
  instructions: string,
  photoUrl?: string,
  familyId: string | null = null,
  name_ro?: string,
  instructions_ro?: string,
  ingredients_ro?: any
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("recipes")
    .update({
      name,
      name_ro,
      meal_type: mealType,
      ingredients,
      ingredients_ro,
      instructions,
      instructions_ro,
      photo_url: photoUrl || null,
      family_id: familyId,
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

      // Use ADMIN_EMAIL as the primary destination as requested by the user
      const reportEmail = process.env.ADMIN_EMAIL || "mineaad14@gmail.com";

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
    } catch (emailErr) {
      console.warn("Failed to send report email:", emailErr);
    }

    // Always log the report for server-side traceability
    console.log(`[REPORT SUCCESS] Recipe ${recipeId} reported by ${userId}. Reason: ${reason}`);

  } catch (err: any) {
    console.error("reportRecipe critically failed:", err);
    throw new Error(err.message || "Failed to process report");
  }
}
