"use client";

import { format, isSameDay } from "date-fns";
import { toDateString } from "@/lib/week";
import { clsx } from "clsx";

interface DaySelectorProps {
  weekDates: Date[];
  selectedDate: Date;
  onSelect: (date: Date) => void;
}

export function DaySelector({ weekDates, selectedDate, onSelect }: DaySelectorProps) {
  const today = new Date();
  const todayStr = toDateString(today);

  return (
    <div className="relative">
      <div className="flex overflow-x-auto pb-6 pt-2 gap-3 px-4 scrollbar-hide -mx-4 snap-x snap-mandatory sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0 sm:pb-4 sm:pt-0 sm:gap-2">
        {/* Mobile-only spacer for start padding */}
        <div className="w-1 shrink-0 sm:hidden" />

        {weekDates.map((date) => {
          const isSelected = isSameDay(date, selectedDate);
          const isToday = toDateString(date) === todayStr;
          return (
            <button
              key={date.getTime()}
              type="button"
              onClick={() => onSelect(date)}
              className={clsx(
                "flex-shrink-0 flex flex-col items-center justify-center rounded-2xl border-2 transition-all snap-center touch-manipulation relative",
                "min-w-[4.5rem] h-20 sm:min-w-[4rem] sm:h-auto sm:px-4 sm:py-3",
                isSelected
                  ? "border-sage-600 bg-sage-600 text-white shadow-lg scale-105 z-10"
                  : "border-sage-200 bg-white text-sage-700 hover:border-sage-300 hover:bg-sage-50",
                isToday && !isSelected && "ring-2 ring-sage-400 ring-offset-2"
              )}
            >
              <div className={clsx(
                "text-[0.65rem] uppercase font-bold tracking-wider sm:text-xs sm:font-medium",
                isSelected ? "text-white/90" : "text-sage-500"
              )}>
                {format(date, "EEE")}
              </div>
              <div className="text-xl font-bold sm:text-lg sm:font-normal">
                {format(date, "d")}
              </div>
              {isToday && (
                <div className={clsx(
                  "absolute bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full sm:hidden",
                  isSelected ? "bg-white" : "bg-sage-600"
                )} />
              )}
            </button>
          );
        })}

        {/* Mobile-only spacer for end padding */}
        <div className="w-1 shrink-0 sm:hidden" />
      </div>
    </div>
  );
}
