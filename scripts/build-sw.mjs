import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const root = new URL('../dist/', import.meta.url);
const files = (await readdir(root, { recursive: true })).filter(f => /\.(html|js|css|png|webmanifest)$/.test(f) && f !== 'sw.js').sort();
const hash = createHash('sha256');
let bytes = 0;
for (const file of files) {
  const content = await readFile(new URL(file, root));
  bytes += content.length; hash.update(file); hash.update(content);
}
if (bytes > 8 * 1024 * 1024) throw new Error('Precache exceeds 8 MiB. Review essential assets before increasing this budget.');
const version = hash.digest('hex').slice(0, 16);
const template = await readFile(new URL('./sw-template.js', import.meta.url), 'utf8');
await writeFile(new URL('sw.js', root), template.replace('__VERSION__', JSON.stringify(version)).replace('__FILES__', JSON.stringify(files)));
console.log(`PWA ${version}: ${files.length} local files, ${bytes} bytes, cache budget 8 MiB.`);
