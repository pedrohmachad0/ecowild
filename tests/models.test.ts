import { describe, expect, test } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { MODEL_ASSETS, MODEL_BUDGET } from '../src/game/data/models';
import { inspectGlb } from '../src/game/data/glbInspect';

const dir = new URL('../public/models/', import.meta.url);
const files = existsSync(dir) ? readdirSync(dir).filter(f => f.endsWith('.glb')) : [];
const assetsDoc = readFileSync(new URL('../docs/ASSETS.md', import.meta.url), 'utf8');

describe('modelos externos (GLB)', () => {
  test('o leitor de GLB conta triângulos do arquivo de teste', () => {
    const info = inspectGlb(readFileSync(new URL('./fixtures/box.glb', import.meta.url)));
    expect(info).toMatchObject({ triangles: 12, meshes: 1 });
    expect(() => inspectGlb(new TextEncoder().encode('not a glb file at all'))).toThrow();
  });
  test('todo GLB publicado está registrado; nenhum registro aponta para arquivo ausente', () => {
    const listed = Object.values(MODEL_ASSETS).map(a => a!.file);
    for (const f of files) expect(listed, `${f} sem registro em data/models.ts`).toContain(f);
    for (const f of listed) expect(files, `${f} registrado mas ausente`).toContain(f);
  });
  test.each(Object.entries(MODEL_ASSETS))('%s respeita orçamento e tem licença registrada', (key, asset) => {
    const info = inspectGlb(readFileSync(new URL(asset!.file, dir)));
    expect(info.bytes, `${key}: arquivo grande demais`).toBeLessThanOrEqual(MODEL_BUDGET.bytes);
    expect(info.triangles, `${key}: triângulos demais`).toBeLessThanOrEqual(MODEL_BUDGET.triangles);
    expect(asset!.license.trim().length, `${key}: licença vazia`).toBeGreaterThan(10);
    expect(assetsDoc, `${key}: docs/ASSETS.md não menciona ${asset!.file}`).toContain(asset!.file);
    expect(asset!.scale).toBeGreaterThan(0);
  });
});
