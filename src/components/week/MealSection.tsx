"use client";

import { useState, useEffect } from "react";
import { MEAL_KEYS, MEAL_LABELS } from "@/lib/week";
import { assignMeal } from "@/app/actions/week";
import { RecipeSearchModal } from "../recipes/RecipeSearchModal";
import { useAuth } from "@/components/providers/AuthProvider";
import { useTranslation } from "@/hooks/useTranslation";
import { downloadRecipePdf } from "@/lib/pdf";
import type { DayPlan, Recipe, MealType } from "@/types";

interface MealSectionProps {
  dayPlan: DayPlan;
  recipes: Recipe[];
  weekStartStr: string;
  onUpdate: () => void;
}

export function MealSection({ dayPlan, recipes, weekStartStr, onUpdate }: MealSectionProps) {
  const { profile, refreshProfile } = useAuth();
  const { t, language } = useTranslation();
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [openSlot, setOpenSlot] = useState<{
    mealKey: MealType;
    slotIndex: number;
  } | null>(null);

  const handleRecipeClick = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsExpanded(true);
    }
  };

  const handleRemoveMeal = async (e: React.MouseEvent, mealKey: MealType, slotIndex: number) => {
    e.stopPropagation();
    if (isUpdating) return;
    if (!window.confirm(t("meal_remove_confirm"))) return;

    setIsUpdating(true);
    try {
      await assignMeal(weekStartStr, dayPlan.date, mealKey, slotIndex, null);
      if (selectedRecipe && dayPlan.meals[mealKey]?.[slotIndex]?.recipe_id === selectedRecipe.id) {
        setSelectedRecipe(null);
      }
      onUpdate();
    } catch (err) {
      alert(t("shopping_toggle_failed"));
    } finally {
      setIsUpdating(false);
    }
  };



  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-sage-400">
          {t("menu_daily_menu")}
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left Side: Meals "Table" (Vertical Flow) */}
        <div className="flex-1 min-w-0 bg-white rounded-[2.5rem] border border-sage-100 shadow-xl shadow-sage-900/5 divide-y divide-sage-50 overflow-hidden">
          {MEAL_KEYS.map((mealKey) => {
            const filledSlots = (dayPlan.meals[mealKey] || []).filter(slot => slot.recipe_id);
            // Check if the selected recipe belongs to this meal type
            const isSelectedInThisMeal = selectedRecipe && filledSlots.some(slot => slot.recipe_id === selectedRecipe.id);
            const firstRecipeInMeal = filledSlots.length > 0 ? recipes.find(r => r.id === filledSlots[0].recipe_id) : null;
            // Prioritize the selected recipe's photo if it's in this meal section
            const displayRecipe = isSelectedInThisMeal ? selectedRecipe : firstRecipeInMeal;

            return (
              <div key={mealKey} className="group p-6 md:p-8 hover:bg-sage-50/20 transition-colors">
                <div className="flex flex-col md:flex-row gap-6 md:gap-8">
                  {/* Column 1: Photo Square Container */}
                  <div className="w-full md:w-32 h-48 md:h-32 shrink-0 rounded-2xl overflow-hidden bg-[#F9F4D8] border border-sage-50 shadow-sm relative group/photo">
                    {displayRecipe?.photo_url ? (
                      <img src={displayRecipe.photo_url} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover/photo:scale-110" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-4xl grayscale opacity-30">🍴</div>
                    )}
                  </div>

                  {/* Column 2: Header (Name + Add) and Recipe List */}
                  <div className="flex-1 flex flex-col min-w-0">
                    {/* Meal Name + Add Button Group */}
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-sage-50">
                      <div>
                        <h3 className="text-xl font-black text-sage-800 uppercase tracking-tight flex items-center gap-3">
                          {t(mealKey)}
                        </h3>
                      </div>
                      <button
                        onClick={() => setOpenSlot({ mealKey, slotIndex: filledSlots.length })}
                        className="w-10 h-10 rounded-xl bg-sage-50 text-sage-400 hover:bg-sage-100 hover:text-sage-600 transition-all flex items-center justify-center text-2xl font-light border border-sage-100/50 shadow-sm"
                        title={t("recipes_add_new")}
                      >
                        ＋
                      </button>
                    </div>

                    {/* Recipe Details Stack */}
                    <div className="space-y-4">
                      {filledSlots.length > 0 ? (
                        filledSlots.map((slot, slotIndex) => {
                          const recipe = recipes.find((r) => r.id === slot.recipe_id);
                          if (!recipe) return null;
                          const isSelected = selectedRecipe?.id === recipe.id;

                          return (
                            <div
                              key={`${mealKey}-${slotIndex}`}
                              onClick={() => handleRecipeClick(recipe)}
                              className={`group/slot relative p-4 rounded-2xl border transition-all cursor-pointer flex flex-col gap-3
                                ${isSelected
                                  ? "border-sage-300 bg-sage-50/50 shadow-sm shadow-sage-900/5"
                                  : "border-transparent bg-transparent hover:bg-sage-50/30"}
                              `}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                  <p className="text-lg font-black text-sage-800 leading-tight tracking-tight hover:text-sage-600 transition-colors">
                                    {language === 'ro' && recipe.name_ro ? recipe.name_ro : recipe.name}
                                  </p>
                                </div>
                                <button
                                  onClick={(e) => handleRemoveMeal(e, mealKey, slotIndex)}
                                  className="shrink-0 w-6 h-6 rounded-full bg-white text-rose-300 hover:text-rose-600 shadow-sm border border-sage-50 flex items-center justify-center text-[10px] transition-all hover:scale-110"
                                >
                                  ✕
                                </button>
                              </div>


                            </div>
                          );
                        })
                      ) : (
                        <div className="py-8 px-4 text-center border-2 border-dashed border-sage-50 rounded-2xl">
                          <p className="text-[10px] font-black text-sage-200 uppercase tracking-[0.2em]">
                            {t("menu_select_recipe")}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Side: Recipe Details Panel */}
        <div className="lg:sticky lg:top-24 h-fit">
          {selectedRecipe ? (
            <div className="rounded-[2.5rem] border border-sage-100 bg-white shadow-2xl p-0 overflow-hidden flex flex-col max-h-[calc(92vh-120px)] animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="relative h-56 w-full overflow-hidden shrink-0">
                {selectedRecipe.photo_url ? (
                  <img
                    src={selectedRecipe.photo_url}
                    alt={selectedRecipe.name}
                    className="absolute inset-0 h-full w-full object-cover scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-6xl bg-gradient-to-br from-cream to-sage-50 grayscale opacity-40">🍽️</div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-sage-900/60 via-transparent to-transparent" />
                <div className="absolute top-6 right-6 flex items-center gap-2 z-20">
                  <button
                    onClick={() => downloadRecipePdf(selectedRecipe, language)}
                    className="h-10 w-10 rounded-full bg-black/20 text-white backdrop-blur-xl hover:bg-white/40 transition-all flex items-center justify-center font-bold border border-white/20"
                    title={t("recipe_download_pdf")}
                  >
                    📄
                  </button>
                  <button
                    onClick={() => setIsExpanded(true)}
                    className="h-10 w-10 rounded-full bg-black/20 text-white backdrop-blur-xl hover:bg-white/40 transition-all flex items-center justify-center font-bold border border-white/20"
                    title={t("View Details")}
                  >
                    ⛶
                  </button>
                  <button
                    onClick={() => setSelectedRecipe(null)}
                    className="h-10 w-10 rounded-full bg-black/20 text-white backdrop-blur-xl hover:bg-white/40 transition-all flex items-center justify-center font-bold border border-white/20"
                    title={t("Close Recipe")}
                  >
                    ✕
                  </button>
                </div>

                <div className="absolute bottom-6 left-8 right-8">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/70 mb-1 block">
                        {t("menu_selected_recipe")}
                      </span>
                      <h3 className="text-2xl font-black text-white leading-tight drop-shadow-md">
                        {language === 'ro' && selectedRecipe.name_ro ? selectedRecipe.name_ro : selectedRecipe.name}
                      </h3>
                    </div>

                  </div>
                </div>
              </div>

              <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
                <div className="flex flex-wrap gap-4">
                  {selectedRecipe.cooking_time_minutes && (
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black uppercase tracking-widest text-sage-300">{t("recipe_time")}</span>
                      <span className="text-xs font-bold text-sage-700">{selectedRecipe.cooking_time_minutes} {t("recipe_mins")}</span>
                    </div>
                  )}
                  {selectedRecipe.difficulty && (
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black uppercase tracking-widest text-sage-300">{t("recipe_level")}</span>
                      <span className="text-xs font-bold text-sage-700 capitalize">
                        {t(selectedRecipe.difficulty)}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black uppercase tracking-widest text-sage-300">{t("recipe_type")}</span>
                    <span className="text-xs font-bold text-sage-700 capitalize">
                      {(() => {
                        const mealTypes = Array.isArray(selectedRecipe.meal_type) ? selectedRecipe.meal_type : [selectedRecipe.meal_type];
                        return mealTypes.map(mt => t(mt)).join(", ");
                      })()}
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-sage-400 mb-6 flex items-center gap-6">
                    {t("recipes_ingredients")}
                    <span className="h-px flex-1 bg-sage-50" />
                  </h4>
                  <div className="grid grid-cols-1 gap-3">
                    {selectedRecipe.ingredients.map((ing, i) => {
                      const roName = ing.name_ro || selectedRecipe.ingredients_ro?.[i]?.name;
                      return (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-sage-50/50 border border-sage-50 group/item hover:bg-white transition-colors">
                          <div className="w-1.5 h-1.5 rounded-full bg-sage-300 group-hover/item:bg-sage-600 transition-colors" />
                          <span className="text-sm text-sage-700 font-medium flex-1">
                            {language === 'ro' && roName ? roName : ing.name}
                          </span>
                          <span className="text-[10px] font-black text-sage-400">
                            {ing.quantity} {ing.unit}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-sage-400 flex items-center gap-6 flex-1">
                      {t("recipes_instructions")}
                      <span className="h-px flex-1 bg-sage-50" />
                    </h4>
                    <button
                      onClick={() => setIsExpanded(true)}
                      className="ml-4 p-2 rounded-lg bg-sage-50 text-sage-400 hover:text-sage-800 transition-colors"
                    >
                      ⛶
                    </button>
                  </div>
                  <div className="bg-sage-50/30 rounded-3xl p-6 border border-sage-100">
                    <p className="text-sm text-sage-700 whitespace-pre-wrap leading-relaxed font-medium">
                      {(language === 'ro' && selectedRecipe.instructions_ro) ? selectedRecipe.instructions_ro : (selectedRecipe.instructions || t("menu_no_instructions"))}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="sticky top-24 h-[500px] bg-white rounded-[3rem] border border-sage-100 shadow-xl flex flex-col items-center justify-center text-center p-12 transition-all duration-700">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-sage-100 rounded-full blur-2xl opacity-40 animate-pulse" />
                <div className="relative w-24 h-24 bg-sage-50 rounded-full flex items-center justify-center text-4xl shadow-inner grayscale opacity-40">🍴</div>
              </div>
              <h3 className="text-xl font-black text-sage-800 mb-3 tracking-tighter">{t("menu_kitchen_guide")}</h3>
              <p className="text-sage-400 text-xs max-w-[200px] leading-relaxed font-medium uppercase tracking-widest">
                {t("menu_select_recipe")}
              </p>
            </div>
          )}
        </div>

        {/* Expanded Instructions Modal */}
        {isExpanded && selectedRecipe && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sage-900/40 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-white rounded-[3rem] w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="p-10 border-b border-sage-50 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-sage-300 mb-2 block">{t("menu_cooking_mode")}</span>
                  <h3 className="text-4xl font-black text-sage-900 tracking-tighter">
                    {language === 'ro' && selectedRecipe.name_ro ? selectedRecipe.name_ro : selectedRecipe.name}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => downloadRecipePdf(selectedRecipe, language)}
                    className="h-14 w-14 rounded-2xl bg-sage-50 text-sage-400 hover:bg-sage-100 hover:text-sage-600 transition-all flex items-center justify-center text-2xl"
                    title={t("recipe_download_pdf")}
                  >
                    📄
                  </button>
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="h-14 w-14 rounded-2xl bg-sage-50 hover:bg-red-50 hover:text-red-500 text-sage-400 transition-all flex items-center justify-center text-2xl"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="p-10 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
                  <div className="md:col-span-1 space-y-8">
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-sage-300 mb-6">{t("menu_pantry_check")}</h4>
                      <ul className="space-y-4">
                        {selectedRecipe.ingredients.map((ing, i) => {
                          const roName = ing.name_ro || selectedRecipe.ingredients_ro?.[i]?.name;
                          return (
                            <li key={i} className="flex flex-col pb-4 border-b border-sage-50 last:border-0">
                              <span className="text-base font-bold text-sage-800">
                                {language === 'ro' && roName ? roName : ing.name}
                              </span>
                              <span className="text-xs text-sage-400 font-bold uppercase tracking-tighter">{ing.quantity} {ing.unit}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                  <div className="md:col-span-2 space-y-8">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-sage-300 mb-6 font-mono">{t("menu_method")}</h4>
                    <p className="text-2xl leading-relaxed text-sage-800 whitespace-pre-wrap font-bold font-display">
                      {(language === 'ro' && selectedRecipe.instructions_ro) ? selectedRecipe.instructions_ro : (selectedRecipe.instructions || t("menu_no_instructions"))}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {openSlot && (
          <RecipeSearchModal
            mealType={openSlot.mealKey}
            recipes={recipes}
            weekStartStr={weekStartStr}
            dateStr={dayPlan.date}
            slotIndex={openSlot.slotIndex}
            onSelect={() => {
              setOpenSlot(null);
              onUpdate();
            }}
            onClose={() => setOpenSlot(null)}
          />
        )}
      </div>
    </div>
  );
}
