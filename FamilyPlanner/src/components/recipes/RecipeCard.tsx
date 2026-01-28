import { clsx } from "clsx";
import Image from "next/image";
import type { Recipe } from "@/types";

type Props = {
  recipe: Recipe;
  onSelect?: () => void;
  onEdit?: () => void;
  compact?: boolean;
};

export function RecipeCard({ recipe, onSelect, onEdit, compact }: Props) {
  const content = (
    <div className="flex flex-col h-full">
      {/* Recipe Photo */}
      {!compact && (
        <div className="relative h-44 w-full overflow-hidden rounded-t-lg bg-gradient-to-br from-amber-100 via-orange-100 to-rose-100">
          {recipe.photo_url ? (
            <Image
              src={recipe.photo_url}
              alt={recipe.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-5xl grayscale-[0.3] group-hover:grayscale-0 transition-all">
              🍽️
            </div>
          )}
        </div>
      )}

      {/* Recipe Info */}
      <div className="p-4 flex-1">
        <div className="font-semibold text-sage-800 group-hover:text-sage-900 transition-colors leading-snug">
          {recipe.name}
        </div>
        {!compact && recipe.ingredients && recipe.ingredients.length > 0 && (
          <div className="mt-2 text-xs text-sage-500 font-medium">
            {recipe.ingredients.length} ingredients
            {recipe.cooking_time_minutes ? ` • ${recipe.cooking_time_minutes} min` : ""}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="group relative flex flex-col rounded-xl border border-sage-200 bg-white transition-all hover:border-sage-300 hover:shadow-lg hover:-translate-y-0.5">
      <div
        onClick={onSelect}
        className={clsx(
          "flex-1",
          onSelect ? "cursor-pointer" : "cursor-default"
        )}
      >
        {content}
      </div>

      {onEdit && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="absolute right-2 bottom-2 p-2 rounded-lg bg-white/80 backdrop-blur-sm border border-sage-200 text-sage-400 hover:text-sage-600 hover:bg-white hover:border-sage-300 shadow-sm transition-all z-10"
          title="Edit recipe"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      )}
    </div>
  );
}
