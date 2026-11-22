# South Africa · December 2026 — trip page

A static trip planner page in the style of Wanderlog: itinerary, map, bookings, budget, files and a to-do list. It needs no build step and no API keys.

| File | Purpose |
|---|---|
| `index.html` | The whole app, with the trip data encrypted inside it. |
| `docs/*.enc` | Ticket PDFs, encrypted with the same password. |
| `encrypt.mjs` | Decrypts the data for editing and encrypts it again. |
| `sw.js` | Service worker that makes the page work offline. |
| `manifest.webmanifest`, `icon.svg` | Let you install the page to your home screen. |

## Password protection and users
The trip data and the ticket PDFs are **encrypted** (AES-256-GCM, key derived from the password with PBKDF2-SHA256, 600k iterations). Without the password, the page and its source show only two blank boxes titled "Notes". The list of names is inside the encrypted data too.
- Sign in with a **name** (Rohan or Chandani; the first few letters are enough) and the shared password.
- After signing in, the device remembers the key and the name, so it opens directly and works offline. The sidebar has **Switch to …** and **🔒 Lock**.
- Every change records **who** made it and **when**: added, moved or edited stops, saved places, expenses, checked-off to-dos and notes. The changes appear under **Recent changes** on the Overview and under **Activity** in Notes & to-do.
- To change the password, decrypt with the old one, then encrypt with the new one.

## Syncing between the two phones
There is no server, so each phone keeps its own changes. In Notes & to-do, tap **Export my changes** and send the file to the other phone; they tap **Import & merge**. Merging keeps everything either of you added, applies deletions, keeps the newest edit, and keeps the combined activity log.

## Editing
The trip details aren't readable in `index.html`. To edit them:
```sh
cd trips/south-africa
TRIP_PASSWORD='…' node encrypt.mjs decrypt   # writes trip.json and docs-src/*.pdf (both git-ignored)
# edit trip.json; add or remove PDFs in docs-src/ and list them in "docs"
TRIP_PASSWORD='…' node encrypt.mjs encrypt   # re-encrypts index.html and docs/*.enc together
```
Afterwards, delete `trip.json` and the `docs-src` folder, bump `VERSION` in `sw.js`, and commit. Never commit `trip.json` or `docs-src/`.

Fields in `trip.json`:
- `places`: map pins (`id: {name, lat, lng}`).
- `days[].stops[]`: `type`, `time`, `title`, `note`, `place`, `res`, `next` (travel-time connector), `flag`, `status` (`pending`/`idea`).
- `recommendations[]`: Claude's suggestions (`date`, `after`, `title`, `time`, `place`, `note`).
- `reservations[]` (each can have `emails: [{label, date, url}]`), `docs[]` (`{id, title, res}`; `id` is the PDF's file name in docs-src/), `users`, `emailOwner`, `budget[]` (`zar` or `usd`; points items add `points` + `unit` (+ `valueZar`); `status` is `paid`/`owed`/`tbd`), `todos`, `unbudgeted`, `tips`, `route`, `defaultRate`.

## Features
- **Wanderlog-style layout** (light mode): a sidebar with sections and a jump list of days, the itinerary in the middle and a live map on the right. On phones there are tabs at the top, a day strip, and a floating **Map** button.
- **Add stops:** type in "Add a place to Day N" to search OpenStreetMap (or your saved places) and add a stop with a map pin. Use ↑ ↓ to reorder any stop, and ✎ / 🗑 to edit or remove the ones you added.
- **Travel time between stops:** given times for booked legs, otherwise a straight-line estimate, each with a Directions link. Each day has a **↗ Route** button that opens the whole day as a multi-stop route in Google Maps.
- **Map:** numbered, colour-coded pins and a route line per day. A day picker dims the other days. ★ pins are saved places and ✨ pins are Claude's ideas.
- **Places to visit:** a wish list of saved places, each with an "Add to day…" option.
- **Reservations:** searchable cards with copyable confirmation numbers, tap-to-call phone numbers, links to every booking email, and the encrypted e-tickets (🎫), which open on the page and work offline.
- **Budget:** ZAR and USD with an editable exchange rate, a category donut, paid vs. owed, and an **Add expense** form.
- **Files:** PDFs and passes stored on the device only, available offline.
- **Notes & to-do**, an **activity log** of who changed what, and **Sync** (export, then import and merge).
- **Claude recommendations:** marked ✨ and can be hidden.
- Calendar (.ics) export, print layout, and offline mode (open the map and tap **Save offline**).

Things you add on the page (stops, places, expenses, notes) are saved in that browser. To make them permanent for everyone, copy them into `trip.json` and re-encrypt.

## URL options
- `?private=1` gives a share-safe view. It hides confirmation numbers, phone numbers and costs, and removes the Budget and Files tabs.
- `#itinerary`, `#budget`, `#reservations` and the other tab names deep-link to a tab.

## Deploy
Drop the folder on any static host. On this repo it is served at `https://rohanatstanford.github.io/trips/south-africa/`.
