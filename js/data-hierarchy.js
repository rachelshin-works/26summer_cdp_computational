(function () {
  const CSV_PATH = "assets/data/Seating_Locations_20260319.csv";

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
    Unknown: "#666666",
    "Backed 1.0": "#56B4E9",
    "Backed 2.0": "#0072B2",
    "Backless 1.0": "#E69F00",
    "Backless 2.0": "#D55E00",
    "Leaning Bar": "#009E73",
    "Worlds Fair": "#CC79A7",
  };

  const wrap = document.getElementById("packWrap");
  const svg = d3.select("#packSvg");
  const tooltip = document.getElementById("packTooltip");
  const statusEl = document.getElementById("packStatus");
  const breadcrumbEl = document.getElementById("packBreadcrumb");
  const legendEl = document.getElementById("packLegend");
  const backBtn = document.getElementById("packBack");
  const resetBtn = document.getElementById("packReset");
  const selectAllBtn = document.getElementById("packSelectAll");
  const clearBtn = document.getElementById("packClear");

  let allData = [];
  let filterValues = [];
  let activeFilters = new Set();
  let root = null;
  let focus = null;
  let view = null;
  let g = null;
  let node = null;
  let label = null;
  let diameter = 640;
  let colorField = "subtype";

  function blankToUnknown(value) {
    const s = (value == null ? "" : String(value)).trim();
    return s || "Unknown";
  }

  function normalizeSubtype(raw) {
    const s = blankToUnknown(raw).toUpperCase();
    if (s === "BACKED 1.0") return "Backed 1.0";
    if (s === "BACKED 2.0") return "Backed 2.0";
    if (s === "BACKLESS 1.0") return "Backless 1.0";
    if (s === "BACKLESS 2.0") return "Backless 2.0";
    if (s === "LEANING BAR") return "Leaning Bar";
    if (s === "WORLDS FAIR") return "Worlds Fair";
    if (s === "UNKNOWN") return "Unknown";
    return blankToUnknown(raw);
  }

  function colorFor(value) {
    return CATEGORY_COLORS[value] || "#AAAAAA";
  }

  function groupValue(d) {
    return colorField === "subtype" ? d.subtype : d.category;
  }

  function parseRow(d, i) {
    const category = blankToUnknown(d.Category);
    const subtype = normalizeSubtype(d.Asset_Subtype);
    return {
      assetId: blankToUnknown(d.Asset_ID || d.SiteID || "seat-" + i),
      siteId: blankToUnknown(d.SiteID),
      boro: blankToUnknown(d.BoroName),
      nta: blankToUnknown(d.NTAName),
      street: blankToUnknown(d.On_Street),
      category: category === "Unknown" ? "Unknown" : category,
      subtype: subtype,
      nearest: blankToUnknown(d.Nearest_Add),
      fromStreet: blankToUnknown(d.From_Street),
      toStreet: blankToUnknown(d.To_Street),
      lat: +d.Latitude,
      lng: +d.Longitude,
    };
  }

  function detectColorField(rows) {
    const known = rows.filter(
      (d) => d.category && d.category !== "Unknown" && d.category !== "Other"
    );
    if (known.length < rows.length * 0.05) return "subtype";
    return "category";
  }

  function filteredRows() {
    return allData.filter((d) => activeFilters.has(groupValue(d)));
  }

  function mapToChildren(map) {
    return Array.from(map, ([key, value]) => {
      if (value instanceof Map) {
        return {
          name: blankToUnknown(key),
          children: mapToChildren(value),
        };
      }
      return {
        name: blankToUnknown(key),
        children: value.map((d) => ({
          name: d.assetId,
          value: 1,
          seat: d,
        })),
      };
    });
  }

  function buildHierarchy(rows) {
    if (!rows.length) {
      return d3.hierarchy({ name: "NYC", children: [] }).sum(() => 0);
    }

    const nested = d3.group(
      rows,
      (d) => d.boro,
      (d) => d.nta,
      (d) => d.street
    );

    return d3
      .hierarchy({ name: "NYC", children: mapToChildren(nested) })
      .sum((d) => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));
  }

  function rebuild() {
    const rows = filteredRows();
    root = buildHierarchy(rows);
    statusEl.textContent =
      rows.length.toLocaleString() +
      " seats · pack hierarchy (boro → nta → street → asset)" +
      (colorField === "subtype"
        ? " · filter by asset subtype"
        : " · filter by category");
    render();
  }

  function buildLegend() {
    legendEl.innerHTML = "";
    const labelSpan = document.createElement("span");
    labelSpan.className = "data-legend-label";
    labelSpan.textContent = colorField === "subtype" ? "subtype" : "category";
    legendEl.appendChild(labelSpan);

    filterValues.forEach((value) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "data-legend-item" + (activeFilters.has(value) ? " active" : "");
      btn.dataset.value = value;
      btn.innerHTML =
        '<span class="data-swatch" style="background:' +
        colorFor(value) +
        '"></span>' +
        value;

      btn.addEventListener("click", () => {
        if (activeFilters.has(value)) {
          activeFilters.delete(value);
        } else {
          activeFilters.add(value);
        }
        btn.classList.toggle("active", activeFilters.has(value));
        rebuild();
      });

      legendEl.appendChild(btn);
    });
  }

  function nodeFill(d) {
    if (d.children) return "transparent";
    const seat = d.data.seat;
    if (!seat) return "#666666";
    return colorFor(groupValue(seat));
  }

  function nodeStroke(d) {
    if (!d.children) return "rgba(255,255,255,0.15)";
    if (d.depth === 0) return "#ffffff";
    if (d.depth === 1) return "#888888";
    if (d.depth === 2) return "#555555";
    return "#333333";
  }

  function pathLabels(d) {
    return d
      .ancestors()
      .reverse()
      .map((n) => n.data.name)
      .join(" / ");
  }

  function updateBreadcrumb(d) {
    breadcrumbEl.textContent = pathLabels(d);
    backBtn.hidden = !d || d.depth === 0;
  }

  function zoomTo(v, focusNode) {
    if (!node || !label) return;
    const k = diameter / v[2];
    view = v;

    label.attr("transform", (d) => {
      const x = (d.x - v[0]) * k;
      const y = (d.y - v[1]) * k;
      return "translate(" + x + "," + y + ")";
    });

    node.attr("transform", (d) => {
      const x = (d.x - v[0]) * k;
      const y = (d.y - v[1]) * k;
      return "translate(" + x + "," + y + ")";
    });

    node.attr("r", (d) => Math.max(0, d.r * k));

    label
      .style("fill-opacity", (d) => (d.parent === focusNode ? 1 : 0))
      .style("display", (d) => (d.parent === focusNode ? "inline" : "none"));
  }

  function zoom(event, d) {
    if (!d || focus === d || !view) return;
    focus = d;
    updateBreadcrumb(d);

    svg
      .transition()
      .duration(750)
      .tween("zoom", () => {
        const i = d3.interpolateZoom(view, [focus.x, focus.y, focus.r * 2]);
        return (t) => zoomTo(i(t), focus);
      });
  }

  function showTooltip(event, d) {
    if (!d.data.seat) {
      tooltip.hidden = true;
      return;
    }
    const s = d.data.seat;
    tooltip.hidden = false;
    tooltip.innerHTML =
      "<strong>" +
      escapeHtml(s.nearest) +
      "</strong><br>" +
      "category: " +
      escapeHtml(s.category) +
      "<br>" +
      "subtype: " +
      escapeHtml(s.subtype) +
      "<br>" +
      "street: " +
      escapeHtml(s.street);

    const rect = wrap.getBoundingClientRect();
    const left = Math.min(event.clientX - rect.left + 12, rect.width - 220);
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

  function render() {
    if (!root) return;

    const size = Math.max(320, Math.min(wrap.clientWidth || 640, 900));
    diameter = size;

    svg
      .attr(
        "viewBox",
        [-diameter / 2, -diameter / 2, diameter, diameter].join(" ")
      )
      .attr("width", "100%")
      .attr("height", size)
      .attr("preserveAspectRatio", "xMidYMid meet");

    svg.selectAll("*").remove();
    tooltip.hidden = true;

    const hasLeaves = root.leaves().length > 0;
    if (!hasLeaves) {
      focus = null;
      view = null;
      node = null;
      label = null;
      breadcrumbEl.textContent = "NYC / no seats for selected subtypes";
      backBtn.hidden = true;

      svg
        .append("text")
        .attr("class", "pack-label")
        .attr("text-anchor", "middle")
        .attr("dy", "0.3em")
        .text("no seats for selected subtypes");
      return;
    }

    const packed = d3
      .pack()
      .size([diameter, diameter])
      .padding(3)(
        root
          .copy()
          .sum((d) => d.value || 0)
          .sort((a, b) => (b.value || 0) - (a.value || 0))
      );

    focus = packed;
    updateBreadcrumb(focus);

    g = svg.append("g");

    node = g
      .selectAll("circle")
      .data(packed.descendants())
      .join("circle")
      .attr("fill", nodeFill)
      .attr("fill-opacity", (d) => (d.children ? 0 : 0.92))
      .attr("stroke", nodeStroke)
      .attr("stroke-width", (d) => (d.depth === 0 ? 1.5 : 1))
      .attr("pointer-events", (d) => (d.depth === 0 ? "none" : null))
      .on("mouseover", function (event, d) {
        d3.select(this).attr("stroke", "#ffffff");
        if (!d.children) showTooltip(event, d);
      })
      .on("mousemove", function (event, d) {
        if (!d.children) showTooltip(event, d);
      })
      .on("mouseout", function (event, d) {
        d3.select(this).attr("stroke", nodeStroke(d));
        tooltip.hidden = true;
      })
      .on("click", (event, d) => {
        event.stopPropagation();
        if (d.children) {
          zoom(event, d);
        } else if (d.parent) {
          zoom(event, d.parent);
        }
      });

    label = g
      .selectAll("text")
      .data(packed.descendants().filter((d) => d.depth > 0 && d.depth < 3))
      .join("text")
      .attr("class", "pack-label")
      .attr("pointer-events", "none")
      .attr("text-anchor", "middle")
      .attr("dy", "0.3em")
      .text((d) => {
        const name = d.data.name || "";
        return name.length > 18 ? name.slice(0, 16) + "…" : name;
      });

    svg.on("click", (event) => {
      zoom(event, packed);
    });

    zoomTo([focus.x, focus.y, focus.r * 2], focus);
  }

  function goBack() {
    if (!focus || !focus.parent) return;
    zoom({ stopPropagation() {} }, focus.parent);
  }

  backBtn.addEventListener("click", goBack);

  resetBtn.addEventListener("click", () => {
    if (!focus) return;
    let top = focus;
    while (top && top.parent) top = top.parent;
    if (top) zoom({ stopPropagation() {} }, top);
  });

  selectAllBtn.addEventListener("click", () => {
    activeFilters = new Set(filterValues);
    buildLegend();
    rebuild();
  });

  clearBtn.addEventListener("click", () => {
    activeFilters.clear();
    buildLegend();
    rebuild();
  });

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (root) render();
    }, 150);
  });

  document.addEventListener("data-tab-change", (e) => {
    if (e.detail === "relational" && root) {
      requestAnimationFrame(render);
    }
  });

  d3.csv(CSV_PATH)
    .then((rows) => {
      allData = rows.map(parseRow).filter((d) => d.boro !== "Unknown");
      colorField = detectColorField(allData);
      filterValues = Array.from(new Set(allData.map(groupValue))).sort((a, b) =>
        a.localeCompare(b)
      );
      activeFilters = new Set(filterValues);
      buildLegend();
      rebuild();
    })
    .catch((err) => {
      console.error(err);
      statusEl.textContent = "failed to load seating data";
    });
})();
