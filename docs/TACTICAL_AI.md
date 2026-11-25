# ARENA ZERO — Tactical AI 1.9

## Design intent
Enemy decisions must be readable, fair and distinct. AI does not receive the player's live position through solid cover.

## Navigation
- Build a static XZ navigation grid from the same AABB colliders used by movement and hitscan.
- Inflate obstacles by a conservative enemy-clearance radius.
- Use deterministic A* with diagonal corner-cut prevention.
- Smooth paths only where the complete segment clears inflated cover.
- Replan on a short cadence and reverse the strafe preference after repeated blocked progress.

## Perception
Each enemy checks line of sight from its upper body to the player. It updates its last-known position only while the player is visible. When sight is lost, it navigates toward that last-known location rather than tracking the player through walls.

## Archetypes
- **Scout:** fast flanker that closes to melee range and telegraphs a short strike.
- **Gunner:** searches for a visible firing position, holds a medium-range orbit and charges a projectile before firing.
- **Heavy:** advances slowly, faces the visible player, exposes its rear reactor away from its facing direction and telegraphs a wide-area slam.

## Attack fairness
Scout and Heavy attacks have visible ground telegraphs. Leaving the warning range before the wind-up completes cancels the attack. Heavy damage is applied only inside the marked radius and with clear line of sight. Gunner projectiles retain travel time and are stopped by cover.

## Validation
Run `node scripts/tactical-ai-test.mjs`, then the movement, weapon, combat, VTK and smoke suites. Browser testing must still confirm route quality around the procedural crate layout, telegraph readability and enemy silhouettes before calling the milestone visually released.
