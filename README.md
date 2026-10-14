# CoalTrack

Coal plant map for Environmental Law & Policy Center P2P+RE. Created by Pouyan Hatami.

The site runs on GitHub Pages. `index.html` is the page, `style.css` handles appearance, `app.js` handles filters and the map, and `data/plants.csv` contains the records.

To change the map, edit a file and commit it to the same GitHub repository. The public link stays the same. To update plant records, replace `data/plants.csv` with a CSV using the same column headings.

Plant statuses and capacities come from the May 2025 dataset, including facilities listed as retired. The state capacity chart is **not** a measure of currently operating capacity. The map groups related statuses for display, while plant details retain the original status text.

The basemaps come from OpenStreetMap, Esri and OpenTopoMap. These external services may change their access policies. The JavaScript map library (Leaflet) is also loaded from an external CDN.

For local testing, run `python -m http.server 8000` inside this folder and open http://localhost:8000. Double-clicking `index.html` can block loading the CSV.

Basemap opacity: open the Opacity control in the top toolbar. The slider defaults to 70% and adjusts the background map only. Switching between Street, Satellite, and Terrain retains the chosen value.
