import { EcoWildGame } from "./game/EcoWildGame.ts";
import type { HudSnapshot } from "./game/EcoWildGame.ts";
import type { PetCommand, QualityName } from "./game/types.ts";
import "./style.css";

const canvas = document.querySelector<HTMLCanvasElement>("#game");
if (!canvas) throw new Error("Canvas não encontrado");

const title = must("#title");
const resume = must<HTMLButtonElement>("#resume");
const vitals = must("#vitals");
const promptEl = must("#prompt");
const toasts = must("#toasts");
const sheet = must("#sheet");
const touch = must("#touch-controls");
const playingBar = must("#playing-bar");

const game = new EcoWildGame(canvas, {
  onHud: render,
  onReady: () => undefined,
  onFatal: (message) => {
    title.hidden = false;
    title.querySelector("p")!.textContent = message;
  },
});

void game.init(canvas);

must("#enter").addEventListener("click", () => game.start("new"));
resume.addEventListener("click", () => game.start("continue"));
must("#camera").addEventListener("click", () => game.setHold("camera", true));
must("#camera-touch").addEventListener("click", () => game.setHold("camera", true));
must("#jump").addEventListener("pointerdown", (event) => {
  event.stopPropagation();
  game.setHold("jump", true);
});
must("#interact").addEventListener("pointerdown", (event) => {
  event.stopPropagation();
  game.setHold("interact", true);
});
must("#sprint").addEventListener("pointerdown", (event) => {
  event.stopPropagation();
  game.setHold("sprint", true);
});

for (const id of ["catalog", "inventory", "map", "pause"] as const) {
  must("#open-" + id).addEventListener("click", () => game.open(id));
}
must("#close-sheet").addEventListener("click", () => game.open("none"));

wireStick(must("#pad"), must("#pad-knob"));
wireLook(must("#camera-look"));

let lastSheet = "";

function render(hud: HudSnapshot): void {
  title.hidden = hud.playing;
  resume.hidden = !hud.hasSave;
  playingBar.hidden = !hud.playing;
  touch.hidden = !hud.playing || !coarse();
  vitals.textContent = hud.playing
    ? `Mata da Nascente  ${hud.discovered}/${hud.species}  ·  Fôlego ${Math.round(hud.health)}  ·  Energia ${Math.round(hud.energy)}${hud.trust?.near ? `  ·  Confiança ${Math.round(hud.trust.value)}` : ""}  ·  ${Number.isFinite(hud.fps) && hud.fps > 0 ? hud.fps : "—"} fps`
    : "";
  promptEl.hidden = !hud.prompt;
  promptEl.textContent = hud.prompt;
  toasts.replaceChildren(
    ...hud.toasts.slice(-2).map((text) => {
      const p = document.createElement("p");
      p.textContent = text;
      return p;
    }),
  );
  const sig = [
    hud.panel,
    hud.inventory.berries,
    hud.inventory.glowfruit,
    hud.pet?.command ?? "",
    hud.catalog.map((c) => c.progress).join(","),
    hud.quality,
  ].join("|");
  if (sig === lastSheet) return;
  lastSheet = sig;
  sheet.hidden = hud.panel === "none" || !hud.playing;
  const body = sheet.querySelector<HTMLElement>("[data-body]");
  if (body) body.innerHTML = panelHtml(hud);
  wireSheet();
}

