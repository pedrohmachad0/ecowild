import type { HudSnapshot } from "../EcoWildGame.ts";
import type { CatalogEntry } from "../catalog/discoveries.ts";
import type { PetCommand } from "../types.ts";
import { minimapSvg, SPECIES_COLOR } from "./minimap.ts";
import { GROUP_LABEL, SPECIES_BY_ID } from "../data/species.ts";
import type { BioGroup } from "../data/species.ts";
import type { SpeciesId } from "../types.ts";

/** HTML escaping. Do not rely on the deprecated global escape(), which URL-encodes. */
const escape = (text: string) => text.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export type CatalogFilter = "all" | "known" | "pending";
export type DiaryTab = "entries" | "challenges";
export type PanelOptions = { catalogFilter: CatalogFilter; touch: boolean; group?: BioGroup | "all"; tab?: DiaryTab; place?: string };

export const TIER_LABEL: Record<string, string> = { low: "baixa", medium: "média", high: "alta" };
export const COMMAND_LABEL: Record<PetCommand, string> = { FOLLOW: "Seguir", STAY: "Esperar", PROTECT: "Proteger", RETURN: "Voltar" };
const COMMAND_HELP: Record<PetCommand, string> = {
  FOLLOW: "caminha atrás de você",
  STAY: "fica parada onde está",
  PROTECT: "fica entre você e lobos próximos",
  RETURN: "volta depressa e depois segue você",
};

export function panelHtml(hud: HudSnapshot, options: PanelOptions = { catalogFilter: "all", touch: false }): string {
  if (hud.panel === "catalog") return options.tab === "challenges" ? challengesHtml(hud) : catalogHtml(hud, options.catalogFilter, options.group ?? "all", options.place ?? "all");
  if (hud.panel === "inventory") return inventoryHtml(hud);
  if (hud.panel === "map") return mapHtml(hud);
  if (hud.panel === "pause") return pauseHtml(hud, options.touch);
  return "";
}

function diaryTabs(tab: DiaryTab, hud: HudSnapshot): string {
  const done = hud.challenges.filter(c => c.done).length;
  return `<div class="tabs" role="tablist" aria-label="Seções do diário"><button type="button" role="tab" data-tab="entries" aria-selected="${tab === "entries"}" aria-pressed="${tab === "entries"}">Fichas ${hud.discovered}/${hud.species}</button><button type="button" role="tab" data-tab="challenges" aria-selected="${tab === "challenges"}" aria-pressed="${tab === "challenges"}">Desafios ${done}/${hud.challenges.length}</button></div>`;
}

function catalogHtml(hud: HudSnapshot, filter: CatalogFilter, group: BioGroup | "all", place: string): string {
  const filters: [CatalogFilter, string][] = [["all", "Todas"], ["known", "Registradas"], ["pending", "Pesquisa pendente"]];
  const groups: (BioGroup | "all")[] = ["all", "mammal", "bird", "reptile", "amphibian", "fish", "fantasy"];
  const list = hud.catalog
    .filter(item => filter === "all" || (filter === "known" ? item.known : item.progress < 100))
    .filter(item => group === "all" || item.group === group)
    .filter(item => place === "all" || item.regionIds.includes(place));
  const research = Math.round(hud.catalog.reduce((sum, item) => sum + item.progress, 0) / Math.max(1, hud.catalog.length));
  return `<h2 id="panel-title">Diário de campo</h2>${diaryTabs("entries", hud)}
    <p class="lede">${hud.discovered} de ${hud.species} espécies registradas · pesquisa geral ${research}% · ${Object.keys(hud.photos).length} foto(s). Fichas separam biologia real de fantasia; esta mata imaginária reúne espécies de regiões diferentes.</p>
    <div class="filters" role="group" aria-label="Filtrar fichas">${filters.map(([id, label]) => `<button type="button" class="chip-button" data-filter="${id}" aria-pressed="${filter === id}">${label}</button>`).join("")}</div>
    <div class="filters" role="group" aria-label="Filtrar por grupo biológico">${groups.map(id => `<button type="button" class="chip-button" data-group="${id}" aria-pressed="${group === id}">${id === "all" ? "Todos os grupos" : GROUP_LABEL[id]}</button>`).join("")}</div>
    <div class="filters" role="group" aria-label="Filtrar por região">${[["all", "Todas as regiões"], ...hud.regions.map(r => [r.id, r.name])].map(([id, label]) => `<button type="button" class="chip-button" data-place="${id}" aria-pressed="${place === id}">${escape(label!)}</button>`).join("")}</div>
    <div class="entries">${list.map(item => entryHtml(item, hud.photos[item.id])).join("") || `<p class="empty">Nenhuma ficha neste filtro.</p>`}</div>`;
}

