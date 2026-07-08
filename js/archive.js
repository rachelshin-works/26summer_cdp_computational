(function () {
  const listEl = document.getElementById("archiveList");
  const emptyEl = document.getElementById("archiveEmpty");
  const searchEl = document.getElementById("archiveSearch");
  const filtersEl = document.getElementById("categoryFilters");

  let benches = [];
  let activeCategory = "all";
  let searchQuery = "";

  function renderList() {
    const filtered = benches.filter(function (bench) {
      const matchesCategory =
        activeCategory === "all" || bench.category === activeCategory;
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        !query ||
        bench.id.includes(query) ||
        bench.name.toLowerCase().includes(query) ||
        bench.category.toLowerCase().includes(query) ||
        (bench.notes && bench.notes.toLowerCase().includes(query));
      return matchesCategory && matchesSearch;
    });

    listEl.innerHTML = "";

    filtered.forEach(function (bench) {
      const li = document.createElement("li");
      li.className = "archive-item";
      li.setAttribute("role", "link");
      li.setAttribute("tabindex", "0");
      li.setAttribute("aria-label", bench.id + " " + bench.name);

      li.innerHTML =
        '<span class="archive-item-id">' +
        bench.id +
        "</span>" +
        '<span class="archive-item-name">' +
        bench.name +
        "</span>" +
        '<span class="archive-item-coords">' +
        bench.lat.toFixed(4) +
        ", " +
        bench.lng.toFixed(4) +
        "</span>";

      function navigate() {
        window.location.href = "maps.html?bench=" + bench.id;
      }

      li.addEventListener("click", navigate);
      li.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate();
        }
      });

      listEl.appendChild(li);
    });

    emptyEl.hidden = filtered.length > 0;
  }

  searchEl.addEventListener("input", function () {
    searchQuery = searchEl.value.trim();
    renderList();
  });

  filtersEl.addEventListener("click", function (e) {
    const link = e.target.closest("a[data-category]");
    if (!link) return;
    e.preventDefault();

    activeCategory = link.dataset.category;
    filtersEl.querySelectorAll("a").forEach(function (a) {
      a.classList.toggle("active", a.dataset.category === activeCategory);
    });
    renderList();
  });

  fetch("data/benches.json")
    .then(function (res) {
      return res.json();
    })
    .then(function (data) {
      benches = data.benches.sort(function (a, b) {
        return b.id.localeCompare(a.id);
      });
      renderList();

      const hash = window.location.hash.replace("#", "");
      if (hash) {
        const item = listEl.querySelector('[aria-label^="' + hash + ' "]');
        if (item) {
          item.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    })
    .catch(function (err) {
      console.error("Failed to load bench data:", err);
      emptyEl.hidden = false;
      emptyEl.textContent = "failed to load bench data";
    });
})();
