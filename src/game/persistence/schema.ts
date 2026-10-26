import type { DiscoveryFlags, PetCommand, QualityName, SaveV1, SpeciesId } from "../types.ts";

import { SPECIES as PROFILES } from "../data/species.ts";
import { SPAWNS, props } from "../world/layout.ts";
const SPECIES = PROFILES.map((s) => s.id);
const CREATURES = [...SPAWNS.capybara, ...SPAWNS.rabbit, ...SPAWNS.wolf, SPAWNS.eagle, SPAWNS.auryn];
const COMMANDS: readonly PetCommand[] = ["FOLLOW", "STAY", "RETURN", "PROTECT"];
const QUALITIES: readonly QualityName[] = ["low", "medium", "high", "auto"];

function num(v: unknown, fallback: number, min: number, max: number): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, v));
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function flags(raw: unknown): DiscoveryFlags {
  const o = isRecord(raw) ? raw : {};
  return {
    seen: o.seen === true,
    habitat: o.seen === true && o.habitat === true,
    behavior: o.seen === true && o.behavior === true,
    interacted: o.seen === true && o.interacted === true,
  };
}

export function emptyDiscovery(): DiscoveryFlags {
  return { seen: false, habitat: false, behavior: false, interacted: false };
}

/** v1 is the only released schema. Unknown versions are preserved, never downgraded. */
export function migrateSave(raw: unknown): SaveV1 | null {
  if (!isRecord(raw)) return null;
  const version = raw.version;
  if (version !== 1) return null;
  if (!isRecord(raw.player)) return null;
  const p = raw.player;
  if (![p.x, p.y, p.z].every((v) => typeof v === "number" && Number.isFinite(v))) return null;
  if (!isRecord(raw.inventory) || !isRecord(raw.discoveries) || !isRecord(raw.creatures)) return null;
  const inv = isRecord(raw.inventory) ? raw.inventory : {};
  const settings = isRecord(raw.settings) ? raw.settings : {};
  const quality = QUALITIES.includes(settings.quality as QualityName)
    ? (settings.quality as QualityName)
    : "auto";
  const discoveries: SaveV1["discoveries"] = {};
  if (isRecord(raw.discoveries)) {
    for (const id of SPECIES) discoveries[id] = flags(raw.discoveries[id]);
  }
  const creatures: SaveV1["creatures"] = {};
  if (isRecord(raw.creatures)) {
    for (const { id } of CREATURES) {
      const value = raw.creatures[id];
      if (!isRecord(value)) continue;
      creatures[id] = {
        x: num(value.x, 0, -80, 80),
        z: num(value.z, 0, -80, 80),
        hunger: num(value.hunger, 0.4, 0, 1),
        thirst: num(value.thirst, 0.3, 0, 1),
        fear: num(value.fear, 0, 0, 1),
        energy: num(value.energy, 0.8, 0, 1),
        trust: num(value.trust, 0, 0, 100),
        tamed: id === SPAWNS.auryn.id && value.tamed === true,
      };
    }
  }
  const picked: Record<string, boolean> = {};
  if (isRecord(raw.picked)) {
    for (const { id } of props()) if (raw.picked[id] === true) picked[id] = true;
  }
  let pet: SaveV1["pet"] = null;
  if (isRecord(raw.pet) && creatures[SPAWNS.auryn.id]?.tamed) {
    const command = COMMANDS.includes(raw.pet.command as PetCommand)
      ? (raw.pet.command as PetCommand)
      : "FOLLOW";
    const name = typeof raw.pet.name === "string" ? raw.pet.name.slice(0, 16) : "Auryn";
    pet = { name: name.trim() || "Auryn", xp: num(raw.pet.xp, 0, 0, 9999), command };
  }
  if (creatures[SPAWNS.auryn.id]?.tamed) creatures[SPAWNS.auryn.id].trust = 100;
  return {
    version: 1,
    player: {
      x: num(p.x, 0, -80, 80),
      y: num(p.y, 0, -10, 40),
      z: num(p.z, 18, -80, 80),
      yaw: num(p.yaw, 0, -20, 20),
      health: num(p.health, 100, 0, 100),
      energy: num(p.energy, 100, 0, 100),
      thirst: num(p.thirst, 8, 0, 100),
    },
    inventory: {
      glowfruit: Math.round(num(inv.glowfruit, 0, 0, 20)),
      berries: Math.round(num(inv.berries, 0, 0, 20)),
    },
    picked,
    discoveries,
    pet,
    creatures,
    settings: { quality, lookSens: num(settings.lookSens, 0.0045, 0.001, 0.02) },
    seconds: num(raw.seconds, 0, 0, 1e7),
  };
}
