import type { ActiveWindow } from "../types.ts";

/** Real seconds for one full day in the Mata. */
export const DAY_LENGTH = 600;
/** New games start mid-morning. */
export const DAY_START = 0.3;

/** 0 = midnight, 0.25 sunrise, 0.5 noon, 0.75 sunset. */
export function dayFraction(seconds: number): number {
  const f = (DAY_START + seconds / DAY_LENGTH) % 1;
  return f < 0 ? f + 1 : f;
}

export type DayPeriod = "night" | "dawn" | "day" | "dusk";

export function dayPeriod(f: number): DayPeriod {
  if (f >= 0.21 && f < 0.29) return "dawn";
  if (f >= 0.29 && f < 0.71) return "day";
  if (f >= 0.71 && f < 0.79) return "dusk";
  return "night";
}

export const PERIOD_LABEL: Record<DayPeriod, string> = { night: "Noite", dawn: "Amanhecer", day: "Dia", dusk: "Entardecer" };

/** 0 at deep night, 1 at noon; smooth through dawn and dusk. */
export function daylight(f: number): number {
  const sun = Math.sin((f - 0.25) * Math.PI * 2);
  return Math.max(0, Math.min(1, (sun + 0.18) / 0.9));
}

export function isActive(window: ActiveWindow, f: number): boolean {
  const period = dayPeriod(f);
  if (window === "any") return true;
  if (window === "day") return period === "day" || period === "dawn" || period === "dusk";
  if (window === "night") return period === "night" || period === "dusk" || period === "dawn";
  return period !== "day" || f < 0.36 || f > 0.64; // twilight: dawn, dusk, night and the edges of the day
}

/** Clock text such as "06:30". */
export function clockLabel(f: number): string {
  const minutes = Math.floor(f * 24 * 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(Math.floor(minutes % 60 / 10) * 10).padStart(2, "0")}`;
}
