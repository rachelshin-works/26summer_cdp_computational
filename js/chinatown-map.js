(function () {
  /*
   * Based on CDW Geospatial Structures / mapBox_Sketch_03.js
   * External GeoJSON load → source/layers → fitBounds → interaction
   * Dataset: assets/data/chinatown.geojson + nearby DOT seating points
   */

  const GEOJSON_PATH = "assets/data/chinatown.geojson";
  const SEATING_CSV_PATH = "assets/data/Seating_Locations_20260319.csv";

  const SUBTYPE_COLORS = {
    "Backed 1.0": "#56B4E9",
    "Backed 2.0": "#0072B2",
    "Backless 1.0": "#E69F00",
    "Backless 2.0": "#D55E00",
    "Leaning Bar": "#009E73",
    "Worlds Fair": "#CC79A7",
    Unknown: "#999999",
  };

  const token = window.MAPBOX_ACCESS_TOKEN || "";
  const metaEl = document.getElementById("chinatownMeta");

  function showTokenError(message) {
    metaEl.textContent = message;
    const errorDiv = document.createElement("div");
    errorDiv.className = "chinatown-error";
    errorDiv.innerHTML =
      "<strong>map error</strong><br>" + message.replace(/</g, "&lt;");
    document.querySelector(".chinatown-map-container").appendChild(errorDiv);
  }

  if (!token || token.includes("xxxxxxxx")) {
    showTokenError(
      "Missing Mapbox token. Open js/mapbox-token.js and paste your pk. token."
    );
    return;
  }

  mapboxgl.accessToken = token;

  const map = new mapboxgl.Map({
    container: "chinatown-map",
    style: "mapbox://styles/mapbox/dark-v11",
    center: [-74.001, 40.7185],
    zoom: 13.5,
    pitch: 0,
    bearing: -12,
    antialias: true,
  });

  map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
  map.addControl(new mapboxgl.ScaleControl({ maxWidth: 100, unit: "metric" }), "bottom-left");

  let bounds = null;
  let seatingCollection = null;

  function normalizeSubtype(raw) {
    const s = String(raw || "").trim().toUpperCase();
    if (s === "BACKED 1.0") return "Backed 1.0";
    if (s === "BACKED 2.0") return "Backed 2.0";
    if (s === "BACKLESS 1.0") return "Backless 1.0";
    if (s === "BACKLESS 2.0") return "Backless 2.0";
    if (s === "LEANING BAR") return "Leaning Bar";
    if (s === "WORLDS FAIR") return "Worlds Fair";
    return s ? raw.trim() : "Unknown";
  }

  function extendBoundsFromGeometry(b, geometry) {
    if (!geometry) return;
    const type = geometry.type;
    const coords = geometry.coordinates;

    if (type === "Point") {
      b.extend(coords);
    } else if (type === "LineString") {
      coords.forEach((c) => b.extend(c));
    } else if (type === "Polygon") {
      coords[0].forEach((c) => b.extend(c));
    } else if (type === "MultiPolygon") {
      coords.forEach((poly) => poly[0].forEach((c) => b.extend(c)));
    } else if (type === "MultiLineString") {
      coords.forEach((line) => line.forEach((c) => b.extend(c)));
    }
  }

  function lineToPolygonFeature(feature) {
    const coords = feature.geometry.coordinates.slice();
    const first = coords[0];
    const last = coords[coords.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      coords.push(first.slice());
    }
    return {
      type: "Feature",
      properties: Object.assign(
        {
          name: "Chinatown",
          label: "Chinatown",
        },
        feature.properties || {}
      ),
      geometry: {
        type: "Polygon",
        coordinates: [coords],
      },
    };
  }

  function parseCsv(text) {
    const rows = [];
    const lines = text.trim().split(/\r?\n/);
    if (!lines.length) return rows;
    const headers = lines[0].match(/("([^"]*)"|[^,]+)/g).map((h) =>
      h.replace(/^"|"$/g, "")
    );

    for (let i = 1; i < lines.length; i++) {
      const cols = [];
      let cur = "";
      let inQuotes = false;
      const line = lines[i];
      for (let j = 0; j < line.length; j++) {
        const ch = line[j];
        if (ch === '"') {
          inQuotes = !inQuotes;
        } else if (ch === "," && !inQuotes) {
          cols.push(cur);
          cur = "";
        } else {
          cur += ch;
        }
      }
      cols.push(cur);
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = (cols[idx] || "").replace(/^"|"$/g, "");
      });
      rows.push(obj);
    }
    return rows;
  }

  function pointInBBox(lon, lat, bbox, pad) {
    return (
      lon >= bbox[0] - pad &&
      lon <= bbox[2] + pad &&
      lat >= bbox[1] - pad &&
      lat <= bbox[3] + pad
    );
  }

  function buildSeatingGeoJSON(rows, bbox) {
    const features = [];
    rows.forEach((row, i) => {
      const lat = parseFloat(row.Latitude);
      const lon = parseFloat(row.Longitude);
      if (Number.isNaN(lat) || Number.isNaN(lon)) return;
      if (!pointInBBox(lon, lat, bbox, 0.0015)) return;

      features.push({
        type: "Feature",
        properties: {
          id: row.SiteID || row.Asset_ID || String(i),
          name: row.Nearest_Add || "Unknown",
          street: row.On_Street || "Unknown",
          subtype: normalizeSubtype(row.Asset_Subtype),
          category: (row.Category || "").trim() || "Unknown",
          installed: row["Installation Date"] || "—",
        },
        geometry: {
          type: "Point",
          coordinates: [lon, lat],
        },
      });
    });

    return { type: "FeatureCollection", features: features };
  }

  function showError(message) {
    metaEl.textContent = message;
    const errorDiv = document.createElement("div");
    errorDiv.className = "chinatown-error";
    errorDiv.innerHTML =
      "<strong>map error</strong><br>" + message.replace(/</g, "&lt;");
    document.querySelector(".chinatown-map-container").appendChild(errorDiv);
  }

  map.on("load", () => {
    Promise.all([
      fetch(GEOJSON_PATH).then((r) => {
        if (!r.ok) throw new Error("Could not load chinatown.geojson");
        return r.json();
      }),
      fetch(SEATING_CSV_PATH).then((r) => {
        if (!r.ok) throw new Error("Could not load seating csv");
        return r.text();
      }),
    ])
      .then(([geojson, csvText]) => {
        const boundaryFeature = geojson.features[0];
        if (!boundaryFeature) throw new Error("No features in chinatown.geojson");

        const polygonFeature = lineToPolygonFeature(boundaryFeature);
        const boundaryCollection = {
          type: "FeatureCollection",
          features: [
            Object.assign({}, boundaryFeature, {
              properties: {
                name: "Chinatown",
                label: "Chinatown boundary",
              },
            }),
          ],
        };
        const fillCollection = {
          type: "FeatureCollection",
          features: [polygonFeature],
        };

        bounds = new mapboxgl.LngLatBounds();
        extendBoundsFromGeometry(bounds, boundaryFeature.geometry);

        const bbox = [
          bounds.getWest(),
          bounds.getSouth(),
          bounds.getEast(),
          bounds.getNorth(),
        ];

        const rows = parseCsv(csvText);
        seatingCollection = buildSeatingGeoJSON(rows, bbox);

        map.addSource("chinatown-fill", {
          type: "geojson",
          data: fillCollection,
        });
        map.addSource("chinatown-boundary", {
          type: "geojson",
          data: boundaryCollection,
        });
        map.addSource("chinatown-seating", {
          type: "geojson",
          data: seatingCollection,
        });

        // Soft area wash
        map.addLayer({
          id: "chinatown-fill",
          type: "fill",
          source: "chinatown-fill",
          paint: {
            "fill-color": "#ffffff",
            "fill-opacity": 0.06,
          },
        });

        // Outer glow line
        map.addLayer({
          id: "chinatown-glow",
          type: "line",
          source: "chinatown-boundary",
          paint: {
            "line-color": "#ffffff",
            "line-width": 10,
            "line-opacity": 0.12,
            "line-blur": 4,
          },
        });

        // Crisp boundary
        map.addLayer({
          id: "chinatown-line",
          type: "line",
          source: "chinatown-boundary",
          paint: {
            "line-color": "#ffffff",
            "line-width": 1.5,
            "line-opacity": 0.95,
          },
        });

        // Label
        map.addLayer({
          id: "chinatown-label",
          type: "symbol",
          source: "chinatown-fill",
          layout: {
            "text-field": ["get", "name"],
            "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"],
            "text-size": 14,
            "text-transform": "lowercase",
            "text-letter-spacing": 0.08,
            "text-anchor": "center",
          },
          paint: {
            "text-color": "#ffffff",
            "text-halo-color": "#000000",
            "text-halo-width": 1.25,
            "text-opacity": 0.9,
          },
        });

        // Seating points
        map.addLayer({
          id: "seating-points",
          type: "circle",
          source: "chinatown-seating",
          paint: {
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              12,
              3,
              16,
              6,
            ],
            "circle-color": [
              "match",
              ["get", "subtype"],
              "Backed 1.0",
              SUBTYPE_COLORS["Backed 1.0"],
              "Backed 2.0",
              SUBTYPE_COLORS["Backed 2.0"],
              "Backless 1.0",
              SUBTYPE_COLORS["Backless 1.0"],
              "Backless 2.0",
              SUBTYPE_COLORS["Backless 2.0"],
              "Leaning Bar",
              SUBTYPE_COLORS["Leaning Bar"],
              "Worlds Fair",
              SUBTYPE_COLORS["Worlds Fair"],
              SUBTYPE_COLORS.Unknown,
            ],
            "circle-stroke-color": "#000000",
            "circle-stroke-width": 1,
            "circle-opacity": 0.95,
          },
        });

        map.fitBounds(bounds, {
          padding: { top: 80, bottom: 80, left: 80, right: 340 },
          duration: 1800,
          maxZoom: 15,
        });

        metaEl.textContent =
          seatingCollection.features.length +
          " seats inside / near chinatown boundary";

        // Hover
        map.on("mouseenter", "chinatown-fill", () => {
          map.getCanvas().style.cursor = "pointer";
          map.setPaintProperty("chinatown-fill", "fill-opacity", 0.12);
        });
        map.on("mouseleave", "chinatown-fill", () => {
          map.getCanvas().style.cursor = "";
          map.setPaintProperty("chinatown-fill", "fill-opacity", 0.06);
        });

        map.on("mouseenter", "seating-points", () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "seating-points", () => {
          map.getCanvas().style.cursor = "";
        });

        // Click boundary
        map.on("click", "chinatown-fill", (e) => {
          new mapboxgl.Popup({ className: "chinatown-popup", maxWidth: "240px" })
            .setLngLat(e.lngLat)
            .setHTML(
              "<div class='popup-kicker'>boundary</div>" +
                "<strong>chinatown</strong>" +
                "<p>line geometry from chinatown.geojson, closed as a polygon wash for reading the edge of the neighborhood against manhattan’s seating infrastructure.</p>"
            )
            .addTo(map);
        });

        // Click seats
        map.on("click", "seating-points", (e) => {
          const f = e.features[0];
          const p = f.properties;
          new mapboxgl.Popup({ className: "chinatown-popup", maxWidth: "260px" })
            .setLngLat(f.geometry.coordinates)
            .setHTML(
              "<div class='popup-kicker'>seat</div>" +
                "<strong>" +
                escapeHtml(p.name) +
                "</strong>" +
                "<p>street: " +
                escapeHtml(p.street) +
                "<br>subtype: " +
                escapeHtml(p.subtype) +
                "<br>installed: " +
                escapeHtml(p.installed) +
                "</p>"
            )
            .addTo(map);
        });

        // Search by street
        document.getElementById("searchFeature").addEventListener("input", (e) => {
          const term = e.target.value.trim().toLowerCase();
          if (!term) {
            map.setFilter("seating-points", null);
            return;
          }
          map.setFilter("seating-points", [
            "in",
            term,
            ["downcase", ["get", "street"]],
          ]);
        });

        document.getElementById("resetFilters").addEventListener("click", () => {
          document.getElementById("searchFeature").value = "";
          map.setFilter("seating-points", null);
        });

        document.getElementById("fitToData").addEventListener("click", () => {
          map.fitBounds(bounds, {
            padding: { top: 80, bottom: 80, left: 80, right: 340 },
            duration: 1500,
            maxZoom: 15,
          });
        });

        document.addEventListener("keydown", (e) => {
          if (e.key === "f" || e.key === "F") {
            e.preventDefault();
            document.getElementById("fitToData").click();
          }
          if (e.key === "r" || e.key === "R") {
            e.preventDefault();
            document.getElementById("resetFilters").click();
          }
          if (e.key === "Escape") {
            document.getElementById("searchFeature").value = "";
            map.setFilter("seating-points", null);
          }
        });
      })
      .catch((err) => {
        console.error(err);
        showError(err.message || String(err));
      });
  });

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
})();
