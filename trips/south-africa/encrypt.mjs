// Encrypt / decrypt the trip data (embedded in index.html) and ticket PDFs (docs/*.enc).
//
//   Decrypt to editable files:   TRIP_PASSWORD=... node encrypt.mjs decrypt   -> trip.json + docs-src/*.pdf
//   Re-encrypt after editing:     TRIP_PASSWORD=... node encrypt.mjs encrypt   -> index.html + docs/*.enc
//
// trip.json and docs-src/ are git-ignored. Never commit them: they hold the plaintext.
// AES-256-GCM, key = PBKDF2-SHA256(password, random salt, 600k iterations). Matches the browser code.
// Every PDF in docs-src/ is encrypted to docs/<name>.enc (12-byte IV followed by ciphertext) with the
// same key as the trip data, so both must be encrypted in the same run.
import { webcrypto as crypto } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const HTML = join(dir, 'index.html'), JSONF = join(dir, 'trip.json'), SRC = join(dir, 'docs-src'), OUT = join(dir, 'docs');
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
  const k = await key(salt, iter);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, new TextEncoder().encode(data));
  const enc = JSON.stringify({ v: 1, iter, salt: b64(salt), iv: b64(iv), ct: b64(ct) });
  if (!MARK.test(html)) throw new Error('ENC marker not found in index.html');
  writeFileSync(HTML, html.replace(MARK, () => `/*ENC*/${enc}/*ENC*/`));
  console.log(`Encrypted trip data (${data.length} bytes) into index.html.`);
  if (existsSync(SRC)) {
    rmSync(OUT, { recursive: true, force: true }); mkdirSync(OUT, { recursive: true });
    for (const f of readdirSync(SRC).filter(f => !f.startsWith('.'))) {
      const fiv = crypto.getRandomValues(new Uint8Array(12));
      const fct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: fiv }, k, readFileSync(join(SRC, f))));
      const out = new Uint8Array(12 + fct.length); out.set(fiv); out.set(fct, 12);
      writeFileSync(join(OUT, basename(f).replace(/\.[^.]+$/, '') + '.enc'), out);
      console.log(`Encrypted docs-src/${f} -> docs/${basename(f).replace(/\.[^.]+$/, '')}.enc`);
    }
  }
  console.log('Bump VERSION in sw.js before committing.');
} else {
  const e = JSON.parse(html.match(MARK)[0].slice(7, -7));
  const k = await key(unb64(e.salt), e.iter);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(e.iv) }, k, unb64(e.ct)).catch(() => { console.error('Wrong password'); process.exit(1); });
  writeFileSync(JSONF, JSON.stringify(JSON.parse(new TextDecoder().decode(pt)), null, 2));
  console.log('Wrote trip.json');
  if (existsSync(OUT)) {
    mkdirSync(SRC, { recursive: true });
    for (const f of readdirSync(OUT).filter(f => f.endsWith('.enc'))) {
      const buf = readFileSync(join(OUT, f));
      const doc = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: buf.subarray(0, 12) }, k, buf.subarray(12));
      writeFileSync(join(SRC, f.replace(/\.enc$/, '.pdf')), Buffer.from(doc));
      console.log(`Wrote docs-src/${f.replace(/\.enc$/, '.pdf')}`);
    }
  }
  console.log('Edit, then run encrypt.');
}
