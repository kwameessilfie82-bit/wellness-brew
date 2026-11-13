"use client";

import { Environment, Lightformer } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";

import { INGREDIENTS_LAND_SECONDS, IngredientField } from "./ingredient-field";
import { CUP, POT, cupGeometries, petalGeometry, softDotTexture, teapotGeometries } from "./models";
import { POUR_SECONDS, pourState } from "./timeline";

type Theme = "light" | "dark";

const TEA = "#9e1230";
const POUR_ANGLE = -0.95;
const Z_AXIS = new THREE.Vector3(0, 0, 1);
const ORIGIN = new THREE.Vector3(0, 0, 0);
const STREAM_SEG = 48;
const STREAM_RAD = 12;
const STEAM_COUNT = 12;
const PETALS = [
  { r: 1.9, speed: 0.11, ph: 0.0, h: 0.9, color: "#b3123a", s: 1 },
  { r: 2.1, speed: -0.08, ph: 1.3, h: 1.2, color: "#d94a6e", s: 0.8 },
  { r: 1.6, speed: 0.09, ph: 2.6, h: 0.7, color: "#8e0f2a", s: 1.1 },
  { r: 2.0, speed: 0.07, ph: 3.9, h: 1.0, color: "#c81d4e", s: 0.9 },
  { r: 1.75, speed: -0.1, ph: 5.1, h: 1.3, color: "#b3123a", s: 0.75 },
  { r: 2.2, speed: 0.06, ph: 0.7, h: 0.8, color: "#e0607f", s: 0.7 },
  { r: 1.8, speed: -0.07, ph: 4.4, h: 1.1, color: "#9e1230", s: 0.95 },
];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

