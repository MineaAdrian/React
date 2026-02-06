import { clsx } from "clsx";
import { useEffect, useState } from "react";
import type { Recipe } from "@/types";
import { useTranslation } from "@/hooks/useTranslation";

type Props = {
  recipe: Recipe;
  currentUserId?: string | null;
  onSelect?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onReport?: (reason: string) => void;
  compact?: boolean;
};

export function RecipeCard({ recipe, currentUserId, onSelect, onEdit, onDelete, onReport, compact }: Props) {
  const { t, language } = useTranslation();
  const [isEditable, setIsEditable] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const canModify = !!(currentUserId && (recipe.created_by === currentUserId || recipe.family_id));

  useEffect(() => {
    const checkEditable = () => {
      // Family recipes are always editable by the creator (no timer)
      if (recipe.family_id) {
        setIsEditable(true);
        setTimeLeft(null);
        return;
      }

      const createdTime = new Date(recipe.created_at).getTime();
      const now = Date.now();
      const tenMinutes = 10 * 60 * 1000;
      const diff = tenMinutes - (now - createdTime);

      if (diff > 0) {
        setIsEditable(true);
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${mins}:${secs < 10 ? "0" : ""}${secs}`);
      } else {
        setIsEditable(false);
        setTimeLeft(null);
      }
    };

    checkEditable();
    const interval = setInterval(checkEditable, 1000);
    return () => clearInterval(interval);
  }, [recipe.created_at, recipe.family_id]);

  const handleReport = (e: React.MouseEvent) => {
    e.stopPropagation();
    const reason = window.prompt(t("recipe_report_prompt"));
    if (reason && onReport) {
      onReport(reason);
    }
  };

  const content = (
    <div className="flex flex-col h-full">
      {/* Recipe Photo */}
      {!compact && (
        <div className="relative h-44 w-full overflow-hidden rounded-t-lg bg-gradient-to-br from-amber-100 via-orange-100 to-rose-100">
          {recipe.photo_url ? (
            <img
              src={recipe.photo_url}
              alt={recipe.name}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
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
          {language === 'ro' ? (recipe.name_ro || recipe.name) : (recipe.name || recipe.name_ro)}
        </div>
        {!compact && recipe.ingredients && recipe.ingredients.length > 0 && (
          <div className="mt-2 text-xs text-sage-500 font-medium">
            {recipe.ingredients.length} {t("recipes_ingredients").toLowerCase()}
            {recipe.cooking_time_minutes ? ` • ${recipe.cooking_time_minutes} ${t("recipe_mins")}` : ""}
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

      <div className="absolute right-2 bottom-2 flex gap-1 z-10">
        {canModify && isEditable ? (
          <div className="flex gap-1">
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="p-2 pl-3 rounded-lg bg-white/80 backdrop-blur-sm border border-sage-200 text-sage-400 hover:text-sage-600 hover:bg-white hover:border-sage-300 shadow-sm transition-all flex items-center gap-2"
                title={t("recipe_edit_hint")}
              >
                {timeLeft && (
                  <span className="text-[10px] font-bold text-rose-500 font-mono">
                    {timeLeft}
                  </span>
                )}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="p-2 rounded-lg bg-white/80 backdrop-blur-sm border border-sage-200 text-sage-400 hover:text-red-600 hover:bg-white hover:border-red-300 shadow-sm transition-all"
                title={t("meal_remove_confirm")}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        ) : (
          onReport && (
            <button
              onClick={handleReport}
              className="p-2 rounded-lg bg-white/80 backdrop-blur-sm border border-sage-200 text-sage-400 hover:text-amber-600 hover:bg-white hover:border-amber-200 shadow-sm transition-all"
              title={t("recipe_report_title")}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </button>
          )
        )}
      </div>
    </div>
  );
}
