# ARENA ZERO

A third-person, PvE browser arena shooter. Version 0.1 is a no-build-step Three.js prototype with WASD movement, mouse-look, target assistance, automatic fire, enemy waves, health, ammo, reloads and a score HUD.

## Run locally

1. Open this repository in a terminal.
2. Start a static web server from the repository root, for example: `python -m http.server 8000`.
3. Visit `http://localhost:8000` in a modern browser.

The project uses Three.js from a CDN, so an internet connection is required on first load.

## Controls

- WASD: move
- Mouse: look around (click the game to capture the pointer)
- F: toggle auto-fire
- T: toggle aim assist
- R: reload
- Shift: sprint
- Space: dash
- Esc: release the mouse

Aim assist and auto-fire are player-facing game mechanics. They target the PvE bots in this project only.

## GitHub Pages

The repository includes a GitHub Actions workflow for static deployment. In repository Settings → Pages, set the build and deployment source to **GitHub Actions**. Push to `main`; the workflow will publish the game.

## Project structure

- `index.html` — application shell and HUD
- `src/main.js` — Three.js scene, controls, enemy AI, combat and game loop
- `src/styles.css` — interface and responsive styling
- `.github/workflows/deploy.yml` — GitHub Pages deployment
- `docs/ROADMAP.md` — planned development milestones

## License

MIT (see `LICENSE`).