// Offline support: precache the app shell, runtime-cache CDN assets and map tiles.
const VERSION = 'sa-trip-v5';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION && k !== 'sa-tiles').map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.endsWith('tile.openstreetmap.org')) {          // tiles: cache-first
    e.respondWith(caches.open('sa-tiles').then(async c => {
      const hit = await c.match(req, { ignoreSearch: true }); if (hit) return hit;
      try { const r = await fetch(req); c.put(req, r.clone()); return r; } catch { return new Response('', { status: 504 }); }
    }));
    return;
  }
  // everything else: network-first for the page (fresh edits), stale-while-revalidate for assets
  const isPage = req.mode === 'navigate';
  e.respondWith(caches.open(VERSION).then(async c => {
    const hit = await c.match(req, { ignoreSearch: isPage });
    const net = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) c.put(isPage ? './index.html' : req, r.clone()); return r; });
    if (isPage) return net.catch(() => hit || c.match('./index.html'));
    return hit || net.catch(() => new Response('', { status: 504 }));
  }));
});
