"use client";

import { useEffect, useState, useRef } from "react";
import { clsx } from "clsx";
import { createClient } from "@/lib/supabase/client";
import { getShoppingList, toggleShoppingItem, refreshShoppingList, deleteShoppingItem } from "@/app/actions/shopping";
import { useWeekStore } from "@/store/weekStore";
import { formatWeekRange } from "@/lib/week";
import { ShoppingItemRow } from "./ShoppingItemRow";
import { AddShoppingItem } from "./AddShoppingItem";
import { useTranslation } from "@/hooks/useTranslation";
import type { ShoppingItem } from "@/types";

export function ShoppingList() {
  const { weekStart, weekStartStr, setWeek } = useWeekStore();
  const { t, language } = useTranslation();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = () => {
    getShoppingList(weekStartStr).then((res) => {
      setItems(res.items ?? []);
    });
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await refreshShoppingList(weekStartStr);
      setItems(res.items ?? []);
    } catch (err) {
      console.error("Refresh failed", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const initLoad = async () => {
      setLoading(true);
      try {
        // First try to just get the list
        const res = await getShoppingList(weekStartStr);
        if (res.items.length === 0) {
          // If empty, try to sync once from plan
          const synced = await refreshShoppingList(weekStartStr);
          setItems(synced.items ?? []);
        } else {
          setItems(res.items);
        }
      } finally {
        setLoading(false);
      }
    };
    initLoad();
  }, [weekStartStr]);


  const handleToggle = async (ingredientName: string, unit: string, checked: boolean) => {
    // Optimistic update
    const previousItems = [...items];
    setItems((prev) =>
      prev.map((item) =>
        item.ingredient_name === ingredientName && item.unit === unit
          ? { ...item, checked }
          : item
      )
    );

    try {
      await toggleShoppingItem(weekStartStr, ingredientName, unit, checked);
    } catch (err) {
      console.error("Toggle failed", err);
      // Rollback on error
      setItems(previousItems);
      alert(t("shopping_toggle_failed"));
    }
  };

  const handleDelete = async (ingredientName: string, unit: string) => {
    if (!window.confirm(t("meal_remove_confirm"))) return;

    // Optimistic update
    const previousItems = [...items];
    setItems((prev) =>
      prev.filter(
        (item) => !(item.ingredient_name === ingredientName && item.unit === unit)
      )
    );

    try {
      await deleteShoppingItem(weekStartStr, ingredientName, unit);
    } catch (err) {
      console.error("Delete failed", err);
      // Rollback on error
      setItems(previousItems);
      alert(t("shopping_toggle_failed"));
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sage-600">{t("week_loading")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <h1 className="w-full text-center font-display text-2xl font-semibold text-sage-800 sm:w-auto sm:text-left">
          {t("shopping_title")} – {formatWeekRange(weekStart, language)}
        </h1>
        <div className="flex w-full items-center justify-between gap-2 bg-sage-50 p-1 rounded-xl sm:w-auto sm:bg-transparent sm:p-0">
          <button
            type="button"
            onClick={() => setWeek(new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000))}
            className="btn-secondary h-10 w-10 p-0 flex items-center justify-center sm:w-auto sm:px-4 sm:h-auto"
          >
            <span className="sm:hidden">←</span>
            <span className="hidden sm:inline">{t("week_previous")}</span>
          </button>
          <button type="button" onClick={() => setWeek(new Date())} className="btn-ghost text-sm font-medium">
            {t("week_this")}
          </button>
          <button
            type="button"
            onClick={() => setWeek(new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000))}
            className="btn-secondary h-10 w-10 p-0 flex items-center justify-center sm:w-auto sm:px-4 sm:h-auto"
          >
            <span className="sm:hidden">→</span>
            <span className="hidden sm:inline">{t("week_next")}</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center justify-between gap-4 border-b border-sage-100 pb-6 sm:flex-row sm:border-0 sm:pb-0">
        <p className="text-sm text-sage-600">
          {t("shopping_subtitle")}
        </p>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <div className="flex-1 sm:flex-none">
            <AddShoppingItem weekStartStr={weekStartStr} />
          </div>
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="btn-secondary p-2.5 flex items-center justify-center rounded-xl shrink-0"
            title={t("shopping_refresh_button")}
            aria-label={t("shopping_refresh_button")}
          >
            <svg
              className={clsx("h-5 w-5", isRefreshing && "animate-spin")}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      <ul className="card divide-y divide-sage-100">
        {items.length === 0 ? (
          <li className="p-6 text-center text-sage-500">
            {t("shopping_empty")}
          </li>
        ) : (
          items.map((item) => (
            <ShoppingItemRow
              key={`${item.ingredient_name}-${item.unit}`}
              item={item}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          ))
        )}
      </ul>
    </div>
  );
}
