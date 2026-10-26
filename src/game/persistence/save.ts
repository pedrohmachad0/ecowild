import type { SaveV1 } from "../types.ts";
import { migrateSave } from "./schema.ts";
export { migrateSave, emptyDiscovery } from "./schema.ts";

const DB = "ecowild";
const STORE = "slots";
const KEY = "primary";
const TIMEOUT = 5000;
export type LoadResult = { status: "loaded"; data: SaveV1 } | { status: "empty" | "invalid" | "unavailable"; data: null };

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
      const timer = setTimeout(() => { try { tx.abort(); } catch { /* already closed */ } reject(new Error("Tempo de gravação excedido")); }, TIMEOUT);
      tx.oncomplete = () => { clearTimeout(timer); resolve(value); };
      tx.onerror = tx.onabort = () => { clearTimeout(timer); reject(tx.error ?? new Error("Transação interrompida")); };
      try { run(tx.objectStore(STORE), (v) => { value = v; }); }
      catch (error) { clearTimeout(timer); tx.abort(); reject(error); }
    });
  } finally { db.close(); }
}

export async function loadSave(): Promise<LoadResult> {
  try {
    const raw = await transaction<unknown>("readonly", (store, done) => {
      const req = store.get(KEY);
      req.onsuccess = () => done(req.result);
    });
    if (raw === undefined) return { status: "empty", data: null };
    const data = migrateSave(raw);
    return data ? { status: "loaded", data } : { status: "invalid", data: null };
  } catch { return { status: "unavailable", data: null }; }
}

// Take a detached snapshot at enqueue time and preserve invocation order, including failures.
let writes: Promise<boolean> = Promise.resolve(true);
export function writeSave(data: SaveV1, backupPrevious = false): Promise<boolean> {
  const snapshot = structuredClone(data);
  const next = async () => {
    try {
      if (!migrateSave(snapshot)) return false;
      return await transaction<boolean>("readwrite", (store, done) => {
        const put = () => { store.put(snapshot, KEY); done(true); };
        if (backupPrevious) {
          const old = store.get(KEY);
          old.onsuccess = () => { if (old.result !== undefined) store.put(old.result, "backup"); put(); };
        } else put();
      });
    } catch { return false; }
  };
  writes = writes.then(next, next);
  return writes;
}
