# ARENA ZERO — VTK static-asset pipeline

Python VTK is an offline geometry-authoring and validation tool, not a second game renderer.

- Generate repeatable static meshes from source geometry.
- Transform, append, clean, triangulate and orient normals consistently.
- Reject empty geometry and boundary/non-manifold edges.
- Export compressed binary STL and a manifest with units, bounds, triangles and collision status.
- Leave PBR materials, placement, collision proxies and gameplay metadata to Three.js.

STL is geometry-only: it does not preserve UVs, PBR materials, skeletons or animation. Three.js assigns shared PBR materials at runtime. Rigged characters, animated weapons and textured assets should use Blender/DCC glTF/GLB.

VTK's vtkGLTFExporter supports a limited subset of VTK scenes and polygonal meshes; it is not a full game-asset authoring pipeline. Reference: https://vtk.org/doc/nightly/html/classvtkGLTFExporter.html

Install Python 3.10+ and VTK 9.x:

    python -m pip install -r tools/vtk/requirements.txt
    python tools/vtk/generate_arena_assets.py

The browser fetches gzip-compressed binary STL, decompresses it with DecompressionStream and builds Three.js BufferGeometry. If loading fails, gameplay continues with a warning.

Assets:
- wall_terminal.stl.gz — loaded visual-only wall terminal.
- floor_service_hatch.stl.gz — loaded visual-only floor hatch.
- cover_barricade.stl.gz — generated and validated but not placed in combat until AI navigation and a separate collider are ready.