function challengesHtml(hud: HudSnapshot): string {
  const done = hud.challenges.filter(c => c.done).length;
  return `<h2 id="panel-title">Diário de campo</h2>${diaryTabs("challenges", hud)}
    <p class="lede">Desafios científicos: ${done} de ${hud.challenges.length} concluídos. Nenhum exige combate.</p>
    <ol class="challenges">${hud.challenges.map(c => `<li class="challenge${c.done ? " done" : ""}"><span class="check" aria-hidden="true">${c.done ? "✓" : ""}</span><div><h3>${escape(c.title)}</h3><p>${escape(c.description)}</p>${c.total > 1 || !c.done ? `<div class="bar" role="progressbar" aria-label="${escape(c.title)}" aria-valuemin="0" aria-valuemax="${c.total}" aria-valuenow="${c.current}"><span style="width:${Math.round(c.current / c.total * 100)}%"></span></div><p class="research">${c.current}/${c.total}</p>` : ""}</div></li>`).join("")}</ol>`;
}

function entryHtml(item: CatalogEntry, photo?: string): string {
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
  const picture = photo ? `<img class="photo" src="${escape(photo)}" alt="Foto de ${escape(item.name)} tirada no jogo" width="224" height="140">` : `<p class="muted photo-hint">Sem foto. Use Observar (Q) perto do animal e Fotografar (P).</p>`;
  return `<article class="entry"><header><span class="swatch" style="--swatch:${SPECIES_COLOR[item.id] ?? "#ccc"}" aria-hidden="true"></span><h3>${escape(item.name)}</h3><span class="rarity rarity-${item.rarityLabel === "Rara" ? "rare" : item.rarityLabel === "Incomum" ? "uncommon" : "common"}">${escape(item.rarityLabel)}</span></header>
    <p class="sci">${escape(item.biological)}${item.scientific ? ` · <i>${escape(item.scientific)}</i>` : ""}${item.domesticable ? ` · <strong>pode criar vínculo</strong>` : ""}</p>
    <div class="entry-body">${picture}<div><p>${escape(item.summary)}</p>
    <ul class="chips">${chips.map(chip => `<li>${escape(chip)}</li>`).join("")}</ul>
    <dl><dt>Habitat</dt><dd>${escape(item.habitat)}</dd>${item.regions.length ? `<dt>Onde vive</dt><dd>${item.regions.map(escape).join(", ")}</dd>` : ""}${item.flags.behavior ? `<dt>Temperamento</dt><dd>${escape(item.temperamentLabel)}</dd><dt>Curiosidade</dt><dd>${escape(item.curiosity)}</dd>` : ""}${item.flags.behavior ? `<dt>Reprodução</dt><dd>${escape(item.reproduction)}</dd>` : ""}${item.abilities.length ? `<dt>Habilidades</dt><dd>${item.abilities.map(escape).join(", ")}</dd>` : ""}</dl></div></div>
    ${bar}${stepList}${next ? `<p class="next">Próximo passo: ${next}</p>` : ""}</article>`;
}

