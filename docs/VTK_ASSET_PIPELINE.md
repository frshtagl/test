# ARENA ZERO — VTK asset pipeline

Python VTK is an offline geometry-authoring and validation tool, not a second game renderer. Three.js owns runtime PBR materials, placement, simplified collision proxies and gameplay behavior.

## Generated assets
- `wall_terminal.stl.gz` — wall-mounted visual-only maintenance console.
- `floor_service_hatch.stl.gz` — floor-mounted visual-only service hatch.
- `cover_barricade.stl.gz` — chest-high modular tactical cover, now active in the arena.

All dimensions are metres in a right-handed, +Y-up coordinate system. The manifest records source bounds, dimensions, byte counts, triangle counts and collision status.

## Functional barricade integration
- Up to four barricades are placed in available positions around the arena centre. Candidate positions are checked against existing crates and pillars to avoid overlapping props.
- A synchronous procedural Three.js fallback is created with its collision proxy before gameplay begins. If the compressed STL cannot load, the fallback remains visible and fully playable.
- When the VTK mesh loads, it replaces only the fallback render mesh; the same collision proxy remains in place.
- The proxy is a conservative rotated AABB derived from the source dimensions. It is used by player/enemy movement, the A* navigation grid, line-of-sight checks, hitscan and travelling projectiles. The high-detail STL mesh is never used as a physics collider.
- Gunners seek visible firing angles; Scouts and Heavies favour visible flank destinations. Their pathfinding routes around the barricades instead of passing through them.
- Player hitscan and hostile projectiles damage barricades. Health progresses through intact, damaged and critical states with a short-lived health indicator. Destruction removes the collider, rebuilds the navigation grid and invalidates enemy paths so routes can open dynamically.

The source mesh has asymmetric local Z bounds. Runtime placement recentres the render geometry against the collision proxy; the manifest retains the original exported bounds.

## Rebuild
Python 3.10+ and VTK 9.x:

```bash
python -m pip install -r tools/vtk/requirements.txt
python tools/vtk/generate_arena_assets.py
```

The generator writes deterministic gzip-compressed binary STL and `assets/vtk/manifest.json`. It triangulates and orients normals, then rejects empty meshes and boundary/non-manifold edges.

## Runtime efficiency
The runtime caches parsed `BufferGeometry` per asset path. Repeated terminals and hatches share geometry, and all barricades share one VTK geometry while keeping per-instance transforms and materials. The fallback is disposed after a successful VTK replacement. Cover destruction hides the instance without disposing shared geometry used by other barricades.

## Why not VTK.js in the game loop?
VTK.js is useful for scientific data and visualization, but duplicating Three.js as a second game renderer adds complexity without improving FPS gameplay. Python VTK remains the geometry-authoring tool; Three.js remains the runtime renderer.

## Asset policy
STL is geometry-only: it does not preserve UVs, textures, skeletons or animation. Rigged characters, animated weapons and textured assets should use Blender/DCC glTF/GLB. Keep render geometry separate from simple collision proxies. Never use high-detail render geometry as a player collider.
