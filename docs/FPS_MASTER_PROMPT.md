# ARENA ZERO — MASTER FPS PRODUCTION PROMPT

## Mission and role
Act as Game Director, Senior FPS Gameplay Engineer, Technical Director, AI Engineer, Technical Artist, VTK Asset-Pipeline Engineer, UI/UX Designer, Audio Designer and QA Lead. Transform the existing Three.js PvE arena shooter into a polished, maintainable first-person sci-fi shooter. Do not call it AAA or claim AAA quality merely because a feature exists. Earn quality through tested mechanics, readable design, coherent art direction, reliability and measured performance.

The current game already has three weapons, three robot archetypes, enemy waves, local upgrades, collision checks, procedural materials, graphics presets and render diagnostics. Preserve these systems unless a planned migration explicitly replaces them and regression tests prove the replacement.

## Non-negotiable engineering principles
1. Audit branch ancestry, open PRs and current files before editing.
2. Work on a dedicated feature branch; never push directly to main.
3. Implement one subsystem at a time in small reviewable commits.
4. Preserve working gameplay and user-owned assets.
5. Separate render meshes, collision proxies and gameplay data.
6. Use deterministic simulation and bounded frame deltas.
7. Keep input, movement, weapons, AI, world, UI, audio and rendering independently testable.
8. Prefer data-driven definitions over hard-coded branches.
9. Reuse geometry, materials, textures and effects; pool transient objects when profiling justifies it.
10. Test startup, normal play, restart, intermission, death, resize, pointer-lock loss and settings migration.
11. Never claim a screenshot, benchmark, visual inspection or deployment unless it actually happened.
12. Record limitations and risks in every milestone report.

## Product target
- Genre: single-player first-person science-fiction PvE shooter.
- Platform: browser, desktop-first; touch support is a later validated layer.
- Runtime renderer: Three.js WebGL.
- Offline geometry authoring: Python VTK for static meshes and mesh inspection.
- Runtime interchange: compressed binary STL for simple static geometry; glTF/GLB for textured, rigged or animated assets authored in Blender or another capable DCC.
- Core loop: enter a tactical arena, read enemy intent, move and use cover, select a weapon, manage ammunition and stamina, eliminate threats, earn upgrades and survive escalating waves.

## Art direction
Build a grounded industrial military science-fiction identity:
- Believable silhouettes and readable combat distances.
- Layered steel, ceramic composite, polymer, rubber, glass and energy components.
- Restrained cyan energy accents and orange hazard language.
- High-contrast target readability; never hide enemies in dark materials.
- Modular architecture: service access, reinforced supports, terminals, vents, cable runs, floor hatches, tactical cover and clear traversal lanes.
- Cinematic lighting is subordinate to combat readability.
- Avoid decorative clutter, unmotivated neon, noisy surfaces, repetitive props and effects that obscure threats.

## FPS camera and input
- First-person camera with configurable standing/crouched eye height.
- Pointer-lock mouse look with safe unlock/relock and pause behavior.
- Independent yaw/pitch, pitch limits, adjustable sensitivity and vertical FOV.
- ADS uses weapon-specific FOV and viewmodel alignment.
- Recoil is a recoverable impulse layered over player look input, not a permanent change to stored aim.
- Camera bob, sway and landing response are subtle and accessibility-adjustable.
- Prevent camera clipping; implement collision and step handling before complex traversal.
- Controls: WASD move; mouse look; LMB fire; RMB ADS; Shift sprint; Space jump; Ctrl/C crouch and sprint-slide; Q dash ability; R reload; 1–3 weapon selection; Esc pause/unlock; F3 diagnostics.
- Inputs must not trigger gameplay while a modal, text field or menu owns focus.

