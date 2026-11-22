// Encrypt / decrypt the trip data embedded in index.html.
//
//   Decrypt to an editable file:   TRIP_PASSWORD=... node encrypt.mjs decrypt   -> writes trip.json
//   Re-encrypt after editing:      TRIP_PASSWORD=... node encrypt.mjs encrypt   -> updates index.html
//
// trip.json is git-ignored. Never commit it: it holds the plaintext details.
// AES-256-GCM, key = PBKDF2-SHA256(password, random salt, 600k iterations). Matches the browser code.
import { webcrypto as crypto } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const HTML = join(dir, 'index.html'), JSONF = join(dir, 'trip.json');
const MARK = /\/\*ENC\*\/[\s\S]*?\/\*ENC\*\//;
const [mode] = process.argv.slice(2);
const pw = process.env.TRIP_PASSWORD;
if (!pw || !['encrypt', 'decrypt'].includes(mode)) { console.error('usage: TRIP_PASSWORD=... node encrypt.mjs encrypt|decrypt'); process.exit(1); }

const b64 = b => Buffer.from(b).toString('base64'), unb64 = s => Buffer.from(s, 'base64');
async function key(salt, iter) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
const html = readFileSync(HTML, 'utf8');
if (mode === 'encrypt') {
  const data = JSON.stringify(JSON.parse(readFileSync(JSONF, 'utf8')));
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12)), iter = 600000;
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(salt, iter), new TextEncoder().encode(data));
  const enc = JSON.stringify({ v: 1, iter, salt: b64(salt), iv: b64(iv), ct: b64(ct) });
  if (!MARK.test(html)) throw new Error('ENC marker not found in index.html');
  writeFileSync(HTML, html.replace(MARK, () => `/*ENC*/${enc}/*ENC*/`));
  console.log(`Encrypted ${data.length} bytes into index.html. Bump VERSION in sw.js before committing.`);
} else {
  const e = JSON.parse(html.match(MARK)[0].slice(7, -7));
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(e.iv) }, await key(unb64(e.salt), e.iter), unb64(e.ct))
    .catch(() => { console.error('Wrong password'); process.exit(1); });
  writeFileSync(JSONF, JSON.stringify(JSON.parse(new TextDecoder().decode(pt)), null, 2));
  console.log('Wrote trip.json; edit it, then run encrypt.');
}
