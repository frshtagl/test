# ARENA ZERO

A third-person PvE browser arena shooter built with Three.js. Gameplay Build 0.5 adds a between-wave roguelite upgrade system with randomized module choices and stackable combat improvements. Visual Build 0.6–0.7 adds instanced industrial architecture and a refined lighting hierarchy. Visual Build 0.8 refines physically based material response across the arena, player, enemies and weapons, including a clear-coated player visor. Visual Build 0.9 adds layered player chest/shoulder/backpack armor and articulated limb guards, plus class-aware enemy chest, shoulder and limb plating. It builds on the articulated sci-fi player, animated Scout, Gunner and Heavy robot classes, three-weapon combat and local persistence.

## Run locally

1. Clone this repository.
2. Start a static web server from the repository root: python -m http.server 8000
3. Visit http://localhost:8000 in a modern browser.

The project loads Three.js from a CDN, with an automatic jsDelivr-to-unpkg fallback. An internet connection is required. The deployment buttons are bound immediately while the engine loads; startup errors are shown on the title screen rather than leaving an unresponsive button.

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

## Wave upgrades

After all hostiles in a wave are eliminated, the simulation pauses and presents three randomly selected upgrade modules. Choose one with the mouse or press **1**, **2** or **3** to continue.

Available modules improve weapon damage, fire rate, reload speed, movement speed, maximum health or magazine capacity. Effects stack during the current run; a new deployment resets the upgrades. The HUD tracks how many modules have been collected.

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
- docs/GRAPHICS_MASTER_PROMPT.md — detailed visual-upgrade protocol

## License

MIT (see LICENSE).