## Movement specification
- Camera-relative WASD movement.
- Acceleration, deceleration, ground friction and limited air control.
- Sprint drains stamina; stamina regenerates after a delay and is visible on the HUD.
- Crouch lowers eye height and movement speed.
- Slide requires sprint, crouch, grounded state and sufficient speed; it has duration, friction and cooldown.
- Jump uses gravity, grounded checks and deterministic landing.
- Keep dash separate from jump.
- Normalize diagonal movement and clamp frame delta to prevent speed exploits.
- Resolve movement against simple collision proxies and cancel blocked velocity components.
- Do not add double-jump, wall-run, mantle or parkour until the base controller is stable.

## Weapons and combat
Represent each weapon as data: ID, display name, fire mode, damage, fire interval, magazine/reserve ammo, reload duration, range, projectile speed or hitscan mode, spread, recoil, ADS FOV, handling offsets and effect palette.
- State machine: ready, firing, reloading, swapping, aiming and disabled.
- Fire cadence must be independent of frame rate.
- Correct magazine/reserve accounting and explicit interrupted-reload policy.
- Distinct recoil, recovery, muzzle flash, impact, sound and reload feedback.
- Use hitscan for weapons designed for instant shots; physical projectiles when travel time is part of gameplay. Shotgun uses deterministic pellet rays or a controlled pellet simulation.
- Hit registration must respect cover and nearest impact; never damage targets through walls.
- Aim assist and auto-fire are optional PvE accessibility assists, off by default.
- Any future competitive multiplayer requires server-authoritative hit validation.

## Enemy AI and encounters
Use explicit finite-state machines, not one large movement branch:
- States: spawn/telegraph, patrol/hold, investigate, engage, attack, reposition, seek cover, recover, stagger and dead.
- Perception: distance, field of view, line of sight, last-known player position and hearing/noise events.
- Navigation: stable arena bounds, waypoint/grid navigation, local obstacle avoidance and stuck detection. Add navmesh/A* only after geometry and collision proxies are stable.
- Telegraph high-damage attacks, respect cooldowns, avoid unavoidable spawn damage and provide counterplay.
- Scout: fast flank and close-range pressure; vulnerable during committed attacks.
- Gunner: ranged suppression and repositioning; readable fire and line-of-sight discipline.
- Heavy: slow area denial, armor and readable weak points; clear recovery windows.
- Difficulty scaling adjusts composition, timing and pressure, not only health/damage.
- Use deterministic spawn seeds for reproducible balance tests.

## World and level design
- Readable sightlines, flanking routes, safe spawn distances and deliberate chokepoints.
- Distinct short-, medium- and long-range engagement zones.
- Cover blocks both player and enemy projectiles and has a separate low-cost collider.
- Enemy navigation around cover is mandatory before collision cover enters the combat arena.
- Hazards have clear visual/audio telegraphs.
- Add multiple arena layouts only after one arena has a stable combat loop.
- Visual set dressing must not silently alter navigation or line-of-sight.

## VTK geometry pipeline
Use VTK as an offline geometry-generation and validation tool, not as the real-time game engine.

VTK is appropriate for static architecture/props, parametric sources, transforms, append/clean/triangulation, normal generation, bounds, triangle counts and boundary/non-manifold inspection.

VTK is not the default choice for runtime rendering, rigged characters, skeletal animation, morph targets, UV/PBR material authoring or replacing the game collision system.

Asset standards:
- Right-handed coordinates, +Y up, metres; document local origin and forward axis.
- Keep render mesh and collision proxy separate.
- Use binary STL for simple static geometry-only props; Three.js assigns runtime PBR materials.
- Use Blender/DCC glTF/GLB for UV-mapped, textured, rigged or animated assets.
- Generate a manifest with file, dimensions, bounds, triangle count, units, VTK version, validation and collision status.
- Reject empty meshes and boundary/non-manifold edges unless an open surface is intentional.
- Review scale, normals, topology, seams, memory and rendered appearance before gameplay integration.
- Never assume a mesh is a valid collider because it renders.

