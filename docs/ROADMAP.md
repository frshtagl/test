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

## 0.3 — World and progression
- [ ] Additional arenas and environmental hazards
- [ ] Upgrade choices between waves
- [ ] Character cosmetics and unlocks
- [ ] Audio and accessibility settings
- [ ] Local leaderboard and run history

## 0.4 — Online features
- [ ] Evaluate authoritative server architecture
- [ ] Co-op PvE prototype
- [ ] Lobby and matchmaking

## Design principles
- Responsive controls before complexity
- Keep combat readable and fair
- Aim assistance only targets this project's PvE enemies
- No third-party game automation or exploit behaviour
