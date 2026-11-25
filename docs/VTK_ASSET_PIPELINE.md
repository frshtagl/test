# ARENA ZERO — VTK asset pipeline

Python VTK is an offline geometry-authoring and validation tool, not a second game renderer. Three.js remains the runtime renderer and owns PBR materials, placement, lighting, collision proxies and gameplay behavior.

## Current generated assets
- wall_terminal.stl.gz — wall-mounted visual-only maintenance console; loaded in the arena.
- floor_service_hatch.stl.gz — floor visual-only service hatch; loaded in the arena.
- cover_barricade.stl.gz — chest-high tactical cover source; generated and validated but intentionally not placed in gameplay until AI navigation and a separate collision proxy are ready.

All dimensions are in metres, right-handed coordinates, +Y up. The manifest records bounds, dimensions, byte counts, triangles, validation and collision status.

## Rebuild
Python 3.10+ and VTK 9.x:

    python -m pip install -r tools/vtk/requirements.txt
    python tools/vtk/generate_arena_assets.py

The generator creates binary STL, compresses it deterministically with gzip and writes assets/vtk/manifest.json. It triangulates and orients normals, then rejects empty meshes and boundary/non-manifold edges.

## Runtime
The browser fetches compressed STL, decompresses it with DecompressionStream, parses binary STL into Three.js BufferGeometry and assigns shared Three.js PBR materials. If decompression or asset loading fails, the base game continues and logs a warning.

## Why not VTK.js in the game loop?
VTK.js is primarily a browser scientific-visualization toolkit. It is useful for scientific data, geometry inspection and visualization workflows, but duplicating Three.js as a second game renderer adds complexity without improving FPS gameplay. Python VTK is the geometry-authoring tool; Three.js is the runtime renderer.

## Asset policy
STL is geometry-only: no UVs, textures, skeletons or animation. Rigged characters, animated weapons and textured assets should use Blender/DCC glTF/GLB. Keep render geometry separate from simple collision proxies. Never add collision cover before AI navigation and projectile occlusion are tested. Never use high-detail render geometry as a player collider.
