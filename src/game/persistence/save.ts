import type { SaveV1 } from "../types.ts";
import { migrateSave } from "./schema.ts";
export { migrateSave, emptyDiscovery } from "./schema.ts";

const DB = "ecowild";
const STORE = "slots";
const REVISION = "revision";
const TIMEOUT = 5000;
export type SaveSlot = "primary" | "backup";
export type LoadResult = { status: "loaded"; data: SaveV1 } | { status: "empty" | "invalid" | "unavailable"; data: null };
export type SessionLoadResult = LoadResult & { revision: number | null; backup: LoadResult };
export type MutationResult = { status: "saved"; revision: number; data: SaveV1; backup: LoadResult }
  | { status: "conflict" | "unavailable" | "invalid" | "empty" };
export type ExportResult = { status: "exported"; json: string } | { status: "empty" | "unavailable" | "unserializable" };

type StoredState = { primary: unknown; backup: unknown; revision: unknown };
type Baseline = { revision: number; primary: string; backup: string };
const unavailable = (): LoadResult => ({ status: "unavailable", data: null });

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const fail = () => { settled = true; clearTimeout(timer); reject(new Error("Armazenamento indisponível")); };
    const timer = setTimeout(fail, TIMEOUT);
    try {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
      };
      req.onerror = fail;
      req.onblocked = fail;
      req.onsuccess = () => {
        clearTimeout(timer);
        if (settled) { req.result.close(); return; }
        settled = true;
        req.result.onversionchange = () => req.result.close();
        resolve(req.result);
      };
    } catch { fail(); }
  });
}

async function transaction<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore, result: (v: T) => void) => void): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      let value: T;
      const timer = setTimeout(() => { try { tx.abort(); } catch { /* already closed */ } reject(new Error("Tempo de armazenamento excedido")); }, TIMEOUT);
      tx.oncomplete = () => { clearTimeout(timer); resolve(value); };
      tx.onerror = tx.onabort = () => { clearTimeout(timer); reject(tx.error ?? new Error("Transação interrompida")); };
      try { run(tx.objectStore(STORE), (v) => { value = v; }); }
      catch (error) { clearTimeout(timer); try { tx.abort(); } catch { /* already aborted */ } reject(error); }
    });
  } finally { db.close(); }
}

function readState(store: IDBObjectStore, done: (state: StoredState) => void): void {
  const state: StoredState = { primary: undefined, backup: undefined, revision: undefined };
  let pending = 3;
  for (const key of ["primary", "backup", REVISION] as const) {
    const req = store.get(key);
    req.onsuccess = () => {
      state[key] = req.result;
      if (--pending === 0) {
        // Abort rather than letting an exception inside an IDB event escape to window.
        try { done(state); } catch {
          try { store.transaction.abort(); } catch { /* an earlier request already aborted it */ }
        }
      }
    };
  }
}

function classify(raw: unknown): LoadResult {
  if (raw === undefined) return { status: "empty", data: null };
  const data = migrateSave(raw);
  return data ? { status: "loaded", data } : { status: "invalid", data: null };
}

// Saves are JSON documents. Refuse a lossy export/comparison of unusual IDB values
// (cycles, BigInt, Date, Map, NaN, undefined fields); leave such records untouched.
function rawJson(raw: unknown): string {
  const seen = new Set<object>();
  const check = (value: unknown): void => {
    if (value === null || typeof value === "string" || typeof value === "boolean") return;
    if (typeof value === "number" && Number.isFinite(value)) return;
    if (typeof value !== "object" || value === null) throw new Error("Não é JSON sem perdas");
    if (seen.has(value)) throw new Error("Referência cíclica");
    const proto = Object.getPrototypeOf(value);
    if (!Array.isArray(value) && proto !== Object.prototype && proto !== null) throw new Error("Objeto não JSON");
    seen.add(value);
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) check(value[i]);
    } else for (const item of Object.values(value)) check(item);
    seen.delete(value);
  };
  check(raw);
  return JSON.stringify(raw);
}

function baseline(state: StoredState): Baseline | null {
  const revision = state.revision === undefined ? 0 : state.revision;
  if (typeof revision !== "number" || !Number.isSafeInteger(revision) || revision < 0 || revision >= Number.MAX_SAFE_INTEGER) return null;
  try {
    return { revision, primary: state.primary === undefined ? "missing" : rawJson(state.primary), backup: state.backup === undefined ? "missing" : rawJson(state.backup) };
  } catch { return null; }
}

