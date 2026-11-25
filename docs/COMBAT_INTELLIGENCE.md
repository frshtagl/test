# ARENA ZERO — Combat Intelligence 2.1

## Scope
This milestone connects three gameplay systems: weapon-specific damage against destructible cover, coordinated enemy squads, and camera-relative warning of incoming attacks. The systems are renderer-independent where possible and have focused Node regression suites.

## Environmental damage model

Barricade base health remains 180. Player weapon base damage and run damage upgrades are multiplied by a cover-specific coefficient. Each pellet is resolved independently by the existing hitscan solver; only pellets whose ray actually intersects the barricade apply damage.

| Source | Coefficient | Example | Balance intent |
|---|---:|---:|---|
| ARC Rifle | 0.75 | 29 × 0.75 = 21.75 | Sustained, predictable wear |
| BREACH-7 | 0.58 per pellet | 13 × 0.58 = 7.54 per pellet | Strong close-range burst when several pellets connect |
| LONGSHOT | 1.50 | 105 × 1.50 = 157.5 | Two accurate hits break a full barricade |
| Hostile projectile | 1.05 | 8 × 1.05 = 8.4 | Enemy fire can eventually open routes |

Player damage upgrades multiply the resulting environmental damage. Enemy hit-zone critical multipliers do not apply to cover. Invalid weapon IDs, non-finite damage and non-positive modifiers return zero damage rather than silently damaging the world.

## Squad formation and shared contact

Each wave is divided into spawn-order groups of up to four members. Squad IDs include the wave number, so squads never share contact across waves.

- Scout slots alternate flank-left and flank-right.
- Gunner slots alternate support-left and support-right.
- Heavy units use the anchor role.

The role biases tactical goal selection; all candidate destinations still pass walkability and line-of-sight checks, and movement still uses the existing A* path planner. Gunners retain cover-edge peek selection, with the squad role used as a tie-breaking directional preference.

When a squad member sees the player, it periodically relays the observed position to same-squad members whose memory is stale. Relayed contact resets their lost-sight timer and requests a route refresh only when the target has materially moved or the member's memory has expired. Enemies also receive a small separation steering vector from nearby same-squad allies to reduce pile-ups. The vector is additive; arena collision remains authoritative.

## Directional threat awareness

The HUD samples two active threat sources:
1. Hostile projectiles that are within 22 metres and whose velocity points toward the player's current position.
2. Enemy attack wind-ups whose telegraph is active and whose attacker is within 10 metres.

The direction is calculated from the player's XZ position and current camera yaw, then quantized into eight readable sectors: front, front-right, right, rear-right, rear, rear-left, left and front-left. The most urgent threat is selected using severity, distance and estimated time-to-impact. A red pulsing indicator is reserved for threats with an estimated impact window below 0.65 seconds; other active warnings are amber.

This is an awareness cue, not an aim lock or a guarantee of collision. Projectiles may still miss, and existing invulnerability and attack-cancellation rules remain unchanged. The indicator is hidden when no relevant threat is approaching and respects reduced-motion preferences.

## Regression and CI

- scripts/cover-system-test.mjs: weapon-specific cover coefficients, upgrades, health stages and collider bounds.
- scripts/squad-tactics-test.mjs: role assignment, squad separation, shared contact and stale-route refresh.
- scripts/tactical-ai-test.mjs: role-separated Scout and Gunner destinations plus existing navigation regressions.
- scripts/threat-awareness-test.mjs: camera-relative direction sectors, threat urgency and invalid/out-of-range filtering.
- scripts/smoke-check.mjs: runtime imports, HUD elements and integration anchors.
- .github/workflows/quality.yml: runs all new regression suites with the existing movement, weapon, combat, tactical AI, cover and VTK tests.

Automated checks do not replace browser playtesting. The remaining manual gate is to confirm that squads visibly spread and flank, that the indicator points correctly while rotating the camera, and that cover durability feels balanced in live combat.
