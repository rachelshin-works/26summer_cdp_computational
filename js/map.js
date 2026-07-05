(function () {
  const MANHATTAN_BOUNDS = [
    [40.700, -74.020],
    [40.882, -73.907],
  ];

  const map = L.map("map", {
    zoomControl: false,
    maxBounds: MANHATTAN_BOUNDS,
    maxBoundsViscosity: 1.0,
    minZoom: 11,
    maxZoom: 18,
  });

  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 19,
  }).addTo(map);

  map.fitBounds(MANHATTAN_BOUNDS);

  const panel = document.getElementById("detailPanel");
  const overlay = document.getElementById("panelOverlay");
  const labelsToggle = document.getElementById("labelsToggle");

  let benches = [];
  let markers = {};
  let labelMarkers = {};
  let labelsVisible = false;
  let activeBenchId = null;

  function getBenchFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("bench");
  }

  function setBenchInUrl(id) {
    const url = new URL(window.location.href);
    if (id) {
      url.searchParams.set("bench", id);
    } else {
      url.searchParams.delete("bench");
    }
    history.replaceState(null, "", url);
  }

  function openPanel(bench) {
    activeBenchId = bench.id;
    document.getElementById("panelId").textContent = bench.id;
    document.getElementById("panelName").textContent = bench.name;
    document.getElementById("panelCoords").textContent =
      bench.lat.toFixed(4) + ", " + bench.lng.toFixed(4);
    document.getElementById("panelCategory").textContent = bench.category;
    document.getElementById("panelNotes").textContent = bench.notes || "";
    document.getElementById("panelArchiveLink").href =
      "archive.html#" + bench.id;

    panel.classList.add("open");
    panel.setAttribute("aria-hidden", "false");
    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden", "false");

    Object.values(markers).forEach(function (el) {
      el.classList.remove("active");
    });
    if (markers[bench.id]) {
      markers[bench.id].classList.add("active");
    }

    setBenchInUrl(bench.id);
  }

  function closePanel() {
    activeBenchId = null;
    panel.classList.remove("open");
    panel.setAttribute("aria-hidden", "true");
    overlay.classList.remove("open");
    overlay.setAttribute("aria-hidden", "true");

    Object.values(markers).forEach(function (el) {
      el.classList.remove("active");
    });

    setBenchInUrl(null);
  }

  function createMarker(bench) {
    const icon = L.divIcon({
      className: "",
      html: '<div class="bench-marker" role="button" tabindex="0" aria-label="' + bench.name + '"></div>',
      iconSize: [8, 8],
      iconAnchor: [4, 4],
    });

    const marker = L.marker([bench.lat, bench.lng], { icon: icon }).addTo(map);

    marker.on("click", function () {
      openPanel(bench);
    });

    const el = marker.getElement();
    if (el) {
      const dot = el.querySelector(".bench-marker");
      if (dot) {
        markers[bench.id] = dot;
        dot.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openPanel(bench);
          }
        });
      }
    }

    const labelIcon = L.divIcon({
      className: "",
      html: '<div class="bench-label">' + bench.id + " " + bench.name + "</div>",
      iconSize: null,
      iconAnchor: [-4, 4],
    });

    labelMarkers[bench.id] = L.marker([bench.lat, bench.lng], {
      icon: labelIcon,
      interactive: false,
    });
  }

  function toggleLabels() {
    labelsVisible = !labelsVisible;
    labelsToggle.classList.toggle("active", labelsVisible);
    labelsToggle.setAttribute("aria-pressed", String(labelsVisible));

    Object.values(labelMarkers).forEach(function (labelMarker) {
      if (labelsVisible) {
        labelMarker.addTo(map);
      } else {
        map.removeLayer(labelMarker);
      }
    });
  }

  document.getElementById("zoomIn").addEventListener("click", function () {
    map.zoomIn();
  });

  document.getElementById("zoomOut").addEventListener("click", function () {
    map.zoomOut();
  });

  labelsToggle.addEventListener("click", toggleLabels);

  document.getElementById("panelClose").addEventListener("click", closePanel);
  overlay.addEventListener("click", closePanel);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closePanel();
    }
  });

  fetch("data/benches.json")
    .then(function (res) {
      return res.json();
    })
    .then(function (data) {
      benches = data.benches;
      benches.forEach(createMarker);

      const urlBench = getBenchFromUrl();
      if (urlBench) {
        const bench = benches.find(function (b) {
          return b.id === urlBench;
        });
        if (bench) {
          map.setView([bench.lat, bench.lng], 15);
          openPanel(bench);
        }
      }
    })
    .catch(function (err) {
      console.error("Failed to load bench data:", err);
    });
})();
