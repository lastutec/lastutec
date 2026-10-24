/* Lastutec – Puurakenteet: yhteiset tiedot
   Lähde: Puuinfo, Puurakenteiden lyhennetty suunnitteluohje, Eurokoodi 5, 5. painos 2020 (päivitys 22.7.2020),
   joka perustuu standardeihin EN 1995-1-1 ja Suomen kansalliseen liitteeseen sekä RIL 205-1-2017. */
(function (g) {
  'use strict';
  // Taulukko 2.7: materiaalin osavarmuusluvut γM (perusyhdistelmät); onnettomuusyhdistelmät 1,0
  var GAMMA = { saha: 1.3, liima: 1.25, lvl: 1.2, vaneri: 1.2, osb: 1.2, lastu: 1.3, kuitu: 1.3, liitos: 1.3 };
  // Taulukko 3.1: kmod [käyttöluokka][aikaluokka: P, K, H]
  var KMOD = {
    puu: { 1: [0.60, 0.80, 1.10], 2: [0.60, 0.80, 1.10], 3: [0.50, 0.65, 0.90] },        // sahatavara, pyöreä puu, liimapuu, LVL, vaneri, CLT
    osb2: { 1: [0.30, 0.65, 1.10], 2: [0.20, 0.45, 0.80] },                               // lastulevy P4, OSB/2, kova kuitulevy
    osb3: { 1: [0.40, 0.70, 1.10], 2: [0.30, 0.55, 0.90] },                               // lastulevy P6, OSB/3, OSB/4
    mbh: { 1: [0.20, 0.60, 1.10], 2: [null, null, 0.80] }                                 // puolikovat kuitulevyt
  };
  // Taulukko 3.2: kdef [KL1, KL2, KL3]
  var KDEF = { puu: [0.60, 0.80, 2.00], vaneri: [0.80, 1.00, 2.50], osb2: [2.25, null, null], osb3: [1.50, 2.25, null], p4: [2.25, null, null], p6: [1.50, null, null], kova: [2.25, 3.00, null], mbh: [3.00, 4.00, null], mdf: [2.25, 3.00, null] };
  // Taulukot 3.3 ja 3.4: sauvamaiset materiaalit (N/mm², kg/m³)
  var MAT = {
    C18: { g: 'Sahatavara', name: 'C18 (T1)', gm: 'saha', km: 'puu', kd: 'puu', fm: 18, ft0: 10, ft90: 0.4, fc0: 18, fc90: 2.2, fv: 3.4, E: 9000, E90: 300, G: 560, rk: 320, rm: 380 },
    C24: { g: 'Sahatavara', name: 'C24 (T2)', gm: 'saha', km: 'puu', kd: 'puu', fm: 24, ft0: 14.5, ft90: 0.4, fc0: 21, fc90: 2.5, fv: 4.0, E: 11000, E90: 370, G: 690, rk: 350, rm: 420 },
    C30: { g: 'Sahatavara', name: 'C30 (T3)', gm: 'saha', km: 'puu', kd: 'puu', fm: 30, ft0: 19, ft90: 0.4, fc0: 24, fc90: 2.7, fv: 4.0, E: 12000, E90: 400, G: 750, rk: 380, rm: 460 },
    GL24c: { g: 'Liimapuu', name: 'GL24c', gm: 'liima', km: 'puu', kd: 'puu', fm: 24, ft0: 17, ft90: 0.5, fc0: 21.5, fc90: 2.5, fv: 3.5, E: 11000, E90: 300, G: 650, rk: 365, rm: 400 },
    GL30c: { g: 'Liimapuu', name: 'GL30c', gm: 'liima', km: 'puu', kd: 'puu', fm: 30, ft0: 19.5, ft90: 0.5, fc0: 24.5, fc90: 2.5, fv: 3.5, E: 13000, E90: 300, G: 650, rk: 390, rm: 430 },
    GL30cs: { g: 'Liimapuu', name: 'GL30cs (halkaistu)', gm: 'liima', km: 'puu', kd: 'puu', fm: 28, ft0: 18.7, ft90: 0.5, fc0: 23.3, fc90: 3.0, fv: 3.5, E: 12500, E90: 300, G: 650, rk: 390, rm: 430 },
    KS: { g: 'LVL', name: 'Kerto-S', gm: 'lvl', km: 'puu', kd: 'puu', fm: 44, s: 0.12, fmflat: 50, ft0: 35, ft90: 0.8, fc0: 35, fc90: 6, fc90flat: 1.8, fv: 4.1, fr: 2.3, E: 13800, G: 600, rk: 480, rm: 510, lvl: true },
    KT: { g: 'LVL', name: 'Kerto-T', gm: 'lvl', km: 'puu', kd: 'puu', fm: 27, s: 0.15, fmflat: 32, ft0: 24, ft90: 0.5, fc0: 26, fc90: 4, fc90flat: 1.0, fv: 2.4, fr: 1.3, E: 10000, G: 400, rk: 410, rm: 440, lvl: true },
    KQ: { g: 'LVL', name: 'Kerto-Q', gm: 'lvl', km: 'puu', kd: 'puu', fm: 32, s: 0.12, fmflat: 36, ft0: 26, ft90: 6.0, fc0: 26, fc90: 9, fc90flat: 2.2, fv: 4.5, fr: 1.3, E: 10500, G: 600, rk: 480, rm: 510, lvl: true }
  };
  var PROPS = [['fm', 'Taivutus', 'f<sub>m</sub>'], ['ft0', 'Veto syysuuntaan', 'f<sub>t,0</sub>'], ['ft90', 'Veto poikittain', 'f<sub>t,90</sub>'], ['fc0', 'Puristus syysuuntaan', 'f<sub>c,0</sub>'], ['fc90', 'Puristus poikittain', 'f<sub>c,90</sub>'], ['fv', 'Leikkaus', 'f<sub>v</sub>']];
  // Taulukko 3.5: puulevyt, paksuusluokat 4-5, 6-8, 9-11, 12-17, 18-23, 24-30 mm
  var TCL = [[4, 5], [6, 8], [9, 11], [12, 17], [18, 23], [24, 30]];
  var PLATE = {
    ohut: { name: 'Havuvaneri, ohutviiluinen (1,4 mm)', gm: 'vaneri', km: 'puu', kd: 'vaneri', rk: 460,
      fm0: [37, 29, 26, 23, 22, 21], fm90: [6, 16, 18, 19, 19, 19], fv: [7, 7, 7, 7, 7, 7], fr0: [1.7, 2.0, 1.7, 1.6, 1.6, 1.6], fr90: [null, 1.1, 1.4, 1.4, 1.5, 1.5], E0: [12200, 9400, 8400, 7600, 7300, 7000], E90: [760, 3500, 4500, 5000, 5500, 5700] },
    paksu: { name: 'Havuvaneri, paksuviiluinen (2,6–3,2 mm)', gm: 'vaneri', km: 'puu', kd: 'vaneri', rk: 460,
      fm0: [null, null, 28, 22, 20, 18], fm90: [null, null, 3.8, 8.3, 12, 12], fv: [null, null, 3.5, 3.5, 3.5, 3.5], fr0: [null, null, 0.9, 0.9, 0.9, 1.0], fr90: [null, null, null, null, 0.6, null], E0: [null, null, 11400, 9100, 8100, 7500], E90: [null, null, 540, 1700, 3400, 3800] },
    koivu: { name: 'Koivuvaneri', gm: 'vaneri', km: 'puu', kd: 'vaneri', rk: 630,
      fm0: [65, 50, 45, 41, 39, 38], fm90: [10, 29, 32, 33, 34, 34], fv: [9.5, 9.5, 9.5, 9.5, 9.5, 9.5], fr0: [2.7, 3.2, 2.6, 2.6, 2.5, 2.5], fr90: [null, 1.7, 2.3, 2.3, 2.3, 2.3], E0: [16400, 12700, 11300, 10000, 9800, 9500], E90: [1000, 4700, 6100, 7100, 7400, 7700] },
    osb3: { name: 'OSB/3', gm: 'osb', km: 'osb3', kd: 'osb3', rk: 550,
      fm0: [null, 18, 16, 16, 14, null], fm90: [null, 9, 8.2, 8.2, 7.4, null], fv: [null, 6.8, 6.8, 6.8, 6.8, null], fr0: [null, 1, 1, 1, 1, null], fr90: [null, 1, 1, 1, 1, null], E0: [null, 4900, 4900, 4900, 4900, null], E90: [null, 1900, 1900, 1900, 1900, null] },
    osb2: { name: 'OSB/2 (vain KL1)', gm: 'osb', km: 'osb2', kd: 'osb2', rk: 550,
      fm0: [null, 18, 16, 16, 14, null], fm90: [null, 9, 8.2, 8.2, 7.4, null], fv: [null, 6.8, 6.8, 6.8, 6.8, null], fr0: [null, 1, 1, 1, 1, null], fr90: [null, 1, 1, 1, 1, null], E0: [null, 4900, 4900, 4900, 4900, null], E90: [null, 1900, 1900, 1900, 1900, null] },
    p4: { name: 'Lastulevy P4 (vain KL1)', gm: 'lastu', km: 'osb2', kd: 'p4', rk: 600,
      fm0: [null, 14, 14, 12, 10, 9], fv: [null, 6.6, 6.6, 6.1, 5.5, 4.8], fr0: [null, 1.8, 1.8, 1.6, 1.4, 1.2], E0: [null, 3200, 3200, 2900, 2700, 2400] },
    p6: { name: 'Lastulevy P6 (vain KL1)', gm: 'lastu', km: 'osb3', kd: 'p6', rk: 600,
      fm0: [null, 16, 16, 15, 13, 12], fv: [null, 7.8, 7.8, 7.3, 6.8, 6.5], fr0: [null, 1.9, 1.9, 1.7, 1.7, 1.7], E0: [null, 4400, 4400, 4100, 3500, 3300] }
  };
  function tclass(t) { for (var i = 0; i < TCL.length; i++) if (t >= TCL[i][0] && t <= TCL[i][1] + 0.999) return i; return t < 4 ? -1 : t > 30 ? 6 : TCL.findIndex(function (c) { return t < c[0]; }); }
  var AIKA = [['P', 'Pysyvä (yli 10 v): omapaino, kiinteät laitteet, kevyet väliseinät'], ['K', 'Keskipitkä (1 vk – 6 kk): lumi, hyötykuormat A–D, F, G'], ['H', 'Hetkellinen: tuuli, onnettomuuskuorma']];
  var AIKAI = { P: 0, K: 1, H: 2 };
  function kmod(km, kl, ai) { var t = KMOD[km], r = t && t[kl]; return r ? r[AIKAI[ai]] : null; }
  function kdef(kd, kl) { var r = KDEF[kd]; return r ? r[kl - 1] : null; }
  function n(x, d) { if (d === undefined) d = 2; return x === null || x === undefined || !isFinite(x) ? '–' : x.toLocaleString('fi-FI', { minimumFractionDigits: d, maximumFractionDigits: d }); }
  function fill(sel, list, val) { sel.innerHTML = list.map(function (o) { var v = typeof o === 'string' ? o : o[0], t = typeof o === 'string' ? o : o[1]; return '<option value="' + v + '"' + (String(v) === String(val) ? ' selected' : '') + '>' + t + '</option>'; }).join(''); }
  function steps(list) { return list.map(function (s, i) { return '<div class="step"><span class="no">' + String(i + 1).padStart(2, '0') + '</span><div><h3>' + s[0] + '</h3><div class="math">' + s.slice(1).map(function (l) { return '<span>' + l + '</span>'; }).join('') + '</div></div></div>'; }).join(''); }
  function ok(u) { return u <= 1 ? '<b class="ok">✓ OK</b>' : '<b class="nok">✗ EI OK</b>'; }
  function bar(u) { var w = Math.max(0, Math.min(u, 1)) * 100; return '<div class="ubar"><i class="' + (u > 1 ? 'over' : '') + '" style="width:' + w + '%"></i></div>'; }
  // suunnitteluperusteiden tallennus työkalujen välillä
  var KEY = 'lt-puu-perusteet';
  function loadBasis() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }
  function saveBasis(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }
  // lomakeotsikot spaniin, jotta alaindeksit pysyvät rivillä
  function wrapLabels() { document.querySelectorAll('label:not(.chk)').forEach(function (lb) { if (lb.dataset.w) return; lb.dataset.w = 1; var c = lb.querySelector('input,select'); if (!c) return; var sp = document.createElement('span'); while (lb.firstChild && lb.firstChild !== c) sp.appendChild(lb.firstChild); lb.insertBefore(sp, c); }); }
  if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wrapLabels); else wrapLabels(); }
  g.PUU = { GAMMA: GAMMA, KMOD: KMOD, KDEF: KDEF, MAT: MAT, PROPS: PROPS, PLATE: PLATE, TCL: TCL, tclass: tclass, AIKA: AIKA, kmod: kmod, kdef: kdef, n: n, fill: fill, steps: steps, ok: ok, bar: bar, loadBasis: loadBasis, saveBasis: saveBasis };
})(typeof window !== 'undefined' ? window : global);
