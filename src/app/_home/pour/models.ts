import * as THREE from "three";

/**
 * Procedural glass teapot + glass cup. Everything round is a lathe (2D profile
 * spun around Y); spout and handles are tubes along curves. Units: the pot
 * body is ~1.75 wide. Origins sit at each object's visual centre.
 */

type P = [number, number];

function lathe(points: P[], samples: number, segments = 64) {
  const curve = new THREE.SplineCurve(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const pts = curve.getSpacedPoints(samples).map((v) => new THREE.Vector2(Math.max(0.0005, v.x), v.y));
  return new THREE.LatheGeometry(pts, segments);
}

/** Tube whose radius tapers linearly from r0 → r1 along the curve. */
function taperedTube(points: THREE.Vector3[], r0: number, r1: number, segs = 48, radial = 16) {
  const curve = new THREE.CatmullRomCurve3(points);
  const g = new THREE.TubeGeometry(curve, segs, 1, radial, false);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const p = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    curve.getPointAt(t, c);
    const r = r0 + (r1 - r0) * t;
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j;
      p.fromBufferAttribute(pos, k).sub(c).multiplyScalar(r).add(c);
      pos.setXYZ(k, p.x, p.y, p.z);
    }
  }
  return g;
}

const v3 = (x: number, y: number, z = 0) => new THREE.Vector3(x, y, z);

// ---------------------------------------------------------------- teapot

const POT_BODY: P[] = [
  [0, -0.63],
  [0.4, -0.635],
  [0.66, -0.56],
  [0.82, -0.38],
  [0.88, -0.12],
  [0.86, 0.12],
  [0.76, 0.33],
  [0.6, 0.47],
  [0.47, 0.53],
  [0.45, 0.56],
];

export const POT = {
  /** Spout tip in pot-local space; the pour aligns this over the cup. */
  tip: v3(1.25, 0.36),
  bottom: -0.63,
  /** Liquid level (local y) when full and when poured out. */
  liquidFull: 0.3,
  liquidEmpty: -0.42,
};

export function teapotGeometries() {
  return {
    body: lathe(POT_BODY, 80),
    liquid: lathe(
      POT_BODY.map(([x, y]) => [x * 0.93, y * 0.93 - 0.01] as P),
      80,
    ),
    lid: lathe(
      [
        [0, 0.73],
        [0.16, 0.72],
        [0.31, 0.67],
        [0.43, 0.6],
        [0.48, 0.56],
        [0.47, 0.545],
      ],
      30,
    ),
    knob: new THREE.SphereGeometry(0.075, 24, 16),
    spout: taperedTube([v3(0.7, -0.3), v3(0.97, -0.16), v3(1.12, 0.08), v3(1.25, 0.36)], 0.14, 0.05),
    handle: taperedTube(
      // Both ends start well inside the belly so the joins read as fused glass.
      [v3(-0.58, 0.38), v3(-0.82, 0.37), v3(-1.1, 0.31), v3(-1.24, 0.04), v3(-1.12, -0.27), v3(-0.86, -0.4), v3(-0.62, -0.44)],
      0.075,
      0.065,
    ),
  };
}

// ---------------------------------------------------------------- cup

/** Closed profile → solid glass with real wall + base thickness. */
const CUP_WALL: P[] = [
  [0, -0.4],
  [0.36, -0.4],
  [0.42, -0.375],
  [0.45, -0.31],
  [0.53, 0.2],
  [0.56, 0.39],
  [0.553, 0.418],
  [0.533, 0.414],
  [0.507, 0.2],
  [0.425, -0.24],
  [0.37, -0.285],
  [0, -0.29],
];

/** Inside surface (bottom → rim), used for the tea volume + surface radius. */
const CUP_INNER: P[] = [
  [0, -0.284],
  [0.365, -0.28],
  [0.418, -0.235],
  [0.5, 0.2],
  [0.524, 0.39],
];

export const CUP = {
  bottom: -0.4,
  levelEmpty: -0.284,
  levelFull: 0.3,
  /** Inner radius at local height y (linear between profile points). */
  innerRadius(y: number) {
    for (let i = 1; i < CUP_INNER.length; i++) {
      const [x0, y0] = CUP_INNER[i - 1];
      const [x1, y1] = CUP_INNER[i];
      if (y <= y1) return x0 + ((x1 - x0) * (y - y0)) / (y1 - y0 || 1);
    }
    return CUP_INNER[CUP_INNER.length - 1][0];
  },
};

export function cupGeometries() {
  return {
    glass: lathe(CUP_WALL, 120, 72),
    tea: lathe(
      CUP_INNER.map(([x, y]) => [x * 0.985, y] as P),
      40,
      72,
    ),
    handle: taperedTube([v3(0.5, 0.24), v3(0.8, 0.23), v3(0.84, 0.0), v3(0.68, -0.19), v3(0.47, -0.17)], 0.05, 0.045),
  };
}

// ---------------------------------------------------------------- petal

/** A cupped hibiscus petal (~0.32 long). */
export function petalGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(0.09, 0.04, 0.17, 0.2, 0.1, 0.3);
  s.bezierCurveTo(0.06, 0.35, -0.06, 0.35, -0.1, 0.3);
  s.bezierCurveTo(-0.17, 0.2, -0.09, 0.04, 0, 0);
  const g = new THREE.ShapeGeometry(s, 16);
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    pos.setZ(i, x * x * 2.2 - y * y * 0.35); // cup across, curl at the tip
  }
  g.computeVertexNormals();
  g.translate(0, -0.15, 0);
  return g;
}

/** Soft round sprite used for steam and ground shadows. */
export function softDotTexture(size = 128) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.45, "rgba(255,255,255,0.45)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
