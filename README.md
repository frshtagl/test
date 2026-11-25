# ARENA ZERO

A first-person sci-fi PvE browser shooter built with Three.js. FPS Foundation 1.5 adds a camera-relative first-person controller with acceleration, stamina, jump, crouch, slide, ADS, recoil, viewmodel arms and a pause flow. The VTK static-asset pipeline generates and validates wall terminals, floor service hatches and a future tactical-cover module; static props load as compressed binary STL and receive shared Three.js materials. Gameplay Build 0.5 adds a between-wave roguelite upgrade system with randomized module choices and stackable combat improvements. Visual Build 0.6–0.7 adds instanced industrial architecture and a refined lighting hierarchy. Visual Build 0.8 refines physically based material response across the arena, player, enemies and weapons, including a clear-coated player visor. Visual Build 0.9 adds layered player and enemy armor details. Visual Build 1.0 adds weapon-specific model details and optics. Visual Build 1.1 adds capsule-shaped energy projectiles, weapon-specific muzzle-flash cones, octahedral impact bursts and lightweight particle shards when enemies are eliminated. Visual Build 1.2 adds Low, Medium, High and Ultra rendering presets, resolution-aware pixel budgets, high-DPI supersampling limits and responsive renderer resizing. Visual Build 1.3 adds deterministic procedural concrete, brushed-metal and armor surface maps with mipmaps, anisotropic filtering, roughness variation and subtle normal detail. Visual Build 1.4 adds an opt-in render telemetry panel for frame cadence, draw calls, triangle count, geometry/texture counts and drawing-buffer resolution. It builds on the articulated sci-fi player, animated Scout, Gunner and Heavy robot classes, three-weapon combat and local persistence.

## Run locally

1. Clone this repository.
2. Start a static web server from the repository root: python -m http.server 8000
3. Visit http://localhost:8000 in a modern browser.

The project loads Three.js from a CDN, with an automatic jsDelivr-to-unpkg fallback. An internet connection is required. The deployment buttons are bound immediately while the engine loads; startup errors are shown on the title screen rather than leaving an unresponsive button.

## Graphics quality

Choose Low, Medium, High or Ultra on the deployment screen. The renderer applies a quality-specific pixel-ratio ceiling and a resolution-aware pixel budget, with more conservative limits on compact/touch displays. Your selection is saved with the existing local combat settings. High and Ultra may increase GPU load; use Medium or Low if frame pacing becomes uneven.

## Procedural surface detail

The arena floor, industrial structures, player armor, weapons and enemy armor use locally generated color, normal and roughness maps. The maps are deterministic, mipmapped and anisotropically filtered where supported; no external texture downloads are required.

## VTK asset pipeline

Static environment props are generated offline with Python VTK and validated for bounds, triangle count and boundary/non-manifold edges. The browser loads compressed binary STL into Three.js and applies shared PBR materials. The cover barricade source is intentionally not used as gameplay cover until enemy navigation and a separate collision proxy are implemented. See docs/FPS_MASTER_PROMPT.md and docs/VTK_ASSET_PIPELINE.md.

## Graphics diagnostics

For development testing, append `?debug=1` to the game URL or press **F3** to show/hide the diagnostics panel. It reports average FPS estimated from frame intervals, average and 95th-percentile frame intervals, draw calls, triangles, active geometry/texture counts, render scale and drawing-buffer resolution. These are browser-side indicators, not direct GPU-time measurements.

## FPS controls

- WASD: move relative to camera direction
- Mouse: look around; Deploy requests pointer lock
- Left mouse: fire; right mouse: aim down sights
- Shift: sprint (uses stamina)
- Space: jump
- Ctrl or C: crouch; press while sprinting to slide
- Q: dash ability
- R: reload
- 1 / 2 / 3: switch weapons
- Esc: pause/resume and release/reacquire the mouse
- F: toggle optional auto-fire; T: toggle optional aim assist
- F3: render diagnostics

Aim assist and auto-fire are optional PvE accessibility assists and are off by default in the standard FPS profile. With both assists disabled, shots follow the centre-screen camera ray. Arena pillars and crates block player movement and projectiles.

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
- docs/FPS_MASTER_PROMPT.md — complete FPS production specification and ordered development plan
- docs/VTK_ASSET_PIPELINE.md — offline VTK geometry workflow and runtime integration
- tools/vtk/generate_arena_assets.py — deterministic static-asset generator
- docs/GRAPHICS_MASTER_PROMPT.md — detailed visual-upgrade protocol
- docs/GRAPHICS_AUDIT.md — source audit and graphics milestone record

## License

MIT (see LICENSE).
