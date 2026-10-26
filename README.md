# Tarek Alfutih — Illustration portfolio

One-page portfolio for Tarek Alfutih, children's book illustrator in Gothenburg, Sweden.
Plain HTML, CSS and JavaScript: no framework and no npm.

## Run it

`src/` is the site and works without a build:

```bash
python3 -m http.server 8070 --directory src
```

For production, build `dist/` (adds WebP image sizes; needs Pillow, `pip install pillow`):

```bash
python3 build.py
```

`python3 build.py --serve` builds and serves `dist/` on http://localhost:8000.

## Deploy

Hosted on GitHub Pages at https://tarekalfutih.se, served from the `gh-pages` branch.
After committing and pushing `main`, publish with:

```bash
python3 build.py --deploy
```

It builds `dist/` (with `CNAME` for the domain) and force-pushes it as the only commit on `gh-pages`.
DNS for tarekalfutih.se is at Loopia: four A records on `@` (185.199.108.153–111.153) and
`www` as a CNAME to `tarekalfutih.github.io`.

## Files

| Path | What it is |
|---|---|
| `src/index.html` | All content and markup |
| `src/css/site.css` | All styles; layout rules keyed on `<html data-bp="0–4">` |
| `src/js/hero.js` | Picks the layout (breakpoint), builds the pirate hero: eyes, blinking, smoke, typing line |
| `src/js/main.js` | In-page scrolling, phone menu, intro sizing, category scroll-spy, day/night slider, lightbox, image protection |
| `src/js/anim.js` | Canvas animations: Lärandets magi cover, Animal friends, Be Happy |
| `src/images/` | Artwork (© Tarek Alfutih) |
| `build.py` | Copies `src/` to `dist/` and adds WebP `srcset`s |

## Layouts

| `data-bp` | Name | Rule | Artboard |
|---|---|---|---|
| 0 | Desktop | width ≥ 1680 | 1920 × 960 |
| 1 | Laptop | width ≥ 1300 | 1440 × 780 |
| 2 | Tablet landscape | width ≥ 1000, or landscape and ≥ 600 | 1180 × 820 |
| 3 | Tablet portrait | width ≥ 600 | 820 × 1180 |
| 4 | Phone | otherwise | 390 × 844 |

The header and hero are fixed-size artboards scaled with CSS `zoom` (`--z`, `--zh`); everything
below the hero is fluid. Hero eye and smoke positions per layout live in the `BP` table in `hero.js`.

Built from the Claude Design handoff "Portfolio Redesign illustration" (`Home One Page.dc.html`).
