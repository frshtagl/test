# ARENA ZERO

A third-person, PvE browser arena shooter built with Three.js. Version 0.2 adds three weapons, three enemy archetypes, ranged enemy attacks, hit feedback and local persistence.

## Run locally

1. Clone this repository.
2. Start a static web server from the repository root: \`python -m http.server 8000\`.
3. Visit \`http://localhost:8000\`.

The project uses Three.js from a CDN, so an internet connection is required.

## Controls

- WASD: move
- Mouse: look around (click the game to capture the pointer)
- Left mouse: manual fire
- F: toggle auto-fire
- T: toggle aim assist
- 1 / 2 / 3: switch weapon
- R: reload
- Shift: sprint
- Space: dash
- Esc: release the mouse

Aim assist and auto-fire target the PvE bots in this project only.

## Weapons

| Key | Weapon | Role |
|---|---|---|
| 1 | ARC Rifle | Balanced automatic weapon |
| 2 | BREACH-7 | Seven-pellet close-range shotgun |
| 3 | LONGSHOT | High-impact precision weapon |

## Enemy classes

- Scout: fast melee attacker
- Gunner: ranged attacker that maintains distance
- Heavy: slow, high-health bruiser

## Persistence

Best elimination score and combat-assist settings are stored in browser local storage on the current device.

## GitHub Pages

In repository Settings → Pages, select **GitHub Actions** as deployment source. Push to \`main\`; the workflow publishes the static game.

## Project structure

- \`index.html\` — application shell and HUD
- \`src/main.js\` — Three.js scene, controls, enemy AI, combat and game loop
- \`src/styles.css\` — interface and responsive styling
- \`.github/workflows/deploy.yml\` — GitHub Pages deployment
- \`docs/ROADMAP.md\` — development milestones

## License

MIT (see \`LICENSE\`).
