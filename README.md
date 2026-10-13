# CoalTrack — Midwest Energy Map

A static, editable Leaflet map intended for embedding in ArcGIS StoryMaps.

## Files
- `index.html` — page layout
- `style.css` — visuals and mobile styles
- `app.js` — filters, marker mapping, table, popups, chart, basemap definitions
- `data/plants.csv` — **your actual editable map data**, created from `Midwest_Coalplants.xlsx` (May 2025). Contains 160 plants and selected source fields.

## Edit the data
Open `data/plants.csv` in Excel. You may add/change plant rows. Preserve column headings; save as **CSV UTF-8**, retaining the same filename. Reload the web page. No code changes or build command needed. Map popups display original status descriptions and relevant notes.

## Run locally
Because the app loads `data/plants.csv`, start a simple local server in this directory, e.g., `python -m http.server 8000`, and open `http://localhost:8000`. Opening index.html directly as a local file is not supported by most browsers.

## Publish and embed
Upload the **contents** of this folder to a static site host such as GitHub Pages or Cloudflare Pages. Once public, embed the website URL in ArcGIS StoryMaps. Edit the existing host's files later; URL stays unchanged. The StoryMaps iframe must allow HTTPS and the hosting site must permit embedding.

## Status logic (mutually exclusive)
- **Operating**: exactly operating.
- **Operating — Conversion**: conversion mentioned, no retirement mentioned.
- **Operating — Retirement**: retirement mentioned, no conversion or natural-gas construction mentioned.
- **Operating — Mixed Transition**: both conversion and retirement mentioned; also includes *Operating with partial retirements and construction (natural gas)*. This exception is not represented as a completed conversion.
- **Retired**: exactly retired.
- **Needs review**: uncategorized status; map never guesses. Original status always preserved.

Original dataset includes 160 facilities. This visualization uses May 2025 research labels without claiming they reflect today's operational status.

## Map backgrounds
Default: public OpenStreetMap raster tiles. Alternate: Esri imagery and OpenTopoMap terrain. These are third-party tile providers, so availability and usage policies are external dependencies. Avoid implying these sources are guaranteed forever. If you anticipate significant website traffic, switch to a suitable paid tile service or self-host tiles; do not bulk-download or heavily load free public tile servers.

## Dependencies
Leaflet 1.9.4 is loaded from unpkg CDN (no API key). The static app itself has no framework, database or backend. If desired, Leaflet files can be vendor-copied and served locally later.
