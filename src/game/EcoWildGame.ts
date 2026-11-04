import { Engine, FreeCamera, Scene, Vector3 } from "@babylonjs/core";
import { Ambience } from "./audio/ambience.ts";
import { catalogView } from "./catalog/discoveries.ts";
import { CONFIG } from "./config.ts";
import { advanceBoom, clampCameraPitch, resolveBoom } from "./camera/boom.ts";
import { createCameraVolumes } from "./camera/worldVolumes.ts";
import { encounterNote, observationTarget, PORTRAIT_HEIGHT } from "./camera/observation.ts";
import { InputManager } from "./input/InputManager.ts";
import { basis, clamp } from "./math.ts";
import { adaptTier, initialTier, scalingFor } from "./performance/quality.ts";
import { SaveSession } from "./persistence/save.ts";
import { loadPreferences, storePreferences } from "./persistence/preferences.ts";
import { animateRig, buildCreature, buildPlayer } from "./render/actors.ts";
import type { Rig } from "./render/actors.ts";
import { buildForest } from "./render/forest.ts";
import { dressRig } from "./render/glbModels.ts";
import type { ModelAsset, ModelKey } from "./data/models.ts";
import type { Forest } from "./render/forest.ts";
import { commandPet, createSim, eatBerry, petSnapshot, petViews, recordPhoto, shout, stepSim, toSave, trustSnapshot, usePetAbility } from "./sim/simulation.ts";
import type { PetView } from "./sim/simulation.ts";
import { SPECIES } from "./data/species.ts";
import { challengeViews } from "./progression/challenges.ts";
import type { ChallengeView } from "./progression/challenges.ts";
import { clockLabel, dayFraction, dayPeriod, PERIOD_LABEL } from "./world/clock.ts";
import type { DayPeriod } from "./world/clock.ts";
import type { SpeciesId } from "./types.ts";
import type { PropKind, RegionId } from "./world/region.ts";
import { allRegions, region, setActiveRegion } from "./world/region.ts";
import type { PetAbility, Simulation, SimCreature } from "./sim/simulation.ts";
import { parseImport } from "./persistence/importSave.ts";
import type { ImportPreview } from "./persistence/importSave.ts";
import type { CameraMode, PetCommand, QualityName, SaveData } from "./types.ts";
import { heightAt } from "./world/terrain.ts";

const EMPTY_INPUT = {
  moveX: 0,
  moveZ: 0,
  camYaw: 0,
  sprint: false,
  jumpEdge: false,
  interactEdge: false,
  useBerryEdge: false,
  pet: null,
  discover: false,
  shoutEdge: false,
};

export class EcoWildGame {
  private engine: Engine | null = null;
  private scene: Scene | null = null;
  private camera: FreeCamera | null = null;
  private forest: Forest | null = null;
  private input: InputManager;
  private audio = new Ambience();
  private sim: Simulation | null = null;
  private playerRig: Rig | null = null;
  private rigs = new Map<string, Rig>();
  private playing = false;
  private wantStart: "new" | "continue" | null = null;
  private pendingSave: SaveData | null = null;
  private mode: CameraMode = "third";
  private camYaw = 0;
  private camPitch: number = CONFIG.camera.pitch;
  private camDist: number = CONFIG.camera.distance;
  private fov = 0.86;
  private cameraVolumes = createCameraVolumes();
  /** Region whose scene is currently built; differs from sim.region right after a trip. */
  private loadedRegion: RegionId = region().id;
  private boomDistance: number = CONFIG.camera.distance;
  private focusId: string | null = null;
  private previousView: { mode: CameraMode; yaw: number; pitch: number; distance: number } | null = null;
  private readonly lookAt = new Vector3();
  private quality: QualityName = "auto";
  private tier = initialTier(false, 4);
  private lookSens: number = CONFIG.lookDefault;
  private acc = 0;
  private hudAcc = 0;
  private saveAcc = 0;
  private fpsAcc = 0;
  private fpsWindow: number[] = [];
  private titleAng = 0;
  private time = 0;
  private panel: "none" | "catalog" | "inventory" | "map" | "pause" = "none";
  private disposed = false;
  private adaptAcc = 0;
  private deadzone = 0.16;
  private saveStatus = "Lendo progresso…";
  private loadStatus = "loading";
  private backupOnWrite = false;
  private saves = new SaveSession();
  private progressOpen = false;
  private recovering = false;
  private saveConflict = false;
  private saveQueue: Promise<boolean> = Promise.resolve(true);
  private contextLost = false;
  private lastShadow: Forest["shadows"] = null;
  private pendingActions = { jumpEdge: false, interactEdge: false, useBerryEdge: false, shoutEdge: false, pet: null as PetCommand | null };
  private pendingPhoto: string | null = null;
  private flash = 0;
  private photoCanvas: HTMLCanvasElement | null = null;
  private hudMap = false;
  private lifecycle = new AbortController();

