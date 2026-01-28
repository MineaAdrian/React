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
    <div className="flex flex-wrap justify-center gap-2">
      {weekDates.map((date) => {
        const isSelected = isSameDay(date, selectedDate);
        const isToday = toDateString(date) === todayStr;
        return (
          <button
            key={date.getTime()}
            type="button"
            onClick={() => onSelect(date)}
            className={clsx(
              "min-w-[4rem] rounded-xl border-2 px-4 py-3 text-center font-medium transition-colors",
              isSelected
                ? "border-sage-600 bg-sage-600 text-white"
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
    </div>
  );
}
