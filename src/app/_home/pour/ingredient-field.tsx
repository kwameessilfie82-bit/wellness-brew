"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";

import type { HeroLayout } from "./pour-scene";

/**
 * Photographic blend ingredients (background-removed cutouts with a baked soft
 * shadow, /public/hero/ingredients) on camera-facing cards. They drift in from
 * beyond the edges once loaded, then float gently around the hero.
 */

type Photo =
  | "orange-slice"
  | "orange-wedge"
  | "orange"
  | "ginger-slice"
  | "ginger-root"
  | "cinnamon"
  | "cloves"
  | "cloves-scatter"
  | "star-anise"
  | "moringa"
  | "pineapple"
  | "prekese"
  | "prekese-2"
  | "teabag"
  | "hibiscus"
  | "hibiscus-pink"
  | "hibiscus-leaves"
  | "palm"
  | "palm-cluster";

/** [u, v, z, size] — u/v in -1..1 across the hero (v up), z = depth, size ≈ card height. */
type Spot = [number, number, number, number];
type Item = { photo: Photo; d: Spot; m: Spot | null };

// Hand-placed around the edges so nothing sits on the headline, buttons or teapot.
// Listed back-to-front where they overlap (palms first so fruit sits on top).
const ITEMS: Item[] = [
  { photo: "palm-cluster", d: [-0.86, 0.86, -1.6, 1.7], m: [-0.98, 0.72, -1.2, 1.0] },
  { photo: "palm", d: [1.0, -0.88, -1.2, 1.5], m: null },
  { photo: "orange-slice", d: [-0.93, 0.7, 0.6, 1.05], m: [-0.95, 0.9, 0.4, 0.95] },
  { photo: "cinnamon", d: [-0.4, 0.86, -1.2, 0.55], m: [1.02, 0.5, 0, 0.5] },
  { photo: "star-anise", d: [0.02, 0.84, -0.4, 0.75], m: [-1.04, 0.05, -0.5, 0.75] },
  { photo: "teabag", d: [-0.06, 0.58, -1.6, 0.9], m: null },
  { photo: "hibiscus-leaves", d: [0.34, 0.84, -1.8, 1.0], m: null },
  { photo: "hibiscus", d: [0.74, 0.84, 0.2, 1.15], m: [0.9, 0.93, 0.3, 1.0] },
  { photo: "orange", d: [0.98, 0.55, -0.6, 0.8], m: null },
  { photo: "ginger-slice", d: [0.97, 0.12, 0.6, 1.0], m: [-1.03, 0.42, 0.3, 0.85] },
  { photo: "pineapple", d: [0.95, -0.5, 0.3, 1.0], m: [1.05, -0.05, -0.5, 0.85] },
  { photo: "orange-wedge", d: [0.4, -0.93, -0.4, 0.85], m: null },
  { photo: "prekese", d: [-0.7, -0.84, 0.3, 1.0], m: null },
  { photo: "moringa", d: [-0.22, -0.86, 0, 1.0], m: null },
  { photo: "cloves", d: [-0.96, 0.15, 0.2, 0.75], m: [0.55, 0.98, 0, 0.65] },
  { photo: "hibiscus-pink", d: [-0.97, -0.5, 0.4, 0.85], m: null },
  { photo: "ginger-root", d: [-0.98, -0.82, 0.7, 1.0], m: null },
  { photo: "cloves-scatter", d: [0.1, -0.93, 0.5, 0.6], m: [-0.45, 0.98, 0, 0.55] },
];

export const INGREDIENTS_LAND_SECONDS = 3.6;
const FLY = 3.4;

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

