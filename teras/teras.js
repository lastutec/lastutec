/* Lastutec – Teräsrakenteet: yhteiset tiedot
   Valssattujen I-profiilien poikkileikkaussuureet lasketaan mitoista (h, b, tw, tf, r)
   ArcelorMittalin / EN 10365 -luettelojen kaavoilla. Yksiköt: mm, N. */
(function (g) {
  var DIM = {
    IPE: [[80,80,46,3.8,5.2,5],[100,100,55,4.1,5.7,7],[120,120,64,4.4,6.3,7],[140,140,73,4.7,6.9,7],[160,160,82,5.0,7.4,9],[180,180,91,5.3,8.0,9],[200,200,100,5.6,8.5,12],[220,220,110,5.9,9.2,12],[240,240,120,6.2,9.8,15],[270,270,135,6.6,10.2,15],[300,300,150,7.1,10.7,15],[330,330,160,7.5,11.5,18],[360,360,170,8.0,12.7,18],[400,400,180,8.6,13.5,21],[450,450,190,9.4,14.6,21],[500,500,200,10.2,16.0,21],[550,550,210,11.1,17.2,24],[600,600,220,12.0,19.0,24]],
    HEA: [[100,96,100,5,8,12],[120,114,120,5,8,12],[140,133,140,5.5,8.5,12],[160,152,160,6,9,15],[180,171,180,6,9.5,15],[200,190,200,6.5,10,18],[220,210,220,7,11,18],[240,230,240,7.5,12,21],[260,250,260,7.5,12.5,24],[280,270,280,8,13,24],[300,290,300,8.5,14,27],[320,310,300,9,15.5,27],[340,330,300,9.5,16.5,27],[360,350,300,10,17.5,27],[400,390,300,11,19,27],[450,440,300,11.5,21,27],[500,490,300,12,23,27],[550,540,300,12.5,24,27],[600,590,300,13,25,27]],
    HEB: [[100,100,100,6,10,12],[120,120,120,6.5,11,12],[140,140,140,7,12,12],[160,160,160,8,13,15],[180,180,180,8.5,14,15],[200,200,200,9,15,18],[220,220,220,9.5,16,18],[240,240,240,10,17,21],[260,260,260,10,17.5,24],[280,280,280,10.5,18,24],[300,300,300,11,19,27],[320,320,300,11.5,20.5,27],[340,340,300,12,21.5,27],[360,360,300,12.5,22.5,27],[400,400,300,13.5,24,27],[450,450,300,14,26,27],[500,500,300,14.5,28,27],[550,550,300,15,29,27],[600,600,300,15.5,30,27]]
  };
  var PI = Math.PI;
  function props(name, h, b, tw, tf, r) {
    var hw = h - 2 * tf, d = hw - 2 * r;
    var A = 2 * b * tf + hw * tw + (4 - PI) * r * r;
    var Iy = (b * h * h * h - (b - tw) * Math.pow(hw, 3)) / 12 + 0.03 * Math.pow(r, 4) + 0.2146 * r * r * Math.pow(hw - 0.4468 * r, 2);
    var Iz = (2 * tf * b * b * b + hw * tw * tw * tw) / 12 + 0.03 * Math.pow(r, 4) + 0.2146 * r * r * Math.pow(tw + 0.4468 * r, 2);
    var Wply = tw * h * h / 4 + (b - tw) * (h - tf) * tf + (4 - PI) / 2 * r * r * hw + (3 * PI - 10) / 3 * r * r * r;
    var Wplz = b * b * tf / 2 + hw / 4 * tw * tw + r * r * r * (10 / 3 - PI) + (2 - PI / 2) * tw * r * r;
    var Avz = Math.max(A - 2 * b * tf + (tw + 2 * r) * tf, hw * tw);
    var Avy = 2 * b * tf;
    var al = -0.042 + 0.2204 * tw / tf + 0.1355 * r / tf - 0.0865 * r * tw / (tf * tf) - 0.0725 * tw * tw / (tf * tf);
    var D = (Math.pow(tf + r, 2) + tw * (r + tw / 4)) / (2 * r + tf);
    var It = 2 / 3 * b * Math.pow(tf, 3) + 1 / 3 * hw * Math.pow(tw, 3) + 2 * al * Math.pow(D, 4) - 0.42 * Math.pow(tf, 4);
    var Iw = Iz * Math.pow(h - tf, 2) / 4;
    return { name: name, h: h, b: b, tw: tw, tf: tf, r: r, hw: hw, d: d, A: A, Iy: Iy, Iz: Iz,
      Wely: Iy / (h / 2), Welz: Iz / (b / 2), Wply: Wply, Wplz: Wplz, iy: Math.sqrt(Iy / A), iz: Math.sqrt(Iz / A),
      Avz: Avz, Avy: Avy, It: It, Iw: Iw, G: A * 7.85e-6 };
  }
  var PROF = {}, ORDER = [];
  Object.keys(DIM).forEach(function (s) { DIM[s].forEach(function (x) { var n = s + ' ' + x[0]; PROF[n] = props(n, x[1], x[2], x[3], x[4], x[5]); ORDER.push(n); }); });

  // Teräslajit: SFS-EN 1993-1-1 taulukko 3.1 (t ≤ 40 / 40 < t ≤ 80), βw SFS-EN 1993-1-8 taulukko 4.1
  var STEEL = {
    S235: { fy: [235, 215], fu: [360, 360], bw: 0.80 },
    S275: { fy: [275, 255], fu: [430, 410], bw: 0.85 },
    S355: { fy: [355, 335], fu: [510, 470], bw: 0.90 },
    S420: { fy: [420, 390], fu: [520, 500], bw: 1.00, label: 'S420 M/ML' },
    S460: { fy: [460, 430], fu: [540, 530], bw: 1.00, label: 'S460 M/ML' }
  };
  function steel(grade, t) { var s = STEEL[grade], i = t > 40 ? 1 : 0; return { grade: grade, label: s.label || grade, fy: s.fy[i], fu: s.fu[i], bw: s.bw, eps: Math.sqrt(235 / s.fy[i]) }; }

  // Ruuvit: d0 normaalireikä, As jännityspinta-ala
  var BOLTS = { M12: { d: 12, d0: 13, As: 84.3 }, M16: { d: 16, d0: 18, As: 157 }, M20: { d: 20, d0: 22, As: 245 }, M22: { d: 22, d0: 24, As: 303 },
    M24: { d: 24, d0: 26, As: 353 }, M27: { d: 27, d0: 30, As: 459 }, M30: { d: 30, d0: 33, As: 561 }, M36: { d: 36, d0: 39, As: 817 } };
  var BCLS = { '4.6': { fyb: 240, fub: 400, av: 0.6 }, '5.6': { fyb: 300, fub: 500, av: 0.6 }, '8.8': { fyb: 640, fub: 800, av: 0.6 }, '10.9': { fyb: 900, fub: 1000, av: 0.5 } };

  // Suomen kansallinen liite (SFS-EN 1993-1-1/NA, 1993-1-8/NA)
  var GAMMA = { M0: 1.0, M1: 1.0, M2: 1.25 };
  var E = 210000, Gmod = 81000;

  function n(x, d) { if (d === undefined) d = 1; return isFinite(x) ? x.toLocaleString('fi-FI', { minimumFractionDigits: d, maximumFractionDigits: d }) : '–'; }
  function fill(sel, list, val) { sel.innerHTML = list.map(function (o) { var v = typeof o === 'string' ? o : o[0], t = typeof o === 'string' ? o : o[1]; return '<option value="' + v + '"' + (v === val ? ' selected' : '') + '>' + t + '</option>'; }).join(''); }
  function steps(list) {
    return list.map(function (s, i) {
      return '<div class="step"><span class="no">' + String(i + 1).padStart(2, '0') + '</span><div><h3>' + s[0] + '</h3><div class="math">' +
        s.slice(1).map(function (l) { return '<span>' + l + '</span>'; }).join('') + '</div></div></div>';
    }).join('');
  }
  function ok(u) { return u <= 1 ? '<b class="ok">✓ OK</b>' : '<b class="nok">✗ EI OK</b>'; }
  function bar(u) { var w = Math.max(0, Math.min(u, 1)) * 100; return '<div class="ubar"><i class="' + (u > 1 ? 'over' : '') + '" style="width:' + w + '%"></i></div>'; }

  // Lomakeotsikot: kääritään teksti spaniin, jotta alaindeksit pysyvät samalla rivillä
  function wrapLabels(root) {
    (root || document).querySelectorAll('label:not(.chk)').forEach(function (lb) {
      if (lb.dataset.w) return; lb.dataset.w = 1;
      var ctl = lb.querySelector('input,select'); if (!ctl) return;
      var sp = document.createElement('span');
      while (lb.firstChild && lb.firstChild !== ctl) sp.appendChild(lb.firstChild);
      lb.insertBefore(sp, ctl);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { wrapLabels(); }); else wrapLabels();

  g.LT = { wrapLabels: wrapLabels, PROF: PROF, ORDER: ORDER, STEEL: STEEL, steel: steel, BOLTS: BOLTS, BCLS: BCLS, GAMMA: GAMMA, E: E, G: Gmod, n: n, fill: fill, steps: steps, ok: ok, bar: bar };
})(window);
