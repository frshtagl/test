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

## Next milestone

Build a procedural texture and surface-detail pipeline: reusable CanvasTexture or generated texture maps, correct color-space handling, mipmaps and anisotropy, followed by controlled material wear and normal/roughness variation. Measure GPU cost before increasing texture resolution.
