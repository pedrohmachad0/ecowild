import type { HudSnapshot } from "../EcoWildGame.ts";
import type { CatalogEntry } from "../catalog/discoveries.ts";
import type { PetCommand } from "../types.ts";
import { minimapSvg, SPECIES_COLOR } from "./minimap.ts";

export type CatalogFilter = "all" | "known" | "pending";
export type PanelOptions = { catalogFilter: CatalogFilter; touch: boolean };

const escape = (text: string) => text.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export const TIER_LABEL: Record<string, string> = { low: "baixa", medium: "média", high: "alta" };
export const COMMAND_LABEL: Record<PetCommand, string> = { FOLLOW: "Seguir", STAY: "Esperar", PROTECT: "Proteger", RETURN: "Voltar" };
const COMMAND_HELP: Record<PetCommand, string> = {
  FOLLOW: "caminha atrás de você",
  STAY: "fica parada onde está",
  PROTECT: "fica entre você e lobos próximos",
  RETURN: "volta depressa e depois segue você",
};

export function panelHtml(hud: HudSnapshot, options: PanelOptions = { catalogFilter: "all", touch: false }): string {
  if (hud.panel === "catalog") return catalogHtml(hud, options.catalogFilter);
  if (hud.panel === "inventory") return inventoryHtml(hud);
  if (hud.panel === "map") return mapHtml(hud);
  if (hud.panel === "pause") return pauseHtml(hud, options.touch);
  return "";
}

function catalogHtml(hud: HudSnapshot, filter: CatalogFilter): string {
  const filters: [CatalogFilter, string][] = [["all", "Todas"], ["known", "Registradas"], ["pending", "Pesquisa pendente"]];
  const list = hud.catalog.filter(item => filter === "all" || (filter === "known" ? item.known : item.progress < 100));
  const research = Math.round(hud.catalog.reduce((sum, item) => sum + item.progress, 0) / Math.max(1, hud.catalog.length));
  return `<h2 id="panel-title">Diário de campo</h2>
    <p class="lede">${hud.discovered} de ${hud.species} espécies registradas · pesquisa geral ${research}%. Fichas separam biologia real de fantasia; esta mata imaginária reúne espécies de regiões diferentes.</p>
    <div class="filters" role="group" aria-label="Filtrar fichas">${filters.map(([id, label]) => `<button type="button" class="chip-button" data-filter="${id}" aria-pressed="${filter === id}">${label}</button>`).join("")}</div>
    <div class="entries">${list.map(entryHtml).join("") || `<p class="empty">Nenhuma ficha neste filtro.</p>`}</div>`;
}

function entryHtml(item: CatalogEntry): string {
  const steps: [boolean, string][] = [[item.flags.seen, "Avistada"], [item.flags.habitat, "Habitat"], [item.flags.behavior, "Comportamento"], [item.flags.interacted, "Encontro"]];
  const stepList = `<ol class="steps">${steps.map(([done, label]) => `<li class="${done ? "done" : ""}">${label}</li>`).join("")}</ol><p class="research">Pesquisa ${item.progress}%</p>`;
  const bar = `<div class="bar" role="progressbar" aria-label="Pesquisa" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${item.progress}"><span style="width:${item.progress}%"></span></div>`;
  if (!item.known) {
    return `<article class="entry locked"><header><span class="swatch" aria-hidden="true"></span><h3>${escape(item.name)}</h3></header><p>${escape(item.summary)}</p>${bar}${stepList}</article>`;
  }
  const next = !item.flags.behavior
    ? "Fique perto, andando devagar ou parado, até o diário anotar o comportamento."
    : !item.flags.interacted ? "Chegue bem perto e use Interagir para anotar um encontro." : "";
  const chips = [...item.ecological.split(" · "), item.dietLabel, item.activity].filter(Boolean);
  return `<article class="entry"><header><span class="swatch" style="--swatch:${SPECIES_COLOR[item.id] ?? "#ccc"}" aria-hidden="true"></span><h3>${escape(item.name)}</h3><span class="rarity rarity-${item.rarityLabel === "Rara" ? "rare" : item.rarityLabel === "Incomum" ? "uncommon" : "common"}">${escape(item.rarityLabel)}</span></header>
    <p class="sci">${escape(item.biological)}${item.scientific ? ` · <i>${escape(item.scientific)}</i>` : ""}${item.domesticable ? ` · <strong>pode criar vínculo</strong>` : ""}</p>
    <p>${escape(item.summary)}</p>
    <ul class="chips">${chips.map(chip => `<li>${escape(chip)}</li>`).join("")}</ul>
    <dl><dt>Habitat</dt><dd>${escape(item.habitat)}</dd>${item.flags.behavior ? `<dt>Temperamento</dt><dd>${escape(item.temperamentLabel)}</dd><dt>Curiosidade</dt><dd>${escape(item.curiosity)}</dd>` : ""}${item.abilities.length ? `<dt>Habilidades</dt><dd>${item.abilities.map(escape).join(", ")}</dd>` : ""}</dl>
    ${bar}${stepList}${next ? `<p class="next">Próximo passo: ${next}</p>` : ""}</article>`;
}

function inventoryHtml(hud: HudSnapshot): string {
  const item = (cls: string, name: string, count: number, text: string, action = "") =>
    `<article class="item"><span class="item-icon ${cls}" aria-hidden="true"></span><div><h3>${name} <span class="count">${count}/20</span></h3><p>${text}</p>${action}</div></article>`;
  return `<h2 id="panel-title">Bolsa</h2><div class="items">
    ${item("glow", "Frutiluz", hud.inventory.glowfruit, "Colhido no bosque do orvalho, a noroeste do lago. Ofereça à Auryn depois de observá-la parada e conquistar confiança 58.")}
    ${item("berry", "Fruto da mata", hud.inventory.berries, "Colhido nos arbustos. Recupera energia, vida e um pouco de sede.", `<button type="button" id="eat-berry" ${hud.inventory.berries ? "" : "disabled"}>Comer fruto</button>`)}
  </div>`;
}

