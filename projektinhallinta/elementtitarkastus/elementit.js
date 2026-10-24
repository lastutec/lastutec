/* Lastutec – betonielementtien tarkastus IFC-mallista
   1) Elementtien poiminta (myös IfcElementAssembly-kokoonpanot), luokittelu elementtitunnuksen ja IFC-luokan mukaan
   2) Paino: IFC-ominaisuus (Weight/Paino) → IFC-tilavuus × tiheys → ontelolaatan taulukkopaino → geometrian tilavuus × tiheys
   3) Nosturi: kiinteä nostokyky tai kuormituskäyrä (säde → nostokyky) ja nosturin sijainti
   4) Mitat: elementtisuunnittelu.fi:n mittasuositukset (BES / Betoniteollisuus ry)
   Tila: 'bad' = korjattava (punainen), 'warn' = huomio (keltainen), 'ok' = kunnossa (vihreä). */
(function (g) {
  'use strict';
  var SRC = {
    seina: 'https://www.elementtisuunnittelu.fi/runkorakenteet/seinat/seinien-mittasuositus',
    sandwich: 'https://www.elementtisuunnittelu.fi/julkisivut/julkisivujarjestelmat/sandwich-julkisivut',
    eriytetty: 'https://www.elementtisuunnittelu.fi/julkisivut/julkisivujarjestelmat/eriytetyt-julkisivut',
    pilari: 'https://www.elementtisuunnittelu.fi/runkorakenteet/pilarit/pilareiden-mittasuosistus',
    palkki: 'https://www.elementtisuunnittelu.fi/runkorakenteet/palkit/suorakaidepalkit',
    leuka: 'https://www.elementtisuunnittelu.fi/runkorakenteet/palkit/leukapalkit',
    ontelo: 'https://www.elementtisuunnittelu.fi/runkorakenteet/laatat/ontelolaatat',
    laatat: 'https://www.elementtisuunnittelu.fi/runkorakenteet/laatat',
    nosto: 'https://www.elementtisuunnittelu.fi/asennus/nosto-ohjeet',
    tunnus: 'https://www.elementtisuunnittelu.fi/runkorakenteet/elementtitunnukset'
  };
  // Ontelolaatat: korkeus [mm], paino (raskain profiili) [kN/m²], suurin jänneväli [m]
  var ONTELO = [['O15', 150, 2.30, 7.0], ['O20', 200, 2.65, 10.0], ['O27', 265, 3.60, 13.5], ['O32', 320, 4.00, 16.0], ['O37', 370, 4.85, 16.0], ['O40', 400, 4.35, 17.5], ['O50', 500, 6.15, 20.0]];
  var KINDS = {
    seina: 'Seinäelementti', kantava: 'Kantava seinä', sisakuori: 'Sisäkuorielementti', sandwich: 'Sandwich-elementti', kuori: 'Ulkokuori / kuorielementti',
    pilari: 'Pilari', palkki: 'Palkki', jannepalkki: 'Jännebetonipalkki (I/HI)', ontelo: 'Ontelolaatta', tt: 'TT-laatta', htt: 'HTT-laatta',
    laatta: 'Laattaelementti', parveke: 'Parveke-elementti', porras: 'Porraselementti', antura: 'Perustuselementti', muu: 'Muu elementti'
  };
  var CLASSES = ['IFCWALL', 'IFCWALLSTANDARDCASE', 'IFCWALLELEMENTEDCASE', 'IFCSLAB', 'IFCSLABSTANDARDCASE', 'IFCSLABELEMENTEDCASE', 'IFCBEAM', 'IFCBEAMSTANDARDCASE',
    'IFCCOLUMN', 'IFCCOLUMNSTANDARDCASE', 'IFCMEMBER', 'IFCMEMBERSTANDARDCASE', 'IFCFOOTING', 'IFCSTAIR', 'IFCSTAIRFLIGHT', 'IFCRAMP', 'IFCRAMPFLIGHT', 'IFCPLATE',
    'IFCPLATESTANDARDCASE', 'IFCBUILDINGELEMENTPROXY', 'IFCCHIMNEY', 'IFCROOF', 'IFCELEMENTASSEMBLY', 'IFCPILE', 'IFCCOVERING'];
  var CONC = /betoni|concrete|\bC\d{2}\s*\/\s*\d{2}\b|\bK\d{2}\b|precast|elementti|ontelo|hollow\s*core|sandwich/i;

  // ---------- geometria ----------
  function analyse(tris) {
    var n = tris.length; if (!n) return null;
    var x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity, mx = 0, my = 0;
    for (var i = 0; i < n; i++) { var p = tris[i]; x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); z0 = Math.min(z0, p[2]); z1 = Math.max(z1, p[2]); mx += p[0]; my += p[1]; }
    mx /= n; my /= n;
    // tilavuus ja painopiste (tetraedrit origon (mx,my,z0) suhteen)
    var V = 0, cx = 0, cy = 0, cz = 0;
    for (i = 0; i + 2 < n; i += 3) {
      var a = tris[i], b = tris[i + 1], c = tris[i + 2];
      var ax = a[0] - mx, ay = a[1] - my, az = a[2] - z0, bx = b[0] - mx, by = b[1] - my, bz = b[2] - z0, qx = c[0] - mx, qy = c[1] - my, qz = c[2] - z0;
      var v = (ax * (by * qz - bz * qy) - ay * (bx * qz - bz * qx) + az * (bx * qy - by * qx)) / 6;
      V += v; cx += v * (ax + bx + qx) / 4; cy += v * (ay + by + qy) / 4; cz += v * (az + bz + qz) / 4;
    }
    var cog = Math.abs(V) > 1e-9 ? [mx + cx / V, my + cy / V, z0 + cz / V] : [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2];
    if (cog[0] < x0 - 1e-6 || cog[0] > x1 + 1e-6 || cog[1] < y0 - 1e-6 || cog[1] > y1 + 1e-6) cog = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2];
    // pienin ympäröivä suorakaide tasossa (konveksi peite)
    var P = []; for (i = 0; i < n; i++) P.push([tris[i][0] - mx, tris[i][1] - my]);
    P.sort(function (p1, p2) { return p1[0] - p2[0] || p1[1] - p2[1]; });
    var Q = [P[0]]; for (i = 1; i < P.length; i++) if (Math.abs(P[i][0] - Q[Q.length - 1][0]) > 1e-7 || Math.abs(P[i][1] - Q[Q.length - 1][1]) > 1e-7) Q.push(P[i]);
    function cr(o, p1, p2) { return (p1[0] - o[0]) * (p2[1] - o[1]) - (p1[1] - o[1]) * (p2[0] - o[0]); }
    var lo = [], hi = [];
    for (i = 0; i < Q.length; i++) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], Q[i]) <= 0) lo.pop(); lo.push(Q[i]); }
    for (i = Q.length - 1; i >= 0; i--) { while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], Q[i]) <= 0) hi.pop(); hi.push(Q[i]); }
    var hull = lo.slice(0, -1).concat(hi.slice(0, -1)); if (hull.length < 2) hull = Q;
    var best = null;
    for (i = 0; i < hull.length; i++) {
      var A = hull[i], B = hull[(i + 1) % hull.length], ex = B[0] - A[0], ey = B[1] - A[1], el = Math.hypot(ex, ey); if (el < 1e-9) continue;
      var u = [ex / el, ey / el], w = [-u[1], u[0]], a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
      for (var k = 0; k < hull.length; k++) { var pu = hull[k][0] * u[0] + hull[k][1] * u[1], pw = hull[k][0] * w[0] + hull[k][1] * w[1]; a0 = Math.min(a0, pu); a1 = Math.max(a1, pu); b0 = Math.min(b0, pw); b1 = Math.max(b1, pw); }
      var ar = (a1 - a0) * (b1 - b0); if (!best || ar < best.ar - 1e-9) best = { ar: ar, u: u, A: a1 - a0, B: b1 - b0 };
    }
    var dA = best ? best.A : x1 - x0, dB = best ? best.B : y1 - y0, dir = best ? best.u : [1, 0];
    if (dB > dA) { var t = dA; dA = dB; dB = t; dir = [-dir[1], dir[0]]; }
    return { box: [x0, y0, z0, x1, y1, z1], L: dA, B: dB, H: z1 - z0, dir: dir, V: Math.abs(V), cog: cog };
  }

  // ---------- poiminta ----------
  function units(M) {
    var u = { vol: 1, mass: 1 }; // m³, kg
    (M.byType.get('IFCSIUNIT') || []).forEach(function (id) { var a = M.args(id), ty = a[1] && a[1].e, pre = a[2] && a[2].e;
      var f = { MILLI: 1e-3, CENTI: 1e-2, DECI: 1e-1, KILO: 1e3, MEGA: 1e6 }[pre] || 1;
      if (ty === 'VOLUMEUNIT') u.vol = Math.pow(f, 3); });
    // massayksikkö: GRAM ilman etuliitettä = g → 0,001 kg; KILO GRAM = kg
    (M.byType.get('IFCSIUNIT') || []).forEach(function (id) { var a = M.args(id); if (a[1] && a[1].e === 'MASSUNIT') { var pre = a[2] && a[2].e; u.mass = pre === 'KILO' ? 1 : pre === 'MEGA' ? 1000 : pre === 'MILLI' ? 1e-6 : 0.001; } });
    (M.byType.get('IFCCONVERSIONBASEDUNIT') || []).forEach(function (id) { var a = M.args(id); if (a[1] && a[1].e === 'MASSUNIT') { var nm = String(a[2] || '').toUpperCase(); if (/TONNE|TON/.test(nm)) u.mass = 1000; } });
    return u;
  }
  function num(v) { if (typeof v === 'number') return v; if (v === null || v === undefined) return NaN; var s = String(v).replace(',', '.').match(/-?\d+(\.\d+)?(e-?\d+)?/i); return s ? parseFloat(s[0]) : NaN; }
  var WKEY = /(^|[.\s_])(net\s*weight|gross\s*weight|weight|paino|massa|mass)$/i, VKEY = /(^|[.\s_])(net\s*volume|gross\s*volume|volume|tilavuus)$/i;
  function propWeight(props, U) { // → kg
    var keys = Object.keys(props), best = null;
    keys.forEach(function (k) { if (!WKEY.test(k)) return; var v = num(props[k]); if (!(v > 0)) return; var pri = /net/i.test(k) ? 0 : /tekla|weight$/i.test(k) ? 1 : 2; if (!best || pri < best.p) best = { p: pri, k: k, v: v }; });
    if (!best) return null;
    var kg = best.v * U.mass;
    if (/\[t\]|\(t\)|_t$|tonn/i.test(best.k)) kg = best.v * 1000;
    return { kg: kg, src: best.k };
  }
  function propVolume(props, U) { // → m³
    var best = null; Object.keys(props).forEach(function (k) { if (!VKEY.test(k)) return; var v = num(props[k]); if (!(v > 0)) return; var pri = /net/i.test(k) ? 0 : 1; if (!best || pri < best.p) best = { p: pri, k: k, v: v }; });
    if (!best) return null; var m3 = best.v * U.vol; if (m3 > 1e4) m3 = best.v * 1e-9; // mm³ ilman yksikkötietoa
    return { m3: m3, src: best.k };
  }

  function extract(M) {
    var R = M.relations(), U = units(M), self = M, els = [], byId = new Map();
    var typeName = function (id) { var t = R.type.get(id); return t ? t.map(function (x) { return x.name; }).filter(Boolean).join(', ') : ''; };
    // kokoonpanot (IfcRelAggregates: RelatingObject = rakennusosa)
    var parentOf = new Map(), kids = new Map(), cls = new Set(CLASSES);
    (M.byType.get('IFCRELAGGREGATES') || []).forEach(function (id) { var a = M.args(id), p = M.ref(a[4]); if (!cls.has(M.type(p))) return; (a[5] || []).forEach(function (r) { if (cls.has(M.type(r.r))) { parentOf.set(r.r, p); var l = kids.get(p); if (!l) kids.set(p, l = []); l.push(r.r); } }); });
    // ylin kokoonpano
    function root(id) { var g2 = 0; while (parentOf.has(id) && g2++ < 10) id = parentOf.get(id); return id; }
    function info(id) {
      var a = M.args(id), props = M.properties(id), mats = [];
      (R.mat.get(id) || []).forEach(function (m) { M.materialNames(m, 0, mats); });
      (R.type.get(id) || []).forEach(function (t) { (R.mat.get(t.id) || []).forEach(function (m) { M.materialNames(m, 0, mats); }); var tp = M.properties(t.id); Object.keys(tp).forEach(function (k) { if (!(k in props)) props[k] = tp[k]; }); });
      var tag = M.type(id) === 'IFCELEMENTASSEMBLY' || /^IFC(WALL|SLAB|BEAM|COLUMN|MEMBER|PLATE|FOOTING|STAIR|BUILDINGELEMENTPROXY|PILE|CHIMNEY|ROOF|RAMP)/.test(M.type(id)) ? a[7] : '';
      return { a: a, props: props, mats: mats.filter(function (x, i) { return x && mats.indexOf(x) === i; }), tag: tag || '' };
    }
    var ids = M.ofTypes(CLASSES), seen = new Set();
    ids.forEach(function (id) {
      var r = root(id); if (seen.has(r)) return; seen.add(r);
      var parts = [], stack = [r]; while (stack.length) { var x = stack.pop(); parts.push(x); (kids.get(x) || []).forEach(function (k) { stack.push(k); }); }
      var tris = [], partInfo = [];
      parts.forEach(function (pid) { var tt = []; try { tt = M.productTris(pid); } catch (e) { tt = []; } for (var i = 0; i < tt.length; i++) tris.push(tt[i]); if (pid !== r || parts.length === 1) partInfo.push({ id: pid, ifc: M.type(pid), tris: tt }); });
      if (!tris.length) return;
      var I = info(r), a = I.a, geo = analyse(tris); if (!geo) return;
      var mats = I.mats.slice(); partInfo.forEach(function (p) { if (p.id !== r) info(p.id).mats.forEach(function (m) { if (mats.indexOf(m) < 0) mats.push(m); }); });
      // kokoonpanon IFC-luokka: suurimman osan luokka
      var ifc = M.type(r), mainIfc = ifc;
      if (ifc === 'IFCELEMENTASSEMBLY' || kids.has(r)) { var bigV = -1; partInfo.forEach(function (p) { var gg = analyse(p.tris); if (gg && gg.V > bigV && p.ifc !== 'IFCELEMENTASSEMBLY') { bigV = gg.V; mainIfc = p.ifc; } }); }
      var storey = R.storey.get(r) || ''; if (!storey) parts.some(function (p) { if (R.storey.get(p)) { storey = R.storey.get(p); return true; } return false; });
      var el = { id: r, guid: a[0] || '', ifc: ifc, mainIfc: mainIfc, name: a[2] || I.tag || ('#' + r), tris: tris, g: geo, storey: storey, parts: parts.length, props: I.props };
      el.attr = { 'Nimi': a[2] || '', 'Tunniste (Tag)': I.tag, 'Objektityyppi': a[4] || '', 'Kuvaus': a[3] || '', 'Tyyppi': typeName(r), 'Materiaali': mats.join(', '), 'Kerros': storey, 'IFC-luokka': ifc.replace(/^IFC/, 'Ifc') };
      Object.keys(I.props).forEach(function (k) { el.attr[k] = String(I.props[k]); });
      // paino ja tilavuus mallin tiedoista (kokoonpano: oma tai osien summa)
      el.pw = propWeight(I.props, U); el.pv = propVolume(I.props, U);
      if ((!el.pw || !el.pv) && parts.length > 1) {
        var sw = 0, swOk = true, sv = 0, svOk = true;
        parts.forEach(function (p) { if (p === r) return; var pp = M.properties(p), w = propWeight(pp, U), v = propVolume(pp, U); if (w) sw += w.kg; else swOk = false; if (v) sv += v.m3; else svOk = false; });
        if (!el.pw && swOk && sw > 0) el.pw = { kg: sw, src: 'osien painojen summa' };
        if (!el.pv && svOk && sv > 0) el.pv = { m3: sv, src: 'osien tilavuuksien summa' };
      }
      el.lb = (function () { var v = I.props['Pset_WallCommon.LoadBearing'] || I.props['Pset_SlabCommon.LoadBearing'] || I.props['Pset_BeamCommon.LoadBearing'] || I.props['Pset_ColumnCommon.LoadBearing']; return v === 'TRUE' ? true : v === 'FALSE' ? false : null; })();
      el.code = codeOf(el);
      el.autoKind = classify(el); el.kind = 'auto';
      el.concrete = CONC.test([el.attr['Materiaali'], el.attr['Tyyppi'], el.attr['Nimi'], el.attr['Objektityyppi'], el.attr['Kuvaus']].join(' ')) || !!el.code.known;
      els.push(el); byId.set(r, el);
    });
    return els;
  }

  // ---------- luokittelu ----------
  var CODES = { // elementtisuunnittelu.fi, elementtitunnukset
    A: 'antura', PH: 'antura', AN: 'antura', AS: 'antura', AK: 'antura', AR: 'antura', AV: 'antura', TKE: 'antura',
    P: 'pilari', V: 'seina', VSP: 'kantava', S: 'kantava', R: 'seina', SK: 'sisakuori', RK: 'sisakuori', SKR: 'sisakuori', RKR: 'sisakuori', NK: 'kantava', N: 'seina', KE: 'kuori',
    SW: 'sandwich', US: 'sandwich', SA: 'sandwich', K: 'palkki', I: 'jannepalkki', HI: 'jannepalkki', JK: 'jannepalkki',
    L: 'laatta', EL: 'laatta', JL: 'laatta', KL: 'laatta', TT: 'tt', HTT: 'htt', C: 'parveke', CL: 'parveke', JCL: 'parveke', UCL: 'parveke', M: 'parveke', Z: 'parveke', CX: 'parveke', JCX: 'parveke',
    T: 'porras', HK: 'seina', HKU: 'seina', HKL: 'seina', HKA: 'laatta', HKY: 'laatta', H: 'muu'
  };
  function codeOf(el) {
    var cands = [el.attr['Tunniste (Tag)'], el.attr['Nimi'], el.attr['Objektityyppi']];
    Object.keys(el.props).forEach(function (k) { if (/assembly.?pos|cast.?unit.?pos|position.?number|elementtitunnus|tunnus|mark$/i.test(k)) cands.unshift(el.props[k]); });
    for (var i = 0; i < cands.length; i++) {
      var s = String(cands[i] || '').trim().toUpperCase(); if (!s) continue;
      var m = s.match(/^([OP])(\d{2})(?![\d])/); if (m) return { code: m[1] + m[2], pre: 'O', h: +m[2], known: true, raw: s };
      m = s.match(/^([A-ZÅÄÖ]{1,4})X?[-_ ]?\d/); if (m && CODES[m[1]]) return { code: m[1], pre: m[1], known: true, raw: s };
      m = s.match(/^([A-ZÅÄÖ]{1,4})X?[-_ ]?\d/); if (m && m[1].length > 1 && CODES[m[1].slice(0, -1)]) return { code: m[1].slice(0, -1), pre: m[1].slice(0, -1), known: true, raw: s };
    }
    return { code: '', pre: '', known: false, raw: '' };
  }
  function classify(el) {
    var txt = [el.attr['Nimi'], el.attr['Tyyppi'], el.attr['Objektityyppi'], el.attr['Kuvaus'], el.attr['Materiaali']].join(' ').toLowerCase();
    var ifc = el.mainIfc, c = el.code;
    if (/sandwich|eristetty ulkoseinä|\bsw\b/.test(txt)) return 'sandwich';
    if (/ontelo|hollow.?core|\bhc\d|\b[op]\d{2}\b/.test(txt) && /SLAB|PLATE|PROXY|ASSEMBLY/.test(ifc)) return 'ontelo';
    if (c.pre === 'O' && /SLAB|PLATE|PROXY|ASSEMBLY|MEMBER/.test(ifc)) return 'ontelo';
    if (/\bhtt\b/.test(txt)) return 'htt';
    if (/\btt.?laatta|\btt\d/.test(txt)) return 'tt';
    if (/sisäkuori|sisakuori/.test(txt)) return 'sisakuori';
    if (/ulkokuori|kuorielementti|facade.?panel/.test(txt)) return 'kuori';
    if (c.known && CODES[c.code]) {
      var k = CODES[c.code];
      if (k === 'pilari' && /SLAB/.test(ifc)) return 'ontelo';
      if (k === 'seina' && el.lb === true) return 'kantava';
      return k;
    }
    // eristekerros seinässä → sandwich
    if (/WALL/.test(ifc) && /eriste|villa|\beps\b|\bxps\b|\bpir\b|polyuret|insulation|mineral wool/.test(txt) && /betoni|concrete/.test(txt)) return 'sandwich';
    if (/WALL/.test(ifc)) return el.lb === true ? 'kantava' : 'seina';
    if (/COLUMN|PILE/.test(ifc)) return 'pilari';
    if (/BEAM/.test(ifc)) return /\bhi\b|\bi-palkki|jänne/.test(txt) ? 'jannepalkki' : 'palkki';
    if (/SLAB|ROOF/.test(ifc)) return /parvek|balcon/.test(txt) ? 'parveke' : 'laatta';
    if (/STAIR|RAMP/.test(ifc)) return 'porras';
    if (/FOOTING/.test(ifc)) return 'antura';
    if (/MEMBER/.test(ifc)) return el.g.H > Math.max(el.g.L, 0.01) * 1.5 ? 'pilari' : 'palkki';
    // geometriasta
    var G = el.g; if (G.H > 2 * G.L && G.H > 1.5) return 'pilari';
    if (G.H > 1.2 && G.B < 0.5 && G.L > 1) return 'seina';
    return 'muu';
  }

  // ---------- mitat elementtityypin mukaan ----------
  function dims(el, kind) {
    var G = el.g, wall = /seina|kantava|sisakuori|sandwich|kuori/.test(kind), col = kind === 'pilari';
    if (wall) return { L: G.L, H: G.H, t: G.B, labels: ['L', 'H', 't'] };
    if (col) return { L: G.H, H: G.L, t: G.B, labels: ['L', 'h', 'b'] }; // pituus pystyyn, poikkileikkaus h × b
    if (/palkki/.test(kind)) return { L: G.L, H: G.H, t: G.B, labels: ['L', 'h', 'b'] };
    return { L: G.L, H: G.B, t: G.H, labels: ['L', 'B', 't'] }; // laatat ym.: pituus, leveys, paksuus
  }
  function ontType(tmm) { var best = null; ONTELO.forEach(function (o) { var d = Math.abs(o[1] - tmm); if (d <= 20 && (!best || d < best.d)) best = { d: d, o: o }; }); return best ? best.o : null; }

  // ---------- paino ----------
  function weight(el, kind, o) { // → { t, src, note }
    if (el.manualT > 0) return { t: el.manualT, src: 'käsin syötetty' };
    if (el.pw) return { t: el.pw.kg / 1000, src: 'IFC: ' + el.pw.src };
    if (el.pv) return { t: el.pv.m3 * o.rho / 1000, src: 'IFC-tilavuus ' + fmt(el.pv.m3, 2) + ' m³ × ' + o.rho + ' kg/m³' };
    var d = dims(el, kind);
    if (kind === 'ontelo') { var ot = ontType(d.t * 1000); if (ot) return { t: ot[2] * d.L * d.H / 9.81, src: 'Ontelolaatta ' + ot[0] + ': ' + fmt(ot[2], 2) + ' kN/m² × ' + fmt(d.L * d.H, 2) + ' m²' }; }
    var V = el.g.V > 1e-6 ? el.g.V : el.g.L * el.g.B * el.g.H;
    if (kind === 'sandwich' && el.parts === 1 && d.t > 0.25) { // yksi kappale eristeineen: betonia oletuksena sisäkuori 150 + ulkokuori 80 mm
      var Vc = V * 0.23 / d.t;
      return { t: Vc * o.rho / 1000, src: 'Geometria ' + fmt(Vc, 2) + ' m³ (betonikuoret 150 + 80 mm) × ' + o.rho + ' kg/m³', note: 'Sandwich on mallinnettu yhtenä kappaleena, joten paino on arvioitu olettaen betonikuoret 150 + 80 mm ja kevyt eriste. Aukkoja ei vähennetä.' };
    }
    return { t: V * o.rho / 1000, src: 'Geometria ' + fmt(V, 2) + ' m³ × ' + o.rho + ' kg/m³', note: 'Aukkoja ei vähennetä, joten paino on varmalla puolella.' + (kind === 'sandwich' ? ' Jos eristekerros on mallinnettu betonin kanssa samaan materiaaliin, se lasketaan betonina.' : '') };
  }

  // ---------- nosturi ----------
  function parseChart(text) {
    var pts = [];
    String(text || '').split(/\r?\n/).forEach(function (line) { var m = line.replace(/,/g, '.').match(/(-?\d+(?:\.\d+)?)\D+(-?\d+(?:\.\d+)?)/); if (m) { var r = +m[1], c = +m[2]; if (r >= 0 && c > 0) pts.push([r, c]); } });
    pts.sort(function (a, b) { return a[0] - b[0]; });
    return pts;
  }
  function capacityAt(chart, r) { // varmalla puolella: seuraavan suuremman säteen nostokyky
    for (var i = 0; i < chart.length; i++) if (r <= chart[i][0] + 1e-9) return { cap: chart[i][1], R: chart[i][0] };
    return { cap: 0, R: null };
  }

  // ---------- tarkastus ----------
  function fmt(x, d) { return isFinite(x) ? x.toLocaleString('fi-FI', { minimumFractionDigits: d, maximumFractionDigits: d }) : '–'; }
  function mm(x) { return fmt(x * 1000, 0) + ' mm'; }
  function m2(x) { return fmt(x, 2) + ' m'; }
  function moduleOk(xm) { var v = Math.round(xm * 1000); return Math.abs(((v + 20) % 100 + 100) % 100) <= 3 || Math.abs(((v + 20) % 100) - 100) <= 3; }
  function txtOf(el) { return [el.attr['Nimi'], el.attr['Tyyppi'], el.attr['Objektityyppi'], el.attr['Kuvaus'], el.attr['Materiaali']].join(' ').toLowerCase(); }

  function check(el, o) {
    var kind = el.kind === 'auto' ? el.autoKind : el.kind, d = dims(el, kind), C = [], add = function (grp, name, val, lim, st, src, note) { C.push({ grp: grp, name: name, val: val, lim: lim, st: st, src: src, note: note || '' }); };
    // --- paino ja nosto ---
    var w = weight(el, kind, o), load = w.t + o.rig, cap, Rr = null, capR = null;
    if (o.mode === 'chart') {
      Rr = Math.hypot(el.g.cog[0] - o.crane[0], el.g.cog[1] - o.crane[1]);
      var cr = capacityAt(o.chart, Rr); cap = cr.cap; capR = cr.R;
    } else cap = o.cap;
    var util = cap > 0 ? load / cap : Infinity;
    var stW = !(cap > 0) ? 'bad' : util > 1 + 1e-9 ? 'bad' : util >= o.warnU ? 'warn' : 'ok';
    add('Nosto', 'Paino + nostovälineet vs. nostokyky', fmt(w.t, 2) + ' + ' + fmt(o.rig, 2) + ' = ' + fmt(load, 2) + ' t',
      (o.mode === 'chart' ? (capR === null ? 'säde ' + m2(Rr) + ' > suurin ulottuma' : 'säde ' + m2(Rr) + ' → ' + fmt(cap, 2) + ' t (taulukon säde ' + fmt(capR, 1) + ' m)') : fmt(cap, 2) + ' t') + (cap > 0 ? ' · käyttöaste ' + fmt(util * 100, 0) + ' %' : ''),
      stW, SRC.nosto, w.src + (w.note ? '. ' + w.note : ''));
    // --- mitat ---
    var L = d.L, H = d.H, t = d.t, txt = txtOf(el);
    var isWall = /seina|kantava|sisakuori|sandwich|kuori/.test(kind);
    if (isWall) {
      // korkeus / kuljetuskorkeus
      var hLim = kind === 'kuori' ? 3.6 : 3.6, hMax = 4.2, src = kind === 'sandwich' ? SRC.sandwich : kind === 'kuori' || kind === 'sisakuori' ? SRC.eriytetty : SRC.seina;
      if (H <= hLim + 0.005) add('Mitat', 'Korkeus H', m2(H), '≤ 3,6 m (suositus)', 'ok', src);
      else if (H <= hMax + 0.005) add('Mitat', 'Korkeus H', m2(H), '≤ 3,6 m suositus, kuljetus ≤ 4,2 m', 'warn', src, 'Ylittää suositeltavan korkeuden. Kuljetuskorkeus enintään 4,2 m nostolenkit ja ulokkeet mukaan lukien.');
      else if (L <= hMax + 0.005) add('Mitat', 'Korkeus H', m2(H), '≤ 4,2 m (kuljetus)', 'warn', src, 'Korkeampi kuin kuljetuskorkeus: suunniteltava käännettäväksi (nostolenkit sivulla) tai erikoiskuljetus.');
      else add('Mitat', 'Korkeus H', m2(H), '≤ 4,2 m (kuljetus)', 'bad', src, 'Sekä korkeus että pituus ylittävät 4,2 m – elementtiä ei voi kuljettaa normaalisti eikä kääntää. Jaa elementti.');
      // pituus
      if (kind === 'sandwich') {
        if (L <= 6 + 0.005) add('Mitat', 'Pituus L', m2(L), '≤ 6 m (halkeiluriski)', 'ok', SRC.sandwich);
        else if (L <= 9 + 0.005) add('Mitat', 'Pituus L', m2(L), '≤ 6 m (halkeiluriski)', 'warn', SRC.sandwich, 'Yli 6 m sandwich-elementtejä tulee välttää halkeiluriskin vuoksi, erityisesti aukollisina. Suurimmat mitat vaihtelevat tehtaittain.');
        else add('Mitat', 'Pituus L', m2(L), '≤ 8–9 m (seinäelementit)', 'bad', SRC.seina, 'Jaa elementti.');
      } else if (kind === 'sisakuori') {
        if (L <= 7.6 + 0.005) add('Mitat', 'Pituus L', m2(L), '≤ 7,6 m', 'ok', SRC.eriytetty);
        else if (L <= 9.3 + 0.005) add('Mitat', 'Pituus L', m2(L), '≤ 7,6 m (enintään 9,3 m)', 'warn', SRC.eriytetty, 'Tarkista valmistajan suurin elementtikoko.');
        else add('Mitat', 'Pituus L', m2(L), '≤ 9,3 m', 'bad', SRC.eriytetty, 'Jaa elementti.');
      } else if (kind === 'kuori') {
        var lk = /tiili|klinkker|brick/.test(txt) ? [4.5, 'tiili/klinkkeri'] : /pesu|pesubet|washed/.test(txt) ? [5.0, 'hienopesu'] : [7.6, 'betonipinta'];
        add('Mitat', 'Pituus L', m2(L), '≤ ' + fmt(lk[0], 1) + ' m (' + lk[1] + ')', L <= lk[0] + 0.005 ? 'ok' : 'bad', SRC.eriytetty, L <= lk[0] + 0.005 ? '' : 'Ulkokuoren suurin pituus ylittyy. Jaa elementti.');
        if (H < 0.6 - 0.005) add('Mitat', 'Korkeus H (min.)', m2(H), '≥ 0,6 m', 'warn', SRC.eriytetty);
      } else {
        if (L <= 8 + 0.005) add('Mitat', 'Pituus L', m2(L), '≤ 8–9 m', 'ok', SRC.seina);
        else if (L <= 9 + 0.005) add('Mitat', 'Pituus L', m2(L), '≤ 8–9 m', 'warn', SRC.seina, 'Suosituksen ylärajalla – huomioi nostokalusto elementtijaossa.');
        else add('Mitat', 'Pituus L', m2(L), '≤ 8–9 m', 'bad', SRC.seina, 'Ylittää seinäelementin suositeltavan enimmäispituuden. Jaa elementti.');
      }
      // paksuus
      if (kind === 'kuori') {
        add('Mitat', 'Paksuus t', mm(t), '80–150 mm', t < 0.08 - 0.003 ? 'bad' : t > 0.15 + 0.003 ? 'warn' : 'ok', SRC.eriytetty);
      } else if (kind === 'sisakuori') {
        add('Mitat', 'Paksuus t', mm(t), '≥ 120 mm (asuinrak. 150 mm)', t < 0.12 - 0.003 ? 'bad' : t < 0.15 - 0.003 ? 'warn' : 'ok', SRC.eriytetty, t < 0.15 - 0.003 && t >= 0.117 ? 'Asuinkerros- ja rivitaloissa suositus 150 mm ääneneristyksen vuoksi.' : '');
      } else if (kind === 'sandwich') {
        add('Mitat', 'Kokonaispaksuus', mm(t), 'sisäkuori 150 / 80 mm, ulkokuori 70–85 mm', 'ok', SRC.sandwich, 'Kuorien paksuuksia ei tarkisteta, ellei kerroksia ole mallinnettu erikseen.');
      } else {
        var lb = kind === 'kantava';
        if (t < 0.12 - 0.003) add('Mitat', 'Paksuus t', mm(t), '≥ 120 mm', 'bad', SRC.seina, 'Raudoittamattoman väliseinän vähimmäispaksuus on 120 mm.');
        else if (lb && t < 0.18 - 0.003) add('Mitat', 'Paksuus t', mm(t), '≥ 180 mm (kantava/jäykistävä)', 'warn', SRC.seina, 'Kantavien ja jäykistävien seinien suositeltava vähimmäispaksuus on 180 mm (huoneistojen väliset 200 mm).');
        else add('Mitat', 'Paksuus t', mm(t), lb ? '≥ 180 mm' : '≥ 120 mm', 'ok', SRC.seina);
      }
      if (L > 0 && t > 0 && L / t < 4) add('Mitat', 'Pituus / paksuus', fmt(L / t, 1), '≥ 4 (muuten pilari)', 'warn', SRC.seina, 'Eurokoodin mukaan rakenne, jonka pituus on alle 4 × paksuus, mitoitetaan pilarina.');
    } else if (kind === 'pilari') {
      var smin = Math.min(H, t), smax = Math.max(H, t);
      add('Mitat', 'Poikkileikkaus', mm(smax) + ' × ' + mm(smin), 'min. 280 mm', smin >= 0.28 - 0.003 ? 'ok' : 'warn', SRC.pilari, smin >= 0.277 ? '' : 'Pienempiä pilareita käytetään yleensä vain kevyesti kuormitetuissa rakennuksissa.');
      var round = Math.abs(H - t) < 0.005 && el.g.V > 0 && el.g.V / (L * H * t) < 0.84;
      if (!round) add('Mitat', 'Mittajärjestelmä', mm(smax) + ' × ' + mm(smin), 'n · 100 − 20 mm (esim. 380)', moduleOk(H) && moduleOk(t) ? 'ok' : 'warn', SRC.pilari, moduleOk(H) && moduleOk(t) ? '' : 'Suositeltu valmistusmitta on n × M − 20 mm (M = 100 mm).');
      var cl = round ? 7 : 15;
      if (L <= cl + 0.005) add('Mitat', 'Pituus L', m2(L), '≤ ' + cl + ' m' + (round ? ' (pyöreä, pystyvalu)' : ' (taloudellinen)'), 'ok', SRC.pilari);
      else if (!round && L <= 24 + 0.005) add('Mitat', 'Pituus L', m2(L), '≤ 15 m taloudellinen, ≤ 20–24 m', 'warn', SRC.pilari, 'Yli 15 m pilarit ovat mahdollisia, mutta tarkista valmistajalta. ' + (L > 20 ? 'Yli 20 m vain erityistapauksissa.' : ''));
      else add('Mitat', 'Pituus L', m2(L), round ? '≤ 7 m' : '≤ 24 m', 'bad', SRC.pilari, 'Ylittää suurimman yhtenä kappaleena asennettavan pilarin pituuden. Jaa pilari.');
    } else if (kind === 'palkki' || kind === 'jannepalkki') {
      var b = t, h = H, isLeuka = /leuka|\bhk\b|ledge/.test(txt);
      if (kind === 'palkki') {
        if (L <= 10 + 0.005) add('Mitat', 'Pituus L', m2(L), '≤ 20 m (ontelolaatoilla ≤ 10 m)', 'ok', SRC.palkki);
        else if (L <= 20 + 0.005) add('Mitat', 'Pituus L', m2(L), '≤ 20 m (ontelolaatoilla ≤ 10 m)', 'warn', SRC.palkki, 'Jos palkki kannattaa ontelolaattoja, laattojen leikkauskestävyys rajoittaa palkin pituuden n. 10 m:iin.');
        else add('Mitat', 'Pituus L', m2(L), '≤ 20 m', 'bad', SRC.palkki, 'Ylittää suorakaidepalkin suurimman valmistuspituuden. Jaa palkki tai käytä jännebetonipalkkia.');
      }
      if (isLeuka) add('Mitat', 'Uuman leveys', mm(b), '380 / 480 / 580 mm', [0.38, 0.48, 0.58].some(function (x) { return Math.abs(b - x) <= 0.003; }) ? 'ok' : 'warn', SRC.leuka, 'Leveys mitattu palkin kokonaisleveydestä – leukojen kanssa tarkista uuma piirustuksista.');
      else add('Mitat', 'Leveys b', mm(b), 'n · 100 − 20 mm', moduleOk(b) ? 'ok' : 'warn', SRC.palkki, moduleOk(b) ? '' : 'Suositeltu valmistusmitta on n × M − 20 mm (esim. 380, 480).');
    } else if (kind === 'ontelo') {
      var ot = ontType(t * 1000);
      if (!ot) add('Mitat', 'Laattatyyppi', mm(t), 'O15–O50', 'warn', SRC.ontelo, 'Paksuus ei vastaa vakio-ontelolaattaa (150, 200, 265, 320, 370, 400, 500 mm).');
      else {
        add('Mitat', 'Laattatyyppi', mm(t), ot[0], 'ok', SRC.ontelo);
        add('Mitat', 'Pituus L', m2(L), '≤ ' + fmt(ot[3], 1) + ' m (' + ot[0] + ')', L <= ot[3] + 0.005 ? 'ok' : 'bad', SRC.ontelo, L <= ot[3] + 0.005 ? '' : 'Ylittää ' + ot[0] + '-laatan suurimman jännevälin. Valitse korkeampi laatta tai lisää tuki.');
      }
      add('Mitat', 'Leveys B', mm(H), '≤ 1200 mm', H <= 1.2 + 0.005 ? 'ok' : 'bad', SRC.ontelo, H <= 1.205 ? (H < 1.195 ? 'Kapeampi kuin vakioleveys: sahattu laatta.' : '') : 'Ontelolaatan vakioleveys on 1200 mm.');
    } else if (kind === 'tt' || kind === 'htt') {
      var lim = kind === 'tt' ? 25 : 30;
      add('Mitat', 'Pituus L', m2(L), '≤ ' + lim + ' m', L <= lim + 0.005 ? 'ok' : 'bad', SRC.laatat, L <= lim + 0.005 ? '' : 'Ylittää suurimman valmistettavan jännevälin.');
    } else {
      add('Mitat', 'Mitat', m2(L) + ' × ' + m2(H) + ' × ' + mm(t), 'ei yleistä mittasuositusta', 'ok', '', 'Tälle elementtityypille ei ole elementtisuunnittelu.fi:ssä yleistä enimmäiskokoa – tarkista valmistajalta.');
    }
    var st = C.some(function (c) { return c.st === 'bad'; }) ? 'bad' : C.some(function (c) { return c.st === 'warn'; }) ? 'warn' : 'ok';
    return { kind: kind, d: d, w: w, load: load, cap: cap, R: Rr, util: util, checks: C, st: st, stW: stW, stD: C.filter(function (c) { return c.grp === 'Mitat'; }).reduce(function (s, c) { return c.st === 'bad' || s === 'bad' ? 'bad' : c.st === 'warn' || s === 'warn' ? 'warn' : 'ok'; }, 'ok') };
  }

  g.Elementit = { extract: extract, check: check, classify: classify, analyse: analyse, parseChart: parseChart, capacityAt: capacityAt, KINDS: KINDS, ONTELO: ONTELO, SRC: SRC, fmt: fmt, dims: dims };
})(window);
