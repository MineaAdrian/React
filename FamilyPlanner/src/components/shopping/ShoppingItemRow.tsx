"use client";

import { clsx } from "clsx";
import type { ShoppingItem } from "@/types";

interface ShoppingItemRowProps {
  item: ShoppingItem;
  onToggle: (ingredientName: string, unit: string, checked: boolean) => void;
}

export function ShoppingItemRow({ item, onToggle }: ShoppingItemRowProps) {
  const label = `${item.ingredient_name} – ${item.total_quantity} ${item.unit}`;

  return (
    <li className="flex items-center gap-4 px-6 py-4 hover:bg-sage-50/50 transition-colors group">
      <button
        type="button"
        onClick={() => onToggle(item.ingredient_name, item.unit, !item.checked)}
        className={clsx(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 transition-all duration-200",
          item.checked
            ? "border-sage-600 bg-sage-600 text-white shadow-sm scale-100"
            : "border-sage-300 bg-white hover:border-sage-500 hover:scale-105"
        )}
        aria-label={item.checked ? `Uncheck ${label}` : `Check ${label}`}
      >
        {item.checked && (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
      <span
        className={clsx(
          "flex-1 text-base font-medium transition-all duration-200",
          item.checked ? "text-sage-400 line-through" : "text-sage-800"
        )}
      >
        {item.ingredient_name}
        <span className={clsx(
          "ml-2 text-sm",
          item.checked ? "text-sage-300" : "text-sage-500 font-normal"
        )}>
          {item.total_quantity} {item.unit}
        </span>
      </span>
    </li>
  );
}
