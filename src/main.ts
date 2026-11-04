import { EcoWildGame } from "./game/EcoWildGame.ts";
import type { HudSnapshot } from "./game/EcoWildGame.ts";
import type { PetCommand, QualityName } from "./game/types.ts";
import { bindTouch } from "./game/input/touch.ts";
import { COMMAND_LABEL, panelHtml } from "./game/ui/panels.ts";
import type { CatalogFilter, DiaryTab } from "./game/ui/panels.ts";
import type { BioGroup } from "./game/data/species.ts";
import { minimapSvg } from "./game/ui/minimap.ts";
import type { PetAbility } from "./game/sim/simulation.ts";
import { bindProgress } from "./game/ui/progress.ts";
import { initPwa } from "./pwa.ts";
import "./style.css";

const canvas = must<HTMLCanvasElement>("#game");
const title = must("#title"), resume = must<HTMLButtonElement>("#resume");
const enter = must<HTMLButtonElement>("#enter");
const vitals = must("#vitals"), promptEl = must("#prompt"), toasts = must("#toasts");
const sheet = must("#sheet"), touch = must("#touch-controls"), playingBar = must("#playing-bar");
const pwaInfo = must("#pwa-info");
let lastSheet = "", panelOpen = false, touchActive = false;
let catalogFilter: CatalogFilter = "all";
let catalogGroup: BioGroup | "all" = "all";
let diaryTab: DiaryTab = "entries";
let catalogPlace = "all";
let hudMapAcc = 0;
let returnFocus: HTMLElement | null = null;
const lifecycle = new AbortController();
const game = new EcoWildGame(canvas, {
  onHud: render,
  onReady: () => { enter.disabled = false; must("#fatal").hidden = true; },
  onFatal: message => {
    must("#fatal").hidden = false;
    must("#fatal-message").textContent = `Não foi possível renderizar a mata. ${message}`;
    must<HTMLButtonElement>("#retry").focus();
  },
});
const touchBinding = bindTouch(touch, game);
const progress = bindProgress(game);
const stopPwa = initPwa(() => game.saveNow(), () => game.open("pause"));
void game.init(canvas);
function on(selector: string, event: string, handler: EventListener) {
  must(selector).addEventListener(event, handler, { signal: lifecycle.signal });
}
on("#enter", "click", () => game.start("new"));
on("#resume", "click", () => game.start("continue"));
on("#manage-progress", "click", () => void progress.open());
on("#camera", "click", () => game.setHold("camera", true));
on("#observe", "click", () => game.toggleObservation());
on("#photo", "click", () => game.takePhoto());
on("#shout", "click", () => game.setHold("shout", true));
on("#ability-track", "click", () => game.petAbility("TRACK"));
on("#ability-calm", "click", () => game.petAbility("CALM"));
on("#retry", "click", () => location.reload());
for (const id of ["catalog", "inventory", "map", "pause"] as const) on("#open-" + id, "click", () => game.open(id));
on("#close-sheet", "click", () => game.open("none"));
on("#portrait-dismiss", "click", () => { must("#orientation-prompt").hidden = true; });
let portrait = false;
function orientation() {
  const next = coarse() && innerHeight > innerWidth;
  if (next && !portrait) must("#orientation-prompt").hidden = false;
  if (!next) must("#orientation-prompt").hidden = true;
  portrait = next;
}
orientation();
window.addEventListener("resize", orientation, { signal: lifecycle.signal });
sheet.addEventListener("keydown", e => {
  if (e.key !== "Tab") return;
  const nodes = Array.from(sheet.querySelectorAll<HTMLElement>('button:not(:disabled), input, select')).filter(n => n.getClientRects().length);
  const first = nodes[0], last = nodes.at(-1);
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
}, { signal: lifecycle.signal });

