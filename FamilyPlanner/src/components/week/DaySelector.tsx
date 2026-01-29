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
      <div className="flex overflow-x-auto pb-4 gap-2 px-1 scrollbar-hide -mx-4 sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible">
        {/* Spacer for mobile padding */}
        <div className="w-2 shrink-0 sm:hidden" />
        {weekDates.map((date) => {
          const isSelected = isSameDay(date, selectedDate);
          const isToday = toDateString(date) === todayStr;
          return (
            <button
              key={date.getTime()}
              type="button"
              onClick={() => onSelect(date)}
              className={clsx(
                "min-w-[4rem] flex-shrink-0 rounded-xl border-2 px-4 py-3 text-center font-medium transition-colors snap-center",
                isSelected
                  ? "border-sage-600 bg-sage-600 text-white shadow-md transform scale-105"
                  : "border-sage-200 bg-white text-sage-700 hover:border-sage-300 hover:bg-sage-50",
                isToday && !isSelected && "ring-2 ring-sage-400 ring-offset-2"
              )}
            >
              <div className="text-xs uppercase text-inherit/80">
                {format(date, "EEE")}
              </div>
              <div className="text-lg">{format(date, "d")}</div>
            </button>
          );
        })}
        {/* Spacer for mobile padding */}
        <div className="w-2 shrink-0 sm:hidden" />
      </div>
    </div>
  );
}
