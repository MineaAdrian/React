"use client";

import { useEffect, useState, useRef } from "react";
import { getRecipes, createRecipe, uploadRecipePhoto, updateRecipe } from "@/app/actions/recipes";
import { RecipeCard } from "@/components/recipes/RecipeCard";
import { MEAL_LABELS } from "@/lib/week";
import type { Recipe } from "@/types";
import type { MealType } from "@/types";

type Props = { familyId: string | null };

export function RecipesPageClient({ familyId }: Props) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [mealType, setMealType] = useState<MealType>("dinner");
  const [instructions, setInstructions] = useState("");
  const [ingredientsText, setIngredientsText] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  // Changed logic to be more intuitive: "Family Only" vs "Public"
  const [isFamilyOnly, setIsFamilyOnly] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getRecipes().then((r) => {
      setRecipes(r);
      setLoading(false);
    });
  }, []);

  const handleEdit = (recipe: Recipe) => {
    setEditingRecipeId(recipe.id);
    setName(recipe.name);
    setMealType(recipe.meal_type);
    setInstructions(recipe.instructions);
    // If it has a family_id, it is Family Only
    setIsFamilyOnly(!!recipe.family_id);
    setIngredientsText(
      recipe.ingredients
        .map((ing) => `${ing.name} ${ing.quantity} ${ing.unit}`)
        .join("\n")
    );
    setPhotoUrl(recipe.photo_url || "");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingRecipeId(null);
    setName("");
    setMealType("dinner");
    setInstructions("");
    setIngredientsText("");
    setPhotoUrl("");
    setIsFamilyOnly(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      const url = await uploadRecipePhoto(formData);
      setPhotoUrl(url);
    } catch (err: any) {
      console.error("Upload failed", err);
      alert(`Upload failed: ${err.message || "Please check your connection."}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ingredients = ingredientsText
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const match = line.match(/^(.+?)\s+(\d+(?:\.\d+)?)\s*(\w*)$/);
        if (match) {
          return { name: match[1].trim(), quantity: parseFloat(match[2]), unit: match[3] || "pcs" };
        }
        return { name: line.trim(), quantity: 1, unit: "pcs" };
      });

    // If they want family only but have no family, fallback to public or warn
    const targetFamilyId = isFamilyOnly && familyId ? familyId : null;

    if (editingRecipeId) {
      await updateRecipe(editingRecipeId, name, mealType, ingredients, instructions, photoUrl, targetFamilyId);
    } else {
      await createRecipe(name, mealType, ingredients, instructions, targetFamilyId, photoUrl);
    }

    handleCancel();
    getRecipes().then(setRecipes);
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sage-600 font-medium animate-pulse">Loading recipes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-sage-800">Recipes</h1>
          <p className="text-xs text-sage-500 mt-1">Community & Family kitchen</p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (showForm) handleCancel();
            else setShowForm(true);
          }}
          className={`btn-primary px-6 transition-all ${showForm ? 'bg-red-500 hover:bg-red-600' : ''}`}
        >
          {showForm ? "Cancel" : "Add New Recipe"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-6 p-8 border-2 border-sage-100 shadow-xl shadow-sage-900/5 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-semibold text-sage-800">
              {editingRecipeId ? "Edit Recipe" : "Create New Recipe"}
            </h2>

            <div className="flex items-center gap-3 px-4 py-2 bg-sage-50 rounded-2xl border border-sage-100">
              <div className="flex flex-col">
                <label className="text-[10px] font-black uppercase tracking-widest text-sage-600 cursor-pointer" htmlFor="family-only-toggle">
                  🏠 Family Only
                </label>
                {!familyId && <span className="text-[8px] text-amber-600 font-bold uppercase">No family joined yet</span>}
              </div>
              <input
                id="family-only-toggle"
                type="checkbox"
                checked={isFamilyOnly && !!familyId}
                disabled={!familyId}
                onChange={(e) => setIsFamilyOnly(e.target.checked)}
                className="w-5 h-5 rounded-lg border-sage-300 text-sage-600 focus:ring-sage-500 cursor-pointer disabled:opacity-30"
              />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-sage-700 mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="input"
                  placeholder="e.g. Pasta carbonara"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-sage-700 mb-1">Meal type</label>
                <select
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value as MealType)}
                  className="input"
                >
                  {(Object.keys(MEAL_LABELS) as MealType[]).map((key) => (
                    <option key={key} value={key}>
                      {MEAL_LABELS[key]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-sage-700 mb-1">
                  Ingredients (one per line: name quantity unit)
                </label>
                <textarea
                  value={ingredientsText}
                  onChange={(e) => setIngredientsText(e.target.value)}
                  rows={6}
                  className="input font-mono text-sm"
                  placeholder="Tomatoes 2 pcs"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-sage-700 mb-1">Instructions</label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={4}
                  className="input"
                  placeholder="Steps..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-sage-700 mb-1">Recipe Photo</label>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="btn-secondary flex items-center gap-2"
                  >
                    {isUploading ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-sage-300 border-t-sage-600" />
                    ) : (
                      "📷 Select Photo"
                    )}
                  </button>
                  {photoUrl && (
                    <div className="relative h-16 w-16 overflow-hidden rounded-xl shadow-sm border border-sage-200">
                      <img src={photoUrl} alt="Preview" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setPhotoUrl("")}
                        className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
                <div className="mt-2">
                  <input
                    type="url"
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    className="input text-xs"
                    placeholder="Or paste image URL here..."
                  />
                </div>
              </div>
            </div>
          </div>

          <button type="submit" className="btn-primary w-full py-4 text-base font-bold shadow-lg shadow-sage-900/10" disabled={isUploading}>
            {isUploading ? "Uploading..." : editingRecipeId ? "Update Recipe" : "Save Recipe"}
          </button>
        </form>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {recipes.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            onSelect={() => handleEdit(recipe)}
            onEdit={() => handleEdit(recipe)}
          />
        ))}
      </div>
      {recipes.length === 0 && !showForm && (
        <div className="card p-12 text-center border-2 border-dashed border-sage-200">
          <div className="text-4xl mb-4">📖</div>
          <p className="text-sage-500 font-medium">Your kitchen is empty. Add your first recipe!</p>
        </div>
      )}
    </div>
  );
}
