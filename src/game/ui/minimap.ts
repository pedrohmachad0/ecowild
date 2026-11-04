import { CONFIG } from "../config.ts";
import { CAMP, NESTS, SPAWNS, rockList, treeList } from "../world/layout.ts";
import { heightAt, TRAIL } from "../world/terrain.ts";
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
};

const R = CONFIG.worldRadius;
const fmt = (n: number) => Math.round(n * 10) / 10;

/** Shoreline radius per angle, from the same terrain function the simulation uses. */
export function shorePolygon(samples = 48): { x: number; z: number }[] {
  const points: { x: number; z: number }[] = [];
  for (let i = 0; i < samples; i++) {
    const a = (i / samples) * Math.PI * 2;
    const dx = Math.cos(a), dz = Math.sin(a);
    let low = 0, high = 14;
    for (let k = 0; k < 14; k++) {
      const mid = (low + high) / 2;
      if (heightAt(CONFIG.lakeX + dx * mid, CONFIG.lakeZ + dz * mid) < CONFIG.waterY) low = mid;
      else high = mid;
    }
    points.push({ x: CONFIG.lakeX + dx * low, z: CONFIG.lakeZ + dz * low });
  }
  return points;
}

let staticLayer: string | null = null;

/** Terrain, water, trail and landmarks never change during a session: build once. */
function baseLayer(): string {
  if (staticLayer) return staticLayer;
  const shore = shorePolygon().map(p => `${fmt(p.x)},${fmt(p.z)}`).join(" ");
  const trail = TRAIL.map(([x, z]) => `${x},${z}`).join(" ");
  const trees = treeList().map(t => `<circle cx="${t.x}" cy="${t.z}" r="1.5" class="mm-tree"/>`).join("");
  const rocks = rockList().map(r => `<circle cx="${r.x}" cy="${r.z}" r="${fmt(r.r + 0.3)}" class="mm-rock"/>`).join("");
  const t = SPAWNS.territory;
  const grove = { x: -9, z: -7 };
  staticLayer = `<circle cx="0" cy="0" r="${R}" class="mm-ground"/>`
    + `<circle cx="${t.x}" cy="${t.z}" r="${t.r}" class="mm-territory"/>`
    + `<circle cx="${grove.x}" cy="${grove.z}" r="5.5" class="mm-grove"/>`
    + `<polygon points="${shore}" class="mm-water"/>`
    + `<polyline points="${trail}" class="mm-trail"/>`
    + trees + rocks
    + NESTS.map(n => `<circle cx="${n.x}" cy="${n.z}" r="1.3" class="mm-nest"/>`).join("")
    + SPAWNS.armadillo.map(b => `<circle cx="${b.x}" cy="${b.z}" r="0.9" class="mm-burrow"/>`).join("")
    + `<rect x="${CAMP.x - 1.4}" y="${CAMP.z - 1.4}" width="2.8" height="2.8" rx="0.5" class="mm-camp"/>`
    + `<circle cx="0" cy="0" r="${R}" class="mm-border"/>`
    + `<text x="${CONFIG.lakeX}" y="${CONFIG.lakeZ + 0.8}" class="mm-label">Lago</text>`
    + `<text x="${grove.x + 1}" y="${grove.z + 8}" class="mm-label">Bosque do orvalho</text>`
    + `<text x="${t.x - 1}" y="${t.z - t.r - 1}" class="mm-label mm-danger">Lobos</text>`
    + `<text x="${CAMP.x + 1}" y="${CAMP.z + 4.2}" class="mm-label">Acampamento (clareira)</text>`
    + `<text x="${NESTS[0].x + 5}" y="${NESTS[0].z - 2.6}" class="mm-label">Musgarins</text>`
    + `<text x="${SPAWNS.armadillo[0].x - 1}" y="${SPAWNS.armadillo[0].z + 3.4}" class="mm-label">Tocas</text>`
    + `<text x="0" y="${-R + 3.4}" class="mm-north">N</text>`;
  return staticLayer;
}

/** Graphic field guide. Only shows animals the diary already knows. */
export function minimapSvg(hud: HudSnapshot, compact = false): string {
  const fruit = hud.props.filter(p => p.available).map(p => `<circle cx="${p.x}" cy="${p.z}" r="${p.kind === "berry" ? 0.7 : 0.9}" class="${p.kind === "glow" ? "mm-glow" : p.kind === "egg" ? "mm-egg" : "mm-berry"}"/>`).join("");
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
