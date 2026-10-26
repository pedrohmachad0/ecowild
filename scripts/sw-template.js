/* Generated at build time. No remote resources or saves belong in this cache. */
const VERSION = __VERSION__;
const FILES = __FILES__;
const ROOT = self.registration.scope;
const PREFIX = `ecowild-shell-${new URL(ROOT).pathname}-`;
const CACHE = PREFIX + VERSION;
const URLS = FILES.map(path => new URL(path, ROOT).href);
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    try { await cache.addAll(URLS.map(url => new Request(url, { cache: 'reload' }))); }
    catch (error) { await caches.delete(CACHE); throw error; }
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    // Retain the previous complete shell while the consenting tab reloads.
    const keys = (await caches.keys()).filter(key => key.startsWith(PREFIX) && key !== CACHE);
    await Promise.all(keys.slice(0, -1).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type !== 'APPLY_UPDATE') return;
  event.waitUntil((async () => {
    const windows = (await self.clients.matchAll({ type: 'window', includeUncontrolled: true })).filter(c => c.url.startsWith(ROOT));
    if (windows.length > 1) { event.source?.postMessage({ type: 'UPDATE_BLOCKED' }); return; }
    await self.skipWaiting();
  })());
});
self.addEventListener('fetch', event => {
  const req = event.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || !url.href.startsWith(ROOT)) return;
  const navigation = req.mode === 'navigate' && [new URL(ROOT).pathname, new URL('index.html', ROOT).pathname].includes(url.pathname);
  if (!navigation && !URLS.includes(url.href)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const key = navigation ? new URL('index.html', ROOT).href : req;
    const hit = await cache.match(key);
    if (hit) return hit;
    try { return await fetch(req); }
    catch { return new Response(navigation ? '<!doctype html><html lang="pt-BR"><p>EcoWild ainda não está disponível offline. Conecte-se e abra o jogo uma vez para preparar a mata.</p></html>' : 'Recurso offline indisponível', { status: 503, headers: { 'Content-Type': navigation ? 'text/html; charset=utf-8' : 'text/plain' } }); }
  })());
});
