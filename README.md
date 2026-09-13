# Costco Helper 🛒

🔗 **Live app:** https://delaneystevens.github.io/CostcoHelper/index.html

A mobile-friendly web app for tracking what everyone spends on a shared
Costco run. Snap a photo of a price tag as you shop, log the price, and
attribute it to one friend or split it between everyone — running totals
update live so nobody has to do math at checkout.

## Features

- **Start a trip** by adding the names of everyone shopping together.
- **Snap a photo** of a price tag or barcode (opens your phone's camera)
  and attach it to the item you're logging.
- **Enter the price** and choose how to split it:
  - Everyone on the trip
  - A custom subset of people
  - One specific person
- **Live running totals** per person and for the whole trip, visible the
  whole time you're shopping.
- **Item list** with photo thumbnails, prices, and who each item is for —
  edit mistakes by deleting and re-adding.
- **End a trip** to see a final summary, then find it later under
  **Past Trips**.
- Works as an installable **PWA** (Add to Home Screen) and caches itself
  for spotty in-store wifi.
- All data is stored locally on your device (`localStorage`) — no account,
  no server, no data leaves your phone.

## Running it

This is a static site with no build step. Serve the folder with any static
file server, e.g.:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000` on your phone or computer. For camera
capture to work well, use a real device (desktop browsers will fall back to
a file picker).

To install it as an app: open the site in your phone's browser and choose
**Add to Home Screen** (iOS Safari) or **Install app** (Android Chrome).
