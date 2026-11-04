import type { AiState, DiscoveryFlags, PetCommand, QualityName, SaveData, SavedPet, SavedPhoto, SpeciesId } from "../types.ts";

import { SPECIES as PROFILES, SPECIES_BY_ID } from "../data/species.ts";
import { allRegions, isRegionId } from "../world/region.ts";
import type { RegionId } from "../world/region.ts";
import "../world/regions/index.ts";
import { CHALLENGES } from "../progression/challenges.ts";

export const SAVE_VERSION = 3;
const SPECIES = PROFILES.map((s) => s.id);
// Every region contributes its spawns and props: a save can hold all of them.
const SPAWN_CREATURES: { id: string; speciesId: SpeciesId }[] = allRegions().flatMap(r => r.creatures.map(c => ({ id: c.id, speciesId: c.speciesId })));
const PROP_IDS = allRegions().flatMap(r => r.props.map(p => p.id));
const AURYN_ID = "auryn-1";
const SPAWN_SPECIES = new Map(SPAWN_CREATURES.map(c => [c.id, c.speciesId]));
const COMMANDS: readonly PetCommand[] = ["FOLLOW", "STAY", "RETURN", "PROTECT"];
const QUALITIES: readonly QualityName[] = ["low", "medium", "high", "auto"];
const STATES: readonly AiState[] = ["IDLE", "WANDER", "SEARCH_FOOD", "EAT", "DRINK", "REST", "FLEE", "CHASE", "DEFEND", "FOLLOW_OWNER", "PROTECT_OWNER", "RETURN_HOME"];
/** Only creatures that can be born in play may appear without a spawn entry. */
const BORN_ID = /^hatch-\d{1,4}$/;
const MAX_BORN = 8;
const PHOTO_LIMIT = 40_000;

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

function petName(raw: unknown, fallback: string): string {
  return typeof raw === "string" ? raw.slice(0, 16).trim() || fallback : fallback;
}

/**
 * Validates and normalizes a stored save into the current schema (v2).
 * v1 (the first released format) is migrated in memory; unknown versions are
 * rejected so the caller can preserve them untouched.
 */
export function migrateSave(raw: unknown): SaveData | null {
  if (!isRecord(raw)) return null;
  const version = raw.version;
  if (version !== 1 && version !== 2 && version !== 3) return null;
  if (!isRecord(raw.player)) return null;
  const p = raw.player;
  if (![p.x, p.y, p.z].every((v) => typeof v === "number" && Number.isFinite(v))) return null;
  if (!isRecord(raw.inventory) || !isRecord(raw.discoveries) || !isRecord(raw.creatures)) return null;
  if (version >= 2 && !Array.isArray(raw.pets)) return null;
  const inv = raw.inventory;
  const settings = isRecord(raw.settings) ? raw.settings : {};
  const quality = QUALITIES.includes(settings.quality as QualityName) ? (settings.quality as QualityName) : "auto";
  const discoveries: SaveData["discoveries"] = {};
  for (const id of SPECIES) discoveries[id] = flags(raw.discoveries[id]);

  const creatures: SaveData["creatures"] = {};
  const speciesOf = new Map(SPAWN_SPECIES);
  let born = 0;
  for (const [id, value] of Object.entries(raw.creatures)) {
    if (!isRecord(value)) continue;
    let speciesId = SPAWN_SPECIES.get(id);
    const isBorn = !speciesId && version >= 2 && BORN_ID.test(id) && SPECIES_BY_ID[value.speciesId as SpeciesId]?.reproduction === "fantasy-egg";
    if (isBorn) { if (born >= MAX_BORN) continue; born++; speciesId = value.speciesId as SpeciesId; speciesOf.set(id, speciesId); }
    if (!speciesId) continue;
    creatures[id] = {
      x: num(value.x, 0, -80, 80),
      z: num(value.z, 0, -80, 80),
      hunger: num(value.hunger, 0.4, 0, 1),
      thirst: num(value.thirst, 0.3, 0, 1),
      fear: num(value.fear, 0, 0, 1),
      energy: num(value.energy, 0.8, 0, 1),
      trust: num(value.trust, 0, 0, 100),
      tamed: SPECIES_BY_ID[speciesId].domesticable && value.tamed === true,
      ...(isBorn ? { speciesId } : {}),
      ...(isRegionId(value.region) ? { region: value.region } : {}),
    };
  }
  for (const c of Object.values(creatures)) if (c.tamed) c.trust = 100;

  const picked: Record<string, boolean> = {};
  if (isRecord(raw.picked)) {
    for (const id of PROP_IDS) if (raw.picked[id] === true) picked[id] = true;
  }

  // v1 had a single optional Auryn pet; v2 keeps one entry per tamed creature.
  const rawPets: unknown[] = version === 1 ? (isRecord(raw.pet) ? [{ ...raw.pet, id: AURYN_ID, speciesId: "auryn" }] : []) : raw.pets as unknown[];
  const pets: SavedPet[] = [];
  for (const entry of rawPets) {
    if (!isRecord(entry) || typeof entry.id !== "string") continue;
    const speciesId = speciesOf.get(entry.id);
    if (!speciesId || !creatures[entry.id]?.tamed || pets.some(p => p.id === entry.id)) continue;
    const fallback = SPECIES_BY_ID[speciesId].name;
    pets.push({
      id: entry.id, speciesId, name: petName(entry.name, fallback), xp: num(entry.xp, 0, 0, 99999),
      command: COMMANDS.includes(entry.command as PetCommand) ? entry.command as PetCommand : "FOLLOW",
    });
  }
  // A tamed creature without a pet entry still gets one, never a silent loss.
  for (const [id, c] of Object.entries(creatures)) {
    if (c.tamed && !pets.some(p => p.id === id)) {
      const speciesId = speciesOf.get(id)!;
      pets.push({ id, speciesId, name: SPECIES_BY_ID[speciesId].name, xp: 0, command: "FOLLOW" });
    }
  }

  const photos: SaveData["photos"] = {};
  if (version >= 2 && isRecord(raw.photos)) {
    for (const id of SPECIES) {
      const photo = raw.photos[id];
      if (!isRecord(photo) || typeof photo.image !== "string") continue;
      if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(photo.image) || photo.image.length > PHOTO_LIMIT) continue;
      photos[id] = { image: photo.image, state: STATES.includes(photo.state as AiState) ? photo.state as AiState : "IDLE", seconds: num(photo.seconds, 0, 0, 1e7) } satisfies SavedPhoto;
    }
  }
  const challenges: Record<string, boolean> = {};
  if (version >= 2 && isRecord(raw.challenges)) for (const c of CHALLENGES) if (raw.challenges[c.id] === true) challenges[c.id] = true;
  const incubator = version >= 2 && isRecord(raw.incubator) ? { progress: num(raw.incubator.progress, 0, 0, 0.999) } : null;

  const regionId: RegionId = version === 3 && isRegionId(raw.region) ? raw.region : "mata";
  const visited: RegionId[] = Array.isArray(raw.visited) ? [...new Set(raw.visited.filter(isRegionId))] : [];
  if (!visited.includes(regionId)) visited.push(regionId);
  return {
    version: 3,
    region: regionId,
    visited,
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
      eggs: Math.round(num(inv.eggs, 0, 0, 2)),
      wolfapple: Math.round(num(inv.wolfapple, 0, 0, 20)),
    },
    picked,
    discoveries,
    pets,
    creatures,
    incubator,
    photos,
    challenges,
    settings: { quality, lookSens: num(settings.lookSens, 0.0045, 0.001, 0.02) },
    seconds: num(raw.seconds, 0, 0, 1e7),
  };
}