function makeStreamGeometry() {
  const g = new THREE.BufferGeometry();
  const verts = (STREAM_SEG + 1) * (STREAM_RAD + 1);
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(verts * 3), 3));
  g.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(verts * 3), 3));
  const idx: number[] = [];
  for (let i = 0; i < STREAM_SEG; i++) {
    for (let j = 0; j < STREAM_RAD; j++) {
      const a = i * (STREAM_RAD + 1) + j;
      const b = a + STREAM_RAD + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  g.setIndex(idx);
  return g;
}

export type HeroLayout = {
  /** Stage box centre + size as fractions of the hero (canvas) size. */
  cx: number;
  cy: number;
  bw: number;
  bh: number;
  mobile: boolean;
};

function Stage({ replay, theme, layout }: { replay: number; theme: Theme; layout: RefObject<HeroLayout> }) {
  const progress = useRef(0);
  const intro = useRef(0);
  const wait = useRef(INGREDIENTS_LAND_SECONDS * 0.7);
  useEffect(() => {
    progress.current = 0;
    if (replay > 0) wait.current = 0; // replays pour straight away
  }, [replay]);

  const pot = useRef<THREE.Group>(null);
  const cup = useRef<THREE.Group>(null);
  const surface = useRef<THREE.Mesh>(null);
  const cupTea = useRef<THREE.Mesh>(null);
  const stream = useRef<THREE.Mesh>(null);
  const ripples = useRef<THREE.Group>(null);
  const steam = useRef<THREE.Group>(null);
  const petals = useRef<THREE.Group>(null);
  const cupShadow = useRef<THREE.Mesh>(null);
  const potShadow = useRef<THREE.Mesh>(null);
  const { viewport, camera } = useThree();

  const potGeo = useMemo(() => teapotGeometries(), []);
  const cupGeo = useMemo(() => cupGeometries(), []);
  const petalGeo = useMemo(() => petalGeometry(), []);
  const streamGeo = useMemo(() => makeStreamGeometry(), []);
  const dot = useMemo(() => softDotTexture(), []);

  const potPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), 0), []);
  const cupPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), 0), []);

  const mats = useMemo(() => {
    // Real transmission can't see the page through an alpha canvas, so glass is
    // faked: nearly clear body + strong env reflections + a Fresnel rim that
    // thickens the edges (dark rim on light pages, bright rim on dark ones).
    const rim = new THREE.Color(theme === "dark" ? "#dff5ea" : "#4d5f57");
    const glass = (tint: string) => {
      const m = new THREE.MeshPhysicalMaterial({
        color: tint,
        metalness: 0,
        roughness: 0.04,
        clearcoat: 1,
        clearcoatRoughness: 0.03,
        envMapIntensity: 2.2,
        transparent: true,
        opacity: theme === "dark" ? 0.1 : 0.14,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      m.onBeforeCompile = (shader) => {
        shader.uniforms.rimColor = { value: rim };
        shader.fragmentShader = shader.fragmentShader
          .replace("void main() {", "uniform vec3 rimColor;\nvoid main() {")
          .replace(
            "#include <dithering_fragment>",
            `float fres = pow(1.0 - abs(dot(normalize(vViewPosition), normal)), 2.2);
            gl_FragColor.rgb = mix(gl_FragColor.rgb, rimColor, fres * ${theme === "dark" ? "0.4" : "0.55"});
            gl_FragColor.a = clamp(gl_FragColor.a + fres * ${theme === "dark" ? "0.4" : "0.6"}, 0.0, ${theme === "dark" ? "0.6" : "0.85"});
            #include <dithering_fragment>`,
          );
      };
      m.customProgramCacheKey = () => `glass-${theme}`;
      return m;
    };
    const tea = (planes?: THREE.Plane[], side: THREE.Side = THREE.DoubleSide) =>
      new THREE.MeshPhysicalMaterial({
        color: TEA,
        roughness: 0.06,
        clearcoat: 1,
        clearcoatRoughness: 0.03,
        emissive: TEA,
        emissiveIntensity: 0.18,
        envMapIntensity: 1.2,
        side,
        clippingPlanes: planes ?? null,
      });
    return {
      potGlass: glass("#f2fbf6"),
      cupGlass: glass("#ffffff"),
      potTea: tea([potPlane], THREE.FrontSide),
      potTeaCap: new THREE.MeshBasicMaterial({ color: "#b3173d", side: THREE.BackSide, clippingPlanes: [potPlane] }),
      cupTea: tea([cupPlane]),
      tea: tea(),
      ripples: [0, 1, 2].map(
        () => new THREE.MeshBasicMaterial({ color: "#ff8fa6", transparent: true, opacity: 0, depthWrite: false }),
      ),
    };
  }, [potPlane, cupPlane, theme]);

  const tip = useMemo(() => new THREE.Vector3(), []);
  const tmp = useMemo(
    () => ({ p0: new THREE.Vector3(), p1: new THREE.Vector3(), p2: new THREE.Vector3(), c: new THREE.Vector3(), d: new THREE.Vector3(), n: new THREE.Vector3() }),
    [],
  );

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05); // no jump after a backgrounded tab
    // Let the ingredients land before the pot appears and pours.
    if (wait.current > 0) wait.current -= dt;
    else {
      progress.current = Math.min(1, progress.current + dt / POUR_SECONDS);
      intro.current = Math.min(1, intro.current + dt / 2.2);
    }
    const s = pourState(progress.current);
    const t = state.clock.elapsedTime;
    const ease = 1 - Math.pow(1 - intro.current, 3);
    const dark = theme === "dark";

    // The canvas covers the whole hero; the teapot fills the stage box inside it.
    // Composition is ≈4.4 × 3.9 units at scale 1.
    const L = layout.current;
    const vp = viewport.getCurrentViewport(camera, ORIGIN);
    const k = Math.min((L.bw * vp.width) / 4.4, (L.bh * vp.height) / 3.9);
    const stageX = (L.cx - 0.5) * vp.width + 0.35 * k;
    // reframe upward as it settles so the resting pair + steam stay centred
    const stageY = (0.5 - L.cy) * vp.height + 0.55 * k * s.settle;

    const cupX = stageX + 0.35 * k;
    const cupY = stageY - 1.3 * k;
    const groundY = cupY + CUP.bottom * k;

    // ---- cup rises in
    const cupNowY = THREE.MathUtils.lerp(cupY - vp.height * 0.9, cupY, s.move);
    if (cup.current) {
      cup.current.scale.setScalar(k);
      cup.current.position.set(cupX, cupNowY, 0);
    }

    // ---- teapot: hero float → pour pose → rest beside the cup
    const angle = s.tilt * POUR_ANGLE;
    tip.copy(POT.tip).multiplyScalar(k).applyAxisAngle(Z_AXIS, angle);
    const heroX = stageX;
    const heroY = stageY + 0.15 * k + Math.sin(t * 1.1) * 0.06 * k - (1 - ease) * 0.6 * k;
    const pourX = cupX - tip.x;
    const pourY = cupY + (0.42 + 0.85) * k - tip.y;
    const restX = cupX - 1.42 * k;
    const restY = groundY - POT.bottom * k;
    const potX = THREE.MathUtils.lerp(THREE.MathUtils.lerp(heroX, pourX, s.move), restX, s.settle);
    const potY = THREE.MathUtils.lerp(THREE.MathUtils.lerp(heroY, pourY, s.move), restY, s.settle);
    const potZ = -0.55 * k * s.settle;
    if (pot.current) {
      pot.current.visible = ease > 0.001;
      pot.current.scale.setScalar(k * (0.85 + 0.15 * ease));
      pot.current.position.set(potX, potY, potZ);
      const spin = (1 - s.move) * (Math.sin(t * 0.35) * 0.6 - 0.35);
      pot.current.rotation.set(0, spin + s.settle * 0.35, angle);
    }
    // Liquid in the pot stays level (world-space clip plane) and drains as the cup fills.
    const potLevel = potY + THREE.MathUtils.lerp(POT.liquidFull, POT.liquidEmpty, s.fill) * k;
    potPlane.constant = potLevel;

    // ---- tea in the cup
    const level = THREE.MathUtils.lerp(CUP.levelEmpty, CUP.levelFull, s.fill);
    const surfaceY = cupNowY + level * k;
    cupPlane.constant = surfaceY;
    if (cupTea.current) cupTea.current.visible = s.fill > 0.004;
    if (surface.current) {
      surface.current.visible = s.fill > 0.004;
      surface.current.position.y = level;
      const wobble = 1 + s.flow * 0.015 * Math.sin(t * 18);
      surface.current.scale.setScalar(CUP.innerRadius(level) * 0.985 * wobble);
    }

    // ---- stream: quadratic arc from spout tip to the tea surface
    if (stream.current) {
      const visible = s.flow > 0.002;
      stream.current.visible = visible;
      if (visible) {
        const { p0, p1, p2, c, d, n } = tmp;
        p0.set(potX + tip.x, potY + tip.y, potZ);
        p1.set(p0.x + 0.16 * k, p0.y - 0.04 * k, 0);
        p2.set(cupX + 0.06 * k, surfaceY, 0);
        const t0 = s.flowEnd;
        const t1 = s.flowStart;
        const r0 = 0.05 * k;
        const pos = streamGeo.attributes.position as THREE.BufferAttribute;
        const nor = streamGeo.attributes.normal as THREE.BufferAttribute;
        for (let i = 0; i <= STREAM_SEG; i++) {
          const u = i / STREAM_SEG;
          const tt = t0 + (t1 - t0) * u;
          const a = 1 - tt;
          c.set(0, 0, 0).addScaledVector(p0, a * a).addScaledVector(p1, 2 * a * tt).addScaledVector(p2, tt * tt);
          d.subVectors(p1, p0).multiplyScalar(2 * a).addScaledVector(n.subVectors(p2, p1), 2 * tt);
          const nx = -d.y;
          const ny = d.x;
          const len = Math.hypot(nx, ny) || 1;
          const front = t1 < 0.999 ? clamp01((t1 - tt) / 0.08) : 1;
          const tail = t0 > 0.001 ? clamp01((tt - t0) / 0.08) : 1;
          const r = r0 * (1 - 0.45 * tt) * (1 + 0.12 * Math.sin(t * 32 - tt * 45)) * Math.sqrt(front * tail);
          for (let j = 0; j <= STREAM_RAD; j++) {
            const ang = (j / STREAM_RAD) * Math.PI * 2;
            const cx = Math.cos(ang);
            const sz = Math.sin(ang);
            const ox = (nx / len) * cx;
            const oy = (ny / len) * cx;
            const kk = i * (STREAM_RAD + 1) + j;
            pos.setXYZ(kk, c.x + ox * r, c.y + oy * r, c.z + sz * r);
            nor.setXYZ(kk, ox, oy, sz);
          }
        }
        pos.needsUpdate = true;
        nor.needsUpdate = true;
      }
    }

    // ---- ripples where the stream hits
    if (ripples.current) {
      ripples.current.position.set(cupX, surfaceY + 0.004 * k, 0);
      const maxR = CUP.innerRadius(level) * 0.95 * k;
      ripples.current.children.forEach((child, i) => {
        const m = child as THREE.Mesh;
        const ph = (t * 1.3 + i / 3) % 1;
        m.scale.setScalar(0.08 * k + ph * (maxR - 0.08 * k));
        (m.material as THREE.MeshBasicMaterial).opacity = s.flow * (1 - ph) * 0.45;
      });
    }

    // ---- steam
    if (steam.current) {
      const amount = s.steam * clamp01(s.fill * 2) * (dark ? 0.22 : 0.7);
      const top = cupNowY + 0.42 * k;
      steam.current.children.forEach((child, i) => {
        const sp = child as THREE.Sprite;
        const ph = (t * 0.2 + i / STEAM_COUNT) % 1;
        sp.position.set(
          cupX + Math.sin(t * 0.9 + i * 1.7) * 0.16 * k * (0.3 + ph),
          top + ph * 1.6 * k,
          0.1 * k,
        );
        sp.scale.setScalar((0.22 + ph * 0.6) * k);
        sp.material.opacity = amount * Math.sin(ph * Math.PI);
      });
    }

    // ---- drifting hibiscus petals
    if (petals.current) {
      const cx = stageX - 0.25 * k;
      const cy = stageY - 0.1 * k;
      petals.current.children.forEach((child, i) => {
        const P = PETALS[i];
        const a = P.ph + t * P.speed * 1.2;
        child.position.set(
          cx + Math.cos(a) * P.r * k,
          cy + Math.sin(a * 1.3 + P.ph) * P.h * k,
          Math.sin(a) * 1.1 * k - 0.3 * k,
        );
        child.rotation.set(t * 0.4 + P.ph, t * 0.3 * Math.sign(P.speed) + P.ph, Math.sin(t * 0.5 + P.ph) * 0.8);
        child.scale.setScalar(P.s * k * 1.15 * ease);
      });
    }

    // ---- soft ground shadows
    const shadowOp = dark ? 0.55 : 0.22;
    if (cupShadow.current) {
      cupShadow.current.position.set(cupX, groundY + 0.002, 0);
      cupShadow.current.scale.set(1.5 * k, 1.5 * k, 1);
      (cupShadow.current.material as THREE.MeshBasicMaterial).opacity = shadowOp * s.move;
    }
    if (potShadow.current) {
      const height = clamp01((potY - restY) / (2 * k));
      potShadow.current.position.set(potX, groundY + 0.001, potZ);
      potShadow.current.scale.set(2.3 * k * (1 + height * 0.4), 2.3 * k * (1 + height * 0.4), 1);
      (potShadow.current.material as THREE.MeshBasicMaterial).opacity = shadowOp * ease * (1 - height * 0.75);
    }
  });

  return (
    <>
      <group ref={pot}>
        <mesh geometry={potGeo.body} material={mats.potGlass} />
        {/* Liquid + its cap: the clipped volume's inner faces, shaded flat, read as
            the tea surface and are exactly bounded by the liquid (never past the glass). */}
        <mesh geometry={potGeo.liquid} material={mats.potTea} />
        <mesh geometry={potGeo.liquid} material={mats.potTeaCap} />
        <mesh geometry={potGeo.lid} material={mats.potGlass} />
        <mesh geometry={potGeo.knob} material={mats.potGlass} position={[0, 0.78, 0]} />
        <mesh geometry={potGeo.spout} material={mats.potGlass} />
        <mesh geometry={potGeo.handle} material={mats.potGlass} />
      </group>

      <group ref={cup}>
        <mesh geometry={cupGeo.glass} material={mats.cupGlass} />
        <mesh geometry={cupGeo.handle} material={mats.cupGlass} />
        <mesh ref={cupTea} geometry={cupGeo.tea} material={mats.cupTea} />
        <mesh ref={surface} material={mats.tea} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1, 64]} />
        </mesh>
      </group>

      <mesh ref={stream} geometry={streamGeo} material={mats.tea} frustumCulled={false} />

      <group ref={ripples}>
        {mats.ripples.map((m, i) => (
          <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} material={m}>
            <ringGeometry args={[0.92, 1, 48]} />
          </mesh>
        ))}
      </group>

      <group ref={steam}>
        {Array.from({ length: STEAM_COUNT }, (_, i) => (
          <sprite key={i}>
            <spriteMaterial
              map={dot}
              color={theme === "dark" ? "#ffffff" : "#b5aba0"}
              transparent
              opacity={0}
              depthWrite={false}
            />
          </sprite>
        ))}
      </group>

      <group ref={petals}>
        {PETALS.map((p, i) => (
          <mesh key={i} geometry={petalGeo}>
            <meshPhysicalMaterial
              color={p.color}
              roughness={0.5}
              sheen={1}
              sheenColor="#ff9db4"
              sheenRoughness={0.4}
              side={THREE.DoubleSide}
            />
          </mesh>
        ))}
      </group>

      <mesh ref={cupShadow} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-1}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={dot} color="#000000" transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh ref={potShadow} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-1}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={dot} color="#000000" transparent opacity={0} depthWrite={false} />
      </mesh>
    </>
  );
}

