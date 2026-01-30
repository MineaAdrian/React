"use client";

import { useEffect, useState, useRef } from "react";
import { getRecipes, createRecipe, uploadRecipePhoto, updateRecipe, reportRecipe } from "@/app/actions/recipes";
import { RecipeCard } from "@/components/recipes/RecipeCard";
import { MEAL_LABELS } from "@/lib/week";
import { useAuth } from "@/components/providers/AuthProvider";
import type { Recipe } from "@/types";
import type { MealType } from "@/types";

type Props = { familyId: string | null };

export function RecipesPageClient({ familyId }: Props) {
  const { profile } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMyRecipes, setFilterMyRecipes] = useState(false);
  const [name, setName] = useState("");
  const [mealType, setMealType] = useState<MealType>("dinner");
  const [instructions, setInstructions] = useState("");
  const [ingredients, setIngredients] = useState<{ name: string; quantity: number | string; unit: string }[]>([
    { name: "", quantity: 1, unit: "pcs/g/ml/l" }
  ]);
  const [photoUrl, setPhotoUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
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
    setIsFamilyOnly(!!recipe.family_id);
    setIngredients(recipe.ingredients.map(ing => ({ ...ing })));
    setPhotoUrl(recipe.photo_url || "");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleReport = async (id: string, reason: string) => {
    try {
      await reportRecipe(id, reason);
      alert("Recipe reported successfully. Thank you!");
    } catch (err) {
      console.error("Report failed", err);
      alert("Failed to report recipe.");
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingRecipeId(null);
    setName("");
    setMealType("dinner");
    setInstructions("");
    setIngredients([{ name: "", quantity: 1, unit: "pcs" }]);
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
    const cleanedIngredients = ingredients
      .filter(ing => ing.name.trim() !== "")
      .map(ing => ({
        name: ing.name.trim(),
        quantity: typeof ing.quantity === 'string' ? parseFloat(ing.quantity) || 0 : ing.quantity,
        unit: ing.unit.trim() || "pcs"
      }));

    const targetFamilyId = isFamilyOnly && familyId ? familyId : null;

    if (editingRecipeId) {
      await updateRecipe(editingRecipeId, name, mealType, cleanedIngredients, instructions, photoUrl, targetFamilyId);
    } else {
      await createRecipe(name, mealType, cleanedIngredients, instructions, targetFamilyId, photoUrl);
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

  // Filter recipes based on search query
  const filteredRecipes = recipes.filter((recipe) => {
    const query = searchQuery.toLowerCase().trim();
    const isMyRecipe = filterMyRecipes ? recipe.created_by === profile?.id : true;

    if (!query) return isMyRecipe;

    const nameMatch = recipe.name.toLowerCase().includes(query);
    const ingredientMatch = recipe.ingredients?.some(
      (ing) => ing.name.toLowerCase().includes(query)
    );

    return (nameMatch || ingredientMatch) && isMyRecipe;
  });

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

      {/* Search and Filters */}
      {!showForm && recipes.length > 0 && (
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search recipes by name or ingredient..."
              className="input pl-10"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-sage-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-sage-50 rounded-xl border border-sage-100 shrink-0">
            <input
              id="filter-my-recipes"
              type="checkbox"
              checked={filterMyRecipes}
              onChange={(e) => setFilterMyRecipes(e.target.checked)}
              className="w-5 h-5 rounded-lg border-sage-300 text-sage-600 focus:ring-sage-500 cursor-pointer"
            />
            <label htmlFor="filter-my-recipes" className="text-xs font-bold text-sage-600 uppercase tracking-wider cursor-pointer select-none">
              My Recipes
            </label>
          </div>
        </div>
      )}

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
                      <img src={photoUrl} alt="Preview" className="absolute inset-0 h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setPhotoUrl("")}
                        className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white z-10"
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

            <div className="flex flex-col">
              <label className="block text-sm font-medium text-sage-700 mb-1">Instructions</label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="input flex-grow min-h-[14rem] resize-none"
                placeholder="Step 1: Boill water...
Step 2: Add pasta..."
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-sage-700">Ingredients</label>
              <button
                type="button"
                onClick={() => setIngredients([...ingredients, { name: "", quantity: 1, unit: "pcs/g/ml/l" }])}
                className="text-xs font-bold text-sage-600 hover:text-sage-800 transition-colors flex items-center gap-1"
              >
                <span>➕ Add Item</span>
              </button>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-sage-100 bg-white/50">
              <table className="w-full text-left text-sm font-mono">
                <thead className="bg-sage-50/50 text-[10px] font-black uppercase tracking-widest text-sage-500">
                  <tr>
                    <th className="px-4 py-3">Ingredient Name</th>
                    <th className="px-4 py-3 w-24">Qty</th>
                    <th className="px-4 py-3 w-24">Unit</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sage-50">
                  {ingredients.map((ing, idx) => (
                    <tr key={idx} className="group hover:bg-sage-50/30 transition-colors">
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={ing.name}
                          onChange={(e) => {
                            const newIngs = [...ingredients];
                            newIngs[idx].name = e.target.value;
                            setIngredients(newIngs);
                          }}
                          placeholder="e.g. Flour"
                          className="w-full bg-transparent border-none focus:ring-0 p-0 text-sage-800 placeholder:text-sage-300"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={ing.quantity}
                          onChange={(e) => {
                            const newIngs = [...ingredients];
                            newIngs[idx].quantity = e.target.value;
                            setIngredients(newIngs);
                          }}
                          className="w-full bg-transparent border-none focus:ring-0 p-0 text-sage-800 placeholder:text-sage-300"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={ing.unit}
                          onChange={(e) => {
                            const newIngs = [...ingredients];
                            newIngs[idx].unit = e.target.value;
                            setIngredients(newIngs);
                          }}
                          placeholder="g"
                          className="w-full bg-transparent border-none focus:ring-0 p-0 text-sage-800 placeholder:text-sage-300 uppercase text-[10px] font-bold tracking-wider"
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            if (ingredients.length > 1) {
                              setIngredients(ingredients.filter((_, i) => i !== idx));
                            } else {
                              setIngredients([{ name: "", quantity: 1, unit: "pcs" }]);
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500 transition-all p-1"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <button type="submit" className="btn-primary w-full py-4 text-base font-bold shadow-lg shadow-sage-900/10" disabled={isUploading}>
            {isUploading ? "Uploading..." : editingRecipeId ? "Update Recipe" : "Save Recipe"}
          </button>
        </form>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredRecipes.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            currentUserId={profile?.id}
            onSelect={() => handleEdit(recipe)}
            onEdit={() => handleEdit(recipe)}
            onReport={(reason) => handleReport(recipe.id, reason)}
          />
        ))}
      </div>

      {searchQuery && filteredRecipes.length === 0 && (
        <div className="card p-12 text-center border-2 border-dashed border-sage-200">
          <div className="text-4xl mb-4">🔍</div>
          <p className="text-sage-500 font-medium">No recipes found matching "{searchQuery}"</p>
        </div>
      )}
      {recipes.length === 0 && !showForm && (
        <div className="card p-12 text-center border-2 border-dashed border-sage-200">
          <div className="text-4xl mb-4">📖</div>
          <p className="text-sage-500 font-medium">Your kitchen is empty. Add your first recipe!</p>
        </div>
      )}
    </div>
  );
}
