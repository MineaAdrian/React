"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { getShoppingList, toggleShoppingItem, refreshShoppingList } from "@/app/actions/shopping";
import { useWeekStore } from "@/store/weekStore";
import { formatWeekRange } from "@/lib/week";
import { ShoppingItemRow } from "./ShoppingItemRow";
import { AddShoppingItem } from "./AddShoppingItem";
import type { ShoppingItem } from "@/types";

export function ShoppingList() {
  const { weekStart, weekStartStr, setWeek } = useWeekStore();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

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

  useEffect(() => {
    const supabase = createClient();
    channelRef.current = supabase
      .channel(`shopping:${weekStartStr}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shopping_items",
          filter: `week_start=eq.${weekStartStr}`,
        },
        (payload) => {
          // Instead of full refresh, we could just patch the items
          // but for simplicity and correctness with aggregation, full refresh is safer
          // as long as getShoppingList is fast (read-only).
          refresh();
        }
      )
      .subscribe((status) => {
        setIsLive(status === "SUBSCRIBED");
      });

    return () => {
      channelRef.current?.unsubscribe();
      channelRef.current = null;
    };
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
      alert("Failed to update item. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sage-600">Loading list…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <h1 className="w-full text-center font-display text-2xl font-semibold text-sage-800 sm:w-auto sm:text-left">
          Shopping list – {formatWeekRange(weekStart)}
        </h1>
        <div className="flex w-full items-center justify-between gap-2 bg-sage-50 p-1 rounded-xl sm:w-auto sm:bg-transparent sm:p-0">
          <button
            type="button"
            onClick={() => setWeek(new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000))}
            className="btn-secondary h-10 w-10 p-0 flex items-center justify-center sm:w-auto sm:px-4 sm:h-auto"
          >
            <span className="sm:hidden">←</span>
            <span className="hidden sm:inline">Previous week</span>
          </button>
          <button type="button" onClick={() => setWeek(new Date())} className="btn-ghost text-sm font-medium">
            This week
          </button>
          <button
            type="button"
            onClick={() => setWeek(new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000))}
            className="btn-secondary h-10 w-10 p-0 flex items-center justify-center sm:w-auto sm:px-4 sm:h-auto"
          >
            <span className="sm:hidden">→</span>
            <span className="hidden sm:inline">Next week</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center justify-between gap-4 border-b border-sage-100 pb-6 sm:flex-row sm:border-0 sm:pb-0">
        <p className="text-sm text-sage-600">
          Check items as you shop. Changes sync in real time for everyone.
        </p>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <AddShoppingItem weekStartStr={weekStartStr} />
          <div className="flex items-center justify-between gap-4 sm:justify-end">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-sage-50 border border-sage-100">
              <div className={`h-2 w-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-sage-300'}`} />
              <span className="text-[10px] font-medium uppercase tracking-wider text-sage-500">
                {isLive ? 'Live Sync' : 'Offline'}
              </span>
            </div>
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="btn-secondary text-sm py-1.5"
            >
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      <ul className="card divide-y divide-sage-100">
        {items.length === 0 ? (
          <li className="p-6 text-center text-sage-500">
            Plan some meals for this week to generate the shopping list.
          </li>
        ) : (
          items.map((item) => (
            <ShoppingItemRow
              key={`${item.ingredient_name}-${item.unit}`}
              item={item}
              onToggle={handleToggle}
            />
          ))
        )}
      </ul>
    </div>
  );
}
