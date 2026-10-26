import type { QualityName } from "../types.ts";
export type Preferences = { quality: QualityName; lookSens: number; deadzone: number };
const defaults: Preferences = { quality: "auto", lookSens: 0.0045, deadzone: 0.16 };
export function loadPreferences(legacy?: Partial<Preferences>): Preferences {
  let raw = legacy;
  try { raw = JSON.parse(localStorage.getItem("ecowild.preferences") ?? "null") ?? legacy; } catch { /* session defaults */ }
  const bounded = (v: unknown, fallback: number, min: number, max: number) => typeof v === "number" && Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : fallback;
  return {
    quality: ["auto", "low", "medium", "high"].includes(raw?.quality ?? "") ? raw!.quality! : defaults.quality,
    lookSens: bounded(raw?.lookSens, defaults.lookSens, 0.001, 0.02),
    deadzone: bounded(raw?.deadzone, defaults.deadzone, 0.05, 0.35),
  };
}
export function storePreferences(prefs: Preferences): boolean {
  try { localStorage.setItem("ecowild.preferences", JSON.stringify(prefs)); return true; } catch { return false; }
}