function render(hud: HudSnapshot): void {
  title.hidden = hud.playing;
  resume.hidden = !hud.hasSave;
  enter.disabled = !hud.ready;
  must<HTMLButtonElement>("#manage-progress").disabled = !hud.ready;
  enter.textContent = hud.hasSave ? "Começar novo jogo" : "Entrar na mata";
  enter.className = hud.hasSave ? "secondary" : "primary";
  must("#load-status").textContent = hud.saveStatus;
  const saveStatus = sheet.querySelector("#save-status");
  if (saveStatus) saveStatus.textContent = hud.saveStatus;
  playingBar.hidden = !hud.playing;
  const nextTouch = hud.playing && hud.panel === "none" && coarse();
  if (!nextTouch && touchActive) touchBinding.clear();
  touchActive = nextTouch; touch.hidden = !nextTouch;
  renderVitals(hud);
  promptEl.hidden = !hud.prompt || !hud.playing;
  promptEl.textContent = coarse() ? hud.prompt.replace(/^E ·/, "Interagir ·") : hud.prompt;
  const encounter = hud.encounter;
  const observeButton = must<HTMLButtonElement>("#observe");
  observeButton.hidden = !encounter;
  observeButton.textContent = encounter?.focused ? "Voltar" : "Observar";
  observeButton.setAttribute("aria-label", encounter?.focused ? "Encerrar observação" : "Observar animal próximo");
  observeButton.setAttribute("aria-pressed", String(!!encounter?.focused));
  const observing = hud.playing && hud.panel === "none" && !!encounter?.focused;
  must("#photo").hidden = !observing;
  must("#photo").textContent = coarse() ? "Fotografar" : "Fotografar (P)";
  must("#photo-state").textContent = encounter?.photographed ? "Já fotografado: P substitui a foto." : "P ou Fotografar: guardar uma foto no diário.";
  must("#photo-flash").style.opacity = String(Math.min(0.8, hud.flash * 2.4));
  const abilityRow = must("#ability-row");
  abilityRow.hidden = !(touchActive && hud.abilities);
  if (hud.abilities) {
    const track = must<HTMLButtonElement>("#ability-track"), calm = must<HTMLButtonElement>("#ability-calm");
    track.disabled = !hud.abilities.near || hud.abilities.track > 0;
    calm.disabled = !hud.abilities.near || hud.abilities.calm > 0;
    track.textContent = hud.abilities.track > 0 ? `Farejar ${Math.ceil(hud.abilities.track)}s` : "Farejar";
    calm.textContent = hud.abilities.calm > 0 ? `Pulso ${Math.ceil(hud.abilities.calm)}s` : "Pulso calmo";
  }
  const shoutButton = must<HTMLButtonElement>("#shout");
  shoutButton.hidden = !(hud.playing && hud.panel === "none" && hud.threat > 0.05);
  shoutButton.disabled = !hud.shoutReady;
  shoutButton.textContent = coarse() ? "Afugentar" : "Afugentar (G)";
  must("#field-note").hidden = !observing;
  document.body.dataset.observing = String(observing);
  if (encounter) {
    must("#encounter-name").textContent = encounter.name;
    must("#encounter-state").textContent = encounter.state;
    must("#encounter-message").textContent = encounter.message;
  }
  const notices = hud.playing && hud.panel === "none" ? hud.toasts.slice(-1) : [];
  if (toasts.textContent !== notices.join("")) toasts.replaceChildren(...notices.map(text => { const p = document.createElement("p"); p.textContent = text; return p; }));
  const open = hud.panel !== "none" && hud.playing;
  if (open !== panelOpen) {
    if (open) returnFocus = document.activeElement as HTMLElement;
    playingBar.inert = open; canvas.inert = open;
    if (!open) returnFocus?.focus();
  }
  const abilities = hud.abilities ? [hud.abilities.near, Math.ceil(hud.abilities.track), Math.ceil(hud.abilities.calm)].join(",") : "";
  const sig = [hud.panel, catalogFilter, catalogGroup, catalogPlace, diaryTab, hud.place.id, hud.inventory.wolfapple, hud.pets.map(p => p.away).join(","), hud.pets.map(p => p.name + p.command + p.level + p.near).join(","), hud.challenges.filter(c => c.done).length, Object.keys(hud.photos).length, hud.inventory.eggs, hud.incubator === null ? "" : Math.floor(hud.incubator * 20), hud.hudMap, hud.inventory.berries, hud.inventory.glowfruit, hud.pet?.name, hud.pet?.command, hud.catalog.map(c => c.progress).join(","), hud.quality, hud.tier, hud.camera, abilities, hud.track?.label].join("|");
  sheet.hidden = !open;
  if (sig !== lastSheet) {
    lastSheet = sig;
    const focusedId = (document.activeElement as HTMLElement)?.id;
    must("#title").append(pwaInfo);
    sheet.querySelector<HTMLElement>("[data-body]")!.innerHTML = panelHtml(hud, { catalogFilter, touch: coarse(), group: catalogGroup, tab: diaryTab, place: catalogPlace });
    sheet.dataset.panel = hud.panel;
    if (hud.panel === "pause") sheet.append(pwaInfo);
    wireSheet();
    if (open && !panelOpen) must<HTMLButtonElement>("#close-sheet").focus();
    else if (open && focusedId) sheet.querySelector<HTMLElement>(`#${focusedId}`)?.focus();
  }
  panelOpen = open;
}
function wireSheet(): void {
  sheet.querySelector("#manage-progress-pause")?.addEventListener("click", () => void progress.open());
  sheet.querySelector("#eat-berry")?.addEventListener("click", () => game.useBerry());
  sheet.querySelector("#save-now")?.addEventListener("click", () => void game.saveNow());
  sheet.querySelector<HTMLSelectElement>("#quality")?.addEventListener("change", e => game.setQuality((e.target as HTMLSelectElement).value as QualityName));
  sheet.querySelector<HTMLInputElement>("#sensitivity")?.addEventListener("input", e => game.setLookSens(Number((e.target as HTMLInputElement).value)));
  sheet.querySelector<HTMLInputElement>("#deadzone")?.addEventListener("input", e => game.setDeadzone(Number((e.target as HTMLInputElement).value)));
  sheet.querySelectorAll<HTMLButtonElement>("[data-rename]").forEach(button => button.addEventListener("click", () => {
    game.renamePet(sheet.querySelector<HTMLInputElement>(`#${button.dataset.input}`)!.value, button.dataset.rename); void game.saveNow();
  }));
  sheet.querySelector<HTMLInputElement>("#hud-map-toggle")?.addEventListener("change", e => game.setHudMap((e.target as HTMLInputElement).checked));
  sheet.querySelectorAll<HTMLButtonElement>("[data-group]").forEach(button => button.addEventListener("click", () => {
    catalogGroup = button.dataset.group as BioGroup | "all"; lastSheet = ""; game.refreshHud();
  }));
  sheet.querySelectorAll<HTMLButtonElement>("[data-place]").forEach(button => button.addEventListener("click", () => {
    catalogPlace = button.dataset.place!; lastSheet = ""; game.refreshHud();
  }));
  sheet.querySelectorAll<HTMLButtonElement>("[data-tab]").forEach(button => button.addEventListener("click", () => {
    diaryTab = button.dataset.tab as DiaryTab; lastSheet = ""; game.refreshHud();
    sheet.querySelector<HTMLElement>(`[data-tab="${diaryTab}"]`)?.focus();
  }));
  sheet.querySelectorAll<HTMLButtonElement>("[data-pet]").forEach(button => button.addEventListener("click", () => game.command(button.dataset.pet as PetCommand)));
  sheet.querySelectorAll<HTMLButtonElement>("[data-ability]").forEach(button => button.addEventListener("click", () => game.petAbility(button.dataset.ability as PetAbility)));
  sheet.querySelectorAll<HTMLButtonElement>("[data-filter]").forEach(button => button.addEventListener("click", () => {
    catalogFilter = button.dataset.filter as CatalogFilter;
    lastSheet = ""; game.refreshHud();
  }));
}
const meters = {
  health: vitals.querySelector<HTMLElement>('[data-kind="health"]')!,
  energy: vitals.querySelector<HTMLElement>('[data-kind="energy"]')!,
  water: vitals.querySelector<HTMLElement>('[data-kind="water"]')!,
};
function setMeter(meter: HTMLElement, value: number, label: string): void {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const fill = meter.querySelector<HTMLElement>(".meter-fill")!;
  const width = `${v}%`;
  if (fill.style.width !== width) fill.style.width = width;
  meter.dataset.low = String(v < 30);
  meter.setAttribute("aria-label", `${label} ${v} de 100`);
}
function renderVitals(hud: HudSnapshot): void {
  if (!hud.playing) return;
  setMeter(meters.health, hud.health, "Vida");
  setMeter(meters.energy, hud.energy, "Energia");
  setMeter(meters.water, 100 - hud.thirst, "Água");
  must("#journal-chip").textContent = `Diário ${hud.discovered}/${hud.species}`;
  const clock = must("#clock-chip"), clockText = `${hud.place.name}|${hud.day.label} ${hud.day.clock}`;
  if (clock.dataset.text !== clockText) {
    clock.dataset.text = clockText;
    const place = document.createElement("span"); place.className = "chip-region"; place.textContent = `${hud.place.name} · `;
    clock.replaceChildren(place, `${hud.day.label} ${hud.day.clock}`);
  }
  must("#clock-chip").dataset.period = hud.day.period;
  const eggChip = must("#egg-chip");
  eggChip.hidden = hud.incubator === null && !hud.inventory.eggs;
  eggChip.textContent = hud.incubator !== null ? `Ovo no ninho ${Math.floor(hud.incubator * 100)}%` : `${hud.inventory.eggs} ovo(s) na bolsa`;
  const petChip = must("#pet-chip");
  const lead = hud.pets[0];
  petChip.hidden = !lead;
  if (lead) petChip.textContent = `${hud.pets.length > 1 ? `${hud.pets.length} companheiros` : lead.name} · ${COMMAND_LABEL[lead.command]}`;
  const map = must("#hud-map");
  map.hidden = !hud.hudMap || hud.panel !== "none";
  hudMapAcc++;
  if (!map.hidden && hudMapAcc % 3 === 0) map.innerHTML = minimapSvg(hud, true);
  const danger = hud.panel === "none" && hud.threat > 0.05;
  must("#threat-chip").hidden = !danger;
  must("#threat-vignette").style.opacity = danger ? String(Math.min(0.85, hud.threat)) : "0";
}
function coarse(): boolean { return matchMedia("(pointer: coarse)").matches; }
function must<T extends HTMLElement = HTMLElement>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (!node) throw new Error(`Elemento ausente: ${selector}`);
  return node;
}
if (import.meta.hot) import.meta.hot.dispose(() => { lifecycle.abort(); touchBinding.dispose(); progress.dispose(); stopPwa(); game.dispose(); });