## Rendering, materials and VFX
- Correct linear/sRGB color-space handling.
- PBR base color, metalness, roughness, normal detail and emissive response.
- Shared materials and texture sets have explicit ownership; do not dispose shared maps when an enemy/weapon is removed.
- Instance repeated static architecture.
- Pool projectiles and VFX when sustained-fire profiling identifies allocation pressure.
- Decals, sparks, trails, smoke and destruction have explicit lifetime and budget.
- Bloom/post-processing are optional and measured against render budgets.
- Track FPS, frame-time p95, draw calls, triangles, geometry/texture counts, render scale and drawing-buffer size.

## Audio and feedback
Add distinct weapon fire, reload, empty click, hit confirmation, enemy telegraph/attack, damage, wave transition and upgrade sounds. Use positional audio for world events, controlled UI mix for critical information, no autoplay before user gesture, and master/effects/music/mute controls. Audio and visual cues must reinforce the same gameplay state.

## UI, accessibility and persistence
- HUD: health, stamina, ammunition, reload state, weapon, wave and threat count.
- Adjustable FOV and mouse sensitivity.
- Aim assist/auto-fire are optional PvE accessibility settings, off by default.
- Reduced-motion option for camera shake/bob.
- Pause on Escape and browser visibility loss; clear stuck keys after blur/pointer-lock loss.
- Versioned settings schema with safe migration defaults.
- Remappable controls are a later milestone.

## Performance targets and measurement
Targets are goals, not claims:
- Desktop goal: stable 60 FPS on an agreed reference device.
- Lower-power goal: stable 30 FPS at Low.
- Track frame-time p50/p95, not average FPS alone.
- Measure texture memory, draw calls, triangles, shadow cost, particle count, startup time and garbage collection.
- Adaptive render scale stays within documented bounds.
- Do not add expensive effects or geometry before comparison.
- Report device, browser, quality preset, run duration and scene conditions for each benchmark.

## Test and release gates
Automated: movement direction/diagonal normalization/acceleration/friction/jump/landing/stamina/crouch/slide; STL malformed lengths/counts/non-finite vertices/normals; VTK manifest/bounds/triangle validation; weapon cadence/ammo/reload/ADS/recoil; AI transitions/LOS; collision/projectile-versus-cover; restart/intermission/pause/pointer-lock loss/settings migration; syntax, smoke and GitHub Actions.
Manual: first-person screenshots at desktop/mobile ratios; movement/weapon feel; hit registration behind cover; Low/Medium/High/Ultra capture; missing/slow asset fallback.
Every PR states what was automated, manually inspected and left unverified.

## Ordered roadmap
1. FPS foundation: first-person camera/controller, stamina, jump, crouch, slide, viewmodel and standard input.
2. VTK static environment asset pipeline: wall terminals, floor hatches and validated modular cover source.
3. Weapon handling: ADS, recoil, sway, reload/swap animation and weapon state machine.
4. Hit registration: hitscan, pellet spread, projectile profiles, impact effects and cover correctness.
5. Enemy AI: state machine, perception, telegraphs, avoidance and stuck recovery.
6. Tactical cover: collision proxies, cover selection, flanking and navigation regression.
7. Encounter design: arena layouts, hazards and deterministic wave composition.
8. Audio/accessibility: spatial audio, pause, settings, reduced motion and control remapping.
9. Progression: balanced upgrades, persistent unlocks and run history.
10. Optimization/release QA: profiling, memory lifecycle, visual regression and browser/device matrix.
11. Only then evaluate co-op, server authority, matchmaking and online persistence.

## Required milestone workflow
Audit → define narrow acceptance criteria → implement one subsystem → add tests → run local/static checks and CI → inspect diff for regressions/leaks/disposal → capture screenshot or state unavailable → commit feature branch → open PR against correct parent → report exact files/tests/CI/commit/PR/remaining work.

## Final directive
Build a dependable FPS first, then expand complexity. Order of priority: feel, fairness, reliability, readability, content, spectacle. Do not trade movement, hit registration, enemy navigation or frame pacing for effects.