export default function PourScene({
  active,
  replay,
  theme,
  layout,
  onReady,
}: {
  active: boolean;
  replay: number;
  theme: Theme;
  layout: RefObject<HeroLayout>;
  onReady?: () => void;
}) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 1.1, 9], fov: 35 }}
      frameloop={active ? "always" : "never"}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.localClippingEnabled = true;
        onReady?.();
      }}
    >
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 6, 5]} intensity={1.4} />
      <pointLight position={[-3, 0.5, 3]} intensity={10} color="#ff7a92" />
      {/* Studio reflections for the glass — generated locally, no HDR download. */}
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={4} position={[0, 5, -1]} rotation-x={Math.PI / 2} scale={[10, 3, 1]} />
        <Lightformer form="rect" intensity={2.5} position={[-5, 1, 2]} rotation-y={Math.PI / 2} scale={[2, 6, 1]} />
        <Lightformer form="rect" intensity={2.5} position={[5, 1, 2]} rotation-y={-Math.PI / 2} scale={[2, 6, 1]} />
        <Lightformer form="ring" intensity={2} color="#ff6b81" position={[0, 1, -6]} scale={3} />
      </Environment>
      <Stage replay={replay} theme={theme} layout={layout} />
      <IngredientField layout={layout} />
    </Canvas>
  );
}
