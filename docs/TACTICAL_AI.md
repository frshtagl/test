# ARENA ZERO — Tactical AI 2.0

## Design intent
Enemy decisions must be readable, fair and distinct. AI does not receive the player's live position through solid cover. Tactical cover is a real gameplay obstacle, not a render-only prop.

## Navigation
- Build a static XZ navigation grid from arena AABB colliders, including active barricades.
- Inflate obstacles by a conservative enemy-clearance radius.
- Use deterministic A* with diagonal corner-cut prevention.
- Smooth paths only where the complete segment clears inflated cover.
- Replan on a short cadence and reverse the strafe preference after repeated blocked progress.
- When a barricade is destroyed, rebuild the grid and invalidate existing enemy paths immediately.

## Perception and cover tactics
Each enemy checks line of sight from its upper body to the player. It updates its last-known position only while the player is visible. When sight is lost, it navigates toward that last-known location rather than tracking the player through walls.

- **Scout:** selects close destinations with a strong preference for a clear line of sight. When the player hides behind a barricade, the Scout's A* route goes around a barricade end before closing for melee.
- **Gunner:** selects a medium-range orbit position with a clear firing angle. It moves around cover rather than firing into the obstruction.
- **Heavy:** advances toward close, visible attack positions and uses its area slam to pressure players who remain exposed.

## Barricade lifecycle
- Up to four VTK barricades are selected from free arena positions. Placement checks prevent overlap with existing crates and pillars.
- A procedural Three.js barricade and its collider are created synchronously. A successfully loaded VTK mesh replaces the visual only; the collision proxy remains unchanged.
- The proxy is a conservative rotated AABB derived from the source mesh bounds. It participates in player/enemy movement, line of sight, hitscan and projectile collision.
- Player hitscan and hostile projectiles can damage barricades. Health stages are intact, damaged, critical and destroyed; the health indicator appears briefly after a hit.
- On destruction the barricade is hidden, its collider is removed, the A* grid is rebuilt and every active enemy route is invalidated.

## Attack fairness
Scout and Heavy attacks have visible ground telegraphs. Leaving the warning range before the wind-up completes cancels the attack. Heavy damage is applied only inside the marked radius and with clear line of sight. Gunner projectiles retain travel time and are stopped by cover.

## Validation
Run `node scripts/tactical-ai-test.mjs` and `node scripts/cover-system-test.mjs`, then the movement, weapon, combat, VTK and smoke suites. Browser playtesting must still confirm cover placement, collision feel, flanking quality, telegraph readability and performance under full enemy waves.
