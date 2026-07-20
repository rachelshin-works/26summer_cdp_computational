(function () {
  const tabs = document.querySelectorAll("[data-data-tab]");
  const sections = {
    relational: document.getElementById("relational"),
    density: document.getElementById("density"),
  };

  function activate(name) {
    Object.keys(sections).forEach((key) => {
      if (!sections[key]) return;
      sections[key].hidden = key !== name;
    });

    tabs.forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.dataTab === name);
    });

    document.dispatchEvent(
      new CustomEvent("data-tab-change", { detail: name })
    );

    if (name === "density") {
      window.dispatchEvent(new Event("resize"));
    }
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", (e) => {
      e.preventDefault();
      activate(tab.dataset.dataTab);
      history.replaceState(null, "", "#" + tab.dataset.dataTab);
    });
  });

  const hash = (location.hash || "#relational").replace("#", "");
  activate(sections[hash] ? hash : "relational");
})();
