/* Lastutec – kevyt IFC (STEP, ISO 10303-21) -lukija selaimeen.
   Ei ulkoisia kirjastoja: lukee entiteetit, sijoitukset (IfcLocalPlacement), yksiköt ja yleisimmät
   geometriat (IfcExtrudedAreaSolid, Boolean, MappedItem, FacetedBrep, Triangulated/PolygonalFaceSet,
   BoundingBox, Block) kolmioverkoksi maailmakoordinaatteihin (metreinä, z ylös).
   Lisäksi nimet, tyypit, materiaalit, ominaisuusjoukot ja kerrokset. */
(function (g) {
  'use strict';
  function decode(s) {
    s = s.replace(/''/g, "'");
    s = s.replace(/\\X2\\([0-9A-Fa-f]+?)\\X0\\/g, function (m, h) { var o = ''; for (var i = 0; i + 3 < h.length; i += 4) o += String.fromCharCode(parseInt(h.substr(i, 4), 16)); return o; });
    s = s.replace(/\\X\\([0-9A-Fa-f]{2})/g, function (m, h) { return String.fromCharCode(parseInt(h, 16)); });
    s = s.replace(/\\S\\(.)/g, function (m, c) { return String.fromCharCode(c.charCodeAt(0) + 128); });
    return s;
  }
  // ---- entiteettien indeksointi ----
  function Model(text) {
    this.text = text; this.ent = new Map(); this.byType = new Map(); this.cache = new Map();
    var i = text.indexOf('DATA;'); if (i < 0) throw new Error('Tiedosto ei ole IFC (STEP) -muotoa.');
    var n = text.length, p = i + 5, c;
    while (p < n) {
      c = text.charCodeAt(p);
      if (c === 35) { // '#'
        var q = p + 1, id = 0; while ((c = text.charCodeAt(q)) >= 48 && c <= 57) { id = id * 10 + c - 48; q++; }
        while (text.charCodeAt(q) === 32 || text.charCodeAt(q) === 10 || text.charCodeAt(q) === 13 || text.charCodeAt(q) === 9) q++;
        if (text.charCodeAt(q) !== 61) { p = q; continue; } q++;
        while (text.charCodeAt(q) <= 32) q++;
        var t0 = q; while ((c = text.charCodeAt(q)) !== 40 && q < n && c > 32) q++;
        var type = text.slice(t0, q).toUpperCase(); while (text.charCodeAt(q) !== 40 && q < n) q++;
        var a0 = q + 1, depth = 1, inS = false; q++;
        while (q < n && depth > 0) { c = text.charCodeAt(q);
          if (inS) { if (c === 39) { if (text.charCodeAt(q + 1) === 39) q++; else inS = false; } }
          else if (c === 39) inS = true; else if (c === 40) depth++; else if (c === 41) depth--;
          q++; }
        this.ent.set(id, [type, a0, q - 1]);
        var l = this.byType.get(type); if (!l) this.byType.set(type, l = []); l.push(id);
        p = q;
      } else if (c === 69 && text.startsWith('ENDSEC', p)) break; else p++;
    }
    this.scale = this.lengthScale();
  }
  Model.prototype.type = function (id) { var e = this.ent.get(id); return e ? e[0] : null; };
  Model.prototype.args = function (id) {
    var c = this.cache.get(id); if (c) return c;
    var e = this.ent.get(id); if (!e) return null;
    var s = this.text, p = e[1], end = e[2];
    function val() {
      while (p < end && s.charCodeAt(p) <= 32) p++;
      var ch = s[p];
      if (ch === '$' || ch === '*') { p++; return null; }
      if (ch === '#') { p++; var st = p; while (p < end && /[0-9]/.test(s[p])) p++; return { r: +s.slice(st, p) }; }
      if (ch === "'") { p++; var st2 = p; while (p < end) { if (s[p] === "'") { if (s[p + 1] === "'") { p += 2; continue; } break; } p++; } var str = s.slice(st2, p); p++; return decode(str); }
      if (ch === '.') { var st3 = ++p; while (p < end && s[p] !== '.') p++; var en = s.slice(st3, p); p++; return { e: en }; }
      if (ch === '(') { p++; var arr = []; while (p < end) { while (s.charCodeAt(p) <= 32) p++; if (s[p] === ')') { p++; break; } arr.push(val()); while (s.charCodeAt(p) <= 32) p++; if (s[p] === ',') p++; } return arr; }
      if (/[A-Za-z]/.test(ch)) { var st4 = p; while (p < end && /[A-Za-z0-9_]/.test(s[p])) p++; var tn = s.slice(st4, p).toUpperCase(); while (s.charCodeAt(p) <= 32) p++; if (s[p] === '(') { p++; var v = val(); while (p < end && s[p] !== ')') p++; p++; return { t: tn, v: v }; } return tn; }
      var st5 = p; while (p < end && /[-+0-9.eE]/.test(s[p])) p++; return parseFloat(s.slice(st5, p));
    }
    var out = []; while (p < end) { out.push(val()); while (p < end && s.charCodeAt(p) <= 32) p++; if (s[p] === ',') p++; }
    this.cache.set(id, out); return out;
  };
  Model.prototype.ref = function (v) { return v && typeof v === 'object' && v.r ? v.r : null; };
  Model.prototype.ofTypes = function (list) { var o = [], self = this; list.forEach(function (t) { var l = self.byType.get(t); if (l) o = o.concat(l); }); return o; };
  Model.prototype.lengthScale = function () {
    var self = this, sc = null;
    (this.byType.get('IFCSIUNIT') || []).forEach(function (id) { var a = self.args(id); if (a[1] && a[1].e === 'LENGTHUNIT' && sc === null) { var pre = a[2] && a[2].e; sc = { MILLI: 0.001, CENTI: 0.01, DECI: 0.1, KILO: 1000 }[pre] || 1; } });
    (this.byType.get('IFCCONVERSIONBASEDUNIT') || []).forEach(function (id) { var a = self.args(id); if (a[1] && a[1].e === 'LENGTHUNIT') { var nm = (a[2] || '').toUpperCase(); sc = nm.indexOf('FOOT') >= 0 ? 0.3048 : nm.indexOf('INCH') >= 0 ? 0.0254 : sc; } });
    return sc || 1;
  };
  // ---- matriisit (4×4, sarakevektorit, taulukko riveittäin 12 alkiota: R|t) ----
  function I() { return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0]; }
  function mul(A, B) { var C = new Array(12); for (var r = 0; r < 3; r++) { for (var c = 0; c < 3; c++) C[r * 4 + c] = A[r * 4] * B[c] + A[r * 4 + 1] * B[4 + c] + A[r * 4 + 2] * B[8 + c]; C[r * 4 + 3] = A[r * 4] * B[3] + A[r * 4 + 1] * B[7] + A[r * 4 + 2] * B[11] + A[r * 4 + 3]; } return C; }
  function ap(M, p) { return [M[0] * p[0] + M[1] * p[1] + M[2] * p[2] + M[3], M[4] * p[0] + M[5] * p[1] + M[6] * p[2] + M[7], M[8] * p[0] + M[9] * p[1] + M[10] * p[2] + M[11]]; }
  function norm(v) { var l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function frame(X, Z, O) { Z = norm(Z); var d = X[0] * Z[0] + X[1] * Z[1] + X[2] * Z[2]; X = norm([X[0] - d * Z[0], X[1] - d * Z[1], X[2] - d * Z[2]]); if (!isFinite(X[0]) || Math.hypot(X[0], X[1], X[2]) < 0.5) X = Math.abs(Z[2]) < 0.9 ? norm(cross([0, 0, 1], Z)) : [1, 0, 0]; var Y = cross(Z, X); return [X[0], Y[0], Z[0], O[0], X[1], Y[1], Z[1], O[1], X[2], Y[2], Z[2], O[2]]; }
  Model.prototype.pt = function (id) { var a = this.args(id); var c = a ? a[0] : [0, 0, 0]; return [c[0] || 0, c[1] || 0, c[2] || 0]; };
  Model.prototype.dir = function (id, def) { if (!id) return def; var a = this.args(id); var c = a[0]; return [c[0] || 0, c[1] || 0, c[2] || 0]; };
  Model.prototype.axis = function (id) { // Axis2Placement2D/3D → matriisi
    if (!id) return I(); var t = this.type(id), a = this.args(id);
    if (t === 'IFCAXIS2PLACEMENT2D') { var o = this.pt(this.ref(a[0])), x = this.dir(this.ref(a[1]), [1, 0, 0]); return frame([x[0], x[1], 0], [0, 0, 1], [o[0], o[1], 0]); }
    if (t === 'IFCAXIS2PLACEMENT3D') { return frame(this.dir(this.ref(a[2]), [1, 0, 0]), this.dir(this.ref(a[1]), [0, 0, 1]), this.pt(this.ref(a[0]))); }
    return I();
  };
  Model.prototype.placement = function (id) {
    if (!id) return I(); var k = 'P' + id; if (this.cache.has(k)) return this.cache.get(k);
    var t = this.type(id), M = I();
    if (t === 'IFCLOCALPLACEMENT') { var a = this.args(id); M = mul(this.placement(this.ref(a[0])), this.axis(this.ref(a[1]))); }
    this.cache.set(k, M); return M;
  };
  Model.prototype.cto = function (id) { // IfcCartesianTransformationOperator3D
    var a = this.args(id); if (!a) return I();
    var X = this.dir(this.ref(a[0]), [1, 0, 0]), Y = this.dir(this.ref(a[1]), [0, 1, 0]), O = this.pt(this.ref(a[2])), s = typeof a[3] === 'number' ? a[3] : 1, Z = a[4] ? this.dir(this.ref(a[4]), cross(X, Y)) : cross(norm(X), norm(Y));
    X = norm(X); Y = norm(Y); Z = norm(Z);
    return [X[0] * s, Y[0] * s, Z[0] * s, O[0], X[1] * s, Y[1] * s, Z[1] * s, O[1], X[2] * s, Y[2] * s, Z[2] * s, O[2]];
  };
  // ---- profiilit (2D-monikulmio) ----
  Model.prototype.curvePts = function (id) {
    var t = this.type(id), a = this.args(id), self = this, o = [];
    if (t === 'IFCPOLYLINE') return a[0].map(function (r) { return self.pt(r.r); });
    if (t === 'IFCINDEXEDPOLYCURVE') { var pl = this.args(this.ref(a[0]))[0]; return pl.map(function (c) { return [c[0], c[1], c[2] || 0]; }); }
    if (t === 'IFCCOMPOSITECURVE') { a[0].forEach(function (sg) { var sa = self.args(sg.r); o = o.concat(self.curvePts(self.ref(sa[sa.length - 1]))); }); return o; }
    if (t === 'IFCTRIMMEDCURVE') { return this.curvePts(this.ref(a[0])); }
    if (t === 'IFCCIRCLE') { var M = this.axis(this.ref(a[0])), r = a[1]; for (var i = 0; i < 24; i++) o.push(ap(M, [r * Math.cos(i / 24 * 2 * Math.PI), r * Math.sin(i / 24 * 2 * Math.PI), 0])); return o; }
    return o;
  };
  Model.prototype.profile = function (id) {
    var t = this.type(id), a = this.args(id), pts = [];
    if (t === 'IFCRECTANGLEPROFILEDEF' || t === 'IFCRECTANGLEHOLLOWPROFILEDEF' || t === 'IFCROUNDEDRECTANGLEPROFILEDEF') { var M = this.axis(this.ref(a[2])), x = a[3] / 2, y = a[4] / 2; pts = [[-x, -y, 0], [x, -y, 0], [x, y, 0], [-x, y, 0]].map(function (p) { return ap(M, p); }); }
    else if (t === 'IFCARBITRARYCLOSEDPROFILEDEF' || t === 'IFCARBITRARYPROFILEDEFWITHVOIDS') pts = this.curvePts(this.ref(a[2]));
    else if (t === 'IFCCIRCLEPROFILEDEF' || t === 'IFCCIRCLEHOLLOWPROFILEDEF') { var Mc = this.axis(this.ref(a[2])), r = a[3]; for (var i = 0; i < 16; i++) pts.push(ap(Mc, [r * Math.cos(i / 16 * 2 * Math.PI), r * Math.sin(i / 16 * 2 * Math.PI), 0])); }
    else if (/^IFC[ILTUCZ]SHAPEPROFILEDEF$|^IFCASYMMETRICISHAPEPROFILEDEF$/.test(t)) { var Mi = this.axis(this.ref(a[2])), w = (a[3] || 0) / 2, h = (a[4] || 0) / 2; pts = [[-w, -h, 0], [w, -h, 0], [w, h, 0], [-w, h, 0]].map(function (p) { return ap(Mi, p); }); }
    else if (t === 'IFCDERIVEDPROFILEDEF') { var Md = this.cto(this.ref(a[3])); pts = this.profile(this.ref(a[2])).map(function (p) { return ap(Md, p); }); }
    if (pts.length > 2) { var f = pts[0], l = pts[pts.length - 1]; if (Math.abs(f[0] - l[0]) < 1e-9 && Math.abs(f[1] - l[1]) < 1e-9) pts.pop(); }
    return pts;
  };
  // ---- kolmiointi (korvien leikkaus) ----
  function triangulate(P) {
    var n = P.length; if (n < 3) return []; if (n === 3) return [[0, 1, 2]];
    var area = 0; for (var i = 0; i < n; i++) { var j = (i + 1) % n; area += P[i][0] * P[j][1] - P[j][0] * P[i][1]; }
    var idx = []; for (i = 0; i < n; i++) idx.push(area >= 0 ? i : n - 1 - i);
    var out = [], guard = 0;
    function inside(a, b, c, p) { var d1 = (p[0] - b[0]) * (a[1] - b[1]) - (a[0] - b[0]) * (p[1] - b[1]), d2 = (p[0] - c[0]) * (b[1] - c[1]) - (b[0] - c[0]) * (p[1] - c[1]), d3 = (p[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (p[1] - a[1]); return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0)); }
    while (idx.length > 3 && guard++ < 5000) {
      var found = false;
      for (i = 0; i < idx.length; i++) {
        var a = P[idx[(i + idx.length - 1) % idx.length]], b = P[idx[i]], c = P[idx[(i + 1) % idx.length]];
        if ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) <= 1e-12) continue;
        var ok = true; for (var k = 0; k < idx.length; k++) { var q = P[idx[k]]; if (q === a || q === b || q === c) continue; if (inside(a, b, c, q)) { ok = false; break; } }
        if (!ok) continue;
        out.push([idx[(i + idx.length - 1) % idx.length], idx[i], idx[(i + 1) % idx.length]]); idx.splice(i, 1); found = true; break;
      }
      if (!found) break;
    }
    if (idx.length === 3) out.push([idx[0], idx[1], idx[2]]);
    if (!out.length) for (i = 1; i < n - 1; i++) out.push([0, i, i + 1]);
    return out;
  }
  // ---- geometria: palauttaa kolmiot (taulukko [x,y,z]-kolmikoita) ----
  Model.prototype.itemTris = function (id, M, out, depth) {
    if (!id || depth > 12) return; var t = this.type(id), a = this.args(id), self = this;
    if (t === 'IFCEXTRUDEDAREASOLID' || t === 'IFCEXTRUDEDAREASOLIDTAPERED') {
      var P = this.profile(this.ref(a[0])); if (P.length < 3) return;
      var Mp = mul(M, this.axis(this.ref(a[1]))), dv = this.dir(this.ref(a[2]), [0, 0, 1]), D = a[3]; dv = norm(dv);
      var top = P.map(function (p) { return [p[0] + dv[0] * D, p[1] + dv[1] * D, p[2] + dv[2] * D]; });
      var Pw = P.map(function (p) { return ap(Mp, p); }), Tw = top.map(function (p) { return ap(Mp, p); });
      triangulate(P).forEach(function (tr) { out.push(Pw[tr[0]], Pw[tr[2]], Pw[tr[1]], Tw[tr[0]], Tw[tr[1]], Tw[tr[2]]); });
      for (var i = 0; i < P.length; i++) { var j = (i + 1) % P.length; out.push(Pw[i], Pw[j], Tw[j], Pw[i], Tw[j], Tw[i]); }
    } else if (t === 'IFCBOOLEANCLIPPINGRESULT' || t === 'IFCBOOLEANRESULT') {
      if (a[0] && a[0].e === 'UNION') { this.itemTris(this.ref(a[1]), M, out, depth + 1); this.itemTris(this.ref(a[2]), M, out, depth + 1); }
      else this.itemTris(this.ref(a[1]), M, out, depth + 1);
    } else if (t === 'IFCMAPPEDITEM') {
      var rm = this.args(this.ref(a[0])), Mo = this.axis(this.ref(rm[0])), Mt = this.cto(this.ref(a[1]));
      this.repTris(this.ref(rm[1]), mul(mul(M, Mt), Mo), out, depth + 1);
    } else if (t === 'IFCFACETEDBREP' || t === 'IFCFACETEDBREPWITHVOIDS' || t === 'IFCADVANCEDBREP') {
      this.shellTris(this.ref(a[0]), M, out);
    } else if (t === 'IFCSHELLBASEDSURFACEMODEL' || t === 'IFCFACEBASEDSURFACEMODEL') {
      (a[0] || []).forEach(function (s) { self.shellTris(s.r, M, out); });
    } else if (t === 'IFCCLOSEDSHELL' || t === 'IFCOPENSHELL' || t === 'IFCCONNECTEDFACESET') { this.shellTris(id, M, out);
    } else if (t === 'IFCTRIANGULATEDFACESET' || t === 'IFCTRIANGULATEDIRREGULARNETWORK') {
      var C = this.args(this.ref(a[0]))[0], ci = a[3], pn = a[4];
      var gp = function (k) { var kk = pn ? pn[k - 1] : k; var c = C[kk - 1]; return ap(M, [c[0], c[1], c[2] || 0]); };
      (ci || []).forEach(function (tr) { out.push(gp(tr[0]), gp(tr[1]), gp(tr[2])); });
    } else if (t === 'IFCPOLYGONALFACESET') {
      var C2 = this.args(this.ref(a[0]))[0], pn2 = a[3];
      var gp2 = function (k) { var kk = pn2 ? pn2[k - 1] : k; var c = C2[kk - 1]; return ap(M, [c[0], c[1], c[2] || 0]); };
      (a[2] || []).forEach(function (f) { var fa = self.args(f.r)[0]; for (var i2 = 1; i2 < fa.length - 1; i2++) out.push(gp2(fa[0]), gp2(fa[i2]), gp2(fa[i2 + 1])); });
    } else if (t === 'IFCBOUNDINGBOX') {
      var c0 = this.pt(this.ref(a[0])); boxTris(M, c0, [a[1], a[2], a[3]], out);
    } else if (t === 'IFCBLOCK') {
      boxTris(mul(M, this.axis(this.ref(a[0]))), [0, 0, 0], [a[1], a[2], a[3]], out);
    } else if (t === 'IFCCSGSOLID') { this.itemTris(this.ref(a[0]), M, out, depth + 1); }
  };
  function boxTris(M, o, s, out) {
    var v = []; for (var k = 0; k < 8; k++) v.push(ap(M, [o[0] + (k & 1 ? s[0] : 0), o[1] + (k & 2 ? s[1] : 0), o[2] + (k & 4 ? s[2] : 0)]));
    [[0, 2, 3, 1], [4, 5, 7, 6], [0, 1, 5, 4], [2, 6, 7, 3], [0, 4, 6, 2], [1, 3, 7, 5]].forEach(function (f) { out.push(v[f[0]], v[f[1]], v[f[2]], v[f[0]], v[f[2]], v[f[3]]); });
  }
  Model.prototype.shellTris = function (id, M, out) {
    var self = this, a = this.args(id); if (!a) return;
    (a[0] || []).forEach(function (f) {
      var fb = self.args(f.r); if (!fb) return;
      (fb[0] || []).forEach(function (b) { var ba = self.args(b.r); if (!ba) return; var lt = self.type(self.ref(ba[0])); if (lt !== 'IFCPOLYLOOP') return;
        var pts = self.args(self.ref(ba[0]))[0].map(function (r) { return ap(M, self.pt(r.r)); });
        if (self.type(b.r) === 'IFCFACEOUTERBOUND' || fb[0].length === 1) for (var i = 1; i < pts.length - 1; i++) out.push(pts[0], pts[i], pts[i + 1]); });
    });
  };
  Model.prototype.repTris = function (id, M, out, depth) { var a = this.args(id), self = this; if (!a) return; (a[3] || []).forEach(function (it) { self.itemTris(it.r, M, out, depth || 0); }); };
  Model.prototype.productTris = function (id) {
    var a = this.args(id), self = this, out = []; if (!a) return out;
    var M = this.placement(this.ref(a[5])), pds = this.args(this.ref(a[6]));
    if (!pds) return out;
    var reps = (pds[2] || []).map(function (r) { return r.r; }), pick = null, box = null;
    reps.forEach(function (r) { var ra = self.args(r); var idn = (ra[1] || '').toLowerCase(); if (idn === 'body' && !pick) pick = r; if (idn === 'box') box = r; });
    if (!pick) reps.forEach(function (r) { var ra = self.args(r); var idn = (ra[1] || '').toLowerCase(); if (!pick && ['axis', 'footprint', 'box', 'annotation', 'profile', 'clearance'].indexOf(idn) < 0) pick = r; });
    this.repTris(pick || box, M, out, 0);
    if (!out.length && box && box !== pick) this.repTris(box, M, out, 0);
    var s = this.scale; for (var i = 0; i < out.length; i++) out[i] = [out[i][0] * s, out[i][1] * s, out[i][2] * s];
    return out;
  };
  // ---- relaatiot: tyypit, materiaalit, ominaisuudet, kerrokset ----
  Model.prototype.relations = function () {
    if (this._rel) return this._rel;
    var self = this, R = { type: new Map(), mat: new Map(), props: new Map(), storey: new Map(), storeys: [] };
    function add(map, ids, v) { (ids || []).forEach(function (r) { var l = map.get(r.r); if (!l) map.set(r.r, l = []); l.push(v); }); }
    (this.byType.get('IFCRELDEFINESBYTYPE') || []).forEach(function (id) { var a = self.args(id); var ta = self.args(self.ref(a[5])); add(R.type, a[4], { name: ta ? ta[2] : null, id: self.ref(a[5]) }); });
    (this.byType.get('IFCRELASSOCIATESMATERIAL') || []).forEach(function (id) { var a = self.args(id); add(R.mat, a[4], self.ref(a[5])); });
    (this.byType.get('IFCRELDEFINESBYPROPERTIES') || []).forEach(function (id) { var a = self.args(id); add(R.props, a[4], self.ref(a[5])); });
    (this.byType.get('IFCRELCONTAINEDINSPATIALSTRUCTURE') || []).forEach(function (id) { var a = self.args(id); var sa = self.args(self.ref(a[5])); var nm = sa ? (sa[2] || sa[7] || ('#' + self.ref(a[5]))) : ''; (a[4] || []).forEach(function (r) { R.storey.set(r.r, nm); }); });
    (this.byType.get('IFCBUILDINGSTOREY') || []).forEach(function (id) { var a = self.args(id); R.storeys.push({ id: id, name: a[2] || ('#' + id), elev: (typeof a[9] === 'number' ? a[9] : 0) * self.scale }); });
    R.storeys.sort(function (x, y) { return x.elev - y.elev; });
    // Elementit, jotka on liitetty kerrokseen välillisesti (esim. IfcElementAssembly)
    (this.byType.get('IFCRELAGGREGATES') || []).forEach(function (id) { var a = self.args(id); var parent = self.ref(a[4]); if (R.storey.has(parent)) (a[5] || []).forEach(function (r) { if (!R.storey.has(r.r)) R.storey.set(r.r, R.storey.get(parent)); }); });
    this._rel = R; return R;
  };
  Model.prototype.materialNames = function (id, depth, acc) {
    acc = acc || []; depth = depth || 0; if (!id || depth > 6) return acc;
    var t = this.type(id), a = this.args(id), self = this;
    if (t === 'IFCMATERIAL') { if (a[0]) acc.push(a[0]); return acc; }
    if (t === 'IFCMATERIALLAYERSET') { if (a[1]) acc.push(a[1]); }
    if (t === 'IFCMATERIALCONSTITUENTSET' || t === 'IFCMATERIALPROFILESET') { if (a[0]) acc.push(a[0]); }
    (a || []).forEach(function (v) { if (v && v.r) self.materialNames(v.r, depth + 1, acc); else if (Array.isArray(v)) v.forEach(function (w) { if (w && w.r) self.materialNames(w.r, depth + 1, acc); }); });
    return acc;
  };
  function pval(v) { if (v === null || v === undefined) return ''; if (typeof v === 'object') { if ('v' in v) return pval(v.v); if (v.e) return v.e === 'T' ? 'TRUE' : v.e === 'F' ? 'FALSE' : v.e; return ''; } return String(v); }
  Model.prototype.properties = function (id) {
    var R = this.relations(), self = this, out = {};
    function readSet(pid) {
      var t = self.type(pid), a = self.args(pid); if (!a) return;
      if (t === 'IFCPROPERTYSET') (a[4] || []).forEach(function (r) { var pa = self.args(r.r); if (self.type(r.r) === 'IFCPROPERTYSINGLEVALUE') out[a[2] + '.' + pa[0]] = pval(pa[2]); else if (self.type(r.r) === 'IFCPROPERTYENUMERATEDVALUE') out[a[2] + '.' + pa[0]] = (pa[2] || []).map(pval).join(', '); });
      if (t === 'IFCELEMENTQUANTITY') (a[5] || []).forEach(function (r) { var qa = self.args(r.r); if (qa) out[a[2] + '.' + qa[0]] = typeof qa[3] === 'number' ? qa[3] : pval(qa[3]); });
    }
    (R.props.get(id) || []).forEach(readSet);
    return out;
  };
  g.IFCModel = Model;
  g.IFCtri = triangulate;
})(window);
