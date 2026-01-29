"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getWeekPlan } from "@/app/actions/week";
import { getRecipes } from "@/app/actions/recipes";
import { useWeekStore } from "@/store/weekStore";
import { getWeekDates, formatWeekRange, toDateString } from "@/lib/week";
import { useAuth } from "@/components/providers/AuthProvider";
import { DaySelector } from "./DaySelector";
import { MealSection } from "./MealSection";
import type { DayPlan, Recipe } from "@/types";

export function WeekCalendar() {
  const { profile } = useAuth();
  const { weekStart, weekStartStr, setWeek } = useWeekStore();
  const [plan, setPlan] = useState<{ id: string; days: DayPlan[] } | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(getWeekDates(weekStart)[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getWeekPlan(weekStartStr),
      getRecipes(),
    ]).then(([p, r]) => {
      setPlan(p ?? null);
      setRecipes(r);
      setLoading(false);
    });
  }, [weekStartStr]);

  const weekDates = getWeekDates(weekStart);
  const selectedDateStr = toDateString(selectedDate);
  const dayPlan = plan?.days.find((d) => d.date === selectedDateStr);

  const handleMealUpdate = () => {
    getWeekPlan(weekStartStr).then(setPlan);
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sage-600">Loading week…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h1 className="w-full font-display text-2xl font-semibold text-sage-800 text-center sm:w-auto sm:text-left">
          {formatWeekRange(weekStart)}
        </h1>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end bg-sage-50 p-1 rounded-xl sm:bg-transparent sm:p-0">
          <button
            type="button"
            onClick={() => setWeek(new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000))}
            className="btn-secondary h-10 w-10 p-0 flex items-center justify-center sm:w-auto sm:px-4 sm:h-auto"
            aria-label="Previous Week"
          >
            <span className="sm:hidden">←</span>
            <span className="hidden sm:inline">Previous week</span>
          </button>
          <button
            type="button"
            onClick={() => setWeek(new Date())}
            className="btn-ghost text-sm font-medium"
          >
            This week
          </button>
          <button
            type="button"
            onClick={() => setWeek(new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000))}
            className="btn-secondary h-10 w-10 p-0 flex items-center justify-center sm:w-auto sm:px-4 sm:h-auto"
            aria-label="Next Week"
          >
            <span className="sm:hidden">→</span>
            <span className="hidden sm:inline">Next week</span>
          </button>
        </div>
      </div>

      <DaySelector
        weekDates={weekDates}
        selectedDate={selectedDate}
        onSelect={setSelectedDate}
      />

      {dayPlan && (
        <MealSection
          dayPlan={dayPlan}
          recipes={recipes}
          weekStartStr={weekStartStr}
          onUpdate={handleMealUpdate}
        />
      )}
    </div>
  );
}
