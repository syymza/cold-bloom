# Cold Bloom

A quiet, continuous composition of hexagonal crystals, grown from simple local rules.

One seed grows, then another begins in a considered position. Up to five crystals share the scene. Earlier shapes keep their history, and the oldest gently retires before a new seed takes its place.

**[Open Cold Bloom](https://syymza.github.io/cold-bloom/)**

The two controls set **vapor supply** and **edge growth for the next crystal**. They are dimensionless model conditions, not calibrated temperature or weather. Crystals are independently simulated and visually arranged, not physically coupled. [Model, attribution and numerical limitations](MODEL.md).

## Run locally

```
git clone https://github.com/syymza/cold-bloom.git
cd cold-bloom
npm run serve
```

Open `http://127.0.0.1:4178/`. The development server needs Python 3; HTTP is required for the module worker. Runtime files are static HTML, CSS and JavaScript, with no build-time or runtime package dependency.

## Checks and publishing

`npm test` checks the deterministic internal fixture, symmetry, growth conditions and the publication allowlist. `npm run build` copies only six reviewed runtime files into `dist/`. Pull requests run checks; the main branch deploys that exact artifact through GitHub Pages.

Optional browser checks require a development installation of Playwright. Run `node tests/browser.cjs`, `node tests/resources.cjs` and `node tests/edge-cases.cjs` against the local server. `PLAYWRIGHT_PATH` can identify an existing installation. Browser tooling, test evidence and local notes are never served to visitors.

The scene uses one worker, one request in flight, and a strict five-crystal display cap. Caches are bounded. Background tabs suspend scheduling without catch-up; reduced-motion mode presents completed still compositions. Growth pace depends on conditions and device speed.

No account, backend, hosted database, secret key, analytics, runtime AI or remote processing is required.
