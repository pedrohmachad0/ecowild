import type { SaveData } from "../types.ts";
import { migrateSave } from "./schema.ts";

export const IMPORT_LIMIT = 512 * 1024;
export type ImportPreview = { ok: true; data: SaveData } | { ok: false; reason: string };

/** Parse and validate an exported JSON file without touching storage. */
export function parseImport(text: string): ImportPreview {
  if (text.length > IMPORT_LIMIT) return { ok: false, reason: "Arquivo grande demais para um save do EcoWild." };
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return { ok: false, reason: "O arquivo não é um JSON válido." }; }
  if (raw && typeof raw === "object" && !Array.isArray(raw) && "version" in raw && ![1, 2].includes((raw as { version: unknown }).version as number)) {
    return { ok: false, reason: "Versão de save desconhecida. Esta versão do jogo importa saves v1 e v2." };
  }
  const data = migrateSave(raw);
  return data ? { ok: true, data } : { ok: false, reason: "O JSON não tem a estrutura de um save do EcoWild." };
}
