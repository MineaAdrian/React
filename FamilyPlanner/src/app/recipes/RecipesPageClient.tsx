"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getRecipes, createRecipe, uploadRecipePhoto, updateRecipe, reportRecipe, deleteRecipe } from "@/app/actions/recipes";
import { RecipeCard } from "@/components/recipes/RecipeCard";
import { MEAL_LABELS } from "@/lib/week";
import { useAuth } from "@/components/providers/AuthProvider";
import { useTranslation } from "@/hooks/useTranslation";
import type { Recipe } from "@/types";
import type { MealType } from "@/types";

type Props = { familyId: string | null };

export function RecipesPageClient({ familyId }: Props) {
  const { profile } = useAuth();
  const { t, language } = useTranslation();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMyRecipes, setFilterMyRecipes] = useState(false);
  const [name, setName] = useState("");
  const [nameRo, setNameRo] = useState("");
  const [mealTypes, setMealTypes] = useState<MealType[]>(["dinner"]);
  const [instructions, setInstructions] = useState("");
  const [instructionsRo, setInstructionsRo] = useState("");
  const [ingredients, setIngredients] = useState<{ name: string; name_ro?: string; quantity: number | string; unit: string }[]>([
    { name: "", name_ro: "", quantity: "", unit: "" }
  ]);
  const [photoUrl, setPhotoUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [viewingRecipe, setViewingRecipe] = useState<Recipe | null>(null);
  const [isFamilyOnly, setIsFamilyOnly] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const searchParams = useSearchParams();

  useEffect(() => {
    getRecipes().then((r) => {
      setRecipes(r);
      setLoading(false);

      const editId = searchParams.get("edit");
      if (editId) {
        const recipeToEdit = r.find(rcp => rcp.id === editId);
        if (recipeToEdit) {
          handleEdit(recipeToEdit);
        }
      }
    });
  }, [familyId, searchParams]);

  useEffect(() => {
    if (showForm || viewingRecipe) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showForm, viewingRecipe]);

  const handleEdit = (recipe: Recipe) => {
    setEditingRecipeId(recipe.id);
    setName(recipe.name);
    setNameRo(recipe.name_ro || "");
    setMealTypes(Array.isArray(recipe.meal_type) ? recipe.meal_type : [recipe.meal_type]);
    setInstructions(recipe.instructions);
    setInstructionsRo(recipe.instructions_ro || "");
    setIsFamilyOnly(!!recipe.family_id);
    setIngredients(recipe.ingredients.map(ing => ({ ...ing })));
    setPhotoUrl(recipe.photo_url || "");
    setShowForm(true);
    setViewingRecipe(null);
  };

  const handleView = (recipe: Recipe) => {
    setViewingRecipe(recipe);
    setShowForm(false);
    setEditingRecipeId(null);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t("meal_remove_confirm"))) return;
    try {
      await deleteRecipe(id);
      handleCancel();
      getRecipes().then(setRecipes);
    } catch (err) {
      console.error("Delete failed", err);
      alert("Failed to delete recipe.");
    }
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
    setViewingRecipe(null);
    setEditingRecipeId(null);
    setName("");
    setNameRo("");
    setMealTypes(["dinner"]);
    setInstructions("");
    setInstructionsRo("");
    setIngredients([{ name: "", name_ro: "", quantity: 1, unit: "pcs" }]);
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
    const actualName = name.trim() || nameRo.trim();
    const actualNameRo = nameRo.trim() || name.trim();
    const actualInstructions = instructions.trim() || (instructionsRo.trim() || "");
    const actualInstructionsRo = instructionsRo.trim() || (instructions.trim() || "");

    const cleanedIngredients = ingredients
      .filter(ing => ing.name.trim() !== "" || (ing.name_ro && ing.name_ro.trim() !== ""))
      .map(ing => {
        const iName = ing.name.trim() || (ing.name_ro?.trim() || "");
        const iNameRo = ing.name_ro?.trim() || (ing.name.trim() || "");
        return {
          name: iName,
          name_ro: iNameRo,
          quantity: typeof ing.quantity === 'string' ? parseFloat(ing.quantity) || 0 : ing.quantity,
          unit: ing.unit.trim() || "pcs"
        };
      });

    const targetFamilyId = isFamilyOnly && familyId ? familyId : null;
    const ingredientsRo = cleanedIngredients.map(ing => ({
      name: ing.name_ro || ing.name,
      quantity: ing.quantity,
      unit: ing.unit
    }));

    const result = editingRecipeId
      ? await updateRecipe(editingRecipeId, actualName, mealTypes, cleanedIngredients, actualInstructions, photoUrl, targetFamilyId, actualNameRo, actualInstructionsRo, ingredientsRo)
      : await createRecipe(actualName, mealTypes, cleanedIngredients, actualInstructions, targetFamilyId, photoUrl, actualNameRo, actualInstructionsRo, ingredientsRo);

    console.log('Submission result:', result);
    handleCancel();
    getRecipes().then((latestRecipes) => {
      console.log('Fetched recipes after add:', latestRecipes.length);
      setRecipes(latestRecipes);
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sage-600 font-medium animate-pulse">{t("week_loading")}</p>
      </div>
    );
  }

  // Filter recipes based on search query
  const filteredRecipes = recipes.filter((recipe) => {
    const query = searchQuery.toLowerCase().trim();
    const isMyRecipe = filterMyRecipes
      ? (familyId ? recipe.family_id === familyId : recipe.created_by === profile?.id)
      : true;

    const nameMatch =
      recipe.name.toLowerCase().includes(query) ||
      recipe.name_ro?.toLowerCase().includes(query);

    const ingredientMatch = recipe.ingredients?.some(
      (ing) =>
        ing.name.toLowerCase().includes(query) ||
        ing.name_ro?.toLowerCase().includes(query)
    );

    return (nameMatch || ingredientMatch) && isMyRecipe;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-sage-800">{t("recipes_title")}</h1>
          <p className="text-xs text-sage-500 mt-1">{t("recipes_subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (showForm || viewingRecipe) handleCancel();
            else setShowForm(true);
          }}
          className={`btn-primary px-6 transition-all ${showForm ? 'bg-red-500 hover:bg-red-600' : ''}`}
        >
          {showForm ? t("recipes_cancel") : viewingRecipe ? t("recipe_view_close") : t("recipes_add_new")}
        </button>
      </div>

      {/* Search and Filters */}
      {recipes.length > 0 && (
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("recipes_search_placeholder")}
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
              {t("recipes_family_only")}
            </label>
          </div>
        </div>
      )}

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {filteredRecipes.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            currentUserId={profile?.id}
            onSelect={() => handleView(recipe)}
            onEdit={() => handleEdit(recipe)}
            onDelete={() => handleDelete(recipe.id)}
            onReport={(reason) => handleReport(recipe.id, reason)}
          />
        ))}
      </div>

      {searchQuery && filteredRecipes.length === 0 && (
        <div className="card p-12 text-center border-2 border-dashed border-sage-200">
          <div className="text-4xl mb-4">🔍</div>
          <p className="text-sage-500 font-medium">{t("recipes_not_found")} "{searchQuery}"</p>
        </div>
      )}
      {recipes.length === 0 && !showForm && !viewingRecipe && (
        <div className="card p-12 text-center border-2 border-dashed border-sage-200">
          <div className="text-4xl mb-4">�</div>
          <p className="text-sage-500 font-medium">{t("recipes_empty")}</p>
        </div>
      )}

      {/* Overlay Layer */}
      {(showForm || viewingRecipe) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8 animate-in fade-in duration-200">
          <div
            className="absolute inset-0 bg-sage-950/40 backdrop-blur-md transition-opacity"
            onClick={handleCancel}
          />
          <div className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            {viewingRecipe && !showForm ? (
              <RecipeDetailsView
                recipe={viewingRecipe}
                profile={profile}
                onCancel={handleCancel}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onReport={handleReport}
              />
            ) : (
              <RecipeFormView
                editingRecipeId={editingRecipeId}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                name={name}
                setName={setName}
                nameRo={nameRo}
                setNameRo={setNameRo}
                mealTypes={mealTypes}
                setMealTypes={setMealTypes}
                instructions={instructions}
                setInstructions={setInstructions}
                instructionsRo={instructionsRo}
                setInstructionsRo={setInstructionsRo}
                ingredients={ingredients}
                setIngredients={setIngredients}
                photoUrl={photoUrl}
                setPhotoUrl={setPhotoUrl}
                isUploading={isUploading}
                fileInputRef={fileInputRef}
                handleFileChange={handleFileChange}
                isFamilyOnly={isFamilyOnly}
                setIsFamilyOnly={setIsFamilyOnly}
                language={language}
                t={t}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RecipeFormView({
  editingRecipeId,
  onSubmit,
  onCancel,
  name,
  setName,
  nameRo,
  setNameRo,
  mealTypes,
  setMealTypes,
  instructions,
  setInstructions,
  instructionsRo,
  setInstructionsRo,
  ingredients,
  setIngredients,
  photoUrl,
  setPhotoUrl,
  isUploading,
  fileInputRef,
  handleFileChange,
  isFamilyOnly,
  setIsFamilyOnly,
  language,
  t
}: any) {
  return (
    <form onSubmit={onSubmit} className="space-y-8 p-6 sm:p-10 relative">
      <button
        type="button"
        onClick={onCancel}
        className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-sage-50 text-sage-400 hover:bg-sage-100 hover:text-sage-600 transition-all z-20"
      >
        ✕
      </button>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-semibold text-sage-800">
          {editingRecipeId ? t("recipes_edit") : t("recipes_create")}
        </h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          {language === 'ro' ? (
            <div>
              <label className="block text-sm font-medium text-sage-700 mb-1">{t("recipes_name")}</label>
              <input
                type="text"
                value={nameRo}
                onChange={(e) => setNameRo(e.target.value)}
                className="input"
                placeholder={t("recipes_name_placeholder")}
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-sage-700 mb-1">{t("recipes_name")}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="input"
                placeholder={t("recipes_name_placeholder")}
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-sage-700 mb-2">{t("recipes_meal_type")}</label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(MEAL_LABELS) as MealType[]).map((key) => {
                const isSelected = mealTypes.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        if (mealTypes.length > 1) {
                          setMealTypes(mealTypes.filter((t: any) => t !== key));
                        }
                      } else {
                        setMealTypes([...mealTypes, key]);
                      }
                    }}
                    className={`px-4 py-2 rounded-xl font-bold text-sm transition-all border-2 ${isSelected
                      ? "bg-sage-600 text-white border-sage-600 shadow-md"
                      : "bg-white text-sage-600 border-sage-200 hover:border-sage-400"
                      }`}
                  >
                    {t(key)}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-sage-400 mt-2">{t("recipes_meal_type_hint")}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-sage-700 mb-1">{t("recipes_photo")}</label>
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
                  `📷 ${t("recipes_select_photo")}`
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

        <div className="flex flex-col gap-4">
          {language === 'ro' ? (
            <div className="flex-1 flex flex-col">
              <label className="block text-sm font-medium text-sage-700 mb-1">{t("recipes_instructions")}</label>
              <textarea
                value={instructionsRo}
                onChange={(e) => setInstructionsRo(e.target.value)}
                className="input flex-grow min-h-[10rem] resize-none"
                placeholder={t("recipes_instructions_placeholder")}
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <label className="block text-sm font-medium text-sage-700 mb-1">{t("recipes_instructions")}</label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="input flex-grow min-h-[10rem] resize-none"
                placeholder={t("recipes_instructions_placeholder")}
              />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-sage-700">{t("recipes_ingredients")}</label>
          <button
            type="button"
            onClick={() => setIngredients([...ingredients, { name: "", name_ro: "", quantity: "", unit: "" }])}
            className="text-xs font-bold text-sage-600 hover:text-sage-800 transition-colors flex items-center gap-1"
          >
            <span>➕ {t("recipes_add_item")}</span>
          </button>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-sage-100 bg-white/50">
          <table className="w-full text-left text-sm font-mono">
            <thead className="bg-sage-50/50 text-[10px] font-black uppercase tracking-widest text-sage-500">
              <tr>
                <th className="px-4 py-3">{t("recipes_ing_name")}</th>
                <th className="px-4 py-3 w-24">{t("recipes_qty")}</th>
                <th className="px-4 py-3 w-24">{t("recipes_unit")}</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sage-50">
              {ingredients.map((ing: any, idx: number) => (
                <tr key={idx} className="group hover:bg-sage-50/30 transition-colors">
                  {language === 'ro' ? (
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={ing.name_ro || ""}
                        onChange={(e) => {
                          const newIngs = [...ingredients];
                          newIngs[idx].name_ro = e.target.value;
                          setIngredients(newIngs);
                          if (idx === ingredients.length - 1 && e.target.value.trim()) {
                            setIngredients([...newIngs, { name: "", name_ro: "", quantity: "", unit: "" }]);
                          }
                        }}
                        placeholder="Făină"
                        className="w-full bg-transparent border-none focus:ring-0 p-0 text-sage-800 placeholder:text-sage-300"
                      />
                    </td>
                  ) : (
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={ing.name || ""}
                        onChange={(e) => {
                          const newIngs = [...ingredients];
                          newIngs[idx].name = e.target.value;
                          setIngredients(newIngs);
                          if (idx === ingredients.length - 1 && e.target.value.trim()) {
                            setIngredients([...newIngs, { name: "", name_ro: "", quantity: "", unit: "" }]);
                          }
                        }}
                        placeholder="e.g. Flour"
                        className="w-full bg-transparent border-none focus:ring-0 p-0 text-sage-800 placeholder:text-sage-300"
                      />
                    </td>
                  )}
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={ing.quantity ?? ""}
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
                      value={ing.unit || ""}
                      onChange={(e) => {
                        const newIngs = [...ingredients];
                        newIngs[idx].unit = e.target.value;
                        setIngredients(newIngs);
                      }}
                      placeholder="g/ml/buc"
                      className="w-full bg-transparent border-none focus:ring-0 p-0 text-sage-800 placeholder:text-sage-300 text-xs"
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        if (ingredients.length > 1) {
                          setIngredients(ingredients.filter((_: any, i: number) => i !== idx));
                        } else {
                          setIngredients([{ name: "", name_ro: "", quantity: "", unit: "" }]);
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
        {isUploading ? t("recipes_uploading") : editingRecipeId ? t("recipes_update") : t("recipes_save")}
      </button>
    </form>
  );
}

function RecipeDetailsView({ recipe, profile, onCancel, onEdit, onDelete, onReport }: {
  recipe: Recipe;
  profile: any;
  onCancel: () => void;
  onEdit: (r: Recipe) => void;
  onDelete: (id: string) => void;
  onReport: (id: string, reason: string) => void;
}) {
  const { t, language } = useTranslation();
  const [canEdit, setCanEdit] = React.useState(false);
  const [timeLeft, setTimeLeft] = React.useState<string | null>(null);

  React.useEffect(() => {
    const check = () => {
      // Family recipes are always editable by the creator (no timer)
      if (recipe.family_id) {
        setCanEdit(true);
        setTimeLeft(null);
        return;
      }

      const createdTime = new Date(recipe.created_at).getTime();
      const now = Date.now();
      const tenMinutes = 10 * 60 * 1000;
      const diff = tenMinutes - (now - createdTime);

      if (diff > 0) {
        setCanEdit(true);
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${mins}:${secs < 10 ? "0" : ""}${secs}`);
      } else {
        setCanEdit(false);
        setTimeLeft(null);
      }
    };
    check();
    const interval = setInterval(check, 1000);
    return () => clearInterval(interval);
  }, [recipe.created_at, recipe.family_id]);

  return (
    <div className="space-y-8 p-6 sm:p-10 relative">
      <button
        onClick={onCancel}
        className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-sage-50 text-sage-400 hover:bg-sage-100 hover:text-sage-600 transition-all z-20"
      >
        ✕
      </button>
      <div className="flex flex-col md:flex-row gap-8">
        {recipe.photo_url && (
          <div className="w-full md:w-1/3 aspect-square rounded-2xl overflow-hidden shadow-md">
            <img src={recipe.photo_url} alt={recipe.name} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex-1 space-y-6">
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-sage-500 mb-1 block">
                  {(() => {
                    const mealTypes = Array.isArray(recipe.meal_type) ? recipe.meal_type : [recipe.meal_type];
                    return mealTypes.map(mt => t(mt)).join(", ");
                  })()}
                </span>
                <h2 className="text-3xl font-display font-semibold text-sage-900 leading-tight">
                  {language === 'ro' && recipe.name_ro ? recipe.name_ro : recipe.name}
                </h2>
              </div>
              <div className="flex gap-2">
                {(profile?.id === recipe.created_by || recipe.family_id) && canEdit ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEdit(recipe)}
                      className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-2 border-rose-100 hover:border-rose-200"
                    >
                      <span>✏️ {t("recipe_view_edit")}</span>
                      {timeLeft && (
                        <span className="text-[10px] font-bold text-rose-500 font-mono bg-rose-50 px-1.5 py-0.5 rounded-md">
                          {timeLeft}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => onDelete(recipe.id)}
                      className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-2 border-red-100 hover:border-red-200 text-red-500"
                      title={t("meal_remove_confirm")}
                    >
                      <span>🗑️</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      const reason = window.prompt(t("recipe_report_prompt"));
                      if (reason) onReport(recipe.id, reason);
                    }}
                    className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-2 border-amber-100 hover:border-amber-200 text-amber-600"
                    title={t("recipe_report_title")}
                  >
                    <span>⚠️ {t("recipe_report_title")}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-sage-50/50 p-4 rounded-xl border border-sage-100">
              <h3 className="text-xs font-black uppercase tracking-widest text-sage-400 mb-3">{t("recipes_ingredients")}</h3>
              <ul className="space-y-2">
                {recipe.ingredients.map((ing, i) => {
                  const roName = ing.name_ro || recipe.ingredients_ro?.[i]?.name;
                  return (
                    <li key={i} className="flex justify-between text-sm">
                      <span className="font-medium text-sage-800">
                        {language === 'ro' && roName ? roName : ing.name}
                      </span>
                      <span className="text-sage-500 font-mono text-xs">{ing.quantity} {ing.unit}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
            {recipe.family_id && (
              <div className="bg-sage-50/50 p-4 rounded-xl border border-sage-100 h-fit">
                <span className="text-xs font-bold text-sage-500">🏠 {t("recipe_view_family")}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-black uppercase tracking-widest text-sage-400 mb-4">{t("recipe_view_method")}</h3>
        <div className="prose prose-sage prose-p:text-sage-800 prose-p:leading-relaxed">
          <p className="whitespace-pre-wrap text-lg">
            {(language === 'ro' && recipe.instructions_ro) ? recipe.instructions_ro : (recipe.instructions || t("menu_no_instructions"))}
          </p>
        </div>
      </div>
    </div>
  );
}
