import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {parseBinarySTL} from '../src/assets/binary-stl.mjs';
const manifest=JSON.parse(await readFile('assets/vtk/manifest.json','utf8'));
assert.equal(manifest.coordinate_system,'right-handed; +Y up; metres');
for(const name of ['wall_terminal','floor_service_hatch','cover_barricade']){
 const item=manifest.assets[name];assert.ok(item,`Missing VTK asset ${name}`);
 assert.equal(item.boundary_or_nonmanifold_edges,0);
 const compressed=await readFile(`assets/vtk/${item.file}`);assert.equal(compressed.length,item.compressed_bytes);
 const raw=gunzipSync(compressed);assert.equal(raw.length,item.raw_bytes);
 const buffer=raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength);
 const parsed=parseBinarySTL(buffer);assert.equal(parsed.triangleCount,item.triangles);
 assert.equal(parsed.positions.length,item.triangles*9);assert.equal(parsed.normals.length,item.triangles*9);
 for(let i=0;i<6;i++)assert.ok(Math.abs(parsed.bounds[i]-item.bounds[i])<.0001,`${name} bounds mismatch`);
}
assert.equal(manifest.assets.cover_barricade.collision_proxy_in_game,true);
assert.equal(manifest.assets.cover_barricade.collision_proxy_required,true);
assert.match(manifest.assets.cover_barricade.notes,/rotated AABB collision proxy/);
assert.throws(()=>parseBinarySTL(new ArrayBuffer(12)),/truncated/);
console.log('ARENA ZERO VTK asset validation passed for 3 generated meshes.');
