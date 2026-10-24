/* Lastutec – naula- ja ruuviliitosten mitoitus (Puuinfo, Eurokoodi 5 lyhennetty suunnitteluohje 2020, luvut 6.1–6.4) */
(function (g) {
  'use strict';
  var P = g.PUU, n = P.n;
  function f1(x) { return n(x, 1); } function f2(x) { return n(x, 2); }

  // syöte o: { fast:'naula'|'ruuvi', ntype:'sq'|'rd'|'pr', stype:'kansi'|'itse', d, di, L, dh, lg (kierreosa), fax (profiloitu naula), fhead, ftens,
  //   conn:'pp1'|'pp2'|'lp'|'tp', mA, tA (kannan puoli/ulko-osa), mB, tB (kärjen puoli / keskiosa), plate, tP, tS (teräs), pre (esiporaus), heated,
  //   kl, ai ('P','K','H'), acc, Fv (kN), Fax (kN), nf (kpl), alpha (°), ang (ruuvin kulma syyhyn °), bonus (ruuvin 1,15-kerroin) }
  function calc(o) {
    var S = [], C = [], W = [], d = +o.d, nf = Math.max(1, Math.round(+o.nf || 1)), gm = o.acc ? 1.0 : 1.3;
    var isNail = o.fast === 'naula', smooth = isNail && o.ntype !== 'pr', square = isNail && o.ntype === 'sq';
    var MA = P.MAT[o.mA], MB = P.MAT[o.mB], PL = P.PLATE[o.plate];
    // materiaalit ja kmod
    var kmods = [], names = [];
    if (o.conn === 'pp1' || o.conn === 'pp2') { kmods.push(P.kmod(MA.km, o.kl, o.ai)); names.push(MA.name); }
    if (o.conn === 'lp') { kmods.push(P.kmod(PL.km, o.kl, o.ai)); names.push(PL.name); }
    kmods.push(P.kmod(MB.km, o.kl, o.ai)); names.push(MB.name);
    if (kmods.some(function (k) { return k === null; })) { W.push('Levyä ei saa käyttää käyttöluokassa ' + o.kl + ' (taulukko 3.1).'); }
    var kmod = Math.min.apply(null, kmods.map(function (k) { return k === null ? 0 : k; }));
    var rhoP = MB.rk, rhoH = (o.conn === 'pp1' || o.conn === 'pp2') ? MA.rk : rhoP, rho = Math.min(rhoP, rhoH), kp = Math.sqrt(rho / 350);
    S.push(['Mitoitusperusteet', 'Käyttöluokka ' + o.kl + ', ' + { P: 'pysyvä', K: 'keskipitkä', H: 'hetkellinen' }[o.ai] + ' aikaluokka → k<sub>mod</sub> = min(' + kmods.map(f2).join('; ') + ') = <b>' + f2(kmod) + '</b> <span class="c">(' + names.join(', ') + ')</span>',
      'γ<sub>M</sub> = ' + f2(gm) + ' (liitokset' + (o.acc ? ', onnettomuus' : '') + ') → k<sub>mod</sub>/γ<sub>M</sub> = ' + n(kmod / gm, 3)]);

    // tehollinen halkaisija
    var def = d, viaBolt = false;
    if (!isNail) {
      var di = +o.di || 0.7 * d;
      if (di < 0.6 * d - 1e-9 || di > 0.9 * d + 1e-9) W.push('Ruuvin sydänmitta d<sub>i</sub> = ' + f1(di) + ' mm ei ole välillä 0,6d … 0,9d.');
      def = o.stype === 'itse' ? 1.1 * di : d;
      if (d < 3.8 || d > 24) W.push('Ruuvin paksuus d = ' + f1(d) + ' mm on ohjeen alueen 3,8–24 mm ulkopuolella.');
      viaBolt = def > 6;
      S.push(['Ruuvin tehollinen halkaisija', (o.stype === 'itse' ? 'Itseporautuva ruuvi: d<sub>ef</sub> = 1,1d<sub>i</sub> = 1,1 · ' + f1(di) + ' = ' : 'Kansiruuvi (sileän varren tunkeuma ≥ 4d): d<sub>ef</sub> = d = ') + '<b>' + f2(def) + ' mm</b>',
        viaBolt ? 'd<sub>ef</sub> &gt; 6 mm → leikkauskestävyys pulttiliitoksen säännöillä (6.4)' : 'd<sub>ef</sub> ≤ 6 mm → leikkauskestävyys profiloidun pyöreän naulan säännöillä (6.2)']);
    } else {
      if (d < 1.9 || d > 8) W.push('Naulan paksuus d = ' + f1(d) + ' mm on ohjeen alueen 1,9–8 mm ulkopuolella.');
    }
    var D = def, pre = !!o.pre || (!isNail && o.stype === 'kansi');
    if (!isNail && o.stype === 'kansi' && !o.pre) S.push(['Esiporaus', 'Kansiruuveille esiporataan reiät (havupuussa d ≤ 6 mm saa ruuvata ilman) → oletettu esiporatuksi']);
    if (isNail && !o.pre && (rho > 500 || d > 6)) W.push('Esiporaus vaaditaan (ρ<sub>k</sub> &gt; 500 kg/m³ tai d &gt; 6 mm).');

    // leikkaus
    var Rv = 0, m = o.conn === 'pp2' ? 2 : 1, t1, t2, L = +o.L, sh = [];
    if (o.conn === 'pp1') { t1 = +o.tA; t2 = Math.min(+o.tB, L - t1); sh.push('Kannan puolella t<sub>1</sub> = ' + f1(t1) + ' mm, kärjen tunkeuma t<sub>2</sub> = min(t<sub>B</sub>; L − t<sub>1</sub>) = min(' + f1(+o.tB) + '; ' + f1(L - t1) + ') = ' + f1(t2) + ' mm'); }
    else if (o.conn === 'pp2') { var pen = L - 2 * (+o.tA) / 2 - (+o.tB); t2 = +o.tB; var tp2 = L - (+o.tA) - (+o.tB); t1 = Math.min(+o.tA, tp2); sh.push('Kaksileikkeinen: ulko-osat t<sub>A</sub> = ' + f1(+o.tA) + ' mm, keskiosa t<sub>2</sub> = ' + f1(t2) + ' mm, kärjen tunkeuma ulko-osaan L − t<sub>A</sub> − t<sub>2</sub> = ' + f1(tp2) + ' mm → t<sub>1</sub> = ' + f1(t1) + ' mm, m = 2'); }
    else if (o.conn === 'lp') { t1 = +o.tP; t2 = Math.min(+o.tB, L - t1); sh.push('Levy t = ' + f1(t1) + ' mm, kärjen tunkeuma t<sub>2</sub> = ' + f1(t2) + ' mm'); }
    else { t1 = +o.tS; t2 = Math.min(+o.tB, L - t1); sh.push('Teräslevy t<sub>t</sub> = ' + f1(t1) + ' mm, kärjen tunkeuma t<sub>2</sub> = ' + f1(t2) + ' mm'); }
    sh.unshift('k<sub>ρ</sub> = √(ρ<sub>k</sub>/350) = √(' + rho + '/350) = <b>' + n(kp, 3) + '</b> <span class="c">(6.7, pienempi tiheys)</span>');
    var base = 120 * Math.pow(D, 1.7);

    if (viaBolt) {
      if (o.conn === 'lp' || o.conn === 'tp') { W.push('d<sub>ef</sub> &gt; 6 mm levyliitoksille ei ole lyhennetyssä ohjeessa yksinkertaistettua kaavaa – käytä EN 1995-1-1:n Johansenin kaavoja.'); }
      else {
        if (t1 < 4 * D || t2 < 4 * D) W.push('Pulttisäännöt: puuosien paksuuksien tulee olla vähintään 4d<sub>ef</sub> = ' + f1(4 * D) + ' mm.');
        var My = 150 * Math.pow(D, 2.6), al = (+o.alpha || 0) * Math.PI / 180;
        var fhk = function (M) { var f0 = 0.082 * (1 - 0.01 * D) * M.rk, k90 = (M.lvl ? 1.30 : 1.35) + 0.015 * D; return f0 / (k90 * Math.pow(Math.sin(al), 2) + Math.pow(Math.cos(al), 2)); };
        var fh1 = fhk(MA), fh2 = fhk(MB), fh = Math.min(fh1, fh2), tu = Math.min(t1 * fh1 / fh, t2 * fh2 / fh);
        var Rk1 = 0.4 * fh * tu * D * Math.sqrt(1 + 3 * My / (fh * D * tu * tu)), Rk2 = 2 * Math.sqrt(My * fh * D), Rk = Math.min(Rk1, Rk2), bf = o.bonus ? 1.15 : 1;
        Rv = m * kmod / gm * Rk * bf;
        S.push(['Leikkauskestävyys pulttisäännöillä (6.22–6.28)'].concat(sh, [
          'M<sub>y</sub> = 150d<sub>ef</sub><sup>2,6</sup> = ' + n(My / 1000, 1) + ' Nm <span class="c">(ohjeen vähimmäisvaatimus ruuveille; valmistajan arvo voi olla suurempi)</span>',
          'f<sub>h,k</sub> = 0,082(1 − 0,01d)ρ<sub>k</sub> / (k<sub>90</sub>sin²α + cos²α): f<sub>h,1</sub> = ' + f2(fh1) + ', f<sub>h,2</sub> = ' + f2(fh2) + ' N/mm² (α = ' + (+o.alpha || 0) + '°)',
          't<sub>u</sub> = min(t<sub>1</sub>f<sub>h,1</sub>/f<sub>h</sub>; t<sub>2</sub>f<sub>h,2</sub>/f<sub>h</sub>) = ' + f1(tu) + ' mm',
          'R<sub>k</sub> = min(0,4f<sub>h</sub>t<sub>u</sub>d√(1 + 3M<sub>y</sub>/(f<sub>h</sub>dt<sub>u</sub>²)); 2√(M<sub>y</sub>f<sub>h</sub>d)) = min(' + f1(Rk1) + '; ' + f1(Rk2) + ') = ' + f1(Rk) + ' N' + (bf > 1 ? ' × 1,15 (kierreosa ≥ 8d<sub>ef</sub> + lisäehto)' : ''),
          'R<sub>v,d</sub> = m · k<sub>mod</sub>/γ<sub>M</sub> · R<sub>k</sub> = ' + m + ' · ' + n(kmod / gm, 3) + ' · ' + f1(Rk * bf) + ' = <b>' + f1(Rv) + ' N / liitin</b>']));
      }
    } else if (o.conn === 'pp1' || o.conn === 'pp2') {
      var t1min = pre ? 4 * D : (MA.g === 'Sahatavara' ? 7 * D : MA === P.MAT.KQ ? 4 * D : 8 * D), t2min = pre ? 4 * D : 8 * D, k, ktxt;
      sh.push('Vähimmäistunkeumat: t<sub>1</sub> ≥ ' + f1(t1min) + ' mm ' + P.ok(t1min / t1) + ', t<sub>2</sub> ≥ ' + f1(t2min) + ' mm ' + P.ok(t2min / t2) + (pre ? ' <span class="c">(esiporattu: 4d)</span>' : ''));
      if (t1 < t1min - 1e-9 || t2 < t2min - 1e-9) { W.push('Liittimen tunkeuma ei riitä (t<sub>1</sub> ≥ ' + f1(t1min) + ', t<sub>2</sub> ≥ ' + f1(t2min) + ' mm).'); k = 0; ktxt = 'tunkeuma ei riitä'; }
      else if (t1 >= 8 * D && t2 >= 12 * D) { var cap = square ? 1.3 : 1.1, kta = 1 + 0.3 * (t1 - 8 * D) / (8 * D), ktb = 1 + 0.3 * (t2 - 12 * D) / (6 * D); k = Math.min(cap, Math.max(kta, ktb, 1));
        ktxt = 'k<sub>t</sub> = max(1 + 0,3(t<sub>1</sub> − 8d)/8d; 1 + 0,3(t<sub>2</sub> − 12d)/6d) = max(' + n(kta, 3) + '; ' + n(ktb, 3) + ') ≤ ' + f1(cap) + ' → <b>' + n(k, 3) + '</b> (6.5)'; }
      else { k = Math.min(t1 / (8 * D), t2 / (12 * D), 1); ktxt = 'k<sub>e</sub> = min(t<sub>1</sub>/8d; t<sub>2</sub>/12d) = min(' + n(t1 / (8 * D), 3) + '; ' + n(t2 / (12 * D), 3) + ') = <b>' + n(k, 3) + '</b> (6.6)'; }
      Rv = m * kmod / gm * kp * k * base;
      S.push(['Leikkauskestävyys, puutavaraliitos (6.4)'].concat(sh, [ktxt,
        'F<sub>v,d</sub> = m · k<sub>mod</sub>/γ<sub>M</sub> · k<sub>ρ</sub> · k · 120d<sup>1,7</sup> = ' + m + ' · ' + n(kmod / gm, 3) + ' · ' + n(kp, 3) + ' · ' + n(k, 3) + ' · ' + f1(base) + ' = <b>' + f1(Rv) + ' N / liitin</b>']));
    } else if (o.conn === 'lp') {
      if (t1 < 2 * D) W.push('Levyn paksuus t ≥ 2d = ' + f1(2 * D) + ' mm ei täyty.'); if (D > 5) W.push('Kaava (6.9) edellyttää d ≤ 5 mm.');
      var kl0 = (0.5 + t1 / (12 * D)) * kp, klcap = (square ? 1.4 : 1.2) * kp, kl = Math.min(kl0, klcap), red = t2 < 12 * D ? t2 / (12 * D) : 1;
      if (t2 < 8 * D - 1e-6) { W.push('Kärjen tunkeuma t<sub>2</sub> ≥ 8d = ' + f1(8 * D) + ' mm ei täyty.'); red = 0; }
      Rv = kmod / gm * kl * base * red;
      S.push(['Leikkauskestävyys, puulevy–puu (6.8)'].concat(sh, ['k<sub>l</sub> = (0,5 + t/12d)k<sub>ρ</sub> = ' + n(kl0, 3) + ' ≤ ' + (square ? '1,4' : '1,2') + 'k<sub>ρ</sub> = ' + n(klcap, 3) + ' → <b>' + n(kl, 3) + '</b> (6.9)',
        red < 1 ? 'Tunkeuma t<sub>2</sub> &lt; 12d → kerroin t<sub>2</sub>/12d = ' + n(red, 3) : 'Tunkeuma t<sub>2</sub> ≥ 12d',
        'R<sub>d</sub> = k<sub>mod</sub>/γ<sub>M</sub> · k<sub>l</sub> · 120d<sup>1,7</sup>' + (red < 1 ? ' · t<sub>2</sub>/12d' : '') + ' = <b>' + f1(Rv) + ' N / liitin</b>']));
    } else {
      var tt = t1, ksT, ksK, kst, need = smooth ? 12 * D : 8 * D, txt;
      if (t2 < need - 1e-6) { W.push('Kärjen tunkeuma t<sub>2</sub> ≥ ' + (smooth ? '12d' : '8d') + ' = ' + f1(need) + ' mm ei täyty.'); kst = 0; txt = 'tunkeuma ei riitä'; }
      else {
        if (t2 >= 12 * D) { ksT = 1.1 * kp; ksK = 1.5 * kp; txt = 'Tunkeuma ≥ 12d: k<sub>s</sub> = 1,1k<sub>ρ</sub> (t<sub>t</sub> ≤ 0,5d) … 1,5k<sub>ρ</sub> (t<sub>t</sub> ≥ d) (6.11)'; }
        else { ksT = (0.2 + 0.9 * t2 / (12 * D)) * kp; ksK = (0.6 + 0.9 * t2 / (12 * D)) * kp; txt = 'Profiloitu, tunkeuma 8d…12d: k<sub>s</sub> = (0,2 … 0,6 + 0,9t<sub>2</sub>/12d)k<sub>ρ</sub> (6.12)'; }
        var fr = Math.max(0, Math.min(1, (tt / D - 0.5) / 0.5)); kst = ksT + (ksK - ksT) * fr;
        txt += ' → t<sub>t</sub>/d = ' + n(tt / D, 2) + ', k<sub>s</sub> = <b>' + n(kst, 3) + '</b>';
      }
      Rv = kmod / gm * kst * base;
      S.push(['Leikkauskestävyys, teräslevy–puu (6.10)'].concat(sh, [txt, 'R<sub>d</sub> = k<sub>mod</sub>/γ<sub>M</sub> · k<sub>s</sub> · 120d<sup>1,7</sup> = ' + n(kmod / gm, 3) + ' · ' + n(kst, 3) + ' · ' + f1(base) + ' = <b>' + f1(Rv) + ' N / liitin</b>']));
    }

    // ulosveto
    var Fax = Math.max(0, +o.Fax || 0) * 1000, Fv = Math.max(0, +o.Fv || 0) * 1000, Rax = null, tpen = (o.conn === 'pp2') ? L - (+o.tA) - (+o.tB) : t2, ax = [];
    if (isNail) {
      var faxk, fheadk = 70e-6 * rhoH * rhoH, red2 = o.heated ? (smooth ? 0.4 : 0.7) : 1;
      if (smooth) faxk = 20e-6 * rhoP * rhoP; else faxk = +o.fax || 6.0;
      var dh = +o.dh || 2.25 * d, tH = o.conn === 'pp1' || o.conn === 'pp2' ? +o.tA : t1;
      var tmin = smooth ? 12 * d : 8 * d;
      ax.push((smooth ? 'f<sub>ax,k</sub> = 20·10<sup>−6</sup>ρ<sub>k</sub>² = ' : 'f<sub>ax,k</sub> (profiloitu, valmistajan arvo) = ') + f2(faxk) + ' N/mm²' + (red2 < 1 ? ' × ' + f1(red2) + ' (lämmitetty sisätila) = ' + f2(faxk * red2) : '') + ', f<sub>head,k</sub> = 70·10<sup>−6</sup>ρ<sub>k</sub>² = ' + f2(fheadk) + ' N/mm²');
      ax.push('Tartuntapituus t<sub>pen</sub> = ' + f1(tpen) + ' mm ≥ ' + (smooth ? '12d' : '8d') + ' = ' + f1(tmin) + ' mm ' + P.ok(tmin / tpen) + ', kannan halkaisija d<sub>h</sub> = ' + f1(dh) + ' mm');
      var ra = faxk * red2 * d * tpen, rb = faxk * red2 * d * tH + fheadk * dh * dh, rc = fheadk * dh * dh, Rk2;
      if (o.conn === 'lp' || o.conn === 'tp') { Rk2 = ra; ax.push('R<sub>k</sub> = f<sub>ax,k</sub>dt<sub>pen</sub> = ' + f1(ra) + ' N <span class="c">(kannan läpiveto levystä tarkistettava erikseen)</span>'); }
      else if (smooth) { Rk2 = Math.min(ra, rb); ax.push('R<sub>k</sub> = min(f<sub>ax,k</sub>dt<sub>pen</sub>; f<sub>ax,k</sub>dt + f<sub>head,k</sub>d<sub>h</sub>²) = min(' + f1(ra) + '; ' + f1(rb) + ') = ' + f1(Rk2) + ' N (6.13a,b)'); }
      else { Rk2 = Math.min(ra, rc); ax.push('R<sub>k</sub> = min(f<sub>ax,k</sub>dt<sub>pen</sub>; f<sub>head,k</sub>d<sub>h</sub>²) = min(' + f1(ra) + '; ' + f1(rc) + ') = ' + f1(Rk2) + ' N (6.13a,c)'); }
      if (tpen < tmin - 1e-6) Rk2 = 0;
      Rax = kmod / gm * Rk2;
      ax.push('R<sub>ax,d</sub> = k<sub>mod</sub>/γ<sub>M</sub> · R<sub>k</sub> = <b>' + f1(Rax) + ' N / naula</b>');
      if (smooth && Fax > 0 && o.ai !== 'H') W.push('Sileävartista naulaa ei saa kuormittaa pysyvällä tai pitkäaikaisella ulosvedolla.');
      if (Fax > 0) S.push(['Ulosvetokestävyys (6.13–6.15)'].concat(ax));
    } else {
      var lef = Math.min(+o.lg || tpen, tpen), ang = (+o.ang || 90) * Math.PI / 180, kd = Math.min(d / 8, 1), Fw, wt;
      if (lef < 6 * d - 1e-6) W.push('Kierreosan tunkeuma kärjen puolella l<sub>ef</sub> ≥ 6d = ' + f1(6 * d) + ' mm ei täyty.');
      if (d >= 6) { var fx = 0.52 * Math.pow(d, -0.5) * Math.pow(lef, -0.1) * Math.pow(rhoP, 0.8); Fw = Math.pow(nf, 0.9) * fx * d * lef * kd / (1.2 * Math.pow(Math.cos(ang), 2) + Math.pow(Math.sin(ang), 2));
        wt = 'f<sub>ax,k</sub> = 0,52d<sup>−0,5</sup>l<sub>ef</sub><sup>−0,1</sup>ρ<sub>k</sub><sup>0,8</sup> = ' + f2(fx) + ' N/mm², k<sub>d</sub> = ' + n(kd, 3) + ' → F<sub>ax,α,Rk</sub> = n<sup>0,9</sup>f<sub>ax,k</sub>dl<sub>ef</sub>k<sub>d</sub>/(1,2cos²α + sin²α) = ' + f1(Fw) + ' N (6.18–6.19)'; }
      else { Fw = Math.pow(nf, 0.9) * Math.pow(d, 1.2) * Math.pow(lef, 0.8) * rhoP / 20; wt = 'F<sub>ax,90,Rk</sub> = n<sup>0,9</sup>d<sup>1,2</sup>l<sub>ef</sub><sup>0,8</sup>ρ<sub>k</sub>/20 = ' + f1(Fw) + ' N (6.20, 4 ≤ d &lt; 6 mm)'; }
      var dh2 = +o.dh || 2 * d, fh0 = +o.fhead || 10, Fh = Math.pow(nf, 0.9) * fh0 * dh2 * dh2 * Math.pow(rhoH / 350, 0.8), Ft = Math.pow(nf, 0.9) * (+o.ftens || 0) * 1000;
      if (o.conn === 'tp') Fh = Infinity;
      var Rkg = Math.min(Fw, Fh, Ft > 0 ? Ft : Infinity);
      Rax = kmod / gm * Rkg / nf;
      ax = ['Kierreosan tunkeuma l<sub>ef</sub> = min(l<sub>g</sub>; t<sub>pen</sub>) = ' + f1(lef) + ' mm, n = ' + nf + ' (n<sup>0,9</sup> = ' + n(Math.pow(nf, 0.9), 3) + '), ruuvin kulma syyhyn ' + (+o.ang || 90) + '°', wt,
        o.conn === 'tp' ? 'Kannan läpiveto: kansi teräslevyä vasten → ei määrää' : 'Kannan läpiveto F<sub>ax,head,Rk</sub> = n<sup>0,9</sup>f<sub>head,k</sub>d<sub>h</sub>²(ρ<sub>k</sub>/350)<sup>0,8</sup> = ' + f1(Fh) + ' N (6.21, f<sub>head,k</sub> = ' + f1(fh0) + ', d<sub>h</sub> = ' + f1(dh2) + ')',
        Ft > 0 ? 'Vetokestävyys F<sub>t,Rk</sub> = n<sup>0,9</sup>f<sub>tens,k</sub> = ' + f1(Ft) + ' N' : 'Vetokestävyys: anna valmistajan f<sub>tens,k</sub>',
        'R<sub>ax,d</sub> = k<sub>mod</sub>/γ<sub>M</sub> · min / n = <b>' + f1(Rax) + ' N / ruuvi</b> (ryhmä ' + f1(Rax * nf) + ' N)'];
      if (Fax > 0) S.push(['Ulosvetokestävyys (6.18–6.21)'].concat(ax));
    }

    // mitoitus
    var Rvt = Rv * nf, nreq = Rv > 0 ? Math.ceil(Fv / Rv) : Infinity, uv = Fv > 0 ? (Rvt > 0 ? Fv / Rvt : Infinity) : 0, ua = Fax > 0 ? (Rax > 0 ? Fax / (Rax * nf) : Infinity) : 0;
    if (Fv > 0) C.push(['Leikkaus', Fv / 1000, Rvt / 1000, uv]);
    if (Fax > 0) C.push(['Ulosveto', Fax / 1000, Rax * nf / 1000, ua]);
    var inter = null;
    if (Fv > 0 && Fax > 0) { inter = (isNail && smooth) ? ua + uv : ua * ua + uv * uv; C.push([(isNail && smooth) ? 'Yhteisvaikutus F<sub>ax</sub>/R<sub>ax</sub> + F<sub>v</sub>/R<sub>v</sub>' : 'Yhteisvaikutus (F<sub>ax</sub>/R<sub>ax</sub>)² + (F<sub>v</sub>/R<sub>v</sub>)²', inter, 1, inter]); }
    if (isNail && nf < 2) W.push('Naulaliitoksessa tulee olla vähintään 2 naulaa.');
    S.push(['Liitoksen kestävyys', 'Leikkaus: n · R<sub>v,d</sub> = ' + nf + ' · ' + f1(Rv) + ' = <b>' + n(Rvt / 1000, 2) + ' kN</b>' + (Fv > 0 ? ' ≥ F<sub>v,Ed</sub> = ' + n(Fv / 1000, 2) + ' kN ' + P.ok(uv) + ' · tarvittava määrä ⌈F<sub>v,Ed</sub>/R<sub>v,d</sub>⌉ = <b>' + nreq + ' kpl</b>' : '')].concat(
      Fax > 0 ? ['Ulosveto: ' + n(Rax * nf / 1000, 2) + ' kN ≥ ' + n(Fax / 1000, 2) + ' kN ' + P.ok(ua)] : [], inter !== null ? ['Yhteisvaikutus (6.17): ' + n(inter, 3) + ' ≤ 1 ' + P.ok(inter)] : []));

    // vähimmäisetäisyydet (kuva 6.3)
    var al2 = (+o.alpha || 0) * Math.PI / 180, fp = pre ? 0.7 : 1, fv2 = o.conn === 'lp' ? 0.85 : o.conn === 'tp' ? 0.7 : 1;
    var sp = { a1: 10 * D * fp * fv2, a2: 5 * D * fp * fv2, a3t: 15 * D * fp, a3c: 10 * D * fp, a4t: (5 + 5 * Math.sin(al2)) * D * fp, a4c: 5 * D * fp };
    if (!isNail && Fax > 0) { sp.a1 = Math.max(sp.a1, 7 * d); sp.a2 = Math.max(sp.a2, 5 * d); sp.a3t = Math.max(sp.a3t, 10 * d); sp.a3c = Math.max(sp.a3c, 10 * d); sp.a4t = Math.max(sp.a4t, 4 * d); sp.a4c = Math.max(sp.a4c, 4 * d); }
    var umax = C.length ? Math.max.apply(null, C.map(function (c) { return c[3]; })) : 0;
    return { S: S, C: C, W: W, Rv: Rv, Rax: Rax, Rvt: Rvt, nreq: nreq, umax: umax, sp: sp, D: D, kmod: kmod, gm: gm, kp: kp, fp: fp, fv2: fv2, pre: pre };
  }
  g.LIITOS = { calc: calc };
})(typeof window !== 'undefined' ? window : global);
