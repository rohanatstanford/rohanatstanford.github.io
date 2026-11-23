// Trip sync server: a Cloudflare Worker backed by D1.
//
// The server never sees trip data. Each device encrypts its whole change set with the trip's
// sync key (AES-256-GCM, done in the browser) and stores it here as an opaque blob. Other devices
// download the blobs, decrypt them locally and merge.
//
//   PUT /v1/<trip>/state/<device>   body {iv, ct, at, by}   store this device's encrypted state
//   GET /v1/<trip>/state?since=<ms>                         encrypted states changed after <ms>
//
// <trip> is a hash derived from the sync key, so it reveals nothing. Every request carries
// X-Trip-Auth = SHA-256(sync key); the first write to a trip records SHA-256(that token) and every
// later request must match it ("trust on first use"), so only people with the password can read or write.

const MAX_BODY = 512 * 1024;
const ID = /^[a-f0-9]{16,64}$/;
const DEV = /^[A-Za-z0-9_-]{6,64}$/;

const cors = origin => ({
  'Access-Control-Allow-Origin': origin || '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Trip-Auth',
  'Access-Control-Max-Age': '86400',
  'Vary': 'Origin'
});
const json = (data, status, origin) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors(origin) } });
const sha256 = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('');

async function authorize(env, trip, token, create) {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return false;
  const h = await sha256('auth:' + token);
  const row = await env.DB.prepare('SELECT token_hash FROM trips WHERE trip = ?').bind(trip).first();
  if (row) return row.token_hash === h;
  if (!create) return 'empty';
  await env.DB.prepare('INSERT OR IGNORE INTO trips (trip, token_hash, created) VALUES (?, ?, ?)').bind(trip, h, Date.now()).run();
  const again = await env.DB.prepare('SELECT token_hash FROM trips WHERE trip = ?').bind(trip).first();
  return again?.token_hash === h;
}

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin');
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
    const url = new URL(req.url);
    if (url.pathname === '/' || url.pathname === '/health') return json({ ok: true }, 200, origin);

    const m = url.pathname.match(/^\/v1\/([^/]+)\/state(?:\/([^/]+))?$/);
    if (!m || !ID.test(m[1])) return json({ error: 'not found' }, 404, origin);
    const [, trip, device] = m;
    const token = req.headers.get('X-Trip-Auth');

    if (req.method === 'GET' && !device) {
      const ok = await authorize(env, trip, token, false);
      if (ok === 'empty') return json({ states: [], now: Date.now() }, 200, origin);
      if (!ok) return json({ error: 'forbidden' }, 403, origin);
      const since = Number(url.searchParams.get('since')) || 0;
      const { results } = await env.DB.prepare('SELECT device, at, by_user AS by, iv, ct, updated FROM states WHERE trip = ? AND updated > ? ORDER BY updated').bind(trip, since).all();
      return json({ states: results, now: Date.now() }, 200, origin);
    }

    if (req.method === 'PUT' && device) {
      if (!DEV.test(device)) return json({ error: 'bad device' }, 400, origin);
      const len = Number(req.headers.get('Content-Length') || 0);
      if (len > MAX_BODY) return json({ error: 'too large' }, 413, origin);
      const text = await req.text();
      if (text.length > MAX_BODY) return json({ error: 'too large' }, 413, origin);
      let body; try { body = JSON.parse(text); } catch { return json({ error: 'bad json' }, 400, origin); }
      if (typeof body.iv !== 'string' || typeof body.ct !== 'string' || body.iv.length > 64) return json({ error: 'bad body' }, 400, origin);
      if (!(await authorize(env, trip, token, true))) return json({ error: 'forbidden' }, 403, origin);
      const updated = Date.now();
      await env.DB.prepare(`INSERT INTO states (trip, device, at, by_user, iv, ct, updated) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (trip, device) DO UPDATE SET at = excluded.at, by_user = excluded.by_user, iv = excluded.iv, ct = excluded.ct, updated = excluded.updated`)
        .bind(trip, device, Number(body.at) || updated, String(body.by || '').slice(0, 40), body.iv, body.ct, updated).run();
      return json({ ok: true, updated }, 200, origin);
    }
    return json({ error: 'method not allowed' }, 405, origin);
  }
};
