"use client";

import { useState, useMemo } from "react";
import { assignMeal } from "@/app/actions/week";
import { RecipeCard } from "./RecipeCard";
import type { Recipe } from "@/types";
import type { MealType } from "@/types";
import { MEAL_LABELS } from "@/lib/week";

type Props = {
  mealType: MealType;
  recipes: Recipe[];
  weekStartStr: string;
  dateStr: string;
  slotIndex: number;
  onSelect: () => void;
  onClose: () => void;
};

import { useTranslation } from "@/hooks/useTranslation";

export function RecipeSearchModal(props: Props) {
  const {
    mealType,
    recipes,
    weekStartStr,
    dateStr,
    slotIndex,
    onSelect,
    onClose,
  } = props;
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<MealType | "">(mealType);

  const filtered = useMemo(() => {
    let list = recipes;
    if (filterType) {
      list = list.filter((r) => {
        const mtypes = Array.isArray(r.meal_type) ? r.meal_type : [r.meal_type];
        return mtypes.includes(filterType as MealType);
      });
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.name_ro?.toLowerCase().includes(q) ||
          (r.ingredients && r.ingredients.some((i) =>
            i.name.toLowerCase().includes(q) ||
            i.name_ro?.toLowerCase().includes(q)
          ))
      );
    }
    return list;
  }, [recipes, search, filterType]);

  const handleSelect = async (recipeId: string | null) => {
    await assignMeal(weekStartStr, dateStr, mealType, slotIndex, recipeId);
    onSelect();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="card max-h-[85vh] w-full max-w-lg overflow-hidden flex flex-col">
        <div className="flex items-center justify-between border-b border-sage-100 p-4">
          <h2 className="font-display text-lg font-semibold text-sage-800">
            {t("assign_recipe")} - {t(mealType)}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-sage-500 hover:bg-sage-100 hover:text-sage-800"
            aria-label="Close"
          >
            {t("close")}
          </button>
        </div>
        <div className="space-y-2 p-4">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("recipes_search_placeholder")}
            className="input"
            autoFocus
          />
          <select
            value={filterType}
            onChange={(e) => setFilterType((e.target.value || "") as MealType | "")}
            className="input"
          >
            <option value="">{t("all_meal_types")}</option>
            {(Object.keys(MEAL_LABELS) as MealType[]).map((key) => (
              <option key={key} value={key}>
                {t(key)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 overflow-y-auto p-4 pt-0 space-y-2">
          <button
            type="button"
            onClick={() => handleSelect(null)}
            className="w-full rounded-lg border-2 border-dashed border-sage-200 py-3 text-sm text-sage-500 hover:border-sage-300 hover:bg-sage-50"
          >
            {t("clear_slot")}
          </button>
          {filtered.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onSelect={() => handleSelect(recipe.id)}
            />
          ))}
          {filtered.length === 0 && (
            <p className="py-4 text-center text-sage-500">{t("recipes_not_found")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
