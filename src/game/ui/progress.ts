import type { EcoWildGame } from "../EcoWildGame.ts";
import type { LoadResult } from "../persistence/save.ts";
import type { SaveData } from "../types.ts";

/** Human summary of a validated save, used for slots and the import preview. */
export function describeSave(data: SaveData): string {
  const known = Object.values(data.discoveries).filter(f => f?.seen).length;
  const minutes = Math.floor(data.seconds / 60);
  const pets = data.pets.map(p => p.name).join(", ");
  const challenges = Object.keys(data.challenges).length;
  return `Save v${data.version} · ${minutes} min de jogo · ${known} espécie(s) no diário · ${challenges} desafio(s) · ${data.inventory.berries} frutos da mata · ${data.inventory.glowfruit} frutiluz${data.inventory.eggs ? ` · ${data.inventory.eggs} ovo(s)` : ""}${pets ? ` · companheiros: ${pets}` : ""}.`;
}

/** Native modal keeps focus and touch scrolling independent of gameplay. */
export function bindProgress(game: EcoWildGame) {
  const dialog = document.querySelector<HTMLDialogElement>("#progress-dialog")!;
  const status = dialog.querySelector<HTMLElement>("#progress-status")!;
  const button = (id: string) => dialog.querySelector<HTMLButtonElement>(`#${id}`)!;
  const abort = new AbortController();
  const options = { signal: abort.signal };
  let busy = false, returnFocus: HTMLElement | null = null;
  let pendingImport: SaveData | null = null;
  const fileInput = dialog.querySelector<HTMLInputElement>("#import-file")!;
  const preview = dialog.querySelector<HTMLElement>("#import-preview")!;
  const resetImport = () => { pendingImport = null; fileInput.value = ""; preview.textContent = ""; button("import-confirm").hidden = true; };
  const urls = new Set<string>();
  const lock = (value: boolean) => {
    busy = value;
    dialog.setAttribute("aria-busy", String(value));
    dialog.querySelectorAll<HTMLButtonElement | HTMLInputElement>("button, input").forEach(node => { node.disabled = value; });
  };
  const describe = (result: LoadResult) => {
    if (result.status === "empty") return "Nenhum progresso neste slot.";
    if (result.status === "invalid") return "Formato incompatível ou inválido. Preservado para exportação; não pode ser carregado.";
    if (result.status === "unavailable") return "Não foi possível acessar o armazenamento. Tente novamente ou exporte a sessão aberta.";
    if (result.status !== "loaded") return "Não foi possível ler o progresso.";
    return describeSave(result.data);
  };
  const refresh = async () => {
    const slots = await game.inspectProgress();
    dialog.querySelector("#primary-summary")!.textContent = (slots.session ? "Exportar captura esta sessão pausada. Última cópia gravada: " : "") + describe(slots.primary);
    dialog.querySelector("#backup-summary")!.textContent = describe(slots.backup);
    lock(false);
    button("import-confirm").disabled = !pendingImport;
    button("restore-backup").disabled = slots.backup.status !== "loaded";
    button("export-backup").disabled = slots.backup.status === "empty" || slots.backup.status === "unavailable";
  };
  const act = async (operation: () => Promise<void>) => {
    if (busy) return;
    const focused = document.activeElement as HTMLButtonElement | null;
    lock(true);
    try { await operation(); }
    catch { status.textContent = "Não foi possível concluir. Seus dados não foram descartados; tente novamente."; }
    finally {
      await refresh();
      if (dialog.open) (focused && !focused.disabled ? focused : button("close-progress")).focus();
    }
  };
  const close = () => { if (!busy) dialog.close(); };
  button("close-progress").addEventListener("click", close, options);
  dialog.addEventListener("cancel", event => { event.preventDefault(); close(); }, options);
  // Disabling a busy button can move focus to body. Capture there too, so the
  // game's global Escape listener cannot cancel the modal's close behavior.
  window.addEventListener("keydown", event => {
    if (!dialog.open) return;
    event.stopPropagation();
    if (event.key === "Escape") { event.preventDefault(); close(); }
  }, { ...options, capture: true });
  dialog.addEventListener("close", () => {
    game.setProgressOpen(false); returnFocus?.focus();
    for (const url of urls) URL.revokeObjectURL(url);
    urls.clear();
  }, options);
  for (const [id, slot] of [["export-current", "current"], ["export-backup", "backup"]] as const) {
    button(id).addEventListener("click", () => void act(async () => {
      const result = await game.exportProgress(slot);
      if (result.status !== "exported") {
        status.textContent = result.status === "empty" ? "Não há progresso para exportar." : "Não foi possível exportar este conteúdo como JSON. O original foi preservado.";
        return;
      }
      const url = URL.createObjectURL(new Blob([result.json], { type: "application/json" }));
      urls.add(url);
      const link = document.createElement("a");
      link.href = url; link.download = `ecowild-${slot}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
      document.body.append(link); link.click(); link.remove();
      status.textContent = "Arquivo preparado. Confira os downloads ou o compartilhamento do navegador e guarde sua cópia.";
    }), options);
  }
  button("restore-backup").addEventListener("click", () => {
    if (busy || !window.confirm("Restaurar o backup? Ele substituirá o progresso atual. O progresso substituído ficará no backup para desfazer. Cancelar mantém tudo como está.")) return;
    void act(async () => {
      const ok = await game.restoreProgress();
      status.textContent = ok ? "Backup restaurado. Feche para continuar; o progresso substituído ficou no backup." : "Restauração não concluída. Outra aba pode ter alterado o progresso ou o armazenamento falhou. Exporte esta sessão antes de recarregar.";
    });
  }, options);
  fileInput.addEventListener("change", async () => {
    pendingImport = null; button("import-confirm").hidden = true;
    const file = fileInput.files?.[0];
    if (!file) { preview.textContent = ""; return; }
    let text = "";
    try { text = await file.text(); } catch { preview.textContent = "Não foi possível ler o arquivo."; return; }
    const result = game.previewImport(text);
    if (!result.ok) { preview.textContent = result.reason + " Nada foi alterado."; return; }
    pendingImport = result.data;
    preview.textContent = `Prévia: ${describeSave(result.data)}`;
    button("import-confirm").hidden = false; button("import-confirm").disabled = false;
  }, options);
  button("import-confirm").addEventListener("click", () => {
    const data = pendingImport;
    if (busy || !data || !window.confirm("Importar este progresso? Ele substituirá o progresso atual, que ficará no backup para desfazer. Cancelar mantém tudo como está.")) return;
    status.textContent = "Importando…";
    void act(async () => {
      const ok = await game.importProgress(data);
      resetImport();
      status.textContent = ok ? "Progresso importado. O anterior ficou no backup; use Restaurar backup para desfazer." : "Importação não concluída. Nada foi trocado; outra aba pode ter alterado o progresso ou o armazenamento falhou.";
    });
  }, options);
  button("reload-progress").addEventListener("click", () => {
    if (!busy && window.confirm("Recarregar o progresso do aparelho? Alterações não gravadas desta sessão serão perdidas. Cancele e exporte a sessão primeiro se quiser preservá-la.")) location.reload();
  }, options);
  return {
    async open() {
      if (dialog.open) return;
      returnFocus = document.activeElement as HTMLElement;
      game.setProgressOpen(true); resetImport();
      status.textContent = "Lendo progresso e backup…";
      dialog.showModal(); lock(true);
      await refresh();
      status.textContent = "Exportar guarda uma cópia JSON. Restaurar exige confirmação e mantém o progresso substituído.";
      button("close-progress").focus();
    },
    dispose() { abort.abort(); for (const url of urls) URL.revokeObjectURL(url); dialog.close(); },
  };
}
