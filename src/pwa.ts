interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}
/** Optional platform UI. Never reload unsaved progress or activate across other open tabs. */
export function initPwa(save: () => Promise<boolean>, pause: () => void): () => void {
  const install = document.querySelector<HTMLButtonElement>("#install")!;
  const update = document.querySelector<HTMLButtonElement>("#update-app")!;
  const status = document.querySelector<HTMLElement>("#pwa-status")!;
  const abort = new AbortController(), options = { signal: abort.signal };
  let prompt: InstallPrompt | null = null, registration: ServiceWorkerRegistration | null = null;
  let applying = false, disposed = false;
  const say = (text: string) => { status.textContent = text; };
  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault(); prompt = event as InstallPrompt; install.textContent = "Instalar EcoWild";
  }, options);
  install.addEventListener("click", async () => {
    if (prompt) { await prompt.prompt(); await prompt.userChoice; prompt = null; }
    else say(/iPad|iPhone|iPod/.test(navigator.userAgent) ? "No Safari: Compartilhar → Adicionar à Tela de Início, quando disponível. Você também pode continuar no navegador." : "Use a opção Instalar/Adicionar à Tela de Início no menu do navegador, se disponível. O jogo também funciona sem instalação.");
  }, options);
  window.addEventListener("appinstalled", () => { prompt = null; say("EcoWild instalado neste navegador."); }, options);
  const waiting = () => {
    update.hidden = !registration?.waiting;
    if (registration?.waiting) say("Nova versão pronta. Salve e atualize quando quiser; feche outras abas do jogo.");
  };
  update.addEventListener("click", async () => {
    pause();
    const playing = document.querySelector<HTMLElement>("#title")!.hidden;
    if (playing && !await save()) { say("A gravação falhou. Atualização adiada para preservar a sessão."); return; }
    applying = true; registration?.waiting?.postMessage({ type: "APPLY_UPDATE" });
  }, options);
  if ("serviceWorker" in navigator && import.meta.env.PROD) {
    navigator.serviceWorker.addEventListener("controllerchange", () => { if (applying) location.reload(); }, options);
    navigator.serviceWorker.addEventListener("message", e => {
      if (e.data?.type === "UPDATE_BLOCKED") { applying = false; say("Feche as outras abas do EcoWild e tente atualizar novamente."); }
    }, options);
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { updateViaCache: "none" }).then(reg => {
      if (disposed) return;
      registration = reg; waiting();
      if (!reg.waiting) say("Preparando a primeira cópia offline…");
      const track = () => {
        reg.installing?.addEventListener("statechange", () => { waiting(); }, options);
      };
      reg.addEventListener("updatefound", track, options); track();
      void navigator.serviceWorker.ready.then(() => { if (!disposed && !reg.waiting) say("Mata preparada para abrir offline neste navegador. O navegador ainda pode remover dados locais."); });
      void reg.update().catch(() => { /* cached version remains available offline */ });
    }).catch(() => say("Offline indisponível agora. O jogo continua no navegador; tente novamente com rede e armazenamento disponíveis."));
  } else say(import.meta.env.DEV ? "Offline é preparado no build de produção; desenvolvimento não registra service worker." : "Este navegador não oferece o modo offline do EcoWild.");
  window.addEventListener("offline", () => say("Sem rede. Se a cópia offline foi preparada, a mata e o save local continuam disponíveis."), options);
  return () => { disposed = true; abort.abort(); };
}
