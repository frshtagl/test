export function raySphereIntersection(origin, direction, center, radius, maxDistance = Infinity) {
  const ox = origin.x - center.x, oy = origin.y - center.y, oz = origin.z - center.z;
  const b = ox * direction.x + oy * direction.y + oz * direction.z;
  const c = ox * ox + oy * oy + oz * oz - radius * radius;
  const discriminant = b * b - c;
  if (discriminant < 0) return null;
  const root = Math.sqrt(discriminant);
  let distance = -b - root;
  if (distance < 0) distance = -b + root;
  if (distance < 0 || distance > maxDistance) return null;
  return {
    distance,
    point: {
      x: origin.x + direction.x * distance,
      y: origin.y + direction.y * distance,
      z: origin.z + direction.z * distance
    }
  };
}

export function segmentAabbIntersection(start, end, bounds) {
  const axes = [
    ['x', bounds.minX, bounds.maxX],
    ['y', bounds.minY, bounds.maxY],
    ['z', bounds.minZ, bounds.maxZ]
  ];
  let tMin = 0, tMax = 1;
  for (const [axis, min, max] of axes) {
    const delta = end[axis] - start[axis];
    if (Math.abs(delta) < 1e-8) {
      if (start[axis] < min || start[axis] > max) return null;
      continue;
    }
    let near = (min - start[axis]) / delta;
    let far = (max - start[axis]) / delta;
    if (near > far) [near, far] = [far, near];
    tMin = Math.max(tMin, near);
    tMax = Math.min(tMax, far);
    if (tMin > tMax) return null;
  }
  if (tMin < 0 || tMin > 1) return null;
  return {
    t: tMin,
    point: {
      x: start.x + (end.x - start.x) * tMin,
      y: start.y + (end.y - start.y) * tMin,
      z: start.z + (end.z - start.z) * tMin
    }
  };
}
