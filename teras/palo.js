/* Lastutec – Teräsrakenteet: suojaamattoman liitoksen palotilannemitoitus
   SFS-EN 1993-1-2: liite D (ruuvit ja hitsit, taulukko D.1, kaavat D.1–D.4),
   4.2.5.1 suojaamattoman teräksen lämpeneminen, 3.4.1.2 ominaislämpö,
   taulukko 3.1 (k_y,θ). Standardipalo ISO 834 (SFS-EN 1991-1-2, 3.2.1).
   Lämpötila lasketaan liitoksen poikkileikkaustekijällä A_m/V (D.3: liitoksen
   lämpötila osien paikallisella A/V-arvolla). */
(function (g) {
  var KB = [[20, 1], [100, 0.968], [150, 0.952], [200, 0.935], [300, 0.903], [400, 0.775], [500, 0.550], [600, 0.220], [700, 0.100], [800, 0.067], [900, 0.033], [1000, 0]];
  var KW = [[20, 1], [100, 1], [150, 1], [200, 1], [300, 1], [400, 0.876], [500, 0.627], [600, 0.378], [700, 0.130], [800, 0.074], [900, 0.018], [1000, 0]];
  var KE = [[20, 1], [100, 1], [200, 0.9], [300, 0.8], [400, 0.7], [500, 0.6], [600, 0.31], [700, 0.13], [800, 0.09], [900, 0.0675], [1000, 0.045], [1100, 0.0225], [1200, 0]];
  var KY = [[20, 1], [100, 1], [200, 1], [300, 1], [400, 1], [500, 0.78], [600, 0.47], [700, 0.23], [800, 0.11], [900, 0.06], [1000, 0.04], [1100, 0.02], [1200, 0]];
  function interp(T, th) { if (th <= T[0][0]) return T[0][1]; for (var i = 1; i < T.length; i++) if (th <= T[i][0]) { var a = T[i - 1], b = T[i]; return a[1] + (b[1] - a[1]) * (th - a[0]) / (b[0] - a[0]); } return T[T.length - 1][1]; }
  function ca(t) { // J/kgK, 3.4.1.2
    if (t < 600) return 425 + 0.773 * t - 1.69e-3 * t * t + 2.22e-6 * t * t * t;
    if (t < 735) return 666 + 13002 / (738 - t);
    if (t < 900) return 545 + 17820 / (t - 731);
    return 650;
  }
  function gas(tmin) { return 20 + 345 * Math.log10(8 * tmin + 1); }
  var cache = {};
  function steelTemp(amv, tmin, ksh) { // 4.2.5.1, Δt = 2 s
    amv = Math.max(10, amv); ksh = ksh || 1; var key = amv + '|' + tmin + '|' + ksh; if (cache[key] !== undefined) return cache[key];
    var th = 20, dt = 2, n = Math.round(tmin * 60 / dt), s = 5.67e-8;
    for (var i = 1; i <= n; i++) { var tg = gas(i * dt / 60), h = 25 * (tg - th) + 1.0 * 0.7 * 1.0 * s * (Math.pow(tg + 273, 4) - Math.pow(th + 273, 4)); th += ksh * amv / (ca(th) * 7850) * h * dt; }
    return (cache[key] = th);
  }
  function curve(amv, tmax) { // teräksen ja kaasun lämpötila minuutin välein
    amv = Math.max(10, amv); var th = 20, dt = 2, s = 5.67e-8, out = [[0, 20, 20]], per = 30;
    for (var i = 1; i <= Math.round(tmax * 60 / dt); i++) { var tg = gas(i * dt / 60), h = 25 * (tg - th) + 0.7 * s * (Math.pow(tg + 273, 4) - Math.pow(th + 273, 4)); th += amv / (ca(th) * 7850) * h * dt; if (i % per === 0) out.push([i * dt / 60, tg, th]); }
    return out;
  }
  function f(x, d) { return isFinite(x) ? x.toLocaleString('fi-FI', { minimumFractionDigits: d, maximumFractionDigits: d }) : '–'; }
  // Lukee palokortin kentät (#fi-R, #fi-amv, #fi-T, #fi-gm, #fi-eta) annetusta juuresta
  function read(root, gM2) {
    var q = function (s) { return root.querySelector(s); }, v = function (s, d) { var e = q(s); if (!e) return d; var x = parseFloat(e.value); return isFinite(x) ? x : d; };
    var R = q('#fi-R') ? q('#fi-R').value : '30', amv = v('#fi-amv', 200), gfi = v('#fi-gm', 1.0) || 1.0, eta = v('#fi-eta', 0.65), on = !q('#fi-on') || q('#fi-on').checked;
    var own = R === 'T', tmin = own ? null : +R, theta = own ? v('#fi-T', 20) : steelTemp(amv, tmin, 1);
    var tw = q('#fi-Tw'); if (tw) tw.hidden = !own; var aw = q('#fi-amvw'); if (aw) aw.hidden = own;
    var o = { on: on, own: own, tmin: tmin, amv: amv, theta: theta, gas: own ? null : gas(tmin), kb: interp(KB, theta), kw: interp(KW, theta), ky: interp(KY, theta), kE: interp(KE, theta), gfi: gfi, eta: eta, gM2: gM2 || 1.25 };
    o.fb = o.kb * o.gM2 / gfi; o.fw = o.kw * o.gM2 / gfi; // kerroin, jolla normaalilämpötilan kestävyys muunnetaan palotilanteeseen
    o.lines = [
      own ? 'Liitoksen lämpötila annettu: θ<sub>a</sub> = <b>' + f(theta, 0) + ' °C</b>'
          : 'Standardipalo ISO 834, R' + tmin + ': kaasun lämpötila θ<sub>g</sub> = 20 + 345·log<sub>10</sub>(8t + 1) = ' + f(o.gas, 0) + ' °C',
      own ? '' : 'Suojaamaton liitos, A<sub>m</sub>/V = ' + f(Math.max(10, amv), 0) + ' 1/m (SFS-EN 1993-1-2, 4.2.5.1 ja D.3): Δθ<sub>a,t</sub> = k<sub>sh</sub>·(A<sub>m</sub>/V)/(c<sub>a</sub>ρ<sub>a</sub>)·h<sub>net</sub>·Δt, α<sub>c</sub> = 25 W/m²K, ε<sub>m</sub> = 0,7, Δt = 2 s → <b>θ<sub>a</sub> = ' + f(theta, 0) + ' °C</b>',
      'Lujuuden heikennys: taulukko D.1 k<sub>b,θ</sub> = <b>' + f(o.kb, 3) + '</b> (ruuvit), k<sub>w,θ</sub> = <b>' + f(o.kw, 3) + '</b> (hitsit); taulukko 3.1 k<sub>y,θ</sub> = <b>' + f(o.ky, 3) + '</b> (perusaine, f<sub>y,θ</sub> = k<sub>y,θ</sub>·f<sub>y</sub>), k<sub>E,θ</sub> = ' + f(o.kE, 3) + '',
      'Kestävyys palossa (D.1–D.4): F<sub>fi,Rd</sub> = F<sub>Rd</sub>·k<sub>θ</sub>·γ<sub>M2</sub>/γ<sub>M,fi</sub> → ruuvit ×' + f(o.fb, 3) + ', hitsit ×' + f(o.fw, 3) + ' (γ<sub>M2</sub> = ' + f(o.gM2, 2) + ', γ<sub>M,fi</sub> = ' + f(gfi, 2) + ')'
    ].filter(Boolean);
    return o;
  }
  // Lämpötila–aika-kuvaaja ja lujuuden heikennys (näytetään kortissa)
  function chart(o) {
    var T = Math.max(o.own ? 60 : o.tmin, 30), c = curve(o.amv, T), W = 420, H = 220, L = 46, B = 30, X = function (t) { return L + t / T * (W - L - 12); }, Y = function (v) { return H - B - v / 1100 * (H - B - 12); }, s = '';
    for (var v = 0; v <= 1000; v += 200) s += '<line x1="' + L + '" y1="' + Y(v) + '" x2="' + (W - 12) + '" y2="' + Y(v) + '" stroke="#3d4046"/><text x="' + (L - 4) + '" y="' + (Y(v) + 4) + '" fill="#aeaba4" font-size="10" text-anchor="end">' + v + '</text>';
    var st = T <= 60 ? 15 : 30; for (var t = 0; t <= T + 1e-9; t += st) s += '<text x="' + X(t) + '" y="' + (H - B + 14) + '" fill="#aeaba4" font-size="10" text-anchor="middle">' + t + '</text>';
    s += '<text x="' + (W - 12) + '" y="' + (H - 4) + '" fill="#aeaba4" font-size="10" text-anchor="end">aika t [min]</text><text x="6" y="12" fill="#aeaba4" font-size="10">θ [°C]</text>';
    s += '<polyline fill="none" stroke="#e8907f" stroke-width="2" points="' + c.map(function (p) { return X(p[0]) + ',' + Y(p[1]); }).join(' ') + '"/>';
    if (!o.own) s += '<polyline fill="none" stroke="#92b8dd" stroke-width="2" points="' + c.map(function (p) { return X(p[0]) + ',' + Y(p[2]); }).join(' ') + '"/>';
    var tt = o.own ? null : o.tmin; if (tt !== null) s += '<line x1="' + X(tt) + '" y1="' + Y(0) + '" x2="' + X(tt) + '" y2="' + Y(1100) + '" stroke="#E3824F" stroke-dasharray="5 3"/><circle cx="' + X(tt) + '" cy="' + Y(o.theta) + '" r="4" fill="#E3824F"/><text x="' + (X(tt) - 6) + '" y="' + (Y(o.theta) + 16) + '" fill="#E3824F" font-size="11" text-anchor="end">θ<tspan font-size="8" dy="3">a</tspan><tspan dy="-3"> = ' + f(o.theta, 0) + ' °C</tspan></text>';
    else s += '<line x1="' + L + '" y1="' + Y(o.theta) + '" x2="' + (W - 12) + '" y2="' + Y(o.theta) + '" stroke="#E3824F" stroke-dasharray="5 3"/><text x="' + (W - 14) + '" y="' + (Y(o.theta) - 4) + '" fill="#E3824F" font-size="11" text-anchor="end">θ<tspan font-size="8" dy="3">a</tspan><tspan dy="-3"> = ' + f(o.theta, 0) + ' °C (annettu)</tspan></text>';
    s += '<text x="' + (L + 6) + '" y="' + (Y(1050)) + '" fill="#e8907f" font-size="10.5">ISO 834 θ<tspan font-size="8" dy="3">g</tspan></text>' + (o.own ? '' : '<text x="' + (L + 110) + '" y="' + Y(1050) + '" fill="#92b8dd" font-size="10.5">teräs θ<tspan font-size="8" dy="3">a</tspan><tspan dy="-3"> (A</tspan><tspan font-size="8" dy="3">m</tspan><tspan dy="-3">/V = ' + f(Math.max(10, o.amv), 0) + ')</tspan></text>');
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;max-width:' + W + 'px;height:auto;display:block" role="img" aria-label="Standardipalon ja teräksen lämpötila ajan funktiona" font-family="Arial,Helvetica,sans-serif">' + s + '</svg>';
  }
  // rows: [[nimi, arvo 20 °C:ssa, kerroin, yksikkö]]
  function show(root, o, rows) {
    var out = root.querySelector('#fi-out'); if (!out) return;
    if (!o.on) { out.innerHTML = ''; return; }
    var t = '<div class="lt-scroll" style="margin-top:8px"><table class="lt-table"><thead><tr><th>Materiaalin lujuus</th><th>20 °C</th><th>kerroin</th><th>θ<sub>a</sub> = ' + f(o.theta, 0) + ' °C</th></tr></thead><tbody>' +
      (rows || []).map(function (r) { return '<tr style="cursor:default"><td>' + r[0] + '</td><td>' + f(r[1], 0) + ' ' + r[3] + '</td><td>' + r[2][0] + ' = ' + f(r[2][1], 3) + '</td><td><b>' + f(r[1] * r[2][1], 0) + ' ' + r[3] + '</b></td></tr>'; }).join('') + '</tbody></table></div>';
    out.innerHTML = '<div style="display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start"><div style="flex:1;min-width:260px">' + chart(o) + '</div><div style="flex:1;min-width:260px">' + o.lines.map(function (l) { return '<div class="lt-f">' + l + '</div>'; }).join('') + '</div></div>' + t;
  }
  // Palokortin HTML (sama kaikissa työkaluissa)
  function card(opts) {
    opts = opts || {};
    var R = [15, 30, 45, 60, 90, 120].map(function (m) { return '<option value="' + m + '"' + (m === (opts.R || 30) ? ' selected' : '') + '>R' + m + '</option>'; }).join('') + '<option value="T">Anna lämpötila</option>';
    return '<div class="lt-card" id="fi-card"><style>#fi-card label[hidden]{display:none!important}</style><h3>Palotilanne, suojaamaton liitos (SFS-EN 1993-1-2, liite D)</h3><div class="lt-grid">' +
      '<label class="lt-chk"><input id="fi-on" type="checkbox"' + (opts.on ? ' checked' : '') + '> <span>Tarkista palotilanne</span></label>' +
      '<label><span>Palonkestoaika (standardipalo)</span><select id="fi-R">' + R + '</select></label>' +
      '<label id="fi-amvw"><span>Liitoksen A<sub>m</sub>/V (1/m)</span><input id="fi-amv" type="number" min="10" step="10" value="' + (opts.amv || 200) + '"></label>' +
      '<label id="fi-Tw" hidden><span>Liitoksen lämpötila θ<sub>a</sub> (°C)</span><input id="fi-T" type="number" min="20" max="1000" step="10" value="550"></label>' +
      '<label><span>γ<sub>M,fi</sub></span><input id="fi-gm" type="number" step="0.05" value="1.0"></label>' +
      (opts.eta === false ? '' : '<label><span>η<sub>fi</sub> = E<sub>fi,d</sub>/E<sub>d</sub></span><input id="fi-eta" type="number" step="0.05" value="0.65"></label>') +
      '</div><p class="lt-note" style="margin:8px 0 0">Levy, joka on palolle alttiina molemmilta puolilta: A<sub>m</sub>/V = 2/t (esim. t = 10 mm → 200 1/m). Liitoksen lämpötilana voidaan käyttää liitoksen osien paikallista A<sub>m</sub>/V-arvoa (D.3). η<sub>fi</sub> = 0,65 on SFS-EN 1993-1-2:n kohdan 2.4.2 suositusarvo (luokka E: 0,7), ja palotilanteen kuorma on E<sub>fi,d</sub> = η<sub>fi</sub>·E<sub>d</sub>. Liukumattomat liitokset oletetaan palossa liukuneiksi ja mitoitetaan reunapuristusliitoksina (D.1(2)).</p>' +
      '<div class="lt-f" id="fi-out" style="margin-top:8px"></div></div>';
  }
  g.LTPALO = { KB: KB, KW: KW, KY: KY, KE: KE, curve: curve, chart: chart, show: show, kE: function (t) { return interp(KE, t); }, kb: function (t) { return interp(KB, t); }, kw: function (t) { return interp(KW, t); }, ky: function (t) { return interp(KY, t); }, gas: gas, steelTemp: steelTemp, read: read, card: card };
})(window);