  constructor(
    canvas: HTMLCanvasElement,
    private hooks: {
      onHud: (hud: HudSnapshot) => void;
      onReady: (hasSave: boolean) => void;
      onFatal: (message: string) => void;
    },
  ) {
    this.input = new InputManager(canvas);
    const signal = this.lifecycle.signal;
    canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault(); this.contextLost = true; this.open("pause");
      this.hooks.onFatal("A conexão gráfica foi interrompida. Aguarde a restauração ou tente novamente.");
    }, { signal });
    canvas.addEventListener("webglcontextrestored", () => { this.contextLost = false; this.hooks.onReady(!!this.pendingSave); this.pushHud(); }, { signal });
    window.addEventListener("blur", this.onBlur, { signal });
  }

  useBerry(): void {
    if (this.sim && eatBerry(this.sim)) this.pushHud();
  }

  /** Companion abilities apply immediately, like commands, even from the pause panel. */
  petAbility(ability: PetAbility): void {
    if (this.sim && this.playing && usePetAbility(this.sim, ability)) { this.pushHud(); void this.saveNow(true); }
    else this.pushHud();
  }

  async init(canvas: HTMLCanvasElement): Promise<void> {
    try {
      const coarse = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
      const cores = navigator.hardwareConcurrency || 4;
      this.tier = initialTier(coarse, cores);
      this.engine = new Engine(canvas, this.tier !== "low", {
        adaptToDeviceRatio: true,
        powerPreference: "high-performance",
        stencil: false,
        antialias: this.tier !== "low",
        preserveDrawingBuffer: false,
      });
      this.applyScale();
      this.buildScene();
      const loaded = await this.saves.load();
      this.loadStatus = loaded.status;
      this.pendingSave = loaded.data;
      this.saveStatus = loaded.status === "invalid" ? "Save incompatível preservado. Novo jogo pede confirmação." : loaded.status === "unavailable" ? "Armazenamento indisponível. Seu save não foi alterado." : loaded.status === "loaded" ? "Progresso local encontrado." : "Nenhum progresso salvo ainda.";
      const prefs = loadPreferences(loaded.data?.settings);
      this.quality = prefs.quality; this.lookSens = prefs.lookSens; this.deadzone = prefs.deadzone; this.hudMap = prefs.hudMap;
      this.input.setDeadzone(this.deadzone);
      if (this.quality !== "auto") this.tier = this.quality;
      this.forest?.setTier(this.tier); this.applyScale();
      this.sim = createSim(null);
      this.buildActors();
      this.engine.runRenderLoop(() => this.frame());
      window.addEventListener("resize", this.onResize);
      document.addEventListener("visibilitychange", this.onHide);
      if (import.meta.env.DEV) this.exposeProbe();
      this.hooks.onReady(!!this.pendingSave);
      this.pushHud();
      this.tryStart();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível iniciar a mata.";
      this.dispose();
      this.hooks.onFatal(message);
    }
  }

  start(mode: "new" | "continue"): void {
    if (!this.sim || this.playing || (mode === "continue" && !this.pendingSave)) return;
    if (mode === "new" && this.loadStatus !== "empty") {
      if (!window.confirm("Começar novo jogo? O progresso anterior será substituído após a próxima gravação, com uma cópia local de segurança. Cancelar preserva o jogo atual.")) return;
      this.backupOnWrite = true;
    }
    this.wantStart = mode;
    this.tryStart();
  }

  private tryStart(): void {
    if (!this.sim || !this.wantStart || !this.scene) return;
    this.sim = createSim(this.wantStart === "continue" ? this.pendingSave : null);
    this.input.clear(); this.acc = 0; this.saveAcc = 0;
    if (this.quality !== "auto") this.tier = this.quality;
    this.forest?.setTier(this.tier);
    this.applyScale();
    this.playing = true;
    this.panel = "none";
    this.camYaw = this.sim.player.yaw;
    this.audio.start();
    this.input.setGameplay(true);
    this.sim.toasts.push({ text: "Siga a trilha ao bosque do orvalho. Colha frutiluz, observe a Auryn parada e espere confiança 58. Diário, bolsa e comandos ficam no menu.", ttl: 8 });
    this.wantStart = null;
    this.pushHud();
  }

  setStick(x: number, y: number): void {
    this.input.setStick(x, y);
  }
  /** Photograph the animal framed by Observar. Captured right after the next render. */
  takePhoto(): void {
    if (!this.playing || this.panel !== "none" || !this.focusId) return;
    this.pendingPhoto = this.focusId;
  }
  setHudMap(on: boolean): void { this.hudMap = on; this.persistPreferences(); this.pushHud(); }
  setHold(name: "jump" | "sprint" | "interact" | "camera" | "pause" | "catalog" | "inventory" | "map" | "berry" | "shout" | "photo", down: boolean): void {
    this.input.setHold(name, down);
  }
  addLook(dx: number, dy: number): void {
    this.input.addLook(dx, dy);
  }
  addZoom(delta: number): void { this.input.addZoom(delta); }
  private canObserve = (creature: SimCreature): boolean => {
    if (!this.sim) return false;
    const p = this.sim.player;
    return !resolveBoom({ x: p.x, y: p.y + 1.5, z: p.z }, { x: creature.x, y: creature.y + PORTRAIT_HEIGHT[creature.speciesId], z: creature.z }, this.cameraVolumes, heightAt, 0.05).blocked;
  };
  toggleObservation(): void {
    if (!this.sim || !this.playing || this.panel !== "none") return;
    if (this.focusId) this.stopObservation();
    else {
      const creature = observationTarget(this.sim, null, this.canObserve);
      if (!creature) return;
      this.previousView = { mode: this.mode, yaw: this.camYaw, pitch: this.camPitch, distance: this.camDist };
      this.focusId = creature.id;
      const low = creature.speciesId === "toad" || creature.speciesId === "fish" || creature.speciesId === "tegu" || creature.speciesId === "armadillo";
      this.mode = "third"; this.camYaw = creature.yaw + 2.5; this.camPitch = low ? 0.5 : 0.22;
      this.camDist = creature.speciesId === "rabbit" || low ? 2.1 : creature.speciesId === "eagle" ? 3.5 : 3;
      this.boomDistance = this.camDist;
    }
    this.pushHud();
  }
  private stopObservation(): void {
    if (this.previousView) {
      this.mode = this.previousView.mode; this.camYaw = this.previousView.yaw;
      this.camPitch = this.previousView.pitch; this.camDist = this.previousView.distance;
    }
    this.focusId = null; this.previousView = null; this.boomDistance = this.camDist;
  }
  command(pet: PetCommand): void {
    if (this.sim && this.playing) { commandPet(this.sim, pet); this.pushHud(); void this.saveNow(true); }
  }
  setQuality(quality: QualityName): void {
    this.quality = quality;
    if (quality !== "auto") this.tier = quality;
    this.forest?.setTier(this.tier);
    this.applyScale();
    this.persistPreferences();
    this.pushHud();
  }
  setLookSens(value: number): void {
    this.lookSens = clamp(value, 0.001, 0.02); this.persistPreferences();
  }
  setDeadzone(value: number): void {
    this.deadzone = clamp(value, 0.05, 0.35); this.input.setDeadzone(this.deadzone); this.persistPreferences();
  }
  private persistPreferences(): void {
    if (!storePreferences({ quality: this.quality, lookSens: this.lookSens, deadzone: this.deadzone, hudMap: this.hudMap })) {
      this.saveStatus = "Preferências válidas só nesta sessão: armazenamento indisponível.";
    }
  }
  renamePet(name: string, id?: string): void {
    if (!this.sim) return;
    const clean = name.slice(0, 16);
    const pet = this.sim.creatures.find(c => c.tamed && (id ? c.id === id : c.speciesId === "auryn"));
    if (!pet) { this.sim.petName = clean; return; }
    if (pet.speciesId === "auryn") this.sim.petName = clean;
    pet.name = clean.trim() || (pet.speciesId === "auryn" ? "Auryn" : pet.name);
  }
  saveNow(quiet = false): Promise<boolean> {
    if (this.recovering || this.saveConflict) return Promise.resolve(false);
    this.saveQueue = this.saveQueue.then(() => this.performSave(quiet));
    return this.saveQueue;
  }
  private async performSave(quiet: boolean): Promise<boolean> {
    if (!this.sim || !this.playing) return false;
    const snapshot = toSave(this.sim, { quality: this.quality, lookSens: this.lookSens });
    this.saveStatus = "Gravando…";
    const result = await this.saves.write(snapshot, this.backupOnWrite);
    const ok = result.status === "saved";
    this.saveConflict = result.status === "conflict";
    if (ok) { this.pendingSave = snapshot; this.backupOnWrite = false; }
    this.saveStatus = ok ? "Salvo neste aparelho." : this.saveConflict ? "Outra aba alterou o progresso. Exporte esta sessão em Progresso / backup e recarregue para usar o save atual. Esta sessão não sobrescreverá o disco." : "Falha ao salvar. Progresso só nesta sessão; tente Gravar agora.";
    if (!quiet || !ok) this.sim.toasts.push({ text: this.saveStatus, ttl: 3 });
    this.pushHud();
    return ok;
  }
  setProgressOpen(open: boolean): void {
    this.progressOpen = open;
    if (open && this.playing) this.open("pause");
    this.input.clear();
  }
  async inspectProgress() { return { ...await this.saves.inspect(), session: this.playing }; }
  async exportProgress(slot: "current" | "backup") {
    if (slot === "current" && this.sim && this.playing) {
      return { status: "exported" as const, json: JSON.stringify(toSave(this.sim, { quality: this.quality, lookSens: this.lookSens }), null, 2) };
    }
    return this.saves.exportRaw(slot === "current" ? "primary" : "backup");
  }
  previewImport(text: string): ImportPreview { return parseImport(text); }

  /**
   * Imported progress becomes primary; the previous primary goes to backup in the same
   * IndexedDB transaction. An open session is saved first so it is the one preserved.
   */
  async importProgress(data: SaveData): Promise<boolean> {
    if (this.recovering || this.saveConflict) return false;
    this.recovering = true;
    try {
      await this.saveQueue;
      if (this.playing && this.sim) {
        const current = await this.saves.write(toSave(this.sim, { quality: this.quality, lookSens: this.lookSens }));
        if (current.status !== "saved") { this.saveConflict = current.status === "conflict"; this.saveStatus = "Não foi possível guardar a sessão atual antes de importar. Nada foi trocado."; return false; }
      }
      const result = await this.saves.write(data, true);
      if (result.status !== "saved") {
        this.saveConflict = result.status === "conflict";
        this.saveStatus = this.saveConflict ? "Outra aba alterou o progresso. Recarregue antes de importar." : "Não foi possível importar. O progresso atual foi preservado.";
        return false;
      }
      this.stopObservation();
      this.pendingSave = result.data; this.loadStatus = "loaded"; this.backupOnWrite = false;
      if (this.playing) {
        this.sim = createSim(result.data);
        this.camYaw = this.sim.player.yaw; this.acc = this.saveAcc = 0;
        this.open("pause"); this.syncActors(); this.syncProps();
      }
      this.saveStatus = "Progresso importado. O anterior ficou no backup.";
      return true;
    } finally { this.recovering = false; this.pushHud(); }
  }

  async restoreProgress(): Promise<boolean> {
    if (this.recovering || this.saveConflict) return false;
    this.recovering = true;
    try {
      await this.saveQueue;
      // Preserve unsaved play atomically with the swap; never overwrite the selected backup first.
      const current = this.playing && this.sim ? toSave(this.sim, { quality: this.quality, lookSens: this.lookSens }) : undefined;
      const result = await this.saves.restoreBackup(current);
      if (result.status !== "saved") {
        this.saveConflict = result.status === "conflict";
        this.saveStatus = this.saveConflict ? "Outra aba alterou o progresso. Exporte esta sessão e recarregue antes de restaurar." : "Não foi possível restaurar. Os slots foram preservados; verifique o backup e tente novamente.";
        return false;
      }
      this.stopObservation();
      this.pendingSave = result.data;
      this.loadStatus = "loaded";
      this.backupOnWrite = false;
      if (this.playing) {
        this.sim = createSim(result.data);
        this.camYaw = this.sim.player.yaw;
        this.acc = this.saveAcc = 0;
        this.open("pause");
        this.syncActors(); this.syncProps();
      }
      this.saveStatus = "Backup restaurado. O progresso substituído ficou no backup para desfazer.";
      return true;
    } finally { this.recovering = false; this.pushHud(); }
  }
  open(panel: "none" | "catalog" | "inventory" | "map" | "pause"): void {
    this.panel = panel;
    this.acc = 0;
    this.pendingActions = { jumpEdge: false, interactEdge: false, useBerryEdge: false, shoutEdge: false, pet: null };
    this.input.setGameplay(this.playing && panel === "none");
    if (panel === "none" && this.playing) this.audio.start();
    this.pushHud();
  }

  dispose(): void {
    this.disposed = true;
    this.lifecycle.abort();
    window.removeEventListener("resize", this.onResize);
    document.removeEventListener("visibilitychange", this.onHide);
    this.input.dispose();
    this.audio.dispose();
    this.scene?.dispose();
    this.engine?.dispose();
    if (window.__controlsTest) delete window.__controlsTest;
  }

  /** One scene per loaded region: terrain, forest, camera and camera volumes. */
  private buildScene(): void {
    if (!this.engine) return;
    const scene = new Scene(this.engine);
    scene.useRightHandedSystem = true;
    this.scene = scene;
    const camera = new FreeCamera("cam", new Vector3(0, 6, 20), scene);
    camera.minZ = 0.12;
    camera.maxZ = 160;
    camera.fov = this.fov;
    this.camera = camera;
    this.forest = buildForest(scene, this.tier);
    this.cameraVolumes = createCameraVolumes();
    this.loadedRegion = region().id;
  }

  /**
   * Travel (or loading a save in another region) swaps the whole scene. The old scene
   * is disposed with its meshes/materials/lights; the engine and the simulation stay.
   */
  private rebuildWorld(): void {
    if (!this.sim || !this.engine) return;
    setActiveRegion(this.sim.region);
    this.stopObservation();
    this.scene?.dispose();
    this.rigs.clear(); this.playerRig = null; this.lastShadow = null;
    this.buildScene();
    this.forest?.setTier(this.tier);
    this.buildActors();
    this.camYaw = this.sim.player.yaw;
    this.boomDistance = this.camDist;
    this.pushHud();
  }

  private buildActors(): void {
    if (!this.scene || !this.sim) return;
    this.playerRig = buildPlayer(this.scene);
    void dressRig(this.scene, this.playerRig, "player");
    for (const c of this.sim.creatures) {
      const rig = buildCreature(this.scene, c.id, c.speciesId);
      this.rigs.set(c.id, rig);
      void dressRig(this.scene, rig, c.speciesId);
    }
  }

  private frame(): void {
    if (!this.engine || !this.scene || !this.sim || !this.camera || this.disposed) return;
    if (this.contextLost || document.hidden) return;
    if (this.sim.region !== this.loadedRegion) { this.rebuildWorld(); return; }
    const dt = Math.min(this.engine.getDeltaTime() / 1000, CONFIG.maxFrame);
    this.time += dt;
    const input = this.input.sample();
    this.handleUi(input);
    const blocked = !this.playing || this.panel !== "none";
    const camYaw = this.camYaw;
    if (!blocked) {
      this.pendingActions.jumpEdge ||= input.jumpEdge;
      this.pendingActions.interactEdge ||= input.interactEdge;
      this.pendingActions.useBerryEdge ||= input.useBerryEdge;
      this.pendingActions.shoutEdge ||= input.shoutEdge;
      this.pendingActions.pet = input.pet ?? this.pendingActions.pet;
      this.acc += dt;
      let first = true;
      let guard = 0;
      while (this.acc >= CONFIG.fixedDt && guard < 5) {
        stepSim(
          this.sim,
          {
            moveX: input.moveX,
            moveZ: input.moveZ,
            camYaw,
            sprint: input.sprint,
            jumpEdge: first && this.pendingActions.jumpEdge,
            interactEdge: first && this.pendingActions.interactEdge,
            useBerryEdge: first && this.pendingActions.useBerryEdge,
            pet: first ? this.pendingActions.pet : null,
            discover: true,
            shoutEdge: first && this.pendingActions.shoutEdge,
          },
          CONFIG.fixedDt,
        );
        this.pendingActions = { jumpEdge: false, interactEdge: false, useBerryEdge: false, shoutEdge: false, pet: null };
        first = false;
        this.acc -= CONFIG.fixedDt;
        guard++;
      }
    } else if (!this.playing) {
      stepSim(this.sim, { ...EMPTY_INPUT, camYaw: this.camYaw }, Math.min(dt, CONFIG.fixedDt));
    }
    this.updateCamera(input, dt, blocked);
    this.syncActors(blocked ? 0 : dt);
    this.syncProps();
    const dayF = dayFraction(this.sim.time);
    if (this.forest) {
      this.forest.water.position.y = CONFIG.waterY + 0.04 + Math.sin(this.time * 1.4) * 0.03;
      this.forest.setTime(dayF, this.sim.player, this.time);
      this.forest.setIncubator(this.sim.incubator?.progress ?? null, this.time);
    }
    this.audio.update(dt, this.playing && this.panel === "none", dayPeriod(dayF));
    this.scene.render();
    if (this.pendingPhoto) this.capturePhoto(this.pendingPhoto);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt);
    this.trackFps(dt);
    this.hudAcc += dt;
    if (this.hudAcc > 0.12) {
      this.hudAcc = 0;
      this.pushHud();
    }
    if (this.playing && this.panel === "none") {
      this.saveAcc += dt;
      if (this.saveAcc > CONFIG.saveEvery) {
        this.saveAcc = 0;
        void this.saveNow(true);
      }
    }
  }

  /** The drawing buffer is still valid right after render: copy a small JPEG for the diary. */
  private capturePhoto(id: string): void {
    this.pendingPhoto = null;
    if (!this.sim || !this.engine) return;
    const source = this.engine.getRenderingCanvas();
    if (!source) return;
    const canvas = this.photoCanvas ??= document.createElement("canvas");
    canvas.width = 224; canvas.height = 140;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const ratio = canvas.width / canvas.height, sw = Math.min(source.width, source.height * ratio), sh = sw / ratio;
    try {
      ctx.drawImage(source, (source.width - sw) / 2, (source.height - sh) / 2, sw, sh, 0, 0, canvas.width, canvas.height);
      const image = canvas.toDataURL("image/jpeg", 0.72);
      if (recordPhoto(this.sim, id, image)) { this.flash = 0.35; this.audio.shutter(); void this.saveNow(true); }
    } catch { this.sim.toasts.push({ text: "Não foi possível guardar a foto neste navegador.", ttl: 3 }); }
    this.pushHud();
  }

  private handleUi(input: ReturnType<InputManager["sample"]>): void {
    if (!this.playing || this.progressOpen) return;
    if (input.pauseEdge) this.open(this.panel === "none" ? "pause" : "none");
    else if (input.catalogEdge) this.open(this.panel === "catalog" ? "none" : "catalog");
    else if (input.inventoryEdge) this.open(this.panel === "inventory" ? "none" : "inventory");
    else if (input.mapEdge) this.open(this.panel === "map" ? "none" : "map");
    if (this.panel === "none" && this.focusId && (Math.hypot(input.moveX, input.moveZ) > 0.1 || input.jumpEdge)) this.stopObservation();
    if (input.observeEdge && this.panel === "none") this.toggleObservation();
    if (input.ability && this.panel === "none") this.petAbility(input.ability);
    if (input.photoEdge && this.panel === "none") this.takePhoto();
    if (input.cameraEdge && this.panel === "none") {
      this.stopObservation();
      this.mode = this.mode === "third" ? "first" : "third";
      this.camPitch = clampCameraPitch(this.camPitch, this.mode);
    }
  }

  private updateCamera(input: ReturnType<InputManager["sample"]>, dt: number, blocked: boolean): void {
    if (!this.camera || !this.sim) return;
    if (!this.playing) {
      this.titleAng += dt * 0.12;
      const x = CONFIG.lakeX + Math.sin(this.titleAng) * 18;
      const z = CONFIG.lakeZ + Math.cos(this.titleAng) * 16;
      this.camera.position.set(x, Math.max(heightAt(x, z) + 5, 4.5), z);
      this.lookAt.set(CONFIG.lakeX, 0.4, CONFIG.lakeZ);
      this.camera.setTarget(this.lookAt);
      return;
    }
    const focused = this.focusId ? observationTarget(this.sim, this.focusId, this.canObserve) : null;
    if (this.focusId && !focused) this.stopObservation();
    if (!blocked) {
      const lookX = input.lookPx + input.lookStickX * 140 * Math.max(dt, 0.016);
      const lookY = input.lookPy + input.lookStickY * 110 * Math.max(dt, 0.016);
      this.camYaw -= lookX * this.lookSens;
      this.camPitch = clampCameraPitch(this.camPitch + lookY * this.lookSens, this.mode);
      if (this.mode === "third") this.camDist = clamp(this.camDist + input.zoom * 0.008, focused ? 1.5 : CONFIG.camera.min, focused ? 7 : CONFIG.camera.max);
      else this.fov = clamp(this.fov + input.zoom * 0.0005, 0.6, 1.25);
    }
    const p = this.sim.player;
    const b = basis(this.camYaw);
    // Small or swimming animals: keep the pivot above ground and water so the boom has room.
    const pivot = focused
      ? { x: focused.x, y: Math.max(focused.y + PORTRAIT_HEIGHT[focused.speciesId], heightAt(focused.x, focused.z) + 0.35, CONFIG.waterY + 0.3), z: focused.z }
      : { x: p.x, y: p.y + (this.mode === "first" ? 1.55 : CONFIG.camera.eye), z: p.z };
    let dist = this.camDist;
    if (p.swimming && !focused) dist = Math.min(dist, 4.4);
    if (this.mode === "first") {
      this.camera.position.set(p.x, pivot.y, p.z);
      this.lookAt.set(p.x + b.fx * Math.cos(this.camPitch), pivot.y - Math.sin(this.camPitch), p.z + b.fz * Math.cos(this.camPitch));
    } else {
      const horizontal = Math.cos(this.camPitch) * dist;
      const desired = { x: pivot.x - b.fx * horizontal, y: pivot.y + Math.sin(this.camPitch) * dist, z: pivot.z - b.fz * horizontal };
      const boom = advanceBoom(pivot, desired, this.boomDistance, dt, this.cameraVolumes, heightAt);
      this.boomDistance = boom.distance;
      this.camera.position.set(boom.position.x, boom.position.y, boom.position.z);
      // Never let the camera sit on its own target: that degenerates the view matrix.
      if (Math.hypot(boom.position.x - pivot.x, boom.position.y - pivot.y, boom.position.z - pivot.z) < 0.25) {
        this.camera.position.set(pivot.x - b.fx * 0.35, pivot.y + 0.45, pivot.z - b.fz * 0.35);
      }
      this.lookAt.set(pivot.x, pivot.y, pivot.z);
    }
    this.camera.setTarget(this.lookAt);
    this.camera.fov = this.mode === "first" ? this.fov : focused ? 0.72 : 0.9;
    if (this.playerRig) this.playerRig.root.setEnabled(this.mode === "third" && !focused && this.boomDistance > 0.7);
  }

  private syncActors(dt = 0): void {
    if (!this.sim || !this.playerRig) return;
    const shadows = this.forest?.shadows ?? null;
    if (shadows && shadows !== this.lastShadow) {
      for (const rig of [this.playerRig, ...this.rigs.values()]) {
        for (const mesh of rig.root.getChildMeshes()) shadows.addShadowCaster(mesh, false);
      }
    }
    this.lastShadow = shadows;
    const p = this.sim.player;
    this.playerRig.root.position.set(p.x, p.y, p.z);
    this.playerRig.root.rotation.y = p.yaw + Math.PI;
    animateRig(this.playerRig, p.speed > 0.2 ? this.time * 8 : 0, p.speed > 0.2, this.time);
    const alive = new Set<string>();
    for (const c of this.sim.creatures) {
      alive.add(c.id);
      let rig = this.rigs.get(c.id);
      // Creatures born in play (hatchlings) get their model the first time they appear.
      if (!rig && this.scene) {
        rig = buildCreature(this.scene, c.id, c.speciesId);
        this.rigs.set(c.id, rig);
        void dressRig(this.scene, rig, c.speciesId);
        if (shadows) for (const mesh of rig.root.getChildMeshes()) shadows.addShadowCaster(mesh, false);
      }
      if (!rig) continue;
      rig.root.setEnabled(true);
      rig.root.position.set(c.x, c.y, c.z);
      rig.root.rotation.y = c.yaw + Math.PI;
      animateRig(rig, c.phase, c.moving, this.time, { state: c.state, fear: Math.max(c.fear, c.startled > 0 ? 0.8 : 0), trust: c.trust, tamed: c.tamed, dt });
    }
    // A restore or import can remove born creatures: hide their models instead of leaving ghosts.
    for (const [id, rig] of this.rigs) if (!alive.has(id)) rig.root.setEnabled(false);
  }

  private syncProps(): void {
    if (!this.sim || !this.forest) return;
    for (const prop of this.sim.props) {
      const node = this.forest.propNodes.get(prop.id);
      if (node) node.setEnabled(!prop.taken && prop.depleted <= 0);
    }
  }

  private trackFps(dt: number): void {
    if (!this.engine) return;
    const fps = this.engine.getFps();
    if (Number.isFinite(fps) && fps > 0 && fps < 480) this.fpsWindow.push(fps);
    if (this.fpsWindow.length > 40) this.fpsWindow.shift();
    this.fpsAcc += dt;
    this.adaptAcc += dt;
    if (this.adaptAcc > 3 && this.fpsWindow.length > 20) {
      this.adaptAcc = 0;
      const avg = this.fpsWindow.reduce((a, b) => a + b, 0) / this.fpsWindow.length;
      const next = adaptTier(this.quality, this.tier, avg);
      if (next !== this.tier) {
        this.tier = next;
        this.forest?.setTier(next);
        this.applyScale();
      }
    }
  }

  private applyScale(): void {
    if (!this.engine) return;
    const dpr = window.devicePixelRatio || 1;
    this.engine.setHardwareScalingLevel(scalingFor(this.tier, dpr));
  }

  private snapshot(): HudSnapshot {
    const sim = this.sim;
    if (!sim) {
      return {
        ready: false, encounter: null,
        lookSens: this.lookSens, deadzone: this.deadzone, saveStatus: this.saveStatus,
        playing: false,
        health: 100,
        energy: 100,
        thirst: 0,
        fps: 0,
        tier: this.tier,
        quality: this.quality,
        entities: 0,
        prompt: "",
        camera: this.mode,
        pet: null,
        trust: null,
        catalog: [],
        inventory: { glowfruit: 0, berries: 0, eggs: 0, wolfapple: 0 },
        panel: "none",
        toasts: [],
        discovered: 0,
        species: SPECIES.length,
        map: [],
        player: { x: 0, z: 18 },
        yaw: 0,
        swimming: false,
        hasSave: !!this.pendingSave,
        threat: 0, track: null, abilities: null, props: [],
        pets: [], challenges: [], photos: {}, visited: [], regions: allRegions().map(r => ({ id: r.id, name: r.name })),
        place: placeView(), day: { clock: "", period: "day", label: "", fraction: 0.3 }, incubator: null, flash: 0, hudMap: this.hudMap, shoutReady: false,
      };
    }
    const avg = this.fpsWindow.length
      ? Math.round(this.fpsWindow.reduce((a, b) => a + b, 0) / this.fpsWindow.length)
      : 0;
    const catalog = catalogView(sim.discoveries);
    const encountered = observationTarget(sim, this.focusId, this.canObserve);
    return {
      ready: true, encounter: encountered ? encounterNote(sim, encountered, this.focusId !== null) : null,
      lookSens: this.lookSens, deadzone: this.deadzone, saveStatus: this.saveStatus,
      playing: this.playing,
      health: sim.player.health,
      energy: sim.player.energy,
      thirst: sim.player.thirst,
      fps: avg,
      tier: this.tier,
      quality: this.quality,
      entities: sim.creatures.length + 1,
      prompt: this.panel === "none" ? sim.prompt : "",
      camera: this.mode,
      pet: petSnapshot(sim),
      trust: trustSnapshot(sim),
      catalog,
      inventory: sim.inventory,
      panel: this.panel,
      toasts: sim.toasts.map((t) => t.text),
      discovered: catalog.filter((c) => c.known).length,
      species: catalog.length,
      map: sim.creatures.map((c) => ({
        id: c.id,
        speciesId: c.speciesId,
        x: c.x,
        z: c.z,
        known: !!sim.discoveries[c.speciesId]?.seen && !c.hidden,
        tamed: c.tamed,
        state: c.state,
      })),
      player: { x: sim.player.x, z: sim.player.z },
      yaw: this.camYaw,
      swimming: sim.player.swimming,
      hasSave: !!this.pendingSave,
      threat: sim.threat,
      props: sim.props.map(p => ({ id: p.id, kind: p.kind, x: p.x, z: p.z, available: !p.taken && p.depleted <= 0 })),
      pets: petViews(sim),
      visited: [...sim.visited],
      regions: allRegions().map(r => ({ id: r.id, name: r.name })),
      place: placeView(),
      challenges: challengeViews(sim),
      photos: Object.fromEntries(Object.entries(sim.photos).map(([id, photo]) => [id, photo!.image])),
      day: (() => { const f = dayFraction(sim.time), period = dayPeriod(f); return { clock: clockLabel(f), period, label: PERIOD_LABEL[period], fraction: f }; })(),
      incubator: sim.incubator ? sim.incubator.progress : null,
      flash: this.flash,
      hudMap: this.hudMap,
      shoutReady: sim.shoutCd <= 0 && sim.player.energy >= 15,
      track: sim.track ? { x: sim.track.x, z: sim.track.z, label: sim.track.label } : null,
      abilities: (() => {
        const pet = sim.creatures.find(c => c.speciesId === "auryn" && c.tamed);
        if (!pet) return null;
        return { near: Math.hypot(pet.x - sim.player.x, pet.z - sim.player.z) < 6, track: pet.abilityCd.track, calm: pet.abilityCd.calm };
      })(),
    };
  }

  refreshHud(): void { this.pushHud(); }

  private pushHud(): void {
    this.hooks.onHud(this.snapshot());
  }

  private exposeProbe(): void {
    window.__controlsTest = {
      getHud: () => this.snapshot(),
      getCamera: () => ({ mode: this.mode, yaw: this.camYaw, distance: this.camDist, fov: this.fov, focus: this.focusId, position: this.camera ? { x: this.camera.position.x, y: this.camera.position.y, z: this.camera.position.z } : null, target: { x: this.lookAt.x, y: this.lookAt.y, z: this.lookAt.z } }),
      getSim: () => this.sim,
      getSceneCounts: () => ({ meshes: this.scene?.meshes.length, materials: this.scene?.materials.length }),
      getYaw: () => this.sim?.player.yaw ?? 0,
      getSpeed: () => this.sim?.player.speed ?? 0,
      setKeys: (codes: string[]) => this.input.setKeys(codes),
      getPos: () => ({ x: this.sim?.player.x ?? 0, z: this.sim?.player.z ?? 0 }),
      // QA only: dress every rig of a kind with a fixture GLB served by Vite dev.
      dressFixture: async (key: ModelKey, url: string, asset: ModelAsset) => {
        if (!this.scene) return 0;
        const rigs = key === "player" ? [this.playerRig] : this.sim?.creatures.filter(c => c.speciesId === key).map(c => this.rigs.get(c.id)) ?? [];
        let dressed = 0;
        for (const rig of rigs) if (rig && await dressRig(this.scene, rig, key, { asset, url })) dressed++;
        return dressed;
      },
    };
  }

  private onBlur = (): void => { if (this.playing) this.open("pause"); };

  private onResize = (): void => {
    this.applyScale();
    this.engine?.resize();
  };

  private onHide = (): void => {
    if (document.hidden) {
      this.onBlur();
      this.audio.suspend();
      if (this.playing) void this.saveNow(true);
    }
  };
}

