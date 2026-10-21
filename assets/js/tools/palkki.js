// Yksiaukkoinen vapaasti tuettu palkki: tasainen kuorma q + pistekuorma P kohdassa a.
(function () {
  const $ = id => document.getElementById(id);
  const fmt = (v, d = 2) => Number.isFinite(v)
    ? v.toLocaleString("fi-FI", { minimumFractionDigits: d, maximumFractionDigits: d })
    : "–";

  // Laskenta SI-yksiköissä (N, m, Pa). Palauttaa näytteet palkin pituudelta.
  function solve({ L, q, P, a, E, I }) {
    const b = L - a;
    const RA = q * L / 2 + P * b / L;
    const RB = q * L / 2 + P * a / L;
    const EI = E * I;

    const n = 240;
    const xs = [];
    for (let i = 0; i <= n; i++) xs.push(L * i / n);
    if (P !== 0 && a > 0 && a < L) xs.push(a, a);
    xs.sort((x1, x2) => x1 - x2);

    const pts = xs.map((x, i) => {
      // Pistekuorman kohdalla leikkausvoima hyppää: ensimmäinen a-piste ennen, toinen jälkeen.
      const afterP = x > a || (x === a && xs[i - 1] === a);
      const V = RA - q * x - (afterP ? P : 0);
      const M = RA * x - q * x * x / 2 - (x > a ? P * (x - a) : 0);
      let d = q * x * (L ** 3 - 2 * L * x * x + x ** 3) / (24 * EI);
      if (P !== 0) {
        d += x <= a
          ? P * b * x * (L * L - b * b - x * x) / (6 * L * EI)
          : P * a * (L - x) * (2 * L * x - x * x - a * a) / (6 * L * EI);
      }
      return { x, V, M, d };
    });

    const absMax = key => pts.reduce((m, p) => Math.abs(p[key]) > Math.abs(m[key]) ? p : m, pts[0]);
    return { RA, RB, pts, Vmax: absMax("V"), Mmax: absMax("M"), dmax: absMax("d") };
  }

  // Piirtää kuvaajan; scale muuntaa SI-arvon näyttöyksikköön, invert piirtää positiiviset arvot alaspäin.
  function plot(svg, pts, key, scale, color, invert) {
    const W = 600, H = 130, pad = 34, mid = H / 2;
    const L = pts[pts.length - 1].x;
    const vals = pts.map(p => p[key] * scale);
    const maxAbs = Math.max(...vals.map(Math.abs)) || 1;
    const sx = x => pad + (x / L) * (W - 2 * pad);
    const sy = v => mid + (invert ? 1 : -1) * (v / maxAbs) * (mid - 18);

    const line = pts.map((p, i) => `${i ? "L" : "M"}${sx(p.x).toFixed(1)},${sy(vals[i]).toFixed(1)}`).join("");
    const area = `M${sx(0)},${mid}` + line.replace(/^M/, "L") + `L${sx(L)},${mid}Z`;

    const iMax = vals.reduce((bi, v, i) => Math.abs(v) > Math.abs(vals[bi]) ? i : bi, 0);
    const iMin = vals.reduce((bi, v, i) => (Math.sign(v) !== Math.sign(vals[iMax]) && Math.abs(v) > Math.abs(vals[bi] || 0)) ? i : bi, -1);
    const label = i => {
      const x = Math.min(Math.max(sx(pts[i].x), pad + 20), W - pad - 20);
      const y = sy(vals[i]);
      const above = y < mid ? y - 6 : y + 15;
      return `<text x="${x}" y="${above}" text-anchor="middle">${fmt(vals[i])}</text>`;
    };

    svg.innerHTML = `
      <path d="${area}" fill="${color}" fill-opacity="0.15"/>
      <path d="${line}" fill="none" stroke="${color}" stroke-width="2"/>
      <line x1="${sx(0)}" y1="${mid}" x2="${sx(L)}" y2="${mid}" stroke="currentColor" stroke-opacity="0.4"/>
      ${Math.abs(vals[iMax]) > 1e-9 ? label(iMax) : ""}
      ${iMin >= 0 && Math.abs(vals[iMin]) > 1e-9 ? label(iMin) : ""}`;
  }

  function drawLoad(svg, { L, q, P, a }) {
    const W = 600, pad = 34, y = 62;
    const sx = x => pad + (x / L) * (W - 2 * pad);
    const accent = "var(--accent)";
    let s = `<line x1="${sx(0)}" y1="${y}" x2="${sx(L)}" y2="${y}" stroke="currentColor" stroke-width="4"/>`;
    // Tuet
    s += `<path d="M${sx(0)},${y + 2} l-9,14 h18 z" fill="none" stroke="currentColor" stroke-width="1.5"/>`;
    s += `<path d="M${sx(L)},${y + 2} l-9,14 h18 z" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="${sx(L) - 12}" y1="${y + 20}" x2="${sx(L) + 12}" y2="${y + 20}" stroke="currentColor" stroke-width="1.5"/>`;
    if (q !== 0) {
      s += `<rect x="${sx(0)}" y="${y - 22}" width="${sx(L) - sx(0)}" height="16" fill="${accent}" fill-opacity="0.15" stroke="${accent}"/>`;
      s += `<text x="${(sx(0) + sx(L)) / 2}" y="${y - 27}" text-anchor="middle">q = ${fmt(q / 1e3)} kN/m</text>`;
    }
    if (P !== 0 && a >= 0 && a <= L) {
      const px = sx(a);
      s += `<line x1="${px}" y1="${y - 52}" x2="${px}" y2="${y - 6}" stroke="var(--chart-m)" stroke-width="2"/><path d="M${px},${y - 4} l-5,-9 h10 z" fill="var(--chart-m)"/>`;
      s += `<text x="${Math.min(px + 6, W - 70)}" y="${y - 44}">P = ${fmt(P / 1e3)} kN</text>`;
    }
    s += `<text x="${(sx(0) + sx(L)) / 2}" y="${y + 26}" text-anchor="middle">L = ${fmt(L)} m</text>`;
    svg.innerHTML = s;
  }

  function read() {
    const num = id => parseFloat($(id).value.replace(",", "."));
    return {
      L: num("L"),
      q: num("q") * 1e3,
      P: num("P") * 1e3 || 0,
      a: num("a") || 0,
      E: num("E") * 1e9,
      I: num("I") * 1e-6,
      limit: num("limit")
    };
  }

  function validate(v) {
    if (!(v.L > 0)) return "Jännevälin on oltava positiivinen.";
    if (!Number.isFinite(v.q)) return "Anna tasainen kuorma (voi olla 0).";
    if (v.P !== 0 && (v.a < 0 || v.a > v.L)) return "Pistekuorman paikan on oltava välillä 0 … L.";
    if (!(v.E > 0)) return "Kimmomoduulin on oltava positiivinen.";
    if (!(v.I > 0)) return "Jäyhyysmomentin on oltava positiivinen.";
    if (!(v.limit > 0)) return "Taipumarajan on oltava positiivinen.";
    return "";
  }

  function update() {
    const v = read();
    const err = validate(v);
    $("error").textContent = err;
    if (err) return;

    const r = solve(v);
    const dmm = Math.abs(r.dmax.d) * 1e3;
    const dAllow = v.L / v.limit * 1e3;
    const ok = dmm <= dAllow;
    const ratio = dmm > 0 ? v.L * 1e3 / dmm : Infinity;

    const item = (label, value, unit, extra = "") =>
      `<div class="result"><div class="label">${label}</div><div class="value">${value} <small>${unit}</small></div>${extra}</div>`;
    $("results").innerHTML =
      item("Tukireaktio R<sub>A</sub>", fmt(r.RA / 1e3), "kN") +
      item("Tukireaktio R<sub>B</sub>", fmt(r.RB / 1e3), "kN") +
      item("V<sub>max</sub>", fmt(Math.abs(r.Vmax.V) / 1e3), "kN") +
      item("M<sub>max</sub>", fmt(r.Mmax.M / 1e3), "kNm", `<div class="label">x = ${fmt(r.Mmax.x)} m</div>`) +
      item("δ<sub>max</sub>", fmt(dmm, 1), "mm", `<div class="label">L/${Number.isFinite(ratio) ? Math.round(ratio) : "∞"}</div>`) +
      item("Taipumaraja L/" + v.limit, fmt(dAllow, 1), "mm",
        `<div class="label" style="color:${ok ? "var(--chart-d)" : "var(--chart-m)"};font-weight:600">${ok ? "OK" : "Ylittyy"} (${fmt(dmm / dAllow * 100, 0)} %)</div>`);

    drawLoad($("d-load"), v);
    plot($("d-V"), r.pts, "V", 1e-3, "var(--chart-v)", false);
    plot($("d-M"), r.pts, "M", 1e-3, "var(--chart-m)", true);
    plot($("d-d"), r.pts, "d", 1e3, "var(--chart-d)", true);
  }

  $("material").addEventListener("change", e => {
    if (e.target.value) $("E").value = e.target.value;
    update();
  });
  $("E").addEventListener("input", () => {
    const m = $("material");
    m.value = [...m.options].some(o => o.value === $("E").value) ? $("E").value : "";
  });
  $("beam-form").addEventListener("input", update);
  $("beam-form").addEventListener("submit", e => e.preventDefault());
  update();
})();