function mapHtml(hud: HudSnapshot): string {
  const legend = [["mm-key-player", "Você"], ["mm-key-glow", "Frutiluz"], ["mm-key-berry", "Fruto da mata"], ["mm-key-track", "Rastro da companheira"], ["mm-key-danger", "Território dos lobos"]];
  return `<h2 id="panel-title">Guia da mata</h2>
    <div class="map-layout">${minimapSvg(hud)}
      <div><p>Norte no alto. Da clareira, a trilha sobe ao <strong>lago, ao norte</strong>, e segue até o <strong>bosque do orvalho, a noroeste do lago</strong>: ali estão frutiluz e a Auryn. Os lobos guardam o bosque fechado mais a noroeste; observe de longe.</p>
      <p>Só aparecem no mapa os animais já registrados no diário.</p>
      <ul class="legend">${legend.map(([cls, label]) => `<li><span class="${cls}" aria-hidden="true"></span>${label}</li>`).join("")}</ul>
      ${hud.track ? `<p class="next">Rastro atual: ${escape(hud.track.label)}.</p>` : ""}</div>
    </div>`;
}

function pauseHtml(hud: HudSnapshot, touch: boolean): string {
  const pet = hud.pet;
  const ab = hud.abilities;
  const cooldown = (s: number) => s > 0 ? ` (${Math.ceil(s)} s)` : "";
  const companion = pet ? `<section class="group"><h3>Companheira · ${escape(pet.name)} <span class="muted">nível ${pet.level}</span></h3>
    <p>Agora: <strong>${COMMAND_LABEL[pet.command]}</strong> — ${COMMAND_HELP[pet.command]}.</p>
    <div class="button-row" role="group" aria-label="Comandos">${(["FOLLOW", "STAY", "PROTECT", "RETURN"] as const).map((cmd, i) => `<button type="button" data-pet="${cmd}" aria-pressed="${pet.command === cmd}">${touch ? "" : `<kbd>${i + 1}</kbd> `}${COMMAND_LABEL[cmd]}</button>`).join("")}</div>
    <p class="muted">Habilidades exigem a companheira a menos de 6 m${ab && !ab.near ? " — <strong>ela está longe agora</strong>" : ""}.</p>
    <div class="button-row" role="group" aria-label="Habilidades"><button type="button" data-ability="TRACK" ${ab?.near && ab.track <= 0 ? "" : "disabled"}>${touch ? "" : "<kbd>5</kbd> "}Farejar rastro${cooldown(ab?.track ?? 0)}</button><button type="button" data-ability="CALM" ${ab?.near && ab.calm <= 0 ? "" : "disabled"}>${touch ? "" : "<kbd>6</kbd> "}Pulso calmo${cooldown(ab?.calm ?? 0)}</button></div>
    <p class="muted">Farejar marca no mapa a espécie com pesquisa pendente mais próxima. O pulso calmo deixa animais num raio de 9 m tranquilos por 8 s: presas não fogem e lobos perdem o foco.</p>
    <div class="field"><label for="pet-name">Nome</label><input id="pet-name" maxlength="16" value="${escape(pet.name)}"><button id="rename-pet" type="button">Salvar nome</button></div></section>` : "";
  const keys = `<details class="group"><summary>Controles</summary><dl class="keys">
    <dt>WASD / setas</dt><dd>mover</dd><dt>Shift</dt><dd>correr</dd><dt>Espaço</dt><dd>pular</dd><dt>E</dt><dd>interagir</dd>
    <dt>Q</dt><dd>observar animal próximo</dd><dt>V</dt><dd>trocar câmera</dd><dt>C / Tab / M</dt><dd>diário / bolsa / guia</dd>
    <dt>F</dt><dd>comer fruto</dd><dt>1–4</dt><dd>comandos da companheira</dd><dt>5 / 6</dt><dd>farejar / pulso calmo</dd>
    <dt>Mouse</dt><dd>arrastar para olhar, roda para zoom</dd><dt>Toque</dt><dd>joystick à esquerda, arraste à direita para olhar, pinça para zoom</dd></dl></details>`;
  return `<h2 id="panel-title">Pausa</h2>
    ${companion}
    <section class="group"><h3>Ajustes</h3>
    <label>Qualidade <select id="quality">${["auto", "low", "medium", "high"].map((q, i) => `<option value="${q}" ${hud.quality === q ? "selected" : ""}>${["Automática", "Baixa", "Média", "Alta"][i]}</option>`).join("")}</select> <span class="muted">em uso: ${TIER_LABEL[hud.tier] ?? hud.tier}</span></label>
    <label>Sensibilidade da câmera <input id="sensitivity" type="range" min="0.001" max="0.02" step="0.0005" value="${hud.lookSens}"></label>
    <label>Zona morta do joystick <input id="deadzone" type="range" min="0.05" max="0.35" step="0.01" value="${hud.deadzone}"></label>
    <p class="muted">Câmera em ${hud.camera === "third" ? "terceira" : "primeira"} pessoa.</p></section>
    ${keys}
    <section class="group"><h3>Progresso</h3><p id="save-status" role="status">${escape(hud.saveStatus)}</p>
    <div class="button-row"><button type="button" id="save-now">Gravar agora</button><button type="button" id="manage-progress-pause">Progresso / backup</button></div></section>`;
}