function inventoryHtml(hud: HudSnapshot): string {
  const item = (cls: string, name: string, count: number | string, text: string, action = "") =>
    `<article class="item"><span class="item-icon ${cls}" aria-hidden="true"></span><div><h3>${name} <span class="count">${count}/20</span></h3><p>${text}</p>${action}</div></article>`;
  return `<h2 id="panel-title">Bolsa</h2><div class="items">
    ${item("glow", "Frutiluz", hud.inventory.glowfruit, "Colhido no bosque do orvalho, a noroeste do lago. Ofereça à Auryn depois de observá-la parada e conquistar confiança 58.")}
    ${item("berry", "Fruto da mata", hud.inventory.berries, "Colhido nos arbustos. Recupera energia, vida e um pouco de sede. O musgarim também aceita, quando está calmo.", `<button type="button" id="eat-berry" ${hud.inventory.berries ? "" : "disabled"}>Comer fruto</button>`)}
    ${hud.inventory.wolfapple || hud.visited.includes("vereda") ? item("wolfapple", "Fruta-do-lobo", hud.inventory.wolfapple, "Fruto da lobeira (<i>Solanum lycocarpum</i>), colhido na Vereda. Alimento do lobo-guará e oferta para o brasalume.") : ""}
    ${hud.inventory.eggs || hud.incubator !== null ? `<article class="item"><span class="item-icon egg" aria-hidden="true"></span><div><h3>Ovo de musgarim <span class="count">${hud.inventory.eggs}/2</span></h3><p>Regra de fantasia: leve ao ninho aquecido do acampamento, ao sul. Choca mais rápido com o calor do dia.${hud.incubator !== null ? ` <strong>No ninho: ${Math.floor(hud.incubator * 100)}%.</strong>` : ""}</p></div></article>` : ""}
  </div>`;
}

function mapHtml(hud: HudSnapshot): string {
  const kinds = new Set(hud.props.map(p => p.kind));
  const legend = [["mm-key-player", "Você"],
    ...(kinds.has("glow") ? [["mm-key-glow", "Frutiluz"]] : []),
    ...(kinds.has("berry") ? [["mm-key-berry", "Fruto da mata"]] : []),
    ...(kinds.has("wolfapple") ? [["mm-key-wolfapple", "Lobeira (fruta-do-lobo)"]] : []),
    ["mm-key-track", "Rastro da companheira"],
    ...(hud.place.territory ? [["mm-key-danger", "Território dos lobos"]] : []),
    ...(hud.place.nests ? [["mm-key-egg", "Ninho de musgo"]] : []),
    ["mm-key-camp", "Acampamento / posto"], ["mm-key-exit", "Trilha para outra região"]];
  return `<h2 id="panel-title">Guia · ${escape(hud.place.name)}</h2>
    <div class="map-layout">${minimapSvg(hud)}
      <div><p class="muted">${escape(hud.place.biome)}. Norte no alto.</p><p>${escape(hud.place.guide)}</p>
      <p>Só aparecem no mapa os animais já registrados no diário.</p>
      <ul class="legend">${legend.map(([cls, label]) => `<li><span class="${cls}" aria-hidden="true"></span>${label}</li>`).join("")}</ul>
      ${hud.track ? `<p class="next">Rastro atual: ${escape(hud.track.label)}.</p>` : ""}</div>
    </div>`;
}