/** One gameplay session, with an optimistic revision checked in the write transaction. */
export class SaveSession {
  private expected: Baseline | null = null;
  private conflicted = false;
  private queue: Promise<unknown> = Promise.resolve();

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(operation, operation);
    this.queue = result;
    return result;
  }

  /** Only call when explicitly loading a game; inspections and exports never reset a conflict. */
  load(): Promise<SessionLoadResult> {
    return this.enqueue(async () => {
      try {
        const state = await transaction<StoredState>("readonly", readState);
        this.expected = baseline(state);
        this.conflicted = false;
        return { ...classify(state.primary), revision: this.expected?.revision ?? null, backup: classify(state.backup) };
      } catch {
        this.expected = null;
        return { ...unavailable(), revision: null, backup: unavailable() };
      }
    });
  }

  inspect(): Promise<{ primary: LoadResult; backup: LoadResult }> {
    return this.enqueue(async () => {
      try {
        const state = await transaction<StoredState>("readonly", readState);
        return { primary: classify(state.primary), backup: classify(state.backup) };
      } catch { return { primary: unavailable(), backup: unavailable() }; }
    });
  }

  exportRaw(slot: SaveSlot): Promise<ExportResult> {
    return this.enqueue(async () => {
      let raw: unknown;
      try {
        raw = await transaction<unknown>("readonly", (store, done) => {
          const req = store.get(slot); req.onsuccess = () => done(req.result);
        });
      } catch { return { status: "unavailable" }; }
      if (raw === undefined) return { status: "empty" };
      try { return { status: "exported", json: rawJson(raw) }; }
      catch { return { status: "unserializable" }; }
    });
  }

  write(data: SaveV1, backupPrevious = false): Promise<MutationResult> {
    // Capture before queuing, so later gameplay cannot mutate the pending save.
    let snapshot: SaveV1;
    try {
      snapshot = structuredClone(data);
      if (!migrateSave(snapshot)) return Promise.resolve({ status: "invalid" });
      rawJson(snapshot);
    } catch { return Promise.resolve({ status: "invalid" }); }
    return this.enqueue(() => this.mutate(snapshot, backupPrevious));
  }

  restoreBackup(currentSession?: SaveV1): Promise<MutationResult> {
    let preserved: SaveV1 | undefined;
    try {
      if (currentSession) {
        preserved = structuredClone(currentSession);
        if (!migrateSave(preserved)) return Promise.resolve({ status: "invalid" });
        rawJson(preserved);
      }
    } catch { return Promise.resolve({ status: "invalid" }); }
    return this.enqueue(() => this.mutate(null, false, preserved));
  }

  private async mutate(snapshot: SaveV1 | null, backupPrevious: boolean, currentSession?: SaveV1): Promise<MutationResult> {
    if (this.conflicted) return { status: "conflict" };
    if (!this.expected) return { status: "unavailable" };
    try {
      const committed = await transaction<{ result: MutationResult; next?: Baseline }>("readwrite", (store, done) => {
        readState(store, state => {
          const current = baseline(state);
          if (!current || current.revision !== this.expected!.revision || current.primary !== this.expected!.primary || current.backup !== this.expected!.backup) {
            done({ result: { status: "conflict" } }); return;
          }
          let data = snapshot;
          const nextState = { ...state, revision: current.revision + 1 };
          if (data === null) {
            const savedBackup = classify(state.backup);
            if (savedBackup.status !== "loaded") {
              done({ result: { status: savedBackup.status === "empty" ? "empty" : "invalid" } }); return;
            }
            data = savedBackup.data;
            // Keep the exact backup as primary; preserve unsaved play or the old raw primary.
            // Validation affects the runtime result, never the preserved raw documents.
            nextState.primary = state.backup; nextState.backup = currentSession ?? state.primary;
          } else {
            nextState.primary = data;
            if (backupPrevious && state.primary !== undefined) nextState.backup = state.primary;
          }
          const next = baseline(nextState);
          if (!next) { done({ result: { status: "unavailable" } }); return; }
          store.put(nextState.primary, "primary");
          if (snapshot === null || backupPrevious) {
            if (nextState.backup === undefined) store.delete("backup");
            else store.put(nextState.backup, "backup");
          }
          store.put(next.revision, REVISION);
          done({ result: { status: "saved", revision: next.revision, data, backup: classify(nextState.backup) }, next });
        });
      });
      // IDB request success is not commit: advance the token only after oncomplete.
      if (committed.next) this.expected = committed.next;
      if (committed.result.status === "conflict") this.conflicted = true;
      return committed.result;
    } catch { return { status: "unavailable" }; }
  }
}

// Compatibility for existing QA/legacy callers. This is also a guarded session,
// never an unconditional writer. The game creates its own SaveSession instance.
const legacy = new SaveSession();
let initialized: Promise<SessionLoadResult> | null = null;
export async function loadSave(): Promise<LoadResult> {
  initialized = legacy.load();
  return initialized;
}
export async function writeSave(data: SaveV1, backupPrevious = false): Promise<boolean> {
  // Preserve the original snapshot-at-call contract while initialization awaits IDB.
  let snapshot: SaveV1;
  try { snapshot = structuredClone(data); } catch { return false; }
  initialized ??= legacy.load();
  await initialized;
  return (await legacy.write(snapshot, backupPrevious)).status === "saved";
}
