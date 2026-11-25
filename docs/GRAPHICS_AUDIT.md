# ARENA ZERO graphics audit

## Audit target

- Repository: `frshtagl/test`
- Baseline ref: `feature/arena-zero-vfx-1-1` (Visual Build 1.1 head before this rendering milestone)
- Audit date: 2026-11-25
- Engine: Three.js 0.160.0, loaded as a browser ES module with jsDelivr and unpkg fallbacks

## Existing rendering baseline

| Area | Observed implementation |
|---|---|
| Renderer | `THREE.WebGLRenderer` |
| Context options | Antialias enabled; high-performance power preference |
| Pixel ratio | `Math.min(devicePixelRatio, 1.65)` |
| Output color space | `THREE.SRGBColorSpace` |
| Tone mapping | ACES Filmic |
| Shadows | Enabled, `PCFSoftShadowMap`, 1536 × 1536 directional shadow map |
| Canvas sizing | Initial window size plus a window resize listener |
| Resize behavior | Updates camera aspect and renderer size, but did not recalculate pixel ratio |
| Post-processing | No EffectComposer or post-processing pipeline found in `src/main.js` |
| Texture loading | No TextureLoader, CanvasTexture or DataTexture usage found in `src/main.js` |
| Tracked image/texture assets | No dedicated texture or model asset directory in the audited repository tree |
| Geometry | Arena, characters, weapons and effects are primarily generated from Three.js primitives and instanced geometry |
| Build tooling | No package.json; browser ES modules load Three.js from a CDN |
| Automated QA | GitHub Actions checks module syntax and runs `scripts/smoke-check.mjs` |

## Main opportunities

1. Make render quality configurable rather than fixing one 1.65 pixel-ratio cap.
2. Bound internal resolution using both a quality ceiling and a pixel budget.
3. Apply more conservative limits to compact/touch displays.
4. Recalculate the drawing buffer and camera projection consistently when the viewport changes.
5. Establish a procedural texture/material pipeline in a later milestone because the current game has no dedicated texture library.
6. Capture browser screenshots and measure frame time before claiming visual or performance gains.

## Runtime baseline limitations

This is a source and repository audit, not a live GPU benchmark. No browser-rendered screenshot, device GPU information, FPS, frame-time distribution, draw-call count or texture-memory measurement was available during this audit. Those values remain unmeasured and must not be invented. The next visual QA stage must capture them in an actual browser session.

## Visual Build 1.2 implementation

- Added Low, Medium, High and Ultra graphics presets.
- Added per-preset maximum pixel ratios and total pixel budgets.
- Added more conservative render limits for compact/touch displays.
- Added saved graphics preference using the existing local settings key.
- Added coordinated renderer/camera resizing on window, visual viewport and container changes.
- Kept antialiasing enabled and made the WebGL context options explicit.
- Preserved gameplay systems, geometry, materials, combat and input behavior.

## Visual Build 1.3 — Procedural texture and surface detail

- Added deterministic CanvasTexture generation for concrete, brushed metal and armor finishes.
- Generated matching tangent-space normal maps from a seeded height field.
- Generated roughness maps with controlled per-pixel variation.
- Configured repeat wrapping, mipmaps, linear filtering and hardware-supported anisotropy (capped at 8).
- Applied shared maps to the arena floor, industrial walls and architecture, player armor, enemy armor and weapon metal.
- Reused scene-lifetime texture sets across materials to avoid generating a new texture set for every enemy or weapon switch.
- No external image downloads or third-party texture assets were introduced.

## Runtime validation limitations

The source and smoke-test checks can confirm that the texture pipeline is wired into the intended materials, but they cannot establish whether the surface scale, normal strength, seams, GPU memory or startup cost look acceptable on a real device. Browser screenshots and runtime profiling remain required.

## Visual Build 1.4 — Runtime graphics diagnostics

- Added an opt-in overlay, hidden during normal play.
- Enable it with `?debug=1` or toggle it with F3.
- Reports rolling average FPS estimated from frame intervals, average frame interval, p95 frame interval, renderer draw calls, triangles, geometry count, texture count, render scale and drawing-buffer resolution.
- The panel updates at a throttled interval and does not add a visible HUD element during ordinary play.
- These are browser-side indicators; they do not expose direct GPU timing.

## Next milestone

Use the diagnostics panel and real browser screenshots to inspect the procedural textures for tiling, seam visibility, excessive bumpiness and color balance. Then refine animation/camera presentation and profile texture memory and frame times before considering larger maps or more expensive post-processing.


## FPS Foundation 1.5 direction

The project is migrating from the original third-person prototype to a first-person PvE FPS. The migration keeps the existing wave, enemy, weapon, upgrade and render systems while replacing the follow camera and immediate movement with a testable first-person controller. Aim assist and auto-fire are now off by default under a versioned settings migration.

## VTK static geometry

Python VTK 9.6.2 generated three static modules: a wall terminal (144 triangles), floor service hatch (96 triangles) and future cover barricade (272 triangles). All three passed the VTK boundary/non-manifold edge check and binary STL parser/manifest checks. The wall terminals and floor hatches are visual-only arena props. The cover barricade is intentionally not placed into gameplay until enemy navigation and a separate collision proxy are implemented.
