// Yhteinen ylä- ja alatunniste kaikille sivuille.
// Sivun <body data-root="../../"> kertoo suhteellisen polun sivuston juureen.
(function () {
  const root = document.body.dataset.root || "./";
  const page = document.body.dataset.page || "";

  const nav = [
    { id: "etusivu", label: "Etusivu", href: root },
    { id: "tyokalut", label: "Työkalut", href: root + "tyokalut/" },
    { id: "yhteystiedot", label: "Yhteystiedot", href: root + "#yhteystiedot" }
  ];

  const header = document.querySelector("[data-site-header]");
  if (header) {
    header.className = "site-header";
    header.innerHTML = `
      <div class="container header-inner">
        <a class="brand" href="${root}">
          <svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
            <path d="M3 24h26M6 24l5-14h10l5 14M11 10l5 14 5-14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>
          </svg>
          <span>Lastutec</span>
        </a>
        <nav aria-label="Päävalikko">
          <ul>
            ${nav.map(n => `<li><a href="${n.href}"${n.id === page ? ' aria-current="page"' : ""}>${n.label}</a></li>`).join("")}
          </ul>
        </nav>
      </div>`;
  }

  const footer = document.querySelector("[data-site-footer]");
  if (footer) {
    footer.className = "site-footer";
    footer.innerHTML = `
      <div class="container footer-inner">
        <span>© ${new Date().getFullYear()} Lastutec</span>
        <span>Rakennesuunnittelu ja laskentatyökalut</span>
      </div>`;
  }

  // Työkalukortit
  document.querySelectorAll("[data-tool-list]").forEach(el => {
    const tools = window.LASTUTEC_TOOLS || [];
    const limit = parseInt(el.dataset.limit || "0", 10);
    const list = limit ? tools.slice(0, limit) : tools;
    el.innerHTML = list.map(t => {
      const ready = t.status === "valmis" && t.path;
      const tag = ready ? "a" : "div";
      const href = ready ? ` href="${root}${t.path}"` : "";
      return `
        <${tag} class="tool-card${ready ? "" : " is-disabled"}"${href}>
          <span class="tool-category">${t.category}</span>
          <h3>${t.name}</h3>
          <p>${t.description}</p>
          <span class="tool-status">${ready ? "Avaa työkalu →" : "Tulossa"}</span>
        </${tag}>`;
    }).join("");
  });
})();
