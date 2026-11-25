# ARENA ZERO roadmap

## 0.1 — First playable prototype
- [x] Third-person 3D arena and follow camera
- [x] WASD movement, sprint and dash
- [x] PvE robot waves and enemy pursuit
- [x] Aim assistance and automatic fire toggles
- [x] Health, ammo, reload, kills and HUD

## 0.2 — Combat evolution
- [x] Three selectable weapons: automatic rifle, shotgun and precision rifle
- [x] Per-weapon magazines, fire rates, damage and reload timings
- [x] Three enemy archetypes: fast scout, ranged gunner and heavy unit
- [x] Ranged enemy projectiles and differentiated enemy behaviour
- [x] Enemy health bars, hit markers and player damage feedback
- [x] Persistent local best score and saved combat-assist settings
- [x] Camera-aligned centre-screen firing and narrow target acquisition
- [x] Swept projectile collision to prevent fast shots tunnelling through targets
- [x] Arena cover collision for player/enemies; cover blocks shots and dash movement
- [x] Cleanup of transient geometries and materials between waves/runs
- [x] Clear-line-of-sight target acquisition so auto-fire does not lock through cover
- [x] Weapon swaps dispose old weapon meshes and materials
- [x] Elimination counter records one per enemy, not weighted enemy points
- [ ] Manual playtest and balance pass across desktop/mobile

## 0.25 — Visual polish
- [x] Cinematic title-screen camera composition
- [x] Premium animated Deploy and Redeploy buttons with keyboard focus states
- [x] Darker high-contrast lighting, improved shadow coverage and atmospheric fog
- [x] Emissive arena floor rings, segmented perimeter accents and illuminated wall trim
- [x] Ambient floating particles and subtle animated lighting pulses
- [ ] Manual visual/performance playtest on desktop and mobile

## 0.3 — Character and enemy evolution
- [x] Articulated player armor, helmet, visor, backpack and limb rig
- [x] Animated player walk and sprint cycles with idle motion
- [x] Three distinct robot silhouettes and armor profiles
- [x] Scout blades and lightweight hunter frame
- [x] Gunner shoulder cannon, optic and firing recoil
- [x] Heavy armor plating, reactor core and reinforced limbs
- [x] Enemy gait animation, head motion and hit-flash response
- [x] Distinct weapon geometry for rifle, shotgun and precision rifle
- [ ] Manual animation, combat readability and performance playtest

## 0.4 — World and progression
- [ ] Additional arenas and environmental hazards
- [x] Upgrade choices between waves: choose one of three randomized modules after clearing a wave
- [x] Stackable damage, fire-rate, reload, movement, health and magazine upgrades
- [x] Upgrade intermission pauses combat and resumes through mouse or 1–3 keyboard selection
- [ ] Character cosmetics and unlocks
- [ ] Audio and accessibility settings
- [ ] Local leaderboard and run history

## 0.5 — Online features
- [ ] Evaluate authoritative server architecture
- [ ] Co-op PvE prototype
- [ ] Lobby and matchmaking

## 0.6 — Environment visual upgrade
- [x] Instanced industrial wall panels and structural ribs
- [x] Upper/lower perimeter rails and recessed vent modules
- [x] Recessed cyan wall fixtures and restrained orange warning markers
- [x] Metallic armor trims on the four existing arena support pillars
- [x] Reuse static geometry/materials and preserve existing gameplay collision layout
- [ ] Further environment props and arena variation

## 0.7 — Lighting and shadows
- [x] Refined fog density, exposure and ambient/key/rim light balance
- [x] Tighter directional shadow-camera bounds and bias tuning
- [x] Added restrained perimeter fill illumination without another shadow map
- [ ] Lighting playtest across low-, medium- and high-performance devices

## 0.8 — PBR materials and surface response
- [x] PBR roughness/metalness tuning across floor, walls, architecture, player, enemies and weapons
- [x] Separate emissive intensity controls for energy materials
- [x] Clear-coated physical material for the player visor
- [ ] Additional texture/normal detail and material wear

## 0.9 — Character silhouette and armor detail
- [x] Layered player chest and shoulder armor
- [x] Backpack side pods and energy accents
- [x] Articulated forearm, thigh, knee and shin details
- [x] Class-aware enemy chest and shoulder plating
- [x] Enemy upper/lower limb armor attached to existing animation pivots
- [ ] Further silhouette and animation review in-browser

## 1.0 — Weapon modelling and optics
- [x] Shared receiver top rail and machined cooling slots
- [x] Weapon-specific barrel bands
- [x] Clear-coated precision-rifle scope lens
- [x] Shotgun side-mounted shell cases
- [x] ARC rifle exposed energy cell

