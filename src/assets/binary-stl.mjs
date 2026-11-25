const HEADER_BYTES = 84;
const TRIANGLE_BYTES = 50;
const MAX_TRIANGLES = 2_000_000;

export function parseBinarySTL(buffer) {
  if (!(buffer instanceof ArrayBuffer)) throw new TypeError('Binary STL input must be an ArrayBuffer.');
  if (buffer.byteLength < HEADER_BYTES) throw new Error('Binary STL is truncated before its triangle count.');
  const view = new DataView(buffer);
  const triangleCount = view.getUint32(80, true);
  if (triangleCount < 1 || triangleCount > MAX_TRIANGLES) throw new Error('Binary STL triangle count is outside the supported range.');
  const expectedBytes = HEADER_BYTES + triangleCount * TRIANGLE_BYTES;
  if (buffer.byteLength !== expectedBytes) throw new Error(`Binary STL length mismatch: expected ${expectedBytes} bytes, received ${buffer.byteLength}.`);
  const positions = new Float32Array(triangleCount * 9);
  const normals = new Float32Array(triangleCount * 9);
  const bounds = [Infinity, -Infinity, Infinity, -Infinity, Infinity, -Infinity];
  for (let triangle = 0; triangle < triangleCount; triangle++) {
    const offset = HEADER_BYTES + triangle * TRIANGLE_BYTES;
    let nx = view.getFloat32(offset, true), ny = view.getFloat32(offset + 4, true), nz = view.getFloat32(offset + 8, true);
    const normalLength = Math.hypot(nx, ny, nz);
    const vertices = [];
    for (let vertex = 0; vertex < 3; vertex++) {
      const at = offset + 12 + vertex * 12;
      const x = view.getFloat32(at, true), y = view.getFloat32(at + 4, true), z = view.getFloat32(at + 8, true);
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) throw new Error(`Binary STL contains a non-finite vertex at triangle ${triangle}.`);
      vertices.push(x, y, z);
      bounds[0] = Math.min(bounds[0], x); bounds[1] = Math.max(bounds[1], x);
      bounds[2] = Math.min(bounds[2], y); bounds[3] = Math.max(bounds[3], y);
      bounds[4] = Math.min(bounds[4], z); bounds[5] = Math.max(bounds[5], z);
    }
    if (!Number.isFinite(normalLength) || normalLength < 1e-8) {
      const ax = vertices[3]-vertices[0], ay = vertices[4]-vertices[1], az = vertices[5]-vertices[2];
      const bx = vertices[6]-vertices[0], by = vertices[7]-vertices[1], bz = vertices[8]-vertices[2];
      nx = ay*bz-az*by; ny = az*bx-ax*bz; nz = ax*by-ay*bx;
      const length = Math.hypot(nx,ny,nz) || 1;
      nx /= length; ny /= length; nz /= length;
    } else { nx /= normalLength; ny /= normalLength; nz /= normalLength; }
    const out = triangle * 9;
    positions.set(vertices, out);
    for (let vertex = 0; vertex < 3; vertex++) {
      normals[out + vertex*3] = nx;
      normals[out + vertex*3 + 1] = ny;
      normals[out + vertex*3 + 2] = nz;
    }
  }
  return { positions, normals, triangleCount, bounds };
}
