/* Lastutec – pohjalevyn FEM-laskenta
   Mindlin-laattaelementti MITC4 (suorakaide, 3 vapausastetta/solmu: w, βx, βy),
   vain puristusta kantava Winkler-alusta (betoni + juotos), vain vetoa kantavat ankkurijouset,
   pilarin jalanjälki jäykkänä kappaleena (w = w0 − θx, βx = −θ, βy = 0, sakkomenetelmä).
   Epälineaarisuus (kosketus/ankkurit) ratkaistaan iteroimalla aktiivisia jousia.
   Yksiköt: N, mm. */
(function (g) {
  function grid(keys, hmax) {
    var k = keys.map(function (v) { return Math.round(v * 100) / 100; }).sort(function (a, b) { return a - b; });
    var u = [k[0]]; for (var i = 1; i < k.length; i++) if (k[i] - u[u.length - 1] > 0.5) u.push(k[i]);
    var out = [u[0]];
    for (i = 1; i < u.length; i++) { var L = u[i] - u[i - 1], nn = Math.max(1, Math.ceil(L / hmax - 1e-9)); for (var j = 1; j <= nn; j++) out.push(u[i - 1] + L * j / nn); }
    return out;
  }
  // MITC4-elementin jäykkyysmatriisi (12×12), solmut (−1,−1),(1,−1),(1,1),(−1,1)
  var XI = [-1, 1, 1, -1], ETA = [-1, -1, 1, 1], cache = {};
  function shp(xi, eta, hx, hy) {
    var N = [], dx = [], dy = [];
    for (var k = 0; k < 4; k++) { N[k] = 0.25 * (1 + xi * XI[k]) * (1 + eta * ETA[k]); dx[k] = 0.25 * XI[k] * (1 + eta * ETA[k]) * 2 / hx; dy[k] = 0.25 * ETA[k] * (1 + xi * XI[k]) * 2 / hy; }
    return { N: N, dx: dx, dy: dy };
  }
  function Bb(xi, eta, hx, hy) {
    var s = shp(xi, eta, hx, hy), B = [new Float64Array(12), new Float64Array(12), new Float64Array(12)];
    for (var k = 0; k < 4; k++) { B[0][3 * k + 1] = s.dx[k]; B[1][3 * k + 2] = s.dy[k]; B[2][3 * k + 1] = s.dy[k]; B[2][3 * k + 2] = s.dx[k]; }
    return B;
  }
  function BsRaw(xi, eta, hx, hy) {
    var s = shp(xi, eta, hx, hy), xz = new Float64Array(12), yz = new Float64Array(12);
    for (var k = 0; k < 4; k++) { xz[3 * k] = s.dx[k]; xz[3 * k + 1] = -s.N[k]; yz[3 * k] = s.dy[k]; yz[3 * k + 2] = -s.N[k]; }
    return { xz: xz, yz: yz };
  }
  function Ke(hx, hy, D, nu, Gk) {
    var key = hx.toFixed(3) + '_' + hy.toFixed(3) + '_' + D.toFixed(0) + '_' + Gk.toFixed(0);
    if (cache[key]) return cache[key];
    var K = new Float64Array(144), gp = 1 / Math.sqrt(3), dA = hx * hy / 4;
    var Db = [[D, nu * D, 0], [nu * D, D, 0], [0, 0, D * (1 - nu) / 2]];
    var A1 = BsRaw(0, 1, hx, hy).xz, C1 = BsRaw(0, -1, hx, hy).xz, B1 = BsRaw(1, 0, hx, hy).yz, D1 = BsRaw(-1, 0, hx, hy).yz;
    [[-gp, -gp], [gp, -gp], [gp, gp], [-gp, gp]].forEach(function (q) {
      var B = Bb(q[0], q[1], hx, hy), i, j, a, b;
      for (i = 0; i < 12; i++) for (j = 0; j < 12; j++) { var s = 0; for (a = 0; a < 3; a++) { if (!B[a][i]) continue; for (b = 0; b < 3; b++) s += B[a][i] * Db[a][b] * B[b][j]; } K[i * 12 + j] += s * dA; }
      var xz = new Float64Array(12), yz = new Float64Array(12);
      for (i = 0; i < 12; i++) { xz[i] = 0.5 * (1 + q[1]) * A1[i] + 0.5 * (1 - q[1]) * C1[i]; yz[i] = 0.5 * (1 + q[0]) * B1[i] + 0.5 * (1 - q[0]) * D1[i]; }
      for (i = 0; i < 12; i++) for (j = 0; j < 12; j++) K[i * 12 + j] += Gk * (xz[i] * xz[j] + yz[i] * yz[j]) * dA;
    });
    cache[key] = K; return K;
  }
  // Nauhamatriisin Cholesky (symmetrinen, positiivisesti definiitti), tallennus A[r*(bw+1)+(c−r)]
  function cholBand(A, n, bw) {
    var w = bw + 1;
    for (var j = 0; j < n; j++) {
      var s = A[j * w];
      var k0 = Math.max(0, j - bw);
      for (var k = k0; k < j; k++) { var l = A[k * w + (j - k)]; s -= l * l; }
      if (s <= 0) return false; var d = Math.sqrt(s); A[j * w] = d;
      var iMax = Math.min(n - 1, j + bw);
      for (var i = j + 1; i <= iMax; i++) {
        var t = A[j * w + (i - j)];
        var kk0 = Math.max(0, i - bw);
        for (k = Math.max(k0, kk0); k < j; k++) t -= A[k * w + (j - k)] * A[k * w + (i - k)];
        A[j * w + (i - j)] = t / d;
      }
    }
    return true;
  }
  function solveBand(L, n, bw, b) {
    var w = bw + 1, y = new Float64Array(b), i, k;
    for (i = 0; i < n; i++) { var s = y[i]; for (k = Math.max(0, i - bw); k < i; k++) s -= L[k * w + (i - k)] * y[k]; y[i] = s / L[i * w]; }
    for (i = n - 1; i >= 0; i--) { s = y[i]; var kM = Math.min(n - 1, i + bw); for (k = i + 1; k <= kM; k++) s -= L[i * w + (k - i)] * y[k]; y[i] = s / L[i * w]; }
    return y;
  }

  function solve(o) {
    var t0 = performance.now();
    var E = o.E, nu = 0.3, t = o.tp, D = E * t * t * t / (12 * (1 - nu * nu)), Gk = 5 / 6 * E / (2 * (1 + nu)) * t;
    var xs = grid(o.xkeys, o.hmax), ys = grid(o.ykeys, o.hmax), nx = xs.length, ny = ys.length, nn = nx * ny, n = 3 * nn, bw = 3 * (ny + 1) + 2;
    var id = function (i, j) { return i * ny + j; };
    var K0 = new Float64Array(n * (bw + 1)), w1 = bw + 1;
    function addK(K, r, c, v) { if (c < r) { var tt = r; r = c; c = tt; } K[r * w1 + (c - r)] += v; }
    for (var i = 0; i < nx - 1; i++) for (var j = 0; j < ny - 1; j++) {
      var hx = xs[i + 1] - xs[i], hy = ys[j + 1] - ys[j], Ke_ = Ke(hx, hy, D, nu, Gk), nd = [id(i, j), id(i + 1, j), id(i + 1, j + 1), id(i, j + 1)];
      for (var a = 0; a < 12; a++) { var ra = 3 * nd[Math.floor(a / 3)] + a % 3; for (var b = a; b < 12; b++) { var cb = 3 * nd[Math.floor(b / 3)] + b % 3; var v = Ke_[a * 12 + b]; if (v) { if (ra === cb) K0[ra * w1] += v; else addK(K0, ra, cb, v); } } }
    }
    // solmujen vaikutusalat
    var area = new Float64Array(nn), dmw = 0, dmr = 0;
    for (i = 0; i < nx; i++) for (j = 0; j < ny; j++) {
      var ax = ((i > 0 ? xs[i] - xs[i - 1] : 0) + (i < nx - 1 ? xs[i + 1] - xs[i] : 0)) / 2, ay = ((j > 0 ? ys[j] - ys[j - 1] : 0) + (j < ny - 1 ? ys[j + 1] - ys[j] : 0)) / 2;
      area[id(i, j)] = ax * ay; }
    for (i = 0; i < nn; i++) { dmw = Math.max(dmw, K0[3 * i * w1]); dmr = Math.max(dmr, K0[(3 * i + 1) * w1], K0[(3 * i + 2) * w1]); }
    var kpw = 1e4 * dmw, kpr = 1e4 * dmr;
    // jalanjälki
    var foot = [];
    for (i = 0; i < nx; i++) for (j = 0; j < ny; j++) if (o.foot(xs[i], ys[j])) foot.push(id(i, j));
    // ankkurit
    var bolts = o.bolts.map(function (bb) { var bi = 0, bj = 0, d = 1e9;
      for (var ii = 0; ii < nx; ii++) if (Math.abs(xs[ii] - bb.x) < d) { d = Math.abs(xs[ii] - bb.x); bi = ii; }
      d = 1e9; for (var jj = 0; jj < ny; jj++) if (Math.abs(ys[jj] - bb.y) < d) { d = Math.abs(ys[jj] - bb.y); bj = jj; }
      return { node: id(bi, bj), k: bb.k, x: xs[bi], y: ys[bj] }; });
    // kytkentä isäntävapausasteisiin (w0, θ)
    var C0 = new Float64Array(n), C1 = new Float64Array(n), Km = [[0, 0], [0, 0]], diag = new Float64Array(n);
    foot.forEach(function (q) { var x = xs[Math.floor(q / ny)];
      diag[3 * q] += kpw; C0[3 * q] += -kpw; C1[3 * q] += kpw * x; Km[0][0] += kpw; Km[0][1] += -kpw * x; Km[1][1] += kpw * x * x;
      diag[3 * q + 1] += kpr; C1[3 * q + 1] += kpr; Km[1][1] += kpr; diag[3 * q + 2] += kpr; });
    Km[1][0] = Km[0][1];
    var F = [-o.N, o.M];
    var fAct = new Uint8Array(nn).fill(1), bAct = new Uint8Array(bolts.length), it, u, m, conv = false;
    for (it = 0; it < 40; it++) {
      var K = K0.slice();
      for (i = 0; i < n; i++) K[i * w1] += diag[i];
      for (i = 0; i < nn; i++) if (fAct[i]) K[3 * i * w1] += o.ks * area[i];
      bolts.forEach(function (bb, k) { if (bAct[k]) K[3 * bb.node * w1] += bb.k; });
      // pieni jäykkyys kaikkiin w:iin, jotta matriisi pysyy säännöllisenä irtautumisalueella
      for (i = 0; i < nn; i++) K[3 * i * w1] += 1e-9 * dmw;
      if (!cholBand(K, n, bw)) return { error: 'Jäykkyysmatriisi ei ole positiivisesti definiitti.' };
      var Y0 = solveBand(K, n, bw, C0), Y1 = solveBand(K, n, bw, C1);
      var S00 = Km[0][0], S01 = Km[0][1], S11 = Km[1][1];
      for (i = 0; i < n; i++) { S00 -= C0[i] * Y0[i]; S01 -= C0[i] * Y1[i]; S11 -= C1[i] * Y1[i]; }
      var det = S00 * S11 - S01 * S01;
      if (Math.abs(det) < 1e-30) return { error: 'Liitos on mekanismi (ei tukea).' };
      m = [(S11 * F[0] - S01 * F[1]) / det, (-S01 * F[0] + S00 * F[1]) / det];
      u = new Float64Array(n); for (i = 0; i < n; i++) u[i] = -(Y0[i] * m[0] + Y1[i] * m[1]);
      var ch = 0;
      for (i = 0; i < nn; i++) { var na = u[3 * i] < 0 ? 1 : 0; if (na !== fAct[i]) { fAct[i] = na; ch++; } }
      bolts.forEach(function (bb, k) { var na = u[3 * bb.node] > 0 ? 1 : 0; if (na !== bAct[k]) { bAct[k] = na; ch++; } });
      if (!ch) { conv = true; break; }
    }
    // tulokset
    var w = new Float64Array(nn), p = new Float64Array(nn), Rc = 0, pmax = 0, wmin = 0, wmax = 0;
    for (i = 0; i < nn; i++) { w[i] = u[3 * i]; if (fAct[i] && w[i] < 0) { p[i] = -o.ks * w[i]; Rc += p[i] * area[i]; pmax = Math.max(pmax, p[i]); } wmin = Math.min(wmin, w[i]); wmax = Math.max(wmax, w[i]); }
    var bf = bolts.map(function (bb, k) { return { x: bb.x, y: bb.y, F: bAct[k] ? bb.k * u[3 * bb.node] : 0, w: u[3 * bb.node] }; });
    var Fb = bf.reduce(function (s, b) { return s + b.F; }, 0);
    // jännitykset elementeittäin (2×2 Gaussin pisteiden suurin)
    var el = [], vmax = 0, vcmax = 0, gp = 1 / Math.sqrt(3), Db = [D, nu * D, D * (1 - nu) / 2], at = null;
    for (i = 0; i < nx - 1; i++) for (j = 0; j < ny - 1; j++) {
      hx = xs[i + 1] - xs[i]; hy = ys[j + 1] - ys[j]; nd = [id(i, j), id(i + 1, j), id(i + 1, j + 1), id(i, j + 1)];
      var ue = new Float64Array(12); for (a = 0; a < 4; a++) for (b = 0; b < 3; b++) ue[3 * a + b] = u[3 * nd[a] + b];
      var vm = 0, sx0 = 0, sy0 = 0, txy0 = 0;
      [[-gp, -gp], [gp, -gp], [gp, gp], [-gp, gp]].forEach(function (q) {
        var B = Bb(q[0], q[1], hx, hy), kx = 0, ky = 0, kxy = 0;
        for (var c = 0; c < 12; c++) { kx += B[0][c] * ue[c]; ky += B[1][c] * ue[c]; kxy += B[2][c] * ue[c]; }
        var mx = Db[0] * kx + Db[1] * ky, my = Db[1] * kx + Db[0] * ky, mxy = Db[2] * kxy;
        var sx = 6 * mx / (t * t), sy = 6 * my / (t * t), txy = 6 * mxy / (t * t), v = Math.sqrt(sx * sx + sy * sy - sx * sy + 3 * txy * txy);
        if (v > vm) { vm = v; sx0 = sx; sy0 = sy; txy0 = txy; } });
      // keskipisteen arvo (tasaisempi, vähemmän verkkoriippuvainen)
      var Bc = Bb(0, 0, hx, hy), kxc = 0, kyc = 0, kxyc = 0;
      for (var c2 = 0; c2 < 12; c2++) { kxc += Bc[0][c2] * ue[c2]; kyc += Bc[1][c2] * ue[c2]; kxyc += Bc[2][c2] * ue[c2]; }
      var mxc = Db[0] * kxc + Db[1] * kyc, myc = Db[1] * kxc + Db[0] * kyc, mxyc = Db[2] * kxyc, sxc = 6 * mxc / (t * t), syc = 6 * myc / (t * t), txc = 6 * mxyc / (t * t);
      var vmc = Math.sqrt(sxc * sxc + syc * syc - sxc * syc + 3 * txc * txc);
      var inFoot = o.foot((xs[i] + xs[i + 1]) / 2, (ys[j] + ys[j + 1]) / 2);
      el.push({ x0: xs[i], x1: xs[i + 1], y0: ys[j], y1: ys[j + 1], vm: vm, vmc: vmc, sx: sx0, sy: sy0, txy: txy0, foot: inFoot, w: (w[nd[0]] + w[nd[1]] + w[nd[2]] + w[nd[3]]) / 4, p: (p[nd[0]] + p[nd[1]] + p[nd[2]] + p[nd[3]]) / 4 });
      if (!inFoot && vm > vmax) vmax = vm;
      if (!inFoot && vmc > vcmax) { vcmax = vmc; at = el[el.length - 1]; }
    }
    return { xs: xs, ys: ys, nx: nx, ny: ny, w: w, p: p, el: el, vmax: vmax, vcmax: vcmax, at: at, pmax: pmax, Rc: Rc, Fb: Fb, bolts: bf, w0: m[0], th: m[1], wmin: wmin, wmax: wmax,
      it: it + 1, conv: conv, n: n, ne: (nx - 1) * (ny - 1), D: D, ms: performance.now() - t0, contactArea: Array.prototype.reduce.call(fAct, function (s, f, k) { return s + (f ? area[k] : 0); }, 0) };
  }
  g.PlateFEM = { solve: solve };
})(window);
