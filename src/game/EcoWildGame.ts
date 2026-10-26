import { Engine, FreeCamera, Scene, Vector3 } from "@babylonjs/core";
import { Ambience } from "./audio/ambience.ts";
import { catalogView } from "./catalog/discoveries.ts";
import { CONFIG } from "./config.ts";
import { InputManager } from "./input/InputManager.ts";
import { basis, clamp } from "./math.ts";
import { adaptTier, initialTier, scalingFor } from "./performance/quality.ts";
import { loadSave, writeSave } from "./persistence/save.ts";
import { loadPreferences, storePreferences } from "./persistence/preferences.ts";
import { animateRig, buildCreature, buildPlayer } from "./render/actors.ts";
import type { Rig } from "./render/actors.ts";
import { buildForest } from "./render/forest.ts";
import type { Forest } from "./render/forest.ts";
import { commandPet, createSim, petSnapshot, stepSim, toSave, trustSnapshot } from "./sim/simulation.ts";
import type { Simulation } from "./sim/simulation.ts";
import type { CameraMode, PetCommand, QualityName, SaveV1 } from "./types.ts";
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
  private pendingSave: SaveV1 | null = null;
  private mode: CameraMode = "third";
  private camYaw = 0;
  private camPitch: number = CONFIG.camera.pitch;
  private camDist: number = CONFIG.camera.distance;
  private fov = 0.86;
  private readonly camPos = new Vector3();
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
  private saveQueue: Promise<boolean> = Promise.resolve(true);
  private contextLost = false;
  private lastShadow: Forest["shadows"] = null;
  private pendingActions = { jumpEdge: false, interactEdge: false, useBerryEdge: false, pet: null as PetCommand | null };
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
    const sim = this.sim;
    if (!sim || sim.inventory.berries <= 0) return;
    sim.inventory.berries -= 1;
    sim.player.energy = Math.min(100, sim.player.energy + 28);
    sim.player.health = Math.min(100, sim.player.health + 16);
    sim.player.thirst = Math.max(0, sim.player.thirst - 10);
    sim.toasts.push({ text: "Você comeu um fruto da mata.", ttl: 2.4 });
    this.pushHud();
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
      const scene = new Scene(this.engine);
      scene.useRightHandedSystem = true;
      this.scene = scene;
      const camera = new FreeCamera("cam", new Vector3(0, 6, 20), scene);
      camera.minZ = 0.12;
      camera.maxZ = 160;
      camera.fov = this.fov;
      this.camera = camera;
      this.forest = buildForest(scene, this.tier);
      const loaded = await loadSave();
      this.loadStatus = loaded.status;
      this.pendingSave = loaded.data;
      this.saveStatus = loaded.status === "invalid" ? "Save incompatível preservado. Novo jogo pede confirmação." : loaded.status === "unavailable" ? "Armazenamento indisponível. Seu save não foi alterado." : loaded.status === "loaded" ? "Progresso local encontrado." : "Nenhum progresso salvo ainda.";
      const prefs = loadPreferences(loaded.data?.settings);
      this.quality = prefs.quality; this.lookSens = prefs.lookSens; this.deadzone = prefs.deadzone;
      this.input.setDeadzone(this.deadzone);
      if (this.quality !== "auto") this.tier = this.quality;
      this.forest.setTier(this.tier); this.applyScale();
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
  setHold(name: "jump" | "sprint" | "interact" | "camera" | "pause" | "catalog" | "inventory" | "map" | "berry", down: boolean): void {
    this.input.setHold(name, down);
  }
  addLook(dx: number, dy: number): void {
    this.input.addLook(dx, dy);
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
    if (!storePreferences({ quality: this.quality, lookSens: this.lookSens, deadzone: this.deadzone })) {
      this.saveStatus = "Preferências válidas só nesta sessão: armazenamento indisponível.";
    }
  }
  renamePet(name: string): void {
    if (!this.sim) return;
    const clean = name.slice(0, 16);
    this.sim.petName = clean;
    const auryn = this.sim.creatures.find((c) => c.speciesId === "auryn");
    if (auryn?.tamed) auryn.name = clean.trim() || "Auryn";
  }
  saveNow(quiet = false): Promise<boolean> {
    this.saveQueue = this.saveQueue.then(() => this.performSave(quiet));
    return this.saveQueue;
  }
  private async performSave(quiet: boolean): Promise<boolean> {
    if (!this.sim || !this.playing) return false;
    const snapshot = toSave(this.sim, { quality: this.quality, lookSens: this.lookSens });
    this.saveStatus = "Gravando…";
    const ok = await writeSave(snapshot, this.backupOnWrite);
    if (ok) { this.pendingSave = snapshot; this.backupOnWrite = false; }
    this.saveStatus = ok ? "Salvo neste aparelho." : "Falha ao salvar. Progresso só nesta sessão; tente Gravar agora.";
    if (!quiet || !ok) this.sim.toasts.push({ text: this.saveStatus, ttl: 3 });
    this.pushHud();
    return ok;
  }
  open(panel: "none" | "catalog" | "inventory" | "map" | "pause"): void {
    this.panel = panel;
    this.acc = 0;
    this.pendingActions = { jumpEdge: false, interactEdge: false, useBerryEdge: false, pet: null };
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

  private buildActors(): void {
    if (!this.scene || !this.sim) return;
    this.playerRig = buildPlayer(this.scene);
    for (const c of this.sim.creatures) {
      this.rigs.set(c.id, buildCreature(this.scene, c.id, c.speciesId));
    }
  }

  private frame(): void {
    if (!this.engine || !this.scene || !this.sim || !this.camera || this.disposed) return;
    if (this.contextLost || document.hidden) return;
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
          },
          CONFIG.fixedDt,
        );
        this.pendingActions = { jumpEdge: false, interactEdge: false, useBerryEdge: false, pet: null };
        first = false;
        this.acc -= CONFIG.fixedDt;
        guard++;
      }
    } else if (!this.playing) {
      stepSim(this.sim, { ...EMPTY_INPUT, camYaw: this.camYaw }, Math.min(dt, CONFIG.fixedDt));
    }
    this.updateCamera(input, dt, blocked);
    this.syncActors();
    this.syncProps();
    if (this.forest) {
      this.forest.water.position.y = CONFIG.waterY + 0.04 + Math.sin(this.time * 1.4) * 0.03;
    }
    this.audio.update(dt, this.playing && this.panel === "none");
    this.scene.render();
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

  private handleUi(input: ReturnType<InputManager["sample"]>): void {
    if (!this.playing) return;
    if (input.pauseEdge) this.open(this.panel === "none" ? "pause" : "none");
    else if (input.catalogEdge) this.open(this.panel === "catalog" ? "none" : "catalog");
    else if (input.inventoryEdge) this.open(this.panel === "inventory" ? "none" : "inventory");
    else if (input.mapEdge) this.open(this.panel === "map" ? "none" : "map");
    if (input.cameraEdge && this.panel === "none") {
      this.mode = this.mode === "third" ? "first" : "third";
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
    if (!blocked) {
      const lookX = input.lookPx + input.lookStickX * 140 * Math.max(dt, 0.016);
      const lookY = input.lookPy + input.lookStickY * 110 * Math.max(dt, 0.016);
      this.camYaw -= lookX * this.lookSens;
      this.camPitch = clamp(this.camPitch + lookY * this.lookSens, this.mode === "first" ? -0.9 : 0.18, 1.15);
      if (this.mode === "third") this.camDist = clamp(this.camDist + input.zoom * 0.008, CONFIG.camera.min, CONFIG.camera.max);
      else this.fov = clamp(this.fov + input.zoom * 0.0005, 0.6, 1.25);
    }
    const p = this.sim.player;
    const b = basis(this.camYaw);
    const pivotY = p.y + (this.mode === "first" ? 1.55 : CONFIG.camera.eye);
    let dist = this.mode === "first" ? 0.18 : this.camDist;
    if (p.swimming && this.mode === "third") dist = Math.min(dist, 4.4);
    const hdist = Math.cos(this.camPitch) * dist;
    const vdist = Math.sin(this.camPitch) * dist;
    let cx = p.x - b.fx * hdist;
    let cz = p.z - b.fz * hdist;
    let cy = pivotY + vdist;
    if (this.mode === "third") {
      const shorten = this.cameraClearance(p.x, p.z, cx, cz, hdist);
      if (shorten < 1) {
        cx = p.x + (cx - p.x) * shorten;
        cz = p.z + (cz - p.z) * shorten;
        cy = pivotY + vdist * shorten;
      }
    }
    const k = 1 - Math.exp(-10 * dt);
    this.camPos.copyFrom(this.camera.position);
    this.camera.position.set(
      this.camPos.x + (cx - this.camPos.x) * k,
      this.camPos.y + (cy - this.camPos.y) * k,
      this.camPos.z + (cz - this.camPos.z) * k,
    );
    this.camera.position.y = Math.max(this.camera.position.y, heightAt(this.camera.position.x, this.camera.position.z) + 0.25);
    if (this.mode === "first") {
      this.camera.position.set(p.x, pivotY, p.z);
      this.lookAt.set(p.x + b.fx * Math.cos(this.camPitch), pivotY - Math.sin(this.camPitch), p.z + b.fz * Math.cos(this.camPitch));
    } else this.lookAt.set(p.x, pivotY, p.z);
    this.camera.setTarget(this.lookAt);
    this.camera.fov = this.mode === "first" ? this.fov : 0.9;
    if (this.playerRig) this.playerRig.root.setEnabled(this.mode === "third");
  }

  private cameraClearance(px: number, pz: number, cx: number, cz: number, dist: number): number {
    if (!this.sim || dist < 0.2) return 1;
    let nearest = 1;
    for (const o of this.sim.obstacles) {
      const dx = cx - px;
      const dz = cz - pz;
      const fx = o.x - px;
      const fz = o.z - pz;
      const t = clamp((fx * dx + fz * dz) / (dist * dist || 1), 0, 1);
      const qx = px + dx * t;
      const qz = pz + dz * t;
      const d = Math.hypot(o.x - qx, o.z - qz);
      const pad = o.r + 0.35;
      if (d < pad) {
        const along = t * dist;
        const safe = Math.max(0.4, along - pad);
        nearest = Math.min(nearest, safe / dist);
      }
    }
    return nearest;
  }

  private syncActors(): void {
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
    for (const c of this.sim.creatures) {
      const rig = this.rigs.get(c.id);
      if (!rig) continue;
      const hop = c.speciesId === "rabbit" && c.moving ? Math.abs(Math.sin(c.phase * 1.4)) * 0.16 : 0;
      rig.root.position.set(c.x, c.y + hop, c.z);
      rig.root.rotation.y = c.yaw + Math.PI;
      animateRig(rig, c.phase, c.moving, this.time);

    }
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
        ready: false,
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
        inventory: { glowfruit: 0, berries: 0 },
        panel: "none",
        toasts: [],
        discovered: 0,
        species: 5,
        map: [],
        player: { x: 0, z: 18 },
        yaw: 0,
        swimming: false,
        hasSave: !!this.pendingSave,
      };
    }
    const avg = this.fpsWindow.length
      ? Math.round(this.fpsWindow.reduce((a, b) => a + b, 0) / this.fpsWindow.length)
      : 0;
    const catalog = catalogView(sim.discoveries);
    return {
      ready: true,
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
        known: !!sim.discoveries[c.speciesId]?.seen,
        tamed: c.tamed,
      })),
      player: { x: sim.player.x, z: sim.player.z },
      yaw: this.camYaw,
      swimming: sim.player.swimming,
      hasSave: !!this.pendingSave,
    };
  }

  private pushHud(): void {
    this.hooks.onHud(this.snapshot());
  }

  private exposeProbe(): void {
    window.__controlsTest = {
      getHud: () => this.snapshot(),
      getCamera: () => ({ mode: this.mode, yaw: this.camYaw }),
      getSim: () => this.sim,
      getSceneCounts: () => ({ meshes: this.scene?.meshes.length, materials: this.scene?.materials.length }),
      getYaw: () => this.sim?.player.yaw ?? 0,
      getSpeed: () => this.sim?.player.speed ?? 0,
      setKeys: (codes: string[]) => this.input.setKeys(codes),
      getPos: () => ({ x: this.sim?.player.x ?? 0, z: this.sim?.player.z ?? 0 }),
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

declare global {
  interface Window {
    __controlsTest?: {
      getHud: () => HudSnapshot;
      getCamera: () => { mode: CameraMode; yaw: number };
      getSim: () => Simulation | null;
      getSceneCounts: () => { meshes?: number; materials?: number };
      getYaw: () => number;
      getSpeed: () => number;
      setKeys: (codes: string[]) => void;
      getPos: () => { x: number; z: number };
    };
  }
}

export type HudSnapshot = {
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
  inventory: { glowfruit: number; berries: number };
  panel: "none" | "catalog" | "inventory" | "map" | "pause";
  toasts: string[];
  discovered: number;
  species: number;
  map: { id: string; speciesId: string; x: number; z: number; known: boolean; tamed: boolean }[];
  player: { x: number; z: number };
  yaw: number;
  swimming: boolean;
  hasSave: boolean;
};
