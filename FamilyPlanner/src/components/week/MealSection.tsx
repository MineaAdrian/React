"use client";

import { useState } from "react";
import { MEAL_KEYS, MEAL_LABELS } from "@/lib/week";
import { assignMeal } from "@/app/actions/week";
import { RecipeSearchModal } from "../recipes/RecipeSearchModal";
import type { DayPlan, Recipe } from "@/types";
import type { MealType } from "@/types";
import { useAuth } from "@/components/providers/AuthProvider";
import Image from "next/image";

interface MealSectionProps {
  dayPlan: DayPlan;
  recipes: Recipe[];
  weekStartStr: string;
  onUpdate: () => void;
}

export function MealSection({ dayPlan, recipes, weekStartStr, onUpdate }: MealSectionProps) {
  const { refreshProfile } = useAuth();
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [openSlot, setOpenSlot] = useState<{
    mealKey: MealType;
    slotIndex: number;
  } | null>(null);

  const handleRecipeClick = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
  };

  const handleRemoveMeal = async (e: React.MouseEvent, mealKey: MealType, slotIndex: number) => {
    e.stopPropagation();
    if (isUpdating) return;
    if (!window.confirm("Remove this meal from the plan?")) return;

    setIsUpdating(true);
    try {
      await assignMeal(weekStartStr, dayPlan.date, mealKey, slotIndex, null);
      if (selectedRecipe && dayPlan.meals[mealKey]?.[slotIndex]?.recipe_id === selectedRecipe.id) {
        setSelectedRecipe(null);
      }
      onUpdate();
    } catch (err) {
      alert("Failed to remove meal.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-sage-400">Daily Menu & Recipe Details</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left Side: Meals "Table" (Vertical Flow) */}
        <div className="bg-white rounded-[2.5rem] border border-sage-100 shadow-xl shadow-sage-900/5 divide-y divide-sage-50 overflow-hidden">
          {MEAL_KEYS.map((mealKey) => {
            // Only show slots that actually have a recipe assigned
            const filledSlots = (dayPlan.meals[mealKey] || []).filter(slot => slot.recipe_id);

            return (
              <div key={mealKey} className="group p-6 hover:bg-sage-50/20 transition-colors">
                <div className="flex flex-row items-center gap-6">
                  {/* Meal Label */}
                  <div className="w-20 shrink-0">
                    <span className="text-[10px] font-bold text-sage-300 uppercase tracking-widest block mb-0.5">
                      {mealKey}
                    </span>
                    <h3 className="text-sm font-black text-sage-800 uppercase tracking-tight">
                      {MEAL_LABELS[mealKey]}
                    </h3>
                  </div>

                  {/* Recipe Stack (Vertical list for multiple dishes) */}
                  <div className="flex-1 flex flex-col gap-3">
                    {filledSlots.map((slot, slotIndex) => {
                      const recipe = recipes.find((r) => r.id === slot.recipe_id);
                      if (!recipe) return null;

                      const isSelected = selectedRecipe?.id === recipe.id;

                      return (
                        <div
                          key={`${mealKey}-${slotIndex}`}
                          onClick={() => handleRecipeClick(recipe)}
                          className={`group/slot relative flex items-center gap-3 p-3 rounded-2xl border-2 transition-all w-full cursor-pointer
                            ${isSelected
                              ? "border-sage-400 bg-sage-50 shadow-md translate-x-1"
                              : "border-sage-100 bg-white hover:border-sage-200 hover:shadow-sm"}
                          `}
                        >
                          {/* Recipe Icon/Photo */}
                          <div className={`w-14 h-14 rounded-xl overflow-hidden shrink-0 flex items-center justify-center text-2xl transition-all
                            ${recipe.photo_url ? '' : 'bg-[#F9F4D8]'}
                          `}>
                            {recipe.photo_url ? (
                              <div className="relative w-full h-full">
                                <Image src={recipe.photo_url} alt="" fill className="object-cover" />
                              </div>
                            ) : (
                              <span className="grayscale opacity-40">🍴</span>
                            )}
                          </div>

                          <div className="text-left overflow-hidden flex-1">
                            <p className="text-sm font-black text-sage-800 truncate tracking-tight">
                              {recipe.name}
                            </p>
                            <p className="text-[10px] text-sage-400 font-bold uppercase tracking-widest mt-0.5">
                              • {recipe.difficulty?.charAt(0) || 'M'}
                            </p>
                          </div>

                          {/* Delete Button on Hover */}
                          <button
                            onClick={(e) => handleRemoveMeal(e, mealKey, slotIndex)}
                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white text-red-500 shadow-sm border border-red-50 flex items-center justify-center text-[10px] font-bold opacity-0 group-hover/slot:opacity-100 transition-all hover:scale-110"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Small Add Button on Right */}
                  <div className="shrink-0 ml-2">
                    <button
                      onClick={() => setOpenSlot({ mealKey, slotIndex: filledSlots.length })}
                      className="w-12 h-12 rounded-xl border-2 border-dashed border-sage-100 flex items-center justify-center text-sage-200 hover:border-sage-300 hover:text-sage-400 hover:bg-sage-50 transition-all group/add"
                    >
                      <span className="text-xl font-light group-hover/add:scale-110 transition-transform">＋</span>
                    </button>
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
                  <Image
                    src={selectedRecipe.photo_url}
                    alt={selectedRecipe.name}
                    fill
                    className="object-cover scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-6xl bg-gradient-to-br from-cream to-sage-50 grayscale opacity-40">�</div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-sage-900/60 via-transparent to-transparent" />
                <button
                  onClick={() => setSelectedRecipe(null)}
                  className="absolute top-6 right-6 h-10 w-10 rounded-full bg-white/20 text-white backdrop-blur-xl hover:bg-white/40 transition-all flex items-center justify-center font-bold border border-white/20"
                >
                  ✕
                </button>

                <div className="absolute bottom-6 left-8 right-8">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/70 mb-1 block">Selected Recipe</span>
                  <h3 className="text-2xl font-black text-white leading-tight drop-shadow-md">{selectedRecipe.name}</h3>
                </div>
              </div>

              <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
                <div className="flex flex-wrap gap-4">
                  {selectedRecipe.cooking_time_minutes && (
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black uppercase tracking-widest text-sage-300">Time</span>
                      <span className="text-xs font-bold text-sage-700">{selectedRecipe.cooking_time_minutes} mins</span>
                    </div>
                  )}
                  {selectedRecipe.difficulty && (
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black uppercase tracking-widest text-sage-300">Level</span>
                      <span className="text-xs font-bold text-sage-700 capitalize">{selectedRecipe.difficulty}</span>
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black uppercase tracking-widest text-sage-300">Type</span>
                    <span className="text-xs font-bold text-sage-700 capitalize">{selectedRecipe.meal_type}</span>
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-sage-400 mb-6 flex items-center gap-6">
                    Ingredients
                    <span className="h-px flex-1 bg-sage-50" />
                  </h4>
                  <div className="grid grid-cols-1 gap-3">
                    {selectedRecipe.ingredients.map((ing, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-sage-50/50 border border-sage-50 group/item hover:bg-white transition-colors">
                        <div className="w-1.5 h-1.5 rounded-full bg-sage-300 group-hover/item:bg-sage-600 transition-colors" />
                        <span className="text-sm text-sage-700 font-medium flex-1">{ing.name}</span>
                        <span className="text-[10px] font-black text-sage-400">
                          {ing.quantity} {ing.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-sage-400 flex items-center gap-6 flex-1">
                      Instructions
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
                      {selectedRecipe.instructions || "No instructions provided."}
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
              <h3 className="text-xl font-black text-sage-800 mb-3 tracking-tighter">Kitchen Guide</h3>
              <p className="text-sage-400 text-xs max-w-[200px] leading-relaxed font-medium uppercase tracking-widest">
                Select a meal on the left to view the master recipe.
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
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-sage-300 mb-2 block">Cooking Mode</span>
                  <h3 className="text-4xl font-black text-sage-900 tracking-tighter">{selectedRecipe.name}</h3>
                </div>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="h-14 w-14 rounded-2xl bg-sage-50 hover:bg-red-50 hover:text-red-500 text-sage-400 transition-all flex items-center justify-center text-2xl"
                >
                  ✕
                </button>
              </div>
              <div className="p-10 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
                  <div className="md:col-span-1 space-y-8">
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-sage-300 mb-6">Pantry Check</h4>
                      <ul className="space-y-4">
                        {selectedRecipe.ingredients.map((ing, i) => (
                          <li key={i} className="flex flex-col pb-4 border-b border-sage-50 last:border-0">
                            <span className="text-base font-bold text-sage-800">{ing.name}</span>
                            <span className="text-xs text-sage-400 font-bold uppercase tracking-tighter">{ing.quantity} {ing.unit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="md:col-span-2 space-y-8">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-sage-300 mb-6 font-mono">The Method</h4>
                    <p className="text-2xl leading-relaxed text-sage-800 whitespace-pre-wrap font-bold font-display">
                      {selectedRecipe.instructions || "No instructions provided."}
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
