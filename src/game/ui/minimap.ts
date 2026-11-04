import { CONFIG } from "../config.ts";
import { moundList, rockList, treeList } from "../world/layout.ts";
import { heightAt } from "../world/terrain.ts";
import { region } from "../world/region.ts";
import type { HudSnapshot } from "../EcoWildGame.ts";

/** Species colours shared by the map legend and the diary chips. */
export const SPECIES_COLOR: Record<string, string> = {
  capybara: "#c99a5b",
  rabbit: "#e8dcc4",
  wolf: "#9aa7b4",
  eagle: "#e0b44a",
  auryn: "#6fe0c9",
  armadillo: "#b5a284",
  toad: "#8a6c43",
  fish: "#c4ccc8",
  tegu: "#3a3934",
  mosslight: "#a8f5c4",
  anteater: "#6e5a48",
  seriema: "#cfc2a0",
  manedwolf: "#c9632f",
  brasalume: "#ffb347",
  caiman: "#4a4a32",
  jabiru: "#eeeae0",
  bat: "#6a5040",
  cavecricket: "#b89a76",
  cavefish: "#ead2c8",
};

const R = CONFIG.worldRadius;
const fmt = (n: number) => Math.round(n * 10) / 10;

/** Shoreline radius per angle, from the same terrain function the simulation uses. */
export function shorePolygon(samples = 48): { x: number; z: number }[] {
  const w = region().water;
  const points: { x: number; z: number }[] = [];
  for (let i = 0; i < samples; i++) {
    const a = (i / samples) * Math.PI * 2;
    const dx = Math.cos(a), dz = Math.sin(a);
    let low = 0, high = w.disc + 3;
    for (let k = 0; k < 14; k++) {
      const mid = (low + high) / 2;
      if (heightAt(w.x + dx * mid, w.z + dz * mid) < CONFIG.waterY) low = mid;
      else high = mid;
    }
    points.push({ x: w.x + dx * low, z: w.z + dz * low });
  }
  return points;
}

const staticLayers = new Map<string, string>();

/** Terrain, water, trail and landmarks never change while a region is loaded: build once per region. */
function baseLayer(): string {
  const def = region();
  const cached = staticLayers.get(def.id);
  if (cached) return cached;
  const shore = shorePolygon().map(p => `${fmt(p.x)},${fmt(p.z)}`).join(" ");
  const trail = def.trail.map(([x, z]) => `${x},${z}`).join(" ");
  const trees = treeList().map(t => `<circle cx="${t.x}" cy="${t.z}" r="1.5" class="mm-tree"/>`).join("");
  const rocks = rockList().map(r => `<circle cx="${r.x}" cy="${r.z}" r="${fmt(r.r + 0.3)}" class="mm-rock"/>`).join("");
  const mounds = moundList().map(m => `<circle cx="${m.x}" cy="${m.z}" r="${fmt(m.r + 0.4)}" class="mm-mound"/>`).join("");
  const t = def.territory;
  const layer = `<circle cx="0" cy="0" r="${R}" class="mm-ground mm-${def.id}"/>`
    + (t ? `<circle cx="${t.x}" cy="${t.z}" r="${t.r}" class="mm-territory"/>` : "")
    + def.highlights.map(h => `<circle cx="${h.x}" cy="${h.z}" r="${h.r}" class="mm-grove"/>`).join("")
    + `<polygon points="${shore}" class="mm-water"/>`
    + `<polyline points="${trail}" class="mm-trail"/>`
    + trees + rocks + mounds
    + def.nests.map(n => `<circle cx="${n.x}" cy="${n.z}" r="1.3" class="mm-nest"/>`).join("")
    + def.burrows.map(b => `<circle cx="${b.x}" cy="${b.z}" r="0.9" class="mm-burrow"/>`).join("")
    + `<rect x="${def.camp.x - 1.4}" y="${def.camp.z - 1.4}" width="2.8" height="2.8" rx="0.5" class="mm-camp"/>`
    + def.exits.map(e => `<path d="M${e.x - 1.6},${e.z - 1.6} L${e.x + 1.6},${e.z} L${e.x - 1.6},${e.z + 1.6} Z" class="mm-exit" transform="rotate(${e.x > 0 ? 0 : 180} ${e.x} ${e.z})"/>`).join("")
    + `<circle cx="0" cy="0" r="${R}" class="mm-border"/>`
    + def.labels.map(l => `<text x="${l.x}" y="${l.z}" class="mm-label${l.danger ? " mm-danger" : ""}">${l.text}</text>`).join("")
    + `<text x="0" y="${-R + 3.4}" class="mm-north">N</text>`;
  staticLayers.set(def.id, layer);
  return layer;
}

/** Graphic field guide. Only shows animals the diary already knows. */
export function minimapSvg(hud: HudSnapshot, compact = false): string {
  const fruit = hud.props.filter(p => p.available).map(p => `<circle cx="${p.x}" cy="${p.z}" r="${p.kind === "berry" ? 0.7 : 0.9}" class="${p.kind === "glow" ? "mm-glow" : p.kind === "egg" ? "mm-egg" : p.kind === "wolfapple" ? "mm-wolfapple" : "mm-berry"}"/>`).join("");
  const animals = hud.map.filter(c => c.known || c.tamed).map(c => {
    const label = c.tamed ? "companheira" : c.speciesId;
    return `<circle cx="${fmt(c.x)}" cy="${fmt(c.z)}" r="${c.tamed ? 1.4 : 1.1}" fill="${SPECIES_COLOR[c.speciesId] ?? "#fff"}" class="mm-animal${c.tamed ? " mm-pet" : ""}"><title>${label}</title></circle>`;
  }).join("");
  const track = hud.track ? `<g class="mm-track"><circle cx="${fmt(hud.track.x)}" cy="${fmt(hud.track.z)}" r="2.2"/><circle cx="${fmt(hud.track.x)}" cy="${fmt(hud.track.z)}" r="0.6"/></g>` : "";
  // Camera yaw 0 looks toward −Z (north); the arrow follows the view direction.
  const deg = fmt((-hud.yaw * 180) / Math.PI);
  const player = `<g transform="translate(${fmt(hud.player.x)} ${fmt(hud.player.z)}) rotate(${deg})" class="mm-player"><path d="M0,-2.6 L1.8,1.8 L0,0.9 L-1.8,1.8 Z"/></g>`;
  return `<svg viewBox="${-R - 1} ${-R - 1} ${2 * R + 2} ${2 * R + 2}" role="img" aria-label="Mapa da Mata da Nascente com sua posição" class="minimap${compact ? " compact" : ""}">${baseLayer()}${fruit}${animals}${track}${player}</svg>`;
}
