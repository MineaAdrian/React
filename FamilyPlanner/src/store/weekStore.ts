import { create } from "zustand";
import { getWeekStart, toDateString } from "@/lib/week";

interface WeekState {
  weekStart: Date;
  weekStartStr: string;
  setWeek: (date: Date) => void;
  setWeekFromString: (s: string) => void;
}

export const useWeekStore = create<WeekState>((set) => {
  const start = getWeekStart();
  return {
    weekStart: start,
    weekStartStr: toDateString(start),
    setWeek: (date) =>
      set({
        weekStart: getWeekStart(date),
        weekStartStr: toDateString(getWeekStart(date)),
      }),
    setWeekFromString: (s) => {
      const d = new Date(s);
      set({
        weekStart: d,
        weekStartStr: toDateString(d),
      });
    },
  };
});
