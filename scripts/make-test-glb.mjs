// Writes tests/fixtures/box.glb: a tiny, valid GLB (one coloured box) used only by QA
// to exercise the external-model pipeline. Original, generated here; no third-party data.
import { writeFileSync } from "node:fs";

const s = 0.5;
const faces = [
  [[1, 0, 0], [[s, -s, -s], [s, s, -s], [s, s, s], [s, -s, s]]],
  [[-1, 0, 0], [[-s, -s, s], [-s, s, s], [-s, s, -s], [-s, -s, -s]]],
  [[0, 1, 0], [[-s, s, -s], [-s, s, s], [s, s, s], [s, s, -s]]],
  [[0, -1, 0], [[-s, -s, s], [-s, -s, -s], [s, -s, -s], [s, -s, s]]],
  [[0, 0, 1], [[s, -s, s], [s, s, s], [-s, s, s], [-s, -s, s]]],
  [[0, 0, -1], [[-s, -s, -s], [-s, s, -s], [s, s, -s], [s, -s, -s]]],
];
const pos = [], nor = [], idx = [];
faces.forEach(([n, quad], f) => {
  for (const v of quad) { pos.push(...v); nor.push(...n); }
  const b = f * 4; idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
});
const p = Buffer.from(new Float32Array(pos).buffer), n = Buffer.from(new Float32Array(nor).buffer), i = Buffer.from(new Uint16Array(idx).buffer);
const bin = Buffer.concat([p, n, i, Buffer.alloc((4 - (i.length % 4)) % 4)]);
const json = {
  asset: { version: "2.0", generator: "ecowild make-test-glb" },
  scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0, name: "box" }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, indices: 2, material: 0 }] }],
  materials: [{ pbrMetallicRoughness: { baseColorFactor: [0.95, 0.55, 0.2, 1], metallicFactor: 0, roughnessFactor: 0.8 } }],
  buffers: [{ byteLength: bin.length }],
  bufferViews: [
    { buffer: 0, byteOffset: 0, byteLength: p.length, target: 34962 },
    { buffer: 0, byteOffset: p.length, byteLength: n.length, target: 34962 },
    { buffer: 0, byteOffset: p.length + n.length, byteLength: i.length, target: 34963 },
  ],
  accessors: [
    { bufferView: 0, componentType: 5126, count: 24, type: "VEC3", min: [-s, -s, -s], max: [s, s, s] },
    { bufferView: 1, componentType: 5126, count: 24, type: "VEC3" },
    { bufferView: 2, componentType: 5123, count: idx.length, type: "SCALAR" },
  ],
};
let jsonBuf = Buffer.from(JSON.stringify(json));
jsonBuf = Buffer.concat([jsonBuf, Buffer.alloc((4 - (jsonBuf.length % 4)) % 4, 0x20)]);
const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + 8 + jsonBuf.length + 8 + bin.length, 8);
const chunk = (data, type) => { const h = Buffer.alloc(8); h.writeUInt32LE(data.length, 0); h.writeUInt32LE(type, 4); return Buffer.concat([h, data]); };
writeFileSync(new URL("../tests/fixtures/box.glb", import.meta.url), Buffer.concat([header, chunk(jsonBuf, 0x4e4f534a), chunk(bin, 0x004e4942)]));
console.log("tests/fixtures/box.glb written");
