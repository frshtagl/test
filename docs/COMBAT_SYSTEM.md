# ARENA ZERO — Combat System 1.8

## Goals
Deterministic, cover-aware combat with immediate player hitscan, weapon-specific ranges, enemy hit zones, reproducible shotgun spread and readable impact feedback.

## Runtime flow
1. Validate weapon state and fire cadence.
2. Resolve muzzle origin and centre-screen aim direction, or explicitly enabled PvE aim assist.
3. Derive a deterministic seed from the shot sequence.
4. Generate a uniform-cone direction for each pellet.
5. Resolve each ray against arena AABB obstacles and enemy hit-zone spheres.
6. Apply damage only to the nearest valid intersection.
7. Spawn a short-lived tracer, surface impact or enemy hit response.
8. Update ammunition and weapon feedback.

## Weapon profiles
| Weapon | Damage | Fire interval | Effective range | Pellets | Spread |
|---|---:|---:|---:|---:|---:|
| ARC Rifle | 29 | 145 ms | 72 m | 1 | 0.012 rad |
| BREACH-7 | 13 per pellet | 650 ms | 27 m | 7 | 0.105 rad |
| LONGSHOT | 105 | 850 ms | 110 m | 1 | 0.002 rad |

Damage upgrades multiply base damage before hit-zone multipliers.

## Hit zones
- Head: 2.0x damage.
- Torso: 1.0x damage.
- Heavy rear reactor: 2.4x damage. It is a rear-facing weak point; frontal fire must not receive the multiplier.

Hit zones use world-space sphere approximations. Their dimensions are initial gameplay values and require visual tuning against enemy silhouettes.

## Occlusion and materials
- World AABB obstacles are tested before damage is applied.
- The closest valid intersection wins. World geometry wins exact-distance ties.
- Perimeter walls and arena pillars are concrete; procedural cover blocks are composite.
- Visual-only VTK props remain non-colliding until dedicated collision proxies and navigation checks are complete.
- Concrete/composite/metal impacts use distinct palettes and transient marks/sparks.

## Determinism
Pellet directions use seeded uniform-cone sampling. Identical weapon inputs and seed must reproduce identical direction arrays.

## Validation
Run `node scripts/combat-test.mjs`, `node scripts/weapon-system-test.mjs`, `node scripts/fps-controller-test.mjs`, and `node scripts/smoke-check.mjs`. GitHub Actions runs the complete suite on the pull request. Browser visual review remains a separate release gate.