function pauseHtml(hud: HudSnapshot, touch: boolean): string {
  const ab = hud.abilities;
  const cooldown = (sec: number) => sec > 0 ? ` (${Math.ceil(sec)} s)` : "";
  const command = hud.pets.find(p => !p.away)?.command ?? "FOLLOW";
  const hasAuryn = hud.pets.some(p => p.speciesId === "auryn");
  const list = hud.pets.map((pet, i) => {
    const suffix = i ? `-${i}` : "";
    return `<li class="pet-row"><span class="swatch" style="--swatch:${SPECIES_COLOR[pet.speciesId] ?? "#ccc"}" aria-hidden="true"></span><div class="field"><label for="pet-name${suffix}"><strong>${escape(pet.name)}</strong> <span class="muted">${escape(speciesLabel(pet.speciesId))} · nível ${pet.level}${pet.away ? ` · esperando em ${escape(pet.away)}` : pet.near ? "" : " · longe"}</span></label><input id="pet-name${suffix}" maxlength="16" value="${escape(pet.name)}"><button id="rename-pet${suffix}" type="button" data-rename="${escape(pet.id)}" data-input="pet-name${suffix}">Salvar nome</button></div></li>`;
  }).join("");
  const companion = hud.pets.length ? `<section class="group"><h3>Companheiros <span class="muted">${hud.pets.length}</span></h3>
    <p>Agora: <strong>${COMMAND_LABEL[command]}</strong> — ${COMMAND_HELP[command]}. Comandos valem para todos nesta região.</p>
    <div class="button-row" role="group" aria-label="Comandos">${(["FOLLOW", "STAY", "PROTECT", "RETURN"] as const).map((cmd, i) => `<button type="button" data-pet="${cmd}" aria-pressed="${command === cmd}">${touch ? "" : `<kbd>${i + 1}</kbd> `}${COMMAND_LABEL[cmd]}</button>`).join("")}</div>
    ${hasAuryn ? `<p class="muted">Habilidades da Auryn exigem que ela esteja a menos de 6 m${ab && !ab.near ? " — <strong>ela está longe agora</strong>" : ""}.</p>
    <div class="button-row" role="group" aria-label="Habilidades"><button type="button" data-ability="TRACK" ${ab?.near && ab.track <= 0 ? "" : "disabled"}>${touch ? "" : "<kbd>5</kbd> "}Farejar rastro${cooldown(ab?.track ?? 0)}</button><button type="button" data-ability="CALM" ${ab?.near && ab.calm <= 0 ? "" : "disabled"}>${touch ? "" : "<kbd>6</kbd> "}Pulso calmo${cooldown(ab?.calm ?? 0)}</button></div>
    <p class="muted">Farejar marca no mapa a espécie com pesquisa pendente mais próxima. O pulso calmo deixa animais num raio de 11 m tranquilos por 8 s: presas não fogem, lobos perdem o foco e o musgarim tímido passa a confiar em você.</p>` : ""}
    <ul class="pets">${list}</ul></section>` : "";
  const keys = `<details class="group"><summary>Controles</summary><dl class="keys">
    <dt>WASD / setas</dt><dd>mover</dd><dt>Shift</dt><dd>correr</dd><dt>Espaço</dt><dd>pular</dd><dt>E</dt><dd>interagir</dd>
    <dt>Q</dt><dd>observar animal próximo</dd><dt>V</dt><dd>trocar câmera</dd><dt>C / Tab / M</dt><dd>diário / bolsa / guia</dd>
    <dt>F</dt><dd>comer fruto</dd><dt>G</dt><dd>afugentar (bater palmas)</dd><dt>P</dt><dd>fotografar durante Observar</dd><dt>1–4</dt><dd>comandos dos companheiros</dd><dt>5 / 6</dt><dd>farejar / pulso calmo da Auryn</dd>
    <dt>Mouse</dt><dd>arrastar para olhar, roda para zoom</dd><dt>Toque</dt><dd>joystick à esquerda, arraste à direita para olhar, pinça para zoom</dd></dl></details>`;
  return `<h2 id="panel-title">Pausa</h2>
    ${companion}
    <section class="group"><h3>Ajustes</h3>
    <label>Qualidade <select id="quality">${["auto", "low", "medium", "high"].map((q, i) => `<option value="${q}" ${hud.quality === q ? "selected" : ""}>${["Automática", "Baixa", "Média", "Alta"][i]}</option>`).join("")}</select> <span class="muted">em uso: ${TIER_LABEL[hud.tier] ?? hud.tier}</span></label>
    <label>Sensibilidade da câmera <input id="sensitivity" type="range" min="0.001" max="0.02" step="0.0005" value="${hud.lookSens}"></label>
    <label>Zona morta do joystick <input id="deadzone" type="range" min="0.05" max="0.35" step="0.01" value="${hud.deadzone}"></label>
    <label><input id="hud-map-toggle" type="checkbox" ${hud.hudMap ? "checked" : ""}> Minimapa no canto da tela</label>
    <p class="muted">Câmera em ${hud.camera === "third" ? "terceira" : "primeira"} pessoa. ${hud.day.label}, ${hud.day.clock}.</p></section>
    ${keys}
    <section class="group"><h3>Progresso</h3><p id="save-status" role="status">${escape(hud.saveStatus)}</p>
    <div class="button-row"><button type="button" id="save-now">Gravar agora</button><button type="button" id="manage-progress-pause">Progresso / backup</button></div></section>`;
}

function speciesLabel(id: SpeciesId): string { return SPECIES_BY_ID[id].name; }
