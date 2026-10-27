/* Lastutec: laskennan tallennus PDF:ään ja tuonti PDF:stä ("Tuo PDF").
 *
 * Tulostettaessa sivun loppuun lisätään laskentatiedot (lähtötiedot pakattuna)
 * sekä linkki, joka avaa saman laskennan työkalussa. "Tuo PDF" -nappi lukee
 * tiedot PDF:stä ja päivittää työkalun syötteet.
 *
 * Tallennettavat tiedot:
 *  - kaikkien lomakekenttien arvot (input, select, textarea; ei tiedostokenttiä)
 *  - painikevalinnat (aria-pressed)
 *  - työkalun omat localStorage-tallennukset (avaimet, joita sivu lukee/kirjoittaa)
 *
 * Ladataan <head>-osassa heti salasanalukituksen jälkeen, jotta localStorage-
 * kutsut voidaan seurata ennen työkalun omia skriptejä.
 */
(function () {
  'use strict';
  var PREFIX = 'LTPDF1:', END = ':END', HASH = '#ltpdf=';
  var SKIP_LS = { 'lt-auth': 1, 'lt-paluu': 1, 'lt-projekti': 1 };
  var PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/';

  // ---- localStorage-avainten seuranta ----
  var lsKeys = {};
  try {
    var SP = Storage.prototype, oGet = SP.getItem, oSet = SP.setItem, oRem = SP.removeItem;
    SP.getItem = function (k) { if (this === window.localStorage && !SKIP_LS[k]) lsKeys[k] = 1; return oGet.apply(this, arguments); };
    SP.setItem = function (k) { if (this === window.localStorage && !SKIP_LS[k]) { lsKeys[k] = 1; dirty(); } return oSet.apply(this, arguments); };
    SP.removeItem = function (k) { if (this === window.localStorage && !SKIP_LS[k]) { lsKeys[k] = 1; dirty(); } return oRem.apply(this, arguments); };
  } catch (e) {}

  function toolPath() { return location.pathname.replace(/index\.html?$/, ''); }
  function locked() { return document.documentElement.style.visibility === 'hidden'; }

  // ---- Tilan keruu ----
  function fields() {
    return Array.prototype.filter.call(document.querySelectorAll('input,select,textarea'), function (el) {
      var t = (el.type || '').toLowerCase();
      return t !== 'file' && t !== 'button' && t !== 'submit' && t !== 'reset' && t !== 'password' && !el.closest('#lt-pdf-data');
    });
  }
  function fieldKey(el, i) {
    if (el.id) return el.id;
    if (el.type === 'radio' && el.name) return 'r:' + el.name + ':' + el.value;
    return '#' + i;
  }
  function pills() { return Array.prototype.slice.call(document.querySelectorAll('[aria-pressed]')); }
  function pillKey(el, i) { return el.id ? el.id : '#' + i; }

  function collect() {
    var st = { v: 1, t: toolPath(), d: new Date().toISOString().slice(0, 10), f: {}, p: {}, ls: {} };
    fields().forEach(function (el, i) {
      var k = fieldKey(el, i), t = (el.type || '').toLowerCase();
      if (t === 'checkbox' || t === 'radio') st.f[k] = el.checked ? 1 : 0;
      else if (el.multiple && el.options) st.f[k] = Array.prototype.filter.call(el.options, function (o) { return o.selected; }).map(function (o) { return o.value; });
      else st.f[k] = el.value;
    });
    pills().forEach(function (el, i) { st.p[pillKey(el, i)] = el.getAttribute('aria-pressed') === 'true' ? 1 : 0; });
    Object.keys(lsKeys).forEach(function (k) { try { st.ls[k] = localStorage.getItem(k); } catch (e) {} });
    return st;
  }

  // ---- Koodaus: JSON -> deflate -> base64url ----
  function b64u(bytes) {
    var s = '', CH = 0x8000;
    for (var i = 0; i < bytes.length; i += CH) s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function unb64u(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    var bin = atob(s), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function pipe(bytes, stream) { return new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer().then(function (b) { return new Uint8Array(b); }); }
  function encode(st) {
    var raw = new TextEncoder().encode(JSON.stringify(st));
    if (typeof CompressionStream === 'undefined') return Promise.resolve('u' + b64u(raw));
    return pipe(raw, new CompressionStream('deflate-raw')).then(function (z) { return 'z' + b64u(z); });
  }
  function encodeSync(st) { return 'u' + b64u(new TextEncoder().encode(JSON.stringify(st))); }
  function decode(code) {
    var kind = code.charAt(0), bytes = unb64u(code.slice(1));
    var p = kind === 'z' ? pipe(bytes, new DecompressionStream('deflate-raw')) : Promise.resolve(bytes);
    return p.then(function (b) { var st = JSON.parse(new TextDecoder().decode(b)); if (!st || st.v !== 1) throw new Error('tuntematon versio'); return st; });
  }

  // ---- Tulostettava tietolohko ----
  var current = '', stale = true, timer = 0;
  function dirty() { stale = true; clearTimeout(timer); timer = setTimeout(refresh, 250); }
  function refresh() {
    if (locked()) return;
    var st = collect();
    encode(st).then(function (c) { current = c; stale = false; render(c, st); }).catch(function () {});
  }
  function render(code, st) {
    var box = document.getElementById('lt-pdf-data');
    if (!box) {
      box = document.createElement('div');
      box.id = 'lt-pdf-data';
      box.innerHTML = '<p class="lt-pdf-h"></p><p class="lt-pdf-c"></p>';
      document.body.appendChild(box);
    }
    var url = location.origin + toolPath() + HASH + code;
    box.querySelector('.lt-pdf-h').innerHTML = 'Laskentatiedot ' + st.d + ': tämän PDF:n voi tuoda takaisin työkaluun <b>Tuo PDF</b> -napilla tai <a href="' + url + '">avata laskennan työkalussa</a>.';
    box.querySelector('.lt-pdf-c').textContent = PREFIX + code + END;
  }
  window.addEventListener('beforeprint', function () {
    if (locked()) return;
    if (stale || !current) { var st = collect(); current = encodeSync(st); render(current, st); }
    printTitle();
  });
  window.addEventListener('afterprint', function () { if (savedTitle !== null) { document.title = savedTitle; savedTitle = null; } });

  // ---- Projektin tiedot (projekti, suunnittelija) tulosteeseen ----
  // Arvot ovat yhteiset kaikille työkaluille (localStorage 'lt-projekti') ja
  // tallentuvat myös PDF:n laskentatietoihin. Tulosteesta poistetaan sivuston nimi.
  var PROJ = 'lt-projekti', savedTitle = null;
  function projGet() { try { return JSON.parse(localStorage.getItem(PROJ) || '{}') || {}; } catch (e) { return {}; } }
  function projSave() {
    var p = document.getElementById('lt-proj-p'), d = document.getElementById('lt-proj-s');
    if (!p || !d) return;
    try { localStorage.setItem(PROJ, JSON.stringify({ p: p.value, s: d.value })); } catch (e) {}
    projMark();
  }
  function projMark() {
    var box = document.getElementById('lt-proj'); if (!box) return;
    var p = document.getElementById('lt-proj-p').value.trim(), d = document.getElementById('lt-proj-s').value.trim();
    box.classList.toggle('lt-proj-empty', !p && !d);
    box.classList.toggle('lt-proj-nop', !p);
    box.classList.toggle('lt-proj-nos', !d);
    document.documentElement.classList.toggle('lt-has-designer', !!d);
    var dt = box.querySelector('.lt-proj-date'); if (dt) dt.textContent = new Date().toLocaleDateString('fi-FI');
  }
  function addProject() {
    if (document.getElementById('lt-proj')) return;
    var hr = document.querySelector('.hdr-r'), anchor = hr ? (hr.closest('header') || hr.parentNode) : null;
    var box = document.createElement('div');
    box.id = 'lt-proj';
    box.innerHTML =
      '<label class="lt-proj-f lt-proj-fp"><span>Projekti</span><input type="text" id="lt-proj-p" autocomplete="off" placeholder="Projektin nimi"></label>' +
      '<label class="lt-proj-f lt-proj-fs"><span>Suunnittelija</span><input type="text" id="lt-proj-s" autocomplete="name" placeholder="Suunnittelijan nimi"></label>' +
      '<span class="lt-proj-f lt-proj-fd"><span>Päiväys</span><b class="lt-proj-date"></b></span>';
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(box, anchor.nextSibling);
    else document.body.insertBefore(box, document.body.firstChild);
    var v = projGet();
    document.getElementById('lt-proj-p').value = v.p || '';
    document.getElementById('lt-proj-s').value = v.s || '';
    box.addEventListener('input', projSave);
    box.addEventListener('change', projSave);
    projMark();
  }
  function cleanTitle(t) { return String(t || '').replace(/\s*[–—-]\s*Lastutec\s*$/i, '').replace(/^\s*Lastutec\s*[–—-]\s*/i, '').trim(); }
  function printTitle() {
    if (savedTitle === null) savedTitle = document.title;
    var p = document.getElementById('lt-proj-p'), name = p ? p.value.trim() : '';
    var t = cleanTitle(savedTitle);
    document.title = name ? name + ' – ' + t : t;
    projMark();
  }

  // ---- Tilan palautus ----
  var PENDING = 'lt-pdf-pending';
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function fire(el) {
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function applyPills(p) {
    var list = pills(), changed = false;
    list.forEach(function (el, i) { var k = pillKey(el, i); if (p[k] === 1 && el.getAttribute('aria-pressed') !== 'true') { el.click(); changed = true; } });
    pills().forEach(function (el, i) { var k = pillKey(el, i); if (p[k] === 0 && el.getAttribute('aria-pressed') === 'true') { el.click(); changed = true; } });
    return changed;
  }
  function applyFields(f) {
    var changed = false;
    fields().forEach(function (el, i) {
      var k = fieldKey(el, i);
      if (!(k in f)) return;
      var v = f[k], t = (el.type || '').toLowerCase();
      if (t === 'checkbox' || t === 'radio') {
        var c = v === 1;
        if (el.checked !== c) { if (t === 'radio' && !c) return; el.checked = c; fire(el); changed = true; }
      } else if (Array.isArray(v) && el.options) {
        Array.prototype.forEach.call(el.options, function (o) { o.selected = v.indexOf(o.value) >= 0; }); fire(el); changed = true;
      } else if (el.value !== v) {
        el.value = v; fire(el); changed = true;
      }
    });
    return changed;
  }
  function applyForm(st) {
    var f = st.f || {}, p = st.p || {}, n = 0;
    function pass() {
      var a = applyPills(p), b = applyFields(f);
      n++;
      if ((a || b) && n < 4) return wait(80).then(pass);
    }
    return wait(30).then(pass).then(function () {
      var msg = 'Laskenta tuotu PDF:stä' + (st.d ? ' (' + st.d + ')' : '') + '.';
      if (document.querySelector('input[type=file]:not(#lt-pdf-file)')) msg += ' Jos laskennassa käytettiin tiedostoa (esim. IFC-malli tai kuva), valitse se uudelleen.';
      toast(msg);
      dirty();
    });
  }
  function applyState(st) {
    if (st.t && st.t !== toolPath()) {
      var name = st.t.replace(/^\/|\/$/g, '');
      if (confirm('PDF on tehty eri työkalulla (' + name + '). Avataanko laskenta siinä työkalussa?')) {
        encode(st).then(function (c) { location.href = st.t + HASH + c; });
      }
      return;
    }
    var keys = Object.keys(st.ls || {});
    if (keys.length) {
      keys.forEach(function (k) {
        try { if (st.ls[k] === null) localStorage.removeItem(k); else localStorage.setItem(k, st.ls[k]); } catch (e) {}
      });
      try { sessionStorage.setItem(PENDING, JSON.stringify({ f: st.f, p: st.p, d: st.d })); } catch (e) { return applyForm(st); }
      location.replace(toolPath());
      return;
    }
    return applyForm(st);
  }

  // ---- PDF:n lukeminen ----
  function findCode(text) {
    var flat = text.replace(/\s+/g, '');
    var m = flat.match(/LTPDF1:([uz][A-Za-z0-9_-]+):END/);
    if (m) return m[1];
    m = flat.match(/[#%23]+ltpdf=([uz][A-Za-z0-9_-]+)/);
    return m ? m[1] : null;
  }
  function readWithPdfjs(buf) {
    var lib = window.__ltPdfjs ? Promise.resolve(window.__ltPdfjs) : import(PDFJS + 'pdf.min.mjs').catch(function () { throw new Error('PDF-lukijan (pdf.js) lataus epäonnistui. Tarkista verkkoyhteys.'); });
    return lib.then(function (m) {
      window.__ltPdfjs = m;
      m.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.mjs';
      return m.getDocument({ data: buf }).promise;
    }).then(function (doc) {
      var pages = [], i;
      for (i = doc.numPages; i >= 1; i--) pages.push(i); // tiedot ovat viimeisellä sivulla
      function next() {
        if (!pages.length) return null;
        return doc.getPage(pages.shift()).then(function (pg) {
          return Promise.all([pg.getAnnotations(), pg.getTextContent()]).then(function (r) {
            var urls = r[0].map(function (a) { return a.url || a.unsafeUrl || ''; }).join(' ');
            var txt = r[1].items.map(function (it) { return it.str; }).join('');
            return findCode(urls) || findCode(txt) || next();
          });
        });
      }
      return next();
    });
  }
  function importFile(file) {
    if (!file) return;
    file.arrayBuffer().then(function (buf) {
      // Nopea polku: linkin osoite on usein PDF:ssä pakkaamattomana tekstinä
      var bytes = new Uint8Array(buf), s = '', CH = 0x8000;
      for (var i = 0; i < bytes.length; i += CH) s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
      var code = findCode(s);
      return code || readWithPdfjs(buf);
    }).then(function (code) {
      if (!code) throw new Error('PDF:stä ei löytynyt laskentatietoja. Tuoda voi vain PDF:n, joka on tulostettu Tulosta PDF -napilla tämän päivityksen jälkeen.');
      return decode(code);
    }).then(applyState).catch(function (e) { toast(e && e.message ? e.message : 'PDF:n tuonti epäonnistui.', true); });
  }

  // ---- Ilmoitus ----
  function toast(msg, bad) {
    var t = document.getElementById('lt-pdf-toast');
    if (!t) { t = document.createElement('div'); t.id = 'lt-pdf-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.className = bad ? 'bad' : '';
    t.style.display = 'block';
    clearTimeout(t._h); t._h = setTimeout(function () { t.style.display = 'none'; }, bad ? 9000 : 6000);
  }

  // ---- Tyylit ja nappi ----
  function css() {
    var st = document.createElement('style');
    st.textContent =
      '#lt-pdf-data{display:none}' +
      '#lt-pdf-toast{display:none;position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:9999;max-width:min(560px,calc(100vw - 32px));background:#2e3035;color:#e9e6e0;border:1px solid #82c79f;border-radius:8px;padding:10px 14px;font:600 14px Arial,Helvetica,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.4)}' +
      '#lt-pdf-toast.bad{border-color:#e8907f}' +
      '.lt-pdf-import{margin-left:0}' +
      '#lt-proj{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:flex-end;margin:8px 0 12px;font:13px/1.3 Arial,Helvetica,sans-serif}' +
      '#lt-proj .lt-proj-f{display:flex;flex-direction:column;gap:3px;flex:1 1 200px;min-width:0;max-width:340px}' +
      '#lt-proj .lt-proj-f>span{font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:var(--muted,#888)}' +
      '#lt-proj input{width:100%;box-sizing:border-box;font:inherit;font-size:14px;padding:6px 8px;border-radius:6px;border:1px solid var(--line,#555);background:var(--input,transparent);color:var(--ink,inherit)}' +
      '#lt-proj .lt-proj-fd{display:none}' +
      '@media print{#lt-pdf-toast,.lt-pdf-import{display:none!important}' +
      '#lt-proj{display:flex!important;gap:4px 24px;align-items:baseline;margin:4px 0 10px;padding:6px 0;border-top:1px solid #bbb;border-bottom:1px solid #bbb;color:#000!important}' +
      '#lt-proj .lt-proj-f{flex:0 1 auto;max-width:none;flex-direction:row;gap:6px;align-items:baseline}' +
      '#lt-proj .lt-proj-f>span{color:#444!important}' +
      '#lt-proj input{border:0!important;padding:0!important;background:none!important;color:#000!important;font-weight:700;font-size:13px;width:auto;field-sizing:content;min-width:2ch}' +
      '#lt-proj input::placeholder{color:transparent}' +
      '#lt-proj .lt-proj-fd{display:flex}' +
      '#lt-proj.lt-proj-nop .lt-proj-fp,#lt-proj.lt-proj-nos .lt-proj-fs{display:none!important}' +
      'html.lt-has-designer .hdr-r .meta{display:none!important}' +
      '#lt-pdf-data{display:block!important;break-inside:avoid;margin-top:14px;border-top:1px solid #bbb;padding-top:6px;color:#666!important;font:8px/1.3 Arial,Helvetica,sans-serif}' +
      '#lt-pdf-data p{margin:0 0 3px}#lt-pdf-data a{color:#c63a00}' +
      '#lt-pdf-data .lt-pdf-c{font:5px/1.25 "Courier New",monospace;word-break:break-all;overflow-wrap:anywhere;color:#888!important}}';
    document.head.appendChild(st);
  }
  function addButton() {
    var btns = document.querySelectorAll('button'), pb = null;
    for (var i = 0; i < btns.length; i++) { if (btns[i].textContent.trim() === 'Tulosta PDF') { pb = btns[i]; break; } }
    var input = document.createElement('input');
    input.type = 'file'; input.accept = 'application/pdf,.pdf'; input.hidden = true; input.id = 'lt-pdf-file';
    input.addEventListener('change', function () { importFile(input.files[0]); input.value = ''; });
    var b = document.createElement('button');
    b.type = 'button'; b.textContent = 'Tuo PDF'; b.title = 'Tuo aiemmin tulostettu laskenta PDF-tiedostosta';
    b.className = (pb ? pb.className + ' ' : '') + 'lt-pdf-import';
    b.addEventListener('click', function () { input.click(); });
    if (pb) { pb.parentNode.insertBefore(b, pb.nextSibling); pb.parentNode.insertBefore(input, b.nextSibling); }
    else { document.body.appendChild(b); document.body.appendChild(input); }
  }

  function init() {
    if (locked()) return;
    css();
    addProject();
    addButton();
    document.addEventListener('input', dirty, true);
    document.addEventListener('change', dirty, true);
    document.addEventListener('click', dirty, true);
  }
  function afterLoad() {
    if (locked()) return;
    var pend = null;
    try { pend = sessionStorage.getItem(PENDING); if (pend) sessionStorage.removeItem(PENDING); } catch (e) {}
    if (pend) { try { applyForm(JSON.parse(pend)); } catch (e) {} }
    else if (location.hash.indexOf(HASH) === 0) {
      var code = location.hash.slice(HASH.length);
      try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
      decode(code).then(applyState).catch(function () { toast('Linkin laskentatietoja ei voitu lukea.', true); });
    }
    refresh();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  if (document.readyState === 'complete') setTimeout(afterLoad, 0); else window.addEventListener('load', function () { setTimeout(afterLoad, 0); });
})();