function panelHtml(hud: HudSnapshot): string {
  if (hud.panel === "catalog") {
    return hud.catalog
      .map(
        (item) =>
          `<article><h3>${item.known ? item.name : "Não registrada"}</h3><p>${item.summary}</p><p>${item.curiosity}</p><p>Pesquisa ${item.progress}%</p></article>`,
      )
      .join("");
  }
  if (hud.panel === "inventory") {
    return `<p>Frutiluz: ${hud.inventory.glowfruit}. Ofereça à Auryn de perto, sem correr.</p>
      <p>Fruto da mata: ${hud.inventory.berries}.</p>
      <button type="button" id="eat-berry" ${hud.inventory.berries ? "" : "disabled"}>Comer fruto</button>`;
  }
  if (hud.panel === "map") {
    return `<p>Oeste: território dos lobos. Leste: lago das capivaras. Sudoeste: bosque do orvalho, onde a Auryn costuma ficar.</p>
      <ul>${hud.map
        .map((c) => `<li>${c.known ? c.speciesId : "sinal"} · ${c.tamed ? "companheira" : "livre"}</li>`)
        .join("")}</ul>`;
  }
  if (hud.panel === "pause") {
    const quals: QualityName[] = ["auto", "low", "medium", "high"];
    return `<p>Câmera ${hud.camera === "third" ? "em terceira pessoa" : "em primeira pessoa"}. V alterna.</p>
      <div>${quals
        .map((q) => `<button type="button" data-q="${q}">${q}</button>`)
        .join("")}</div>
      ${
        hud.pet
          ? `<p>${hud.pet.name} · nv ${hud.pet.level}</p>
             <button type="button" data-pet="FOLLOW">Seguir</button>
             <button type="button" data-pet="STAY">Esperar</button>
             <button type="button" data-pet="PROTECT">Proteger</button>
             <button type="button" data-pet="RETURN">Voltar</button>`
          : ""
      }
      <button type="button" id="save-now">Gravar agora</button>`;
  }
  return "";
}

function wireSheet(): void {
  sheet.querySelector("#eat-berry")?.addEventListener("click", () => game.useBerry());
  sheet.querySelector("#save-now")?.addEventListener("click", () => void game.saveNow());
  sheet.querySelectorAll<HTMLButtonElement>("[data-q]").forEach((button) => {
    button.addEventListener("click", () => game.setQuality(button.dataset.q as QualityName));
  });
  sheet.querySelectorAll<HTMLButtonElement>("[data-pet]").forEach((button) => {
    button.addEventListener("click", () => game.command(button.dataset.pet as PetCommand));
  });
}

function coarse(): boolean {
  return window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 860;
}

function wireStick(pad: HTMLElement, knob: HTMLElement): void {
  let origin: { x: number; y: number; id: number } | null = null;
  const move = (event: PointerEvent) => {
    if (!origin || origin.id !== event.pointerId) return;
    const dx = event.clientX - origin.x;
    const dy = event.clientY - origin.y;
    const m = Math.hypot(dx, dy) || 1;
    const cap = 48;
    const scale = Math.min(cap, m) / m;
    knob.style.transform = `translate(calc(-50% + ${dx * scale}px), calc(-50% + ${dy * scale}px))`;
    game.setStick((dx * scale) / cap, (dy * scale) / cap);
  };
  pad.addEventListener("pointerdown", (event) => {
    pad.setPointerCapture(event.pointerId);
    origin = { x: event.clientX, y: event.clientY, id: event.pointerId };
  });
  pad.addEventListener("pointermove", move);
  const end = (event: PointerEvent) => {
    if (origin?.id !== event.pointerId) return;
    origin = null;
    knob.style.transform = "translate(-50%, -50%)";
    game.setStick(0, 0);
  };
  pad.addEventListener("pointerup", end);
  pad.addEventListener("pointercancel", end);
}

function wireLook(zone: HTMLElement): void {
  let last: { x: number; y: number; id: number } | null = null;
  zone.addEventListener("pointerdown", (event) => {
    if ((event.target as HTMLElement).closest("button, #pad, #actions")) return;
    zone.setPointerCapture(event.pointerId);
    last = { x: event.clientX, y: event.clientY, id: event.pointerId };
  });
  zone.addEventListener("pointermove", (event) => {
    if (!last || last.id !== event.pointerId) return;
    game.addLook(event.clientX - last.x, event.clientY - last.y);
    last = { x: event.clientX, y: event.clientY, id: event.pointerId };
  });
  zone.addEventListener("pointerup", () => {
    last = null;
  });
}

function must<T extends Element = HTMLElement>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (!node) throw new Error(`Elemento ausente: ${selector}`);
  return node;
}
