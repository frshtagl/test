#!/usr/bin/env python3
"""Generate deterministic static ARENA ZERO environment props with VTK."""
from __future__ import annotations
import gzip, json
from pathlib import Path
import vtk

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "assets" / "vtk"
OUT.mkdir(parents=True, exist_ok=True)

def transformed(source, position=(0,0,0), rotation=(0,0,0)):
    source.Update()
    transform = vtk.vtkTransform(); transform.PostMultiply()
    transform.Translate(*position); transform.RotateX(rotation[0]); transform.RotateY(rotation[1]); transform.RotateZ(rotation[2])
    filt = vtk.vtkTransformPolyDataFilter(); filt.SetTransform(transform); filt.SetInputConnection(source.GetOutputPort()); filt.Update()
    return filt

def cube(dims, position=(0,0,0), rotation=(0,0,0)):
    source = vtk.vtkCubeSource()
    source.SetXLength(dims[0]); source.SetYLength(dims[1]); source.SetZLength(dims[2]); source.SetCenter(0,0,0)
    return transformed(source, position, rotation)

def cylinder(radius, height, position, rotation=(90,0,0), resolution=20):
    source = vtk.vtkCylinderSource()
    source.SetRadius(radius); source.SetHeight(height); source.SetResolution(resolution); source.CappingOn()
    return transformed(source, position, rotation)

def assemble(parts):
    append = vtk.vtkAppendPolyData()
    for part in parts: append.AddInputConnection(part.GetOutputPort())
    clean = vtk.vtkCleanPolyData(); clean.SetInputConnection(append.GetOutputPort()); clean.SetTolerance(1e-6)
    triangles = vtk.vtkTriangleFilter(); triangles.SetInputConnection(clean.GetOutputPort()); triangles.Update()
    normals = vtk.vtkPolyDataNormals(); normals.SetInputConnection(triangles.GetOutputPort())
    normals.ConsistencyOn(); normals.AutoOrientNormalsOn(); normals.SplittingOff(); normals.Update()
    result = vtk.vtkPolyData(); result.DeepCopy(normals.GetOutput())
    return result

def write_asset(name, parts, notes, collision_required=False):
    poly = assemble(parts)
    if poly.GetNumberOfPoints() == 0 or poly.GetNumberOfPolys() == 0: raise RuntimeError(f"{name}: empty VTK output")
    edges = vtk.vtkFeatureEdges(); edges.SetInputData(poly)
    edges.BoundaryEdgesOn(); edges.NonManifoldEdgesOn(); edges.FeatureEdgesOff(); edges.ManifoldEdgesOff(); edges.Update()
    edge_count = edges.GetOutput().GetNumberOfCells()
    if edge_count: raise RuntimeError(f"{name}: {edge_count} boundary/non-manifold edges")
    raw_path = OUT / f"{name}.stl"
    writer = vtk.vtkSTLWriter(); writer.SetFileName(str(raw_path)); writer.SetFileTypeToBinary(); writer.SetInputData(poly)
    if not writer.Write(): raise RuntimeError(f"{name}: STL export failed")
    raw = raw_path.read_bytes()
    compressed_path = OUT / f"{name}.stl.gz"
    with compressed_path.open("wb") as target:
        with gzip.GzipFile(filename="", mode="wb", fileobj=target, compresslevel=9, mtime=0) as zipped: zipped.write(raw)
    raw_path.unlink()
    bounds = list(poly.GetBounds())
    return {
        "file": f"{name}.stl.gz", "format": "gzip-compressed-binary-stl",
        "raw_bytes": len(raw), "compressed_bytes": compressed_path.stat().st_size, "units": "metres",
        "bounds": bounds, "dimensions": [round(bounds[1]-bounds[0],5),round(bounds[3]-bounds[2],5),round(bounds[5]-bounds[4],5)],
        "vertices": poly.GetNumberOfPoints(), "triangles": poly.GetNumberOfPolys(),
        "boundary_or_nonmanifold_edges": edge_count, "collision_proxy_in_game": False,
        "collision_proxy_required": collision_required, "notes": notes
    }

assets = {}
assets["cover_barricade"] = write_asset("cover_barricade", [
    cube((3.0,.18,.78),(0,.09,0)), cube((2.72,.88,.28),(0,.68,0)), cube((2.9,.13,.48),(0,1.17,0)),
    cube((.22,.92,.54),(-1.24,.64,0),(0,0,-12)), cube((.22,.92,.54),(1.24,.64,0),(0,0,12)),
    cube((2.18,.42,.035),(0,.67,-.159)), cube((2.55,.045,.045),(0,.94,-.18)), cube((2.55,.045,.045),(0,.4,-.18)),
    cube((.48,.12,.9),(-1.08,.06,0)), cube((.48,.12,.9),(1.08,.06,0)),
    cylinder(.055,.05,(-.92,.72,-.2)), cylinder(.055,.05,(.92,.72,-.2))
], "Chest-high modular cover; Three.js owns PBR material and collision proxy.", True)

terminal = [
    cube((.92,1.28,.18),(0,0,0)), cube((.7,.48,.09),(0,.31,-.13)), cube((.58,.34,.025),(0,.31,-.19)),
    cube((.7,.38,.09),(0,-.28,-.13)), cube((.56,.25,.025),(0,-.28,-.19)),
    cube((.07,1.12,.12),(-.43,0,-.12)), cube((.07,1.12,.12),(.43,0,-.12)),
    cube((.78,.07,.12),(0,.59,-.12)), cube((.78,.07,.12),(0,-.59,-.12)),
    cube((.075,.075,.04),(-.18,-.29,-.22)), cube((.075,.075,.04),(0,-.29,-.22)), cube((.075,.075,.04),(.18,-.29,-.22))
]
assets["wall_terminal"] = write_asset("wall_terminal", terminal, "Wall-mounted maintenance console; local front faces -Z; visual-only.")

hatch = [
    cube((1.55,.12,1.55),(0,.06,0)), cube((1.28,.035,1.28),(0,.14,0)),
    cube((1.18,.045,.08),(0,.18,-.49)), cube((1.18,.045,.08),(0,.18,.49)),
    cube((.08,.045,.98),(-.49,.18,0)), cube((.08,.045,.98),(.49,.18,0)),
    cube((.09,.025,.9),(0,.18,0)), cube((.9,.025,.09),(0,.18,0))
]
assets["floor_service_hatch"] = write_asset("floor_service_hatch", hatch, "Flush industrial service hatch; local origin at floor level; visual-only.")

manifest = {
    "schema_version":1, "generator":"ARENA ZERO VTK asset pipeline", "vtk_version":vtk.vtkVersion.GetVTKVersion(),
    "coordinate_system":"right-handed; +Y up; metres",
    "export":"binary STL; PBR materials and collision proxies are authored in Three.js", "assets":assets
}
(OUT/"manifest.json").write_text(json.dumps(manifest,indent=2)+"\n",encoding="utf-8")
print(json.dumps(manifest,indent=2))
