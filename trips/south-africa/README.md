# South Africa · December 2026 — trip page

A static trip planner page in the style of Wanderlog: itinerary, map, bookings, budget, files and a to-do list. It needs no build step and no API keys.

| File | Purpose |
|---|---|
| `index.html` | The whole app. All trip data is in `const TRIP = {…}` at the top of the `<script>`. |
| `sw.js` | Service worker that makes the page work offline. |
| `manifest.webmanifest`, `icon.svg` | Let you install the page to your home screen. |

## Password protection
The trip data is **encrypted** (AES-256-GCM, key derived from the password with PBKDF2-SHA256, 600k iterations) and stored inside `index.html`. Without the password, the page and its source show only a blank passcode box titled "Notes". There is no server, so encryption is the only real protection on a static host.
- After unlocking, the device remembers the key, so it opens directly and works offline. **🔒 Lock** forgets it.
- To change the password, decrypt with the old one, then encrypt with the new one.

## Editing
The trip details are no longer in `index.html` in readable form. To edit them:
```sh
cd trips/south-africa
TRIP_PASSWORD='…' node encrypt.mjs decrypt   # writes trip.json (git-ignored)
# edit trip.json
TRIP_PASSWORD='…' node encrypt.mjs encrypt   # writes the encrypted data back into index.html
rm trip.json
```
Then bump `VERSION` in `sw.js` and commit. Never commit `trip.json`.

Fields in `trip.json`:
- `places`: map pins (`id: {name, lat, lng}`).
- `days[].stops[]`: `type`, `time`, `title`, `note`, `place`, `res`, `next` (travel-time connector), `flag`, `status` (`pending`/`idea`).
- `recommendations[]`: Claude's suggestions (`date`, `after`, `title`, `time`, `place`, `note`).
- `reservations[]`, `budget[]` (`zar` or `usd`; points items add `points` + `unit` (+ `valueZar`); `status` is `paid`/`owed`/`tbd`), `todos`, `unbudgeted`, `tips`, `route`, `defaultRate`.

## Features
- **Wanderlog-style layout** (light mode): a sidebar with sections and a jump list of days, the itinerary in the middle and a live map on the right. On phones there are tabs at the top, a day strip, and a floating **Map** button.
- **Add stops:** type in "Add a place to Day N" to search OpenStreetMap (or your saved places) and add a stop with a map pin. Use ↑ ↓ to reorder any stop, and ✎ / 🗑 to edit or remove the ones you added.
- **Travel time between stops:** given times for booked legs, otherwise a straight-line estimate, each with a Directions link. Each day has a **↗ Route** button that opens the whole day as a multi-stop route in Google Maps.
- **Map:** numbered, colour-coded pins and a route line per day. A day picker dims the other days. ★ pins are saved places and ✨ pins are Claude's ideas.
- **Places to visit:** a wish list of saved places, each with an "Add to day…" option.
- **Reservations:** searchable cards with copyable confirmation numbers, tap-to-call phone numbers and file attachments.
- **Budget:** ZAR and USD with an editable exchange rate, a category donut, paid vs. owed, and an **Add expense** form.
- **Files:** PDFs and passes stored on the device only, available offline.
- **Notes & to-do**, plus **Sync**: export your changes as a file and import it on the other phone.
- **Claude recommendations:** marked ✨ and can be hidden.
- Calendar (.ics) export, print layout, and offline mode (open the map and tap **Save offline**).

Things you add on the page (stops, places, expenses, notes) are saved in that browser. To make them permanent for everyone, copy them into `trip.json` and re-encrypt.

## URL options
- `?private=1` gives a share-safe view. It hides confirmation numbers, phone numbers and costs, and removes the Budget and Files tabs.
- `#itinerary`, `#budget`, `#reservations` and the other tab names deep-link to a tab.

## Deploy
Drop the folder on any static host. On this repo it is served at `https://rohanatstanford.github.io/trips/south-africa/`.