function seeded(i: number) {
  const r = (n: number) => {
    const x = Math.sin((i + 1) * 12.9898 + n * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  return {
    rotZ: (r(1) - 0.5) * 1.2,
    tiltY: (r(2) - 0.5) * 0.3,
    bob: 0.3 + r(3) * 0.4,
    phase: r(4) * Math.PI * 2,
    delay: r(5) * 0.6,
  };
}

export function IngredientField({ layout }: { layout: RefObject<HeroLayout> }) {
  const { camera, size } = useThree();
  const pointer = useRef({ x: 0, y: 0, sx: 0, sy: 0 });
  const elapsed = useRef(0);
  const [textures, setTextures] = useState<Map<Photo, THREE.Texture> | null>(null);

  // Load every photo once, then start the fly-in together.
  useEffect(() => {
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    const unique = [...new Set(ITEMS.map((i) => i.photo))];
    Promise.all(
      unique.map((p) =>
        loader.loadAsync(`/hero/ingredients/${p}.webp`).then((t) => {
          t.colorSpace = THREE.SRGBColorSpace;
          t.anisotropy = 4;
          return [p, t] as const;
        }),
      ),
    )
      .then((pairs) => {
        if (!cancelled) setTextures(new Map(pairs));
      })
      .catch((err) => console.error("[hero] ingredient photos failed:", err));
    return () => {
      cancelled = true;
    };
  }, []);

  const cards = useMemo(() => {
    if (!textures) return [];
    const plane = new THREE.PlaneGeometry(1, 1);
    return ITEMS.map((item, i) => {
      const map = textures.get(item.photo)!;
      const img = map.image as { width: number; height: number };
      const mesh = new THREE.Mesh(
        plane,
        new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, toneMapped: false }),
      );
      return { item, mesh, aspect: img.width / img.height, seed: seeded(i) };
    });
  }, [textures]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame((state, rawDt) => {
    if (!cards.length) return;
    const dt = Math.min(rawDt, 0.05);
    elapsed.current += dt;
    const t = state.clock.elapsedTime;
    const p = pointer.current;
    p.sx = THREE.MathUtils.damp(p.sx, p.x, 2.5, dt);
    p.sy = THREE.MathUtils.damp(p.sy, p.y, 2.5, dt);
    const mobile = layout.current?.mobile ?? size.width < 768;
    const cam = camera as THREE.PerspectiveCamera;
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));

    cards.forEach(({ item, mesh, aspect, seed }, i) => {
      const spot = mobile ? item.m : item.d;
      mesh.visible = !!spot;
      if (!spot) return;
      const [u, v, z, sz] = spot;
      const h = 2 * tanHalf * (cam.position.z - z);
      const w = h * (size.width / size.height);
      // Size relative to the hero height so cards don't balloon on wide screens.
      // Wide screens have more room at the edges, so let cards grow a little with the aspect ratio.
      const screen = size.width / size.height;
      const unit = Math.min(1, h / 5.6) * (mobile ? 0.85 : 1.45 * THREE.MathUtils.clamp(screen / 1.6, 1, 1.25));

      const tx = (u * w) / 2;
      const ty = (v * h) / 2;
      const local = THREE.MathUtils.clamp((elapsed.current - 0.11 * i - seed.delay) / FLY, 0, 1);
      const e = easeOutCubic(local);
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.min(1, local * 2.5);

      // Drift in from just beyond the nearest edges, slightly nearer the camera.
      const sx = tx + Math.sign(u || 1) * w * 0.3 + tx * 0.25;
      const sy = ty + Math.sign(v || 1) * h * 0.25 + ty * 0.15;
      const depth = (z + 3) / 4; // nearer cards drift more with the pointer
      mesh.position.set(
        THREE.MathUtils.lerp(sx, tx, e) - p.sx * 0.1 * depth,
        THREE.MathUtils.lerp(sy, ty, e) + Math.sin(t * seed.bob + seed.phase) * 0.05 + p.sy * 0.07 * depth,
        THREE.MathUtils.lerp(z + 1.2, z, e),
      );
      mesh.rotation.set(
        0,
        seed.tiltY + Math.sin(t * 0.3 + seed.phase) * 0.12,
        seed.rotZ + Math.sin(t * 0.22 + seed.phase) * 0.12 + (1 - e) * 0.5,
      );
      const height = sz * unit * (0.85 + 0.15 * e);
      mesh.scale.set(height * aspect, height, 1);
    });
  });

  return (
    <group>
      {cards.map(({ mesh }, i) => (
        <primitive key={i} object={mesh} />
      ))}
    </group>
  );
}