/** What the guide needs to know about the active region. */
function placeView() {
  const def = region();
  return { id: def.id, name: def.name, biome: def.biome, guide: def.guide, territory: !!def.territory, nests: def.nests.length > 0 };
}

declare global {
  interface Window {
    __controlsTest?: {
      getHud: () => HudSnapshot;
      getCamera: () => { mode: CameraMode; yaw: number; distance: number; fov: number; focus: string | null; position: { x: number; y: number; z: number } | null; target: { x: number; y: number; z: number } };
      getSim: () => Simulation | null;
      getSceneCounts: () => { meshes?: number; materials?: number };
      getYaw: () => number;
      getSpeed: () => number;
      setKeys: (codes: string[]) => void;
      getPos: () => { x: number; z: number };
      dressFixture: (key: ModelKey, url: string, asset: ModelAsset) => Promise<number>;
    };
  }
}

export type HudSnapshot = {
  encounter: ReturnType<typeof encounterNote> | null;
  ready: boolean;
  lookSens: number;
  deadzone: number;
  saveStatus: string;
  playing: boolean;
  health: number;
  energy: number;
  thirst: number;
  fps: number;
  tier: string;
  quality: QualityName;
  entities: number;
  prompt: string;
  camera: CameraMode;
  pet: { name: string; command: PetCommand; level: number; xp: number } | null;
  trust: { value: number; near: boolean } | null;
  catalog: ReturnType<typeof catalogView>;
  inventory: { glowfruit: number; berries: number; eggs: number; wolfapple: number };
  panel: "none" | "catalog" | "inventory" | "map" | "pause";
  toasts: string[];
  discovered: number;
  species: number;
  map: { id: string; speciesId: string; x: number; z: number; known: boolean; tamed: boolean; state: string }[];
  player: { x: number; z: number };
  yaw: number;
  swimming: boolean;
  hasSave: boolean;
  threat: number;
  props: { id: string; kind: PropKind; x: number; z: number; available: boolean }[];
  pets: PetView[];
  visited: RegionId[];
  regions: { id: RegionId; name: string }[];
  place: ReturnType<typeof placeView>;
  challenges: ChallengeView[];
  photos: Partial<Record<SpeciesId, string>>;
  day: { clock: string; period: DayPeriod; label: string; fraction: number };
  incubator: number | null;
  flash: number;
  hudMap: boolean;
  shoutReady: boolean;
  track: { x: number; z: number; label: string } | null;
  abilities: { near: boolean; track: number; calm: number } | null;
};
