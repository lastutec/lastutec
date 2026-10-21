# Lastutec-sivusto

Staattinen sivusto (HTML, CSS, JavaScript) ilman build-vaihetta. Julkaistaan GitHub Pagesiin
`.github/workflows/pages.yml`-työnkululla aina, kun `main`-haaraan tulee muutoksia.

## Rakenne

```
index.html                 Etusivu
tyokalut/index.html        Työkalulistaus
tyokalut/palkki/           Esimerkkityökalu: yksiaukkoinen palkki
assets/css/style.css       Yhteiset tyylit (vaalea ja tumma teema)
assets/js/main.js          Yhteinen ylä-/alatunniste ja työkalukortit
assets/js/tools.js         Työkalurekisteri
assets/js/tools/*.js       Työkalujen laskentakoodi
```

## Uuden työkalun lisääminen

1. Kopioi `tyokalut/palkki/` uudeksi kansioksi, esim. `tyokalut/puu/`.
2. Kirjoita laskenta tiedostoon `assets/js/tools/puu.js` ja viittaa siihen sivulta.
3. Lisää työkalu tiedostoon `assets/js/tools.js` (`status: "valmis"` ja `path: "tyokalut/puu/"`).
   Se näkyy silloin automaattisesti etusivulla ja työkalulistauksessa.

Valmiit lomake- ja tulosluokat (`.field`, `.input-unit`, `.results`, `.result`, `.diagram`, `.note`)
löytyvät tiedostosta `style.css`.

## Paikallinen esikatselu

```
python3 -m http.server 8000
```

ja avaa http://localhost:8000.

## Julkaisu

Ota GitHub Pages käyttöön: repositorion *Settings → Pages → Source: GitHub Actions*.
