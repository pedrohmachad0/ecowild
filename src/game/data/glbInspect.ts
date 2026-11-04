/** Minimal GLB reader for asset checks: header, JSON chunk and triangle count. No rendering. */
export type GlbInfo = { bytes: number; triangles: number; meshes: number; images: number };

export function inspectGlb(data: Uint8Array): GlbInfo {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  if (data.byteLength < 20 || view.getUint32(0, true) !== 0x46546c67) throw new Error("Não é um arquivo GLB");
  if (view.getUint32(4, true) !== 2) throw new Error("Só glTF 2.0 é aceito");
  const jsonLength = view.getUint32(12, true);
  if (view.getUint32(16, true) !== 0x4e4f534a) throw new Error("Primeiro bloco do GLB não é JSON");
  const json = JSON.parse(new TextDecoder().decode(data.subarray(20, 20 + jsonLength))) as {
    meshes?: { primitives: { indices?: number; attributes: Record<string, number>; mode?: number }[] }[];
    accessors?: { count: number }[];
    images?: unknown[];
  };
  let triangles = 0;
  for (const mesh of json.meshes ?? []) for (const prim of mesh.primitives) {
    if ((prim.mode ?? 4) !== 4) continue; // only TRIANGLES are counted
    const count = prim.indices !== undefined ? json.accessors?.[prim.indices]?.count : json.accessors?.[prim.attributes.POSITION!]?.count;
    triangles += Math.floor((count ?? 0) / 3);
  }
  return { bytes: data.byteLength, triangles, meshes: json.meshes?.length ?? 0, images: json.images?.length ?? 0 };
}