## 1.1 — Combat effects
- [x] Capsule-shaped directional projectiles
- [x] Weapon-specific muzzle-flash cones
- [x] Octahedral impact bursts
- [x] Lightweight particle-shard burst on enemy elimination
- [x] Effect lifetimes, attribute updates and disposal integrated into the existing effect loop
- [ ] Projectile trails and environmental debris
- [ ] Effect pooling review under sustained combat

## 1.2 — Rendering pipeline and resolution
- [x] Add Low, Medium, High and Ultra graphics presets
- [x] Add quality-specific render pixel-ratio ceilings and pixel budgets
- [x] Apply conservative quality limits on compact/touch displays
- [x] Recalculate pixel ratio, drawing-buffer size and camera aspect on resize
- [x] Observe viewport/container resizing without changing the canvas CSS layout
- [x] Persist graphics quality alongside existing local settings
- [ ] Browser visual comparison and per-tier frame-time measurements

## 1.3 — Procedural textures and surface detail
- [x] Generate deterministic concrete, brushed-metal and armor color maps
- [x] Generate corresponding tangent-space normal maps
- [x] Generate roughness maps with controlled micro-variation
- [x] Configure repeat wrapping, mipmaps and supported anisotropic filtering
- [x] Apply shared surface maps to floor, walls, architecture, player, enemies and weapons
- [ ] Browser inspection for texture scale, seams and material balance
- [ ] Texture memory and startup-time profiling

## 1.4 — Graphics diagnostics and profiling
- [x] Add optional F3 / ?debug=1 render telemetry overlay
- [x] Track rolling average FPS and average frame interval
- [x] Track 95th-percentile frame interval
- [x] Display renderer draw calls, triangles, geometry and texture counts
- [x] Display effective render scale and drawing-buffer resolution
- [ ] Capture baseline and per-quality-tier metrics on real devices

## 1.5 — FPS foundation
- [x] First-person camera with configurable vertical FOV
- [x] Camera-relative movement with acceleration, friction and air control
- [x] Sprint stamina drain, regeneration delay and HUD indicator
- [x] Jump, crouch and sprint-slide movement state machine
- [x] Separate Q dash ability retained from the previous prototype
- [x] First-person weapon viewmodel and simple armored forearms
- [x] ADS input, weapon-specific FOV, subtle viewmodel sway and recoil impulse
- [x] Manual fire and aim assist/auto-fire disabled by default
- [x] Versioned settings migration, sensitivity and FOV controls
- [x] Escape pause/resume flow and focus-loss handling
- [ ] Browser visual review of arms/weapon alignment and movement feel

## 1.6 — VTK static environment asset pipeline
- [x] Python VTK generator for wall terminal, floor service hatch and cover barricade
- [x] Deterministic compressed binary STL export and asset manifest
- [x] Mesh validation for empty geometry and boundary/non-manifold edges
- [x] Browser STL parser with malformed-file guards
- [x] Load wall terminals and floor hatches as visual-only arena props
- [x] Keep tactical cover out of combat until navigation and a separate collider are ready
- [ ] Inspect generated props in a browser screenshot and adjust scale/material balance
- [ ] Add validated cover collision proxy with enemy navigation regression tests

## 1.7 — Weapon handling and hit registration
- [ ] Weapon state machine: ready, firing, ADS, reload and swap
- [ ] Reload/swap viewmodel animation and ammo reserve model
- [ ] Weapon-specific recoil recovery and spread behavior
- [ ] Hitscan rifle/precision fire and deterministic shotgun pellet rays
- [ ] Projectile profiles for energy weapons that need travel time
- [ ] Cover-aware hit registration and impact feedback

## 1.8 — Enemy AI and tactical navigation
- [ ] Explicit enemy finite-state machines and attack telegraphs
- [ ] Perception: field of view, line of sight and last-known player position
- [ ] Local obstacle avoidance, stuck detection and recovery
- [ ] Scout flanking, Gunner repositioning and Heavy weak-point behavior
- [ ] Tactical cover selection after navigation tests pass

## 1.9 — Audio, accessibility and encounter design
- [ ] Spatial weapon/enemy audio and combat telegraphs
- [ ] Pause/settings menu, reduced-motion option and control remapping
- [ ] Additional arena layouts, hazards and deterministic wave composition

## 2.0 — Performance and release QA
- [ ] Before/after browser screenshots
- [ ] Desktop and compact viewport review
- [ ] FPS and frame-time p50/p95 per graphics preset
- [ ] Texture memory, draw calls, geometry and asset startup profiling
- [ ] Final regression and performance pass

## Design principles
- Responsive controls before complexity
- Keep combat readable and fair
- Aim assistance only targets this project's PvE enemies
- No third-party game automation or exploit behaviour
