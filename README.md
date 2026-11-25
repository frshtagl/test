# ARENA ZERO

A third-person PvE browser arena shooter built with Three.js. Visual Build 0.3 adds cinematic arena lighting, floor energy rings, ambient particles, illuminated wall trim, a scenic title-screen camera and a redesigned animated deployment menu. The combat build includes three weapons, three enemy archetypes, ranged enemy attacks, hit feedback and local persistence.

## Run locally

1. Clone this repository.
2. Start a static web server from the repository root: python -m http.server 8000
3. Visit http://localhost:8000 in a modern browser.

The project loads Three.js from a CDN, so an internet connection is required.

## Controls

- WASD: move
- Mouse: look around (the Deploy button starts the run and requests pointer lock)
- Left mouse: manual fire
- F: toggle auto-fire
- T: toggle aim assist
- 1 / 2 / 3: switch weapon
- R: reload
- Shift: sprint
- Space: dash
- Esc: release the mouse

Aim assist and auto-fire target the PvE bots in this project only. Auto-fire can still be used with aim assist disabled; in that mode shots follow the centre-screen camera ray. Arena pillars and crates block player movement and projectiles, and the dash stops at cover.

## Weapons

| Key | Weapon | Role |
|---|---|---|
| 1 | ARC Rifle | Balanced automatic weapon |
| 2 | BREACH-7 | Seven-pellet close-range shotgun |
| 3 | LONGSHOT | High-impact precision weapon |

Switching weapons cancels the current reload but preserves each weapon's remaining magazine.

## Enemy classes

- Scout: fast melee attacker
- Gunner: ranged attacker that maintains distance
- Heavy: slow, high-health bruiser

## Persistence

Best elimination score and combat-assist settings are stored in browser local storage on the current device.

## GitHub Pages deployment

The GitHub Actions token cannot enable Pages for this repository automatically yet. Enable it once:

1. Open repository Settings → Pages.
2. Under Build and deployment, set Source to GitHub Actions.
3. Open Actions → Deploy ARENA ZERO to GitHub Pages.
4. Select Run workflow.

After Pages is enabled, use Run workflow whenever you want to publish a new build.

## Project structure

- index.html — application shell and HUD
- src/main.js — Three.js scene, controls, enemy AI, combat and game loop
- src/styles.css — interface and responsive styling
- .github/workflows/quality.yml — syntax and integration checks on every push
- .github/workflows/deploy.yml — manual GitHub Pages deployment
- scripts/smoke-check.mjs — static integration checks
- docs/ROADMAP.md — development milestones

## License

MIT (see LICENSE).
