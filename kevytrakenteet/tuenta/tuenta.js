/* Lastutec – ei-kantavien Kahi-väliseinien tuentatarve
   Kapasiteettikäyrät: Weber, Kahi-rakenteiden suunnitteluohje 4-33 (15.9.2026), luku 3.5, kuvat 1–4,
   vaakakuorma qd = 0,32 kN/m². Käyrät on digitoitu kuvista; pisteet [L (m), H (m)], H laskevassa järjestyksessä.
   u = raudoittamaton, r = raudoitettu (1 ø8 harkko / 2 ø8 tiili joka toisessa vaakasaumassa).
   blue = kaikki reunat tuettu, green = ylä-, ala- ja toinen sivureuna, red = ala- ja molemmat sivureunat (yläpää vapaa). */
(function (g) {
  'use strict';
  var U130 = { red: [[5.21, 10.4], [5.21, 7.9], [7.11, 2.62], [15.5, 1.95]], blue: [[3.91, 10.4], [3.91, 9.05], [5.2, 6.45], [15.5, 3.92]], green: [[0, 9.1], [2.6, 9.1], [7.75, 3.9], [15.5, 3.9]] };
  var U85 = { red: [[3.42, 6.8], [3.42, 5.15], [4.67, 1.7], [10.1, 1.27]], blue: [[2.57, 6.8], [2.57, 6.0], [3.4, 4.2], [10.08, 2.55]], green: [[0, 5.95], [1.8, 5.95], [5.05, 2.55], [10.1, 2.55]] };
  var CURVES = {
    harkko130: { fig: 'Kuva 1', name: 'Kahi-harkkoseinä 130 mm', reinf: '1 ø8 joka toisessa vaakasaumassa', Hmax: 11, u: U130,
      r: { red: [[10.05, 8], [10.24, 7], [10.5, 6], [10.84, 5], [11.55, 4], [12.33, 3], [12.85, 2.2]], blue: [[11.44, 8], [11.95, 7], [12.85, 6], [14.6, 5], [16.8, 4], [19.73, 3], [20, 2.9]], green: [[3.42, 8], [3.76, 7], [4.2, 6.3], [5.06, 5.5], [5.77, 5], [6.9, 4.5], [8.4, 4], [10, 3.75], [12.6, 3.55]] } },
    harkko85: { fig: 'Kuva 2', name: 'Kahi-harkkoseinä 85 mm', reinf: '1 ø8 joka toisessa vaakasaumassa', Hmax: 8, u: U85,
      r: { red: [[7.47, 8], [7.55, 7], [7.66, 6], [7.82, 5], [8.02, 4], [8.6, 3], [9.15, 2]], blue: [[8, 8], [8.21, 7], [8.5, 6], [8.95, 5], [9.93, 4], [11.56, 3], [12.5, 2.5], [13.45, 2]], green: [[2.12, 8], [2.28, 7], [2.47, 6], [2.62, 5.2], [3.03, 4.5], [3.57, 4], [5.3, 3], [8.1, 2.5], [10.55, 2]] } },
    tiili130: { fig: 'Kuva 3', name: 'Kahi-tiiliseinä 130 mm', reinf: '2 ø8 joka toisessa vaakasaumassa', Hmax: 11, u: U130,
      r: { red: [[13.2, 8], [13.38, 7], [13.78, 6], [14.27, 5], [14.85, 4], [15.36, 3], [15.92, 2]], blue: [[15.02, 8], [15.41, 7.5], [15.9, 7], [16.88, 6.25], [17.2, 6], [18.56, 5], [19.9, 4.25]], green: [[4.4, 8], [4.63, 7.5], [4.99, 7], [5.38, 6.5], [5.89, 6], [6.85, 5.5], [7.95, 5], [9.64, 4.5], [11.7, 4], [15.5, 3.65]] } },
    tiili85: { fig: 'Kuva 4', name: 'Kahi-tiiliseinä 85 mm', reinf: '2 ø8 joka toisessa vaakasaumassa', Hmax: 8, u: U85,
      r: { red: [[8.31, 8], [8.42, 7], [8.55, 6], [8.7, 5], [8.92, 4.25], [9.53, 3], [10.05, 2]], blue: [[8.92, 8], [9.14, 7], [9.5, 6], [9.98, 5], [10.47, 4.5], [11.17, 4], [11.95, 3.5], [12.63, 3], [14, 2.25], [14.34, 2]], green: [[2.45, 8], [2.6, 7], [2.74, 6], [2.95, 5], [3.31, 4.5], [3.75, 4], [4.82, 3.5], [6.1, 3], [8.6, 2.5], [10.7, 2]] } }
  };
  var HV = { 130: 3.9, 85: 2.55 }; // ylä- ja alareunasta tuetun seinän suurin korkeus pystysuuntaisella kantotavalla
  var CASES = {
    blue: { name: 'Kaikki reunat tuettu', short: '4 reunaa', col: '#3b82f6' },
    green: { name: 'Ylä-, ala- ja toinen sivureuna', short: '3 reunaa (yläpää tuettu)', col: '#22a05a' },
    red: { name: 'Ala- ja molemmat sivureunat, yläpää vapaa', short: '3 reunaa (yläpää vapaa)', col: '#e5484d' },
    tb: { name: 'Ylä- ja alareuna, sivut vapaat', short: 'ylä + ala', col: '#a0a0a0' },
    free: { name: 'Yläpää vapaa ja enintään yksi sivutuki', short: 'vapaa', col: '#a0a0a0' }
  };

  function lmax(c, H) {
    if (!c || H > c[0][1] + 1e-9) return null;
    for (var i = 0; i < c.length - 1; i++) {
      var a = c[i], b = c[i + 1];
      if (H <= a[1] + 1e-9 && H >= b[1] - 1e-9) { if (Math.abs(a[1] - b[1]) < 1e-9) return Math.max(a[0], b[0]); return a[0] + (a[1] - H) / (a[1] - b[1]) * (b[0] - a[0]); }
    }
    return c[c.length - 1][0];
  }

  // ---- geometria ----
  function analyseMesh(tris) {
    var n = tris.length; if (!n) return null;
    var mx = 0, my = 0, z0 = Infinity, z1 = -Infinity, x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (var i = 0; i < n; i++) { var p = tris[i]; mx += p[0]; my += p[1]; z0 = Math.min(z0, p[2]); z1 = Math.max(z1, p[2]); x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    mx /= n; my /= n;
    // pienin ympäröivä suorakaide konveksin peitteen reunojen suunnista (tarkka prismoille)
    var P = []; for (i = 0; i < n; i++) P.push([tris[i][0] - mx, tris[i][1] - my]);
    P.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    var Q = [P[0]]; for (i = 1; i < P.length; i++) if (Math.abs(P[i][0] - Q[Q.length - 1][0]) > 1e-7 || Math.abs(P[i][1] - Q[Q.length - 1][1]) > 1e-7) Q.push(P[i]);
    function cr(o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }
    var lo = [], hi = [];
    for (i = 0; i < Q.length; i++) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], Q[i]) <= 0) lo.pop(); lo.push(Q[i]); }
    for (i = Q.length - 1; i >= 0; i--) { while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], Q[i]) <= 0) hi.pop(); hi.push(Q[i]); }
    var hull = lo.slice(0, -1).concat(hi.slice(0, -1)); if (hull.length < 2) hull = Q;
    var best = null;
    for (i = 0; i < hull.length; i++) {
      var A = hull[i], B = hull[(i + 1) % hull.length], ex = B[0] - A[0], ey = B[1] - A[1], el = Math.hypot(ex, ey); if (el < 1e-9) continue;
      var uu = [ex / el, ey / el], vv = [-uu[1], uu[0]], a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
      for (var k = 0; k < hull.length; k++) { var pu0 = hull[k][0] * uu[0] + hull[k][1] * uu[1], pv0 = hull[k][0] * vv[0] + hull[k][1] * vv[1]; a0 = Math.min(a0, pu0); a1 = Math.max(a1, pu0); b0 = Math.min(b0, pv0); b1 = Math.max(b1, pv0); }
      var w0 = Math.min(a1 - a0, b1 - b0); if (!best || w0 < best.w - 1e-9 || (Math.abs(w0 - best.w) < 1e-9 && (a1 - a0) * (b1 - b0) < best.ar)) best = { w: w0, ar: (a1 - a0) * (b1 - b0), u: uu, v: vv, a0: a0, a1: a1, b0: b0, b1: b1 };
    }
    var u = best ? best.u : [1, 0], v = best ? best.v : [0, 1], umin = best ? best.a0 : 0, umax = best ? best.a1 : 0, vmin = best ? best.b0 : 0, vmax = best ? best.b1 : 0;
    if (vmax - vmin > umax - umin) { var t = u; u = v; v = [-t[0], -t[1]]; var a0 = umin, a1 = umax; umin = -vmax; umax = -vmin; vmin = a0; vmax = a1; }
    var vm = (vmin + vmax) / 2, cu = (umin + umax) / 2;
    var c = [mx + u[0] * cu + v[0] * vm, my + u[1] * cu + v[1] * vm];
    return { c: c, u: u, v: v, L: umax - umin, t: vmax - vmin, z0: z0, z1: z1, H: z1 - z0, box: [x0, y0, z0, x1, y1, z1],
      e1: [c[0] - u[0] * (umax - umin) / 2, c[1] - u[1] * (umax - umin) / 2], e2: [c[0] + u[0] * (umax - umin) / 2, c[1] + u[1] * (umax - umin) / 2] };
  }
  function distRect(p, g2) { var dx = p[0] - g2.c[0], dy = p[1] - g2.c[1], pu = dx * g2.u[0] + dy * g2.u[1], pv = dx * g2.v[0] + dy * g2.v[1]; return Math.hypot(Math.max(0, Math.abs(pu) - g2.L / 2), Math.max(0, Math.abs(pv) - g2.t / 2)); }
  function rayDown(tris, x, y, zmin) { // pienin z ≥ zmin, jossa pystysuora viiva (x,y) leikkaa kolmion
    var best = Infinity;
    for (var i = 0; i + 2 < tris.length; i += 3) {
      var a = tris[i], b = tris[i + 1], c = tris[i + 2];
      if (x < Math.min(a[0], b[0], c[0]) - 1e-6 || x > Math.max(a[0], b[0], c[0]) + 1e-6 || y < Math.min(a[1], b[1], c[1]) - 1e-6 || y > Math.max(a[1], b[1], c[1]) + 1e-6) continue;
      var d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]); if (Math.abs(d) < 1e-12) continue;
      var l1 = ((b[1] - c[1]) * (x - c[0]) + (c[0] - b[0]) * (y - c[1])) / d, l2 = ((c[1] - a[1]) * (x - c[0]) + (a[0] - c[0]) * (y - c[1])) / d, l3 = 1 - l1 - l2;
      if (l1 < -1e-6 || l2 < -1e-6 || l3 < -1e-6) continue;
      var z = l1 * a[2] + l2 * b[2] + l3 * c[2]; if (z >= zmin && z < best) best = z;
    }
    return best;
  }

  var WALLS = ['IFCWALL', 'IFCWALLSTANDARDCASE', 'IFCWALLELEMENTEDCASE'];
  var SIDE = ['IFCCOLUMN', 'IFCCOLUMNSTANDARDCASE', 'IFCCURTAINWALL'];
  var TOP = ['IFCSLAB', 'IFCSLABSTANDARDCASE', 'IFCSLABELEMENTEDCASE', 'IFCBEAM', 'IFCBEAMSTANDARDCASE', 'IFCROOF', 'IFCMEMBER', 'IFCPLATE'];

  function extract(M, progress) {
    var R = M.relations(), els = [], typeName = function (id) { var t = R.type.get(id); return t ? t.map(function (x) { return x.name; }).filter(Boolean).join(', ') : ''; };
    function add(id, kind) {
      var tris = M.productTris(id), geo = analyseMesh(tris); if (!geo) return;
      var a = M.args(id), el = { id: id, ifc: M.type(id), kind: kind, tris: tris, g: geo, storey: R.storey.get(id) || '', name: a[2] || '' };
      if (kind === 'wall') {
        var mats = []; (R.mat.get(id) || []).forEach(function (m) { M.materialNames(m, 0, mats); });
        (R.type.get(id) || []).forEach(function (t) { (R.mat.get(t.id) || []).forEach(function (m) { M.materialNames(m, 0, mats); }); });
        var props = M.properties(id);
        el.attr = { 'Nimi': a[2] || '', 'Kuvaus': a[3] || '', 'Objektityyppi': a[4] || '', 'Tunniste (Tag)': a[7] || '', 'Tyyppi': typeName(id), 'Materiaali': mats.filter(function (x, i) { return mats.indexOf(x) === i; }).join(', '), 'Kerros': el.storey };
        Object.keys(props).forEach(function (k) { el.attr[k] = String(props[k]); });
        var lb = props['Pset_WallCommon.LoadBearing']; el.loadBearing = lb === 'TRUE' ? true : lb === 'FALSE' ? false : null;
        el.name = a[2] || a[7] || ('#' + id); el.guid = a[0];
      }
      els.push(el);
    }
    var ids = M.ofTypes(WALLS); ids.forEach(function (id) { add(id, 'wall'); });
    M.ofTypes(SIDE).forEach(function (id) { add(id, 'side'); });
    M.ofTypes(TOP).forEach(function (id) { add(id, 'top'); });
    return els;
  }

  function detectSupports(w, els, o) {
    var g2 = w.g, tolS = o.sideTol, tolT = o.topTol, res = { e1: null, e2: null, top: false, topFrac: 0 };
    [['e1', g2.e1], ['e2', g2.e2]].forEach(function (E) {
      var best = null;
      els.forEach(function (c) {
        if (c === w || c.kind === 'top') return;
        var cg = c.g, ov = Math.min(g2.z1, cg.z1) - Math.max(g2.z0, cg.z0); if (ov < 0.5 * g2.H) return;
        if (c.kind === 'wall' && Math.abs(cg.u[0] * g2.u[0] + cg.u[1] * g2.u[1]) > 0.94) return; // samansuuntainen = jatke, ei tuki
        var d = distRect(E[1], cg); if (d <= tolS && (!best || d < best.d)) best = { d: d, name: c.name || (c.ifc + ' #' + c.id), ifc: c.ifc };
      });
      res[E[0]] = best;
    });
    var tops = els.filter(function (c) { return c.kind === 'top' && c.g.box[2] <= g2.z1 + tolT && c.g.box[5] >= g2.z1 - 0.05; }), hit = 0, N = 7, by = null;
    for (var k = 0; k < N; k++) {
      var f = -0.4 + 0.8 * k / (N - 1), x = g2.c[0] + g2.u[0] * g2.L * f, y = g2.c[1] + g2.u[1] * g2.L * f, ok = false;
      for (var j = 0; j < tops.length && !ok; j++) { var b = tops[j].g.box; if (x < b[0] - 0.01 || x > b[3] + 0.01 || y < b[1] - 0.01 || y > b[4] + 0.01) continue; var z = rayDown(tops[j].tris, x, y, g2.z1 - 0.06); if (z <= g2.z1 + tolT) { ok = true; by = tops[j]; } }
      if (ok) hit++;
    }
    res.topFrac = hit / N; res.top = res.topFrac >= 0.6; res.topBy = by ? (by.name || (by.ifc + ' #' + by.id)) : null;
    return res;
  }

  function autoCase(s) { var n = (s.e1 ? 1 : 0) + (s.e2 ? 1 : 0); if (s.top) return n === 2 ? 'blue' : n === 1 ? 'green' : 'tb'; return n === 2 ? 'red' : 'free'; }

  function check(w, o) {
    var t = w.g.t * 1000, L = w.g.L, H = w.g.H, txt = (w.attr ? [w.attr['Materiaali'], w.attr['Tyyppi'], w.attr['Nimi']].join(' ') : '');
    var prod = w.prod && w.prod !== 'auto' ? w.prod : (o.prod !== 'auto' ? o.prod : (/tiili|brick/i.test(txt) ? 'tiili' : 'harkko'));
    var reinf = w.reinf === undefined || w.reinf === 'auto' ? o.reinf : w.reinf === 'yes';
    var cs = w.sup && w.sup !== 'auto' ? w.sup : autoCase(w.supports);
    var r = { prod: prod, reinf: reinf, cs: cs, t: t, L: L, H: H, Lmax: null, ok: false, notes: [], key: null };
    var key = t < 80 ? null : t < 125 ? 85 : 130; r.key = key;
    if (!key) { r.notes.push('Paksuus ' + Math.round(t) + ' mm < 85 mm: ohjeessa ei käyrää → erillinen mitoitus.'); return r; }
    if (key === 130 && t > 140) r.notes.push('Paksuus ' + Math.round(t) + ' mm: käytetty 130 mm:n käyrää (varmalla puolella).');
    if (key === 85 && t > 95) r.notes.push('Paksuus ' + Math.round(t) + ' mm: käytetty 85 mm:n käyrää (varmalla puolella).');
    var C = CURVES[prod + key]; r.curve = C;
    if (cs === 'free') { r.notes.push('Yläpää vapaa ja enintään yksi sivureuna tuettu → seinä on tuettava.'); r.ok = false; }
    else if (cs === 'tb') { r.Lmax = H <= HV[key] ? Infinity : 0; r.ok = H <= HV[key]; r.notes.push('Vain ylä- ja alareuna tuettu: pystysuuntainen kantotapa, H ≤ ' + HV[key].toFixed(2).replace('.', ',') + ' m.'); }
    else {
      if ((cs === 'blue' || cs === 'green') && H <= HV[key]) { r.Lmax = Infinity; r.ok = true; r.notes.push('H ≤ ' + HV[key].toFixed(2).replace('.', ',') + ' m: seinä kantaa pystysuunnassa ylä- ja alareunan välillä.'); }
      else {
        var lu = lmax(C.u[cs], H), lr = reinf ? lmax(C.r[cs], H) : null, lm = Math.max(lu === null ? -1 : lu, lr === null ? -1 : lr);
        if (lm < 0) { r.Lmax = null; r.ok = false; r.notes.push('Korkeus ' + H.toFixed(2).replace('.', ',') + ' m on käyrän ulkopuolella → tuenta tai erillinen mitoitus.'); }
        else { r.Lmax = lm; r.ok = L <= lm + 1e-6; }
      }
    }
    if (o.fire && H > 0.04 * t) { r.ok = false; r.notes.push('Paloseinä: H = ' + H.toFixed(2).replace('.', ',') + ' m > 40t = ' + (0.04 * t).toFixed(2).replace('.', ',') + ' m.'); }
    return r;
  }

  g.Tuenta = { CURVES: CURVES, HV: HV, CASES: CASES, lmax: lmax, extract: extract, detectSupports: detectSupports, autoCase: autoCase, check: check, analyseMesh: analyseMesh };
})(window);
