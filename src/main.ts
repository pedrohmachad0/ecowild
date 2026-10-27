import { EcoWildGame } from "./game/EcoWildGame.ts";
import type { HudSnapshot } from "./game/EcoWildGame.ts";
import type { PetCommand, QualityName } from "./game/types.ts";
import { bindTouch } from "./game/input/touch.ts";
import { panelHtml } from "./game/ui/panels.ts";
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
  must("#load-status").textContent = hud.saveStatus;
  must("#save-status").textContent = hud.saveStatus;
  playingBar.hidden = !hud.playing;
  const nextTouch = hud.playing && hud.panel === "none" && coarse();
  if (!nextTouch && touchActive) touchBinding.clear();
  touchActive = nextTouch; touch.hidden = !nextTouch;
  vitals.textContent = hud.playing ? `Diário ${hud.discovered}/${hud.species} · Vida ${Math.round(hud.health)} · Energia ${Math.round(hud.energy)} · Sede ${Math.round(hud.thirst)}` : "";
  promptEl.hidden = !hud.prompt || !hud.playing;
  promptEl.textContent = coarse() ? hud.prompt.replace(/^E ·/, "Interagir ·") : hud.prompt;
  const encounter = hud.encounter;
  const observeButton = must<HTMLButtonElement>("#observe");
  observeButton.hidden = !encounter;
  observeButton.textContent = encounter?.focused ? "Voltar" : "Observar";
  observeButton.setAttribute("aria-label", encounter?.focused ? "Encerrar observação" : "Observar animal próximo");
  observeButton.setAttribute("aria-pressed", String(!!encounter?.focused));
  const observing = hud.playing && hud.panel === "none" && !!encounter?.focused;
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
  const sig = [hud.panel, hud.inventory.berries, hud.inventory.glowfruit, hud.pet?.name, hud.pet?.command, hud.catalog.map(c => c.progress).join(","), hud.quality].join("|");
  sheet.hidden = !open;
  if (sig !== lastSheet) {
    lastSheet = sig;
    const focusedId = (document.activeElement as HTMLElement)?.id;
    must("#title").append(pwaInfo);
    sheet.querySelector<HTMLElement>("[data-body]")!.innerHTML = panelHtml(hud);
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
  sheet.querySelector("#rename-pet")?.addEventListener("click", () => { game.renamePet(sheet.querySelector<HTMLInputElement>("#pet-name")!.value); void game.saveNow(); });
  sheet.querySelectorAll<HTMLButtonElement>("[data-pet]").forEach(button => button.addEventListener("click", () => game.command(button.dataset.pet as PetCommand)));
}
function coarse(): boolean { return matchMedia("(pointer: coarse)").matches; }
function must<T extends HTMLElement = HTMLElement>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (!node) throw new Error(`Elemento ausente: ${selector}`);
  return node;
}
if (import.meta.hot) import.meta.hot.dispose(() => { lifecycle.abort(); touchBinding.dispose(); progress.dispose(); stopPwa(); game.dispose(); });
