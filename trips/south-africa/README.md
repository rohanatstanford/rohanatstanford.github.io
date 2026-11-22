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
- Itinerary with collapsible days, numbered pins and a route line per day. Click a stop to pan the map to it. Each stop has a Directions link to Google Maps.
- Reservations you can search and filter. Tap a confirmation number to copy it, and tap a phone number to call.
- **Files tab:** attach PDFs, boarding passes or screenshots to any booking. They are stored in the browser's IndexedDB **on that device only**. Nothing is uploaded, and the files are available offline. Add them on each phone or laptop you travel with.
- Budget in ZAR and USD with an editable exchange rate, a donut chart by category, a paid vs. owed bar and every line item.
- To-do list and notes, saved on the device.
- **Claude recommendations:** optional suggestions with descriptions, marked with a purple ✨ badge and dashed border (star pins on the map). Edit them in `TRIP.recommendations`, or hide them with the toggle at the top of the Itinerary.
- Export to calendar (`.ics`), light and dark mode, and a print layout.
- **Offline:** open the page once while online, then tap **Save map offline**. This stores map tiles around every stop. On iPhone, use Share → Add to Home Screen.

## URL options
- `?private=1` gives a share-safe view. It hides confirmation numbers, phone numbers and costs, and removes the Budget and Files tabs.
- `#itinerary`, `#budget`, `#reservations` and the other tab names deep-link to a tab.

## Deploy
Drop the folder on any static host. On this repo it is served at `https://rohanatstanford.github.io/trips/south-africa/`.
