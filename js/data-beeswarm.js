(function () {
  const CSV_PATH = "assets/data/Seating_Locations_20260319.csv";
  const RADIUS = 3.5;
  const BOROS = [
    "Manhattan",
    "Bronx",
    "Brooklyn",
    "Queens",
    "Staten Island",
  ];

  // Colorblind-friendly palette (Okabe–Ito + extensions)
  const CATEGORY_COLORS = {
    AAR: "#E69F00",
    BID: "#56B4E9",
    "Bus Route": "#009E73",
    "Community Health Centers": "#F0E442",
    General: "#0072B2",
    "Health Care Facilities": "#D55E00",
    "Municipal Facilities": "#CC79A7",
    Plaza: "#44AA99",
    SBS: "#882255",
    Other: "#999999",
    "Backed 1.0": "#56B4E9",
    "Backed 2.0": "#0072B2",
    "Backless 1.0": "#E69F00",
    "Backless 2.0": "#D55E00",
    "Leaning Bar": "#009E73",
    "Worlds Fair": "#CC79A7",
    Unknown: "#666666",
  };

  const wrap = document.getElementById("beeswarmWrap");
  const canvas = document.getElementById("beeswarmCanvas");
  const ctx = canvas.getContext("2d");
  const tooltip = document.getElementById("beeswarmTooltip");
  const legendEl = document.getElementById("categoryLegend");
  const statusEl = document.getElementById("dataStatus");
  const resetBtn = document.getElementById("resetView");
  const selectAllBtn = document.getElementById("selectAllCats");
  const clearBtn = document.getElementById("clearCats");
  const dateMinInput = document.getElementById("dateMin");
  const dateMaxInput = document.getElementById("dateMax");
  const dateStartLabel = document.getElementById("dateStartLabel");
  const dateEndLabel = document.getElementById("dateEndLabel");
  const dateRangeFill = document.getElementById("dateRangeFill");
  const resetDatesBtn = document.getElementById("resetDates");

  let allData = [];
  let nodes = [];
  let categories = [];
  let activeCategories = new Set();
  let colorField = "category";
  let drillBoro = null;
  let simulation = null;
  let xScale = null;
  let lanes = [];
  let width = 0;
  let height = 520;
  let margin = { top: 24, right: 24, bottom: 56, left: 24 };
  let hovered = null;
  let dateExtent = [0, 0];
  let dateFilter = [0, 0];
  let dateTicks = [];

  function parseInstallDate(raw) {
    const s = (raw || "").trim();
    if (!s) return null;
    const parsed = d3.timeParse("%m/%d/%Y")(s) || d3.timeParse("%Y-%m-%d")(s);
    if (!parsed) return null;
    // treat placeholder / invalid early dates as missing
    if (parsed.getFullYear() < 2000) return null;
    return parsed;
  }

  function formatDate(d) {
    return d3.timeFormat("%b %Y")(d);
  }

  function normalizeSubtype(raw) {
    const s = (raw || "").trim().toUpperCase();
    if (s === "BACKED 1.0") return "Backed 1.0";
    if (s === "BACKED 2.0") return "Backed 2.0";
    if (s === "BACKLESS 1.0") return "Backless 1.0";
    if (s === "BACKLESS 2.0") return "Backless 2.0";
    if (s === "LEANING BAR") return "Leaning Bar";
    if (s === "WORLDS FAIR") return "Worlds Fair";
    if (!s) return "Unknown";
    return raw.trim();
  }

  function normalizeCategory(raw) {
    const s = (raw || "").trim();
    if (!s) return "Other";
    return s;
  }

  function colorFor(value) {
    return CATEGORY_COLORS[value] || "#AAAAAA";
  }

  function parseRow(d, i) {
    const category = normalizeCategory(d.Category);
    const subtype = normalizeSubtype(d.Asset_Subtype);
    const installedRaw = d["Installation Date"] || "—";
    const installedDate = parseInstallDate(d["Installation Date"]);
    return {
      id: d.SiteID || d.Asset_ID || String(i),
      boro: d.BoroName,
      category: category,
      subtype: subtype,
      nearest: d.Nearest_Add || "—",
      installed: installedRaw,
      installedDate: installedDate,
      lat: +d.Latitude,
      lng: +d.Longitude,
      r: RADIUS,
    };
  }

  function detectColorField(rows) {
    const nonOther = rows.filter((d) => d.category && d.category !== "Other");
    // CSV Category is mostly empty — use Asset_Subtype for color/filter
    if (nonOther.length < rows.length * 0.05) {
      return "subtype";
    }
    return "category";
  }

  function groupValue(d) {
    return colorField === "subtype" ? d.subtype : d.category;
  }

  function filteredData() {
    const [minT, maxT] = dateFilter;
    return allData.filter((d) => {
      if (drillBoro && d.boro !== drillBoro) return false;
      if (!activeCategories.has(groupValue(d))) return false;
      if (!d.installedDate) return true;
      const t = d.installedDate.getTime();
      return t >= minT && t <= maxT;
    });
  }

  function currentLanes() {
    if (drillBoro) {
      return categories.filter((c) => activeCategories.has(c));
    }
    return BOROS.filter((b) => allData.some((d) => d.boro === b));
  }

  function laneKey(d) {
    return drillBoro ? groupValue(d) : d.boro;
  }

  function buildLegend() {
    legendEl.innerHTML = "";
    const label = document.createElement("span");
    label.className = "data-legend-label";
    label.textContent =
      colorField === "subtype" ? "subtype" : "category";
    legendEl.appendChild(label);

    categories.forEach((cat) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "data-legend-item" + (activeCategories.has(cat) ? " active" : "");
      btn.dataset.category = cat;
      btn.innerHTML =
        '<span class="data-swatch" style="background:' +
        colorFor(cat) +
        '"></span>' +
        cat;
      btn.addEventListener("click", () => {
        if (activeCategories.has(cat)) {
          activeCategories.delete(cat);
        } else {
          activeCategories.add(cat);
        }
        btn.classList.toggle("active", activeCategories.has(cat));
        restartSimulation();
      });
      legendEl.appendChild(btn);
    });
  }

  function resize() {
    width = wrap.clientWidth || 800;
    height = Math.max(420, Math.min(640, Math.round(width * 0.55)));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    restartSimulation();
  }

  function restartSimulation() {
    if (simulation) {
      simulation.stop();
      simulation = null;
    }

    const data = filteredData();
    lanes = currentLanes();
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    xScale = d3
      .scaleBand()
      .domain(lanes)
      .range([margin.left, margin.left + innerW])
      .paddingInner(0.12)
      .paddingOuter(0.04);

    nodes = data.map((d) => {
      const key = laneKey(d);
      const band = xScale(key);
      const cx = band != null ? band + xScale.bandwidth() / 2 : width / 2;
      return Object.assign({}, d, {
        x: cx + (Math.random() - 0.5) * 20,
        y: margin.top + innerH / 2 + (Math.random() - 0.5) * 40,
        vx: 0,
        vy: 0,
        targetX: cx,
      });
    });

    const counts = d3.rollup(
      nodes,
      (v) => v.length,
      (d) => laneKey(d)
    );

    statusEl.textContent =
      nodes.length.toLocaleString() +
      " seats" +
      (drillBoro ? " · " + drillBoro : "") +
      " · " +
      formatDate(new Date(dateFilter[0])) +
      " – " +
      formatDate(new Date(dateFilter[1])) +
      (colorField === "subtype"
        ? " · colored by asset subtype (category empty in source)"
        : "");

    resetBtn.hidden = !drillBoro;

    simulation = d3
      .forceSimulation(nodes)
      .force(
        "x",
        d3
          .forceX((d) => d.targetX)
          .strength(0.45)
      )
      .force(
        "y",
        d3.forceY(margin.top + innerH / 2).strength(0.08)
      )
      .force("collide", d3.forceCollide(RADIUS + 1).iterations(2))
      .alpha(1)
      .alphaDecay(0.012)
      .velocityDecay(0.35)
      .on("tick", () => draw(counts));

    draw(counts);
  }

  function draw(counts) {
    ctx.clearRect(0, 0, width, height);

    // lane guides
    lanes.forEach((lane) => {
      const x = xScale(lane);
      if (x == null) return;
      const bw = xScale.bandwidth();
      ctx.fillStyle = "rgba(255,255,255,0.03)";
      ctx.fillRect(x, margin.top, bw, height - margin.top - margin.bottom);

      ctx.fillStyle = "#999999";
      ctx.font = '11px "Datatype", Helvetica, Arial, sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const count = counts.get(lane) || 0;
      const labelY = height - margin.bottom + 12;
      ctx.fillText(lane, x + bw / 2, labelY);
      ctx.fillStyle = "#666666";
      ctx.fillText(count.toLocaleString(), x + bw / 2, labelY + 16);
    });

    // seats
    for (let i = 0; i < nodes.length; i++) {
      const d = nodes[i];
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = colorFor(groupValue(d));
      ctx.globalAlpha = hovered && hovered.id === d.id ? 1 : 0.9;
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (hovered) {
      ctx.beginPath();
      ctx.arc(hovered.x, hovered.y, hovered.r + 1.5, 0, Math.PI * 2);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  function findNode(mx, my) {
    let best = null;
    let bestDist = RADIUS + 3;
    for (let i = 0; i < nodes.length; i++) {
      const d = nodes[i];
      const dx = d.x - mx;
      const dy = d.y - my;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < bestDist) {
        bestDist = dist;
        best = d;
      }
    }
    return best;
  }

  function findLane(mx) {
    for (let i = 0; i < lanes.length; i++) {
      const lane = lanes[i];
      const x = xScale(lane);
      if (x == null) continue;
      if (mx >= x && mx <= x + xScale.bandwidth()) return lane;
    }
    return null;
  }

  function showTooltip(d, event) {
    tooltip.hidden = false;
    tooltip.innerHTML =
      "<strong>" +
      escapeHtml(d.nearest) +
      "</strong><br>" +
      "category: " +
      escapeHtml(d.category) +
      "<br>" +
      "subtype: " +
      escapeHtml(d.subtype) +
      "<br>" +
      "installed: " +
      escapeHtml(d.installed);

    const rect = wrap.getBoundingClientRect();
    const left = Math.min(
      event.clientX - rect.left + 12,
      rect.width - 220
    );
    const top = Math.max(8, event.clientY - rect.top - 12);
    tooltip.style.left = left + "px";
    tooltip.style.top = top + "px";
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  canvas.addEventListener("mousemove", (event) => {
    const rect = canvas.getBoundingClientRect();
    const mx = event.clientX - rect.left;
    const my = event.clientY - rect.top;
    const next = findNode(mx, my);
    if (next !== hovered) {
      hovered = next;
      const counts = d3.rollup(
        nodes,
        (v) => v.length,
        (d) => laneKey(d)
      );
      draw(counts);
    }
    if (hovered) {
      showTooltip(hovered, event);
      canvas.style.cursor = "pointer";
    } else {
      tooltip.hidden = true;
      const lane = !drillBoro ? findLane(mx) : null;
      canvas.style.cursor = lane ? "pointer" : "default";
    }
  });

  canvas.addEventListener("mouseleave", () => {
    hovered = null;
    tooltip.hidden = true;
    canvas.style.cursor = "default";
    const counts = d3.rollup(
      nodes,
      (v) => v.length,
      (d) => laneKey(d)
    );
    draw(counts);
  });

  canvas.addEventListener("click", (event) => {
    if (hovered) return;
    if (drillBoro) return;

    const rect = canvas.getBoundingClientRect();
    const mx = event.clientX - rect.left;
    const my = event.clientY - rect.top;

    // only accept clicks in lower label band or mid lane area
    const lane = findLane(mx);
    if (!lane) return;
    if (my < margin.top) return;

    drillBoro = lane;
    restartSimulation();
  });

  function updateDateBarUI() {
    const [minT, maxT] = dateExtent;
    const span = maxT - minT || 1;
    const startPct = ((dateFilter[0] - minT) / span) * 100;
    const endPct = ((dateFilter[1] - minT) / span) * 100;

    dateStartLabel.textContent = formatDate(new Date(dateFilter[0]));
    dateEndLabel.textContent = formatDate(new Date(dateFilter[1]));
    dateRangeFill.style.left = startPct + "%";
    dateRangeFill.style.width = Math.max(0, endPct - startPct) + "%";

    dateMinInput.value = String(dateFilter[0]);
    dateMaxInput.value = String(dateFilter[1]);
  }

  function setupDateBar(rows) {
    const dated = rows
      .map((d) => d.installedDate)
      .filter(Boolean)
      .sort((a, b) => a - b);

    if (dated.length === 0) {
      document.getElementById("dateBar").hidden = true;
      return;
    }

    const minDate = dated[0];
    const maxDate = dated[dated.length - 1];

    // monthly ticks across the extent for smoother scrubbing
    dateTicks = d3.timeMonth.range(
      d3.timeMonth.floor(minDate),
      d3.timeMonth.offset(d3.timeMonth.ceil(maxDate), 1)
    );
    if (dateTicks.length < 2) {
      dateTicks = [minDate, maxDate];
    }

    const tickTimes = dateTicks.map((d) => d.getTime());
    const minTick = tickTimes[0];
    const maxTick = tickTimes[tickTimes.length - 1];
    dateExtent = [minTick, maxTick];
    dateFilter = [minTick, maxTick];

    [dateMinInput, dateMaxInput].forEach((input) => {
      input.min = String(minTick);
      input.max = String(maxTick);
      input.step = String(24 * 60 * 60 * 1000);
    });

    updateDateBarUI();
  }

  function onDateInput(which) {
    let minV = +dateMinInput.value;
    let maxV = +dateMaxInput.value;

    if (which === "min" && minV > maxV) minV = maxV;
    if (which === "max" && maxV < minV) maxV = minV;

    dateFilter = [minV, maxV];
    updateDateBarUI();
    restartSimulation();
  }

  dateMinInput.addEventListener("input", () => onDateInput("min"));
  dateMaxInput.addEventListener("input", () => onDateInput("max"));

  resetDatesBtn.addEventListener("click", () => {
    dateFilter = dateExtent.slice();
    updateDateBarUI();
    restartSimulation();
  });

  resetBtn.addEventListener("click", () => {
    drillBoro = null;
    restartSimulation();
  });

  selectAllBtn.addEventListener("click", () => {
    categories.forEach((c) => activeCategories.add(c));
    buildLegend();
    restartSimulation();
  });

  clearBtn.addEventListener("click", () => {
    activeCategories.clear();
    buildLegend();
    restartSimulation();
  });

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });

  d3.csv(CSV_PATH)
    .then((rows) => {
      allData = rows
        .map(parseRow)
        .filter((d) => BOROS.includes(d.boro) && !Number.isNaN(d.lat));

      colorField = detectColorField(allData);
      categories = Array.from(
        new Set(allData.map(groupValue))
      ).sort((a, b) => a.localeCompare(b));
      activeCategories = new Set(categories);

      setupDateBar(allData);
      buildLegend();
      resize();
    })
    .catch((err) => {
      console.error(err);
      statusEl.textContent = "failed to load seating data";
    });
})();
