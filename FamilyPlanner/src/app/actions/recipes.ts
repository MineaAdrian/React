"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserAndFamily } from "@/lib/auth";
import type { Recipe, MealType } from "@/types";

function toRecipe(r: {
  id: string;
  name: string;
  mealType?: string;
  meal_type?: string;
  ingredients: unknown;
  instructions: string;
  familyId?: string | null;
  family_id?: string | null;
  cookingTimeMinutes?: number | null;
  cooking_time_minutes?: number | null;
  difficulty?: string | null;
  tags?: string[];
  photoUrl?: string | null;
  photo_url?: string | null;
  createdAt?: Date;
  created_at?: string;
}): Recipe {
  const mt = r.mealType ?? r.meal_type ?? "dinner";
  const created = r.createdAt ?? (r.created_at ? new Date(r.created_at) : new Date());
  return {
    id: r.id,
    name: r.name,
    meal_type: mt as MealType,
    ingredients: (r.ingredients as Recipe["ingredients"]) ?? [],
    instructions: r.instructions ?? "",
    family_id: r.familyId ?? r.family_id ?? null,
    cooking_time_minutes: r.cookingTimeMinutes ?? r.cooking_time_minutes ?? undefined,
    difficulty: (r.difficulty as Recipe["difficulty"]) ?? undefined,
    tags: r.tags?.length ? r.tags : undefined,
    photo_url: r.photoUrl ?? r.photo_url ?? undefined,
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
  photoUrl?: string
): Promise<string> {
  const { familyId: userFamilyId } = await getCurrentUserAndFamily();
  // If familyIdInput is explicitly null, it means its a public recipe.
  // if its undefined (not passed), we use the user's family.
  const fid = familyIdInput === undefined ? userFamilyId : familyIdInput;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .insert({
      family_id: fid,
      name,
      meal_type: mealType,
      ingredients,
      instructions,
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
  familyId: string | null = null
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("recipes")
    .update({
      name,
      meal_type: mealType,
      ingredients,
      instructions,
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
