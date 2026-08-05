"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, useTexture } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import {
  useMemo,
  useRef,
  useState,
  useEffect,
  Suspense,
  type ReactNode,
} from "react";
import * as THREE from "three";
import { useRouter } from "next/navigation";
import Link from "next/link";

export type TurningPoint = {
  id: string;
  slug: string;
  title: string;
  year: number;
  place: string;
  lat: number;
  lng: number;
  turnedName: string;
  turnedId?: string | null;
  sireId?: string | null;
};

const BASE_RADIUS = 2;
const MARKER_RADIUS = 2.035;
const ARTERIAL = "#A8121F";
const OXBLOOD = "#5C0A11";

const EARTH_DAY = "/textures/earth/earth_day.jpg";
const EARTH_BUMP = "/textures/earth/earth_bump.jpg";
const EARTH_SPEC = "/textures/earth/earth_specular.png";
const EARTH_CLOUDS = "/textures/earth/earth_clouds.png";
const EARTH_NIGHT = "/textures/earth/earth_night.png";

function latLngToVec3(lat: number, lng: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

function slerpDir(a: THREE.Vector3, b: THREE.Vector3, t: number) {
  const aN = a.clone().normalize();
  const bN = b.clone().normalize();
  const dot = THREE.MathUtils.clamp(aN.dot(bN), -1, 1);
  const omega = Math.acos(dot);
  if (omega < 1e-4) return aN;
  const so = Math.sin(omega);
  return aN
    .multiplyScalar(Math.sin((1 - t) * omega) / so)
    .add(bN.multiplyScalar(Math.sin(t * omega) / so))
    .normalize();
}

/** Spherical great-circle arc lifted above the surface like a vein. */
function bloodArc(
  a: THREE.Vector3,
  b: THREE.Vector3,
  surfaceRadius: number,
  lift = 1.28
) {
  const points: THREE.Vector3[] = [];
  const segments = 48;
  const angle = Math.max(0.001, a.angleTo(b));

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const dir = slerpDir(a, b, t);
    const bulge = Math.sin(t * Math.PI);
    const height =
      surfaceRadius * (1 + (lift - 1) * bulge * (0.55 + angle * 0.35));
    points.push(dir.multiplyScalar(height));
  }

  return new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.35);
}

function growthScale(count: number) {
  // Each new turning swells the globe slightly — never wild, always felt.
  return 1 + Math.min(0.45, Math.log1p(count) * 0.1);
}

function reddeningIntensity(count: number) {
  return Math.min(1, 0.12 + count * 0.1);
}

/** Transparent blood blotches only — sits over the real Earth map. */
function buildBloodOverlay(
  stains: { lat: number; lng: number }[],
  intensity: number
) {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const s of stains) {
    const x = ((s.lng + 180) / 360) * canvas.width;
    const y = ((90 - s.lat) / 180) * canvas.height;
    const r = 22 + intensity * 40;
    const blot = ctx.createRadialGradient(x, y, 0, x, y, r);
    blot.addColorStop(0, `rgba(168,18,31,${0.55 + intensity * 0.3})`);
    blot.addColorStop(0.4, `rgba(92,10,17,${0.28 + intensity * 0.2})`);
    blot.addColorStop(1, "rgba(92,10,17,0)");
    ctx.fillStyle = blot;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function GlobeSphere({
  stains,
  intensity,
  scaleTarget,
  reducedMotion,
}: {
  stains: { lat: number; lng: number }[];
  intensity: number;
  scaleTarget: number;
  reducedMotion: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);

  const [dayMap, bumpMap, specMap, cloudsMap, nightMap] = useTexture([
    EARTH_DAY,
    EARTH_BUMP,
    EARTH_SPEC,
    EARTH_CLOUDS,
    EARTH_NIGHT,
  ]);

  useEffect(() => {
    dayMap.colorSpace = THREE.SRGBColorSpace;
    cloudsMap.colorSpace = THREE.SRGBColorSpace;
    nightMap.colorSpace = THREE.SRGBColorSpace;
    dayMap.anisotropy = 8;
    bumpMap.anisotropy = 4;
    cloudsMap.anisotropy = 4;
  }, [dayMap, bumpMap, cloudsMap, nightMap]);

  const bloodMap = useMemo(
    () => buildBloodOverlay(stains, intensity),
    [stains, intensity]
  );

  useEffect(() => {
    return () => bloodMap.dispose();
  }, [bloodMap]);

  useFrame((_, dt) => {
    if (group.current) {
      const cur = group.current.scale.x;
      const next = reducedMotion
        ? scaleTarget
        : THREE.MathUtils.damp(cur, scaleTarget, 2.2, dt);
      group.current.scale.setScalar(next);
    }
    if (cloudsRef.current && !reducedMotion) {
      cloudsRef.current.rotation.y += dt * 0.012;
    }
  });

  return (
    <group ref={group}>
      {/* Real Earth */}
      <mesh>
        <sphereGeometry args={[BASE_RADIUS, 128, 128]} />
        <meshPhongMaterial
          map={dayMap}
          bumpMap={bumpMap}
          bumpScale={0.045}
          specularMap={specMap}
          specular="#6699bb"
          shininess={18}
          emissiveMap={nightMap}
          emissive="#ffaa66"
          emissiveIntensity={0.55}
        />
      </mesh>

      {/* Blood stain overlay — additive so the planet still reads clearly */}
      <mesh>
        <sphereGeometry args={[BASE_RADIUS * 1.003, 96, 96]} />
        <meshBasicMaterial
          map={bloodMap}
          transparent
          opacity={0.9}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Clouds */}
      <mesh ref={cloudsRef} scale={1.012}>
        <sphereGeometry args={[BASE_RADIUS, 96, 96]} />
        <meshPhongMaterial
          map={cloudsMap}
          transparent
          opacity={0.42}
          depthWrite={false}
          specular="#000000"
        />
      </mesh>

      {/* Atmosphere — soft blue limb, tips arterial as cast grows */}
      <mesh scale={1.065}>
        <sphereGeometry args={[BASE_RADIUS, 64, 64]} />
        <meshBasicMaterial
          color={intensity > 0.55 ? "#6a2030" : "#4a7ab5"}
          transparent
          opacity={0.11 + intensity * 0.06}
          side={THREE.BackSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh scale={1.12}>
        <sphereGeometry args={[BASE_RADIUS, 48, 48]} />
        <meshBasicMaterial
          color="#1a2a45"
          transparent
          opacity={0.06}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function TurningMarker({
  point,
  radius,
  active,
  dimmed,
  onHover,
  onClick,
  phase,
  isNewest,
  reducedMotion,
}: {
  point: TurningPoint;
  radius: number;
  active: boolean;
  dimmed: boolean;
  onHover: (p: TurningPoint | null) => void;
  onClick: () => void;
  phase: number;
  isNewest: boolean;
  reducedMotion: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const core = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const spawn = useRef(reducedMotion ? 1 : 0);
  const pos = useMemo(
    () => latLngToVec3(point.lat, point.lng, radius),
    [point.lat, point.lng, radius]
  );

  useFrame(({ clock }, dt) => {
    if (!group.current || !core.current) return;
    spawn.current = Math.min(1, spawn.current + dt / (isNewest ? 0.9 : 0.55));
    const ease = 1 - Math.pow(1 - spawn.current, 3);
    const t = clock.getElapsedTime() + phase;
    const pulse = 1 + Math.sin(t * 1.8) * (isNewest ? 0.55 : 0.28);
    const s = ease * (active ? 1.75 : pulse) * (isNewest ? 1.25 : 1);
    core.current.scale.setScalar(s);

    if (ring.current) {
      const beat = 1 + Math.sin(t * 2.4) * 0.15;
      ring.current.scale.setScalar(ease * beat * (isNewest ? 2.4 : 1.8));
      const mat = ring.current.material as THREE.MeshBasicMaterial;
      mat.opacity = (dimmed ? 0.05 : isNewest ? 0.55 : 0.28) * ease;
    }

    group.current.visible = ease > 0.02;
  });

  return (
    <group ref={group} position={pos}>
      <mesh
        ref={core}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(point);
        }}
        onPointerOut={() => onHover(null)}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <sphereGeometry args={[0.048, 20, 20]} />
        <meshBasicMaterial
          color={ARTERIAL}
          transparent
          opacity={dimmed ? 0.18 : 0.98}
        />
      </mesh>
      <mesh ref={ring}>
        <sphereGeometry args={[0.048, 16, 16]} />
        <meshBasicMaterial
          color={ARTERIAL}
          transparent
          opacity={0.3}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

function BloodParticle({
  curve,
  offset,
  reducedMotion,
}: {
  curve: THREE.CatmullRomCurve3;
  offset: number;
  reducedMotion: boolean;
}) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current || reducedMotion) return;
    const t = (clock.getElapsedTime() * 0.18 + offset) % 1;
    const p = curve.getPointAt(t);
    ref.current.position.copy(p);
    const pulse = 0.6 + Math.sin(clock.getElapsedTime() * 6 + offset * 20) * 0.4;
    ref.current.scale.setScalar(pulse);
  });

  if (reducedMotion) return null;

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.018, 8, 8]} />
      <meshBasicMaterial
        color="#ff2a3a"
        transparent
        opacity={0.9}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

function ArcVein({
  curve,
  bright,
  delay,
  reducedMotion,
  thickness,
}: {
  curve: THREE.CatmullRomCurve3;
  bright: boolean;
  delay: number;
  reducedMotion: boolean;
  thickness: number;
}) {
  const coreRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const drawn = useRef(reducedMotion ? 1 : 0);

  const { coreGeom, glowGeom } = useMemo(() => {
    const coreGeom = new THREE.TubeGeometry(curve, 72, thickness, 10, false);
    const glowGeom = new THREE.TubeGeometry(
      curve,
      64,
      thickness * 2.8,
      8,
      false
    );
    return { coreGeom, glowGeom };
  }, [curve, thickness]);

  useEffect(() => {
    return () => {
      coreGeom.dispose();
      glowGeom.dispose();
    };
  }, [coreGeom, glowGeom]);

  useFrame((_, dt) => {
    drawn.current = Math.min(1, drawn.current + dt / (1.4 + delay * 0.15));
    const progress = reducedMotion ? 1 : drawn.current;

    for (const mesh of [coreRef.current, glowRef.current]) {
      if (!mesh) continue;
      const g = mesh.geometry as THREE.TubeGeometry;
      const total = g.index ? g.index.count : 0;
      g.setDrawRange(0, Math.floor(total * progress));
    }
  });

  return (
    <group>
      <mesh ref={glowRef} geometry={glowGeom}>
        <meshBasicMaterial
          color={OXBLOOD}
          transparent
          opacity={bright ? 0.35 : 0.06}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh ref={coreRef} geometry={coreGeom}>
        <meshBasicMaterial
          color={ARTERIAL}
          transparent
          opacity={bright ? 0.95 : 0.12}
        />
      </mesh>
      {bright &&
        [0, 0.33, 0.66].map((o) => (
          <BloodParticle
            key={o}
            curve={curve}
            offset={o + delay * 0.07}
            reducedMotion={reducedMotion}
          />
        ))}
    </group>
  );
}

function BloodArcs({
  points,
  radius,
  maxYear,
  hoverId,
  reducedMotion,
  scaleTarget,
}: {
  points: TurningPoint[];
  radius: number;
  maxYear: number;
  hoverId: string | null;
  reducedMotion: boolean;
  scaleTarget: number;
}) {
  const group = useRef<THREE.Group>(null);
  const visible = useMemo(
    () => points.filter((p) => p.year <= maxYear),
    [points, maxYear]
  );

  const curves = useMemo(() => {
    const byTurned = new Map<string, TurningPoint>();
    for (const p of visible) {
      if (p.turnedId) byTurned.set(p.turnedId, p);
    }

    const out: {
      curve: THREE.CatmullRomCurve3;
      fromId: string;
      toId: string;
      key: string;
    }[] = [];
    const linked = new Set<string>();

    // Prefer sire → progeny veins (true bloodline)
    for (const p of visible) {
      if (!p.sireId) continue;
      const sirePoint = byTurned.get(p.sireId);
      if (!sirePoint) continue;
      const a = latLngToVec3(sirePoint.lat, sirePoint.lng, radius);
      const b = latLngToVec3(p.lat, p.lng, radius);
      const key = `${sirePoint.id}->${p.id}`;
      linked.add(p.id);
      out.push({
        curve: bloodArc(a, b, radius),
        fromId: sirePoint.id,
        toId: p.id,
        key,
      });
    }

    // Chronological thread for origins / orphans so the string still grows
    for (let i = 0; i < visible.length - 1; i++) {
      const from = visible[i];
      const to = visible[i + 1];
      if (linked.has(to.id)) continue;
      const a = latLngToVec3(from.lat, from.lng, radius);
      const b = latLngToVec3(to.lat, to.lng, radius);
      out.push({
        curve: bloodArc(a, b, radius, 1.22),
        fromId: from.id,
        toId: to.id,
        key: `chrono-${from.id}-${to.id}`,
      });
    }

    return out;
  }, [visible, radius]);

  useFrame((_, dt) => {
    if (!group.current) return;
    const cur = group.current.scale.x;
    const next = reducedMotion
      ? scaleTarget
      : THREE.MathUtils.damp(cur, scaleTarget, 2.2, dt);
    group.current.scale.setScalar(next);
  });

  const thickness = 0.01 + Math.min(0.014, visible.length * 0.0025);

  return (
    <group ref={group}>
      {curves.map(({ curve, fromId, toId, key }, i) => (
        <ArcVein
          key={key}
          curve={curve}
          bright={!hoverId || hoverId === fromId || hoverId === toId}
          delay={i * 0.28}
          reducedMotion={reducedMotion}
          thickness={thickness}
        />
      ))}
    </group>
  );
}

function GrowingGroup({
  scaleTarget,
  reducedMotion,
  children,
}: {
  scaleTarget: number;
  reducedMotion: boolean;
  children: ReactNode;
}) {
  const group = useRef<THREE.Group>(null);

  useFrame((_, dt) => {
    if (!group.current) return;
    const cur = group.current.scale.x;
    const next = reducedMotion
      ? scaleTarget
      : THREE.MathUtils.damp(cur, scaleTarget, 2.2, dt);
    group.current.scale.setScalar(next);
  });

  return <group ref={group}>{children}</group>;
}

function Scene({
  points,
  maxYear,
  reducedMotion,
  onHover,
}: {
  points: TurningPoint[];
  maxYear: number;
  reducedMotion: boolean;
  onHover: (p: TurningPoint | null) => void;
}) {
  const router = useRouter();
  const [hover, setHover] = useState<TurningPoint | null>(null);
  const visible = points.filter((p) => p.year <= maxYear);
  const scaleTarget = growthScale(visible.length);
  const intensity = reddeningIntensity(visible.length);
  const newestId = visible.at(-1)?.id ?? null;

  const stains = useMemo(
    () => visible.map((p) => ({ lat: p.lat, lng: p.lng })),
    [visible]
  );

  const handleHover = (p: TurningPoint | null) => {
    setHover(p);
    onHover(p);
  };

  return (
    <>
      <color attach="background" args={["#020308"]} />
      <fog attach="fog" args={["#020308", 12, 32]} />
      <ambientLight intensity={0.22} />
      {/* Sun */}
      <directionalLight
        position={[6, 2.5, 4]}
        intensity={2.4}
        color="#fff4e6"
      />
      {/* Soft fill on the dark side so night lights read */}
      <directionalLight
        position={[-5, -1, -3]}
        intensity={0.28}
        color="#6a8cff"
      />
      <pointLight position={[0, 0, 6]} intensity={0.2} color="#ffffff" />
      <Stars
        radius={60}
        depth={40}
        count={2200}
        factor={2.4}
        saturation={0}
        fade
        speed={reducedMotion ? 0 : 0.25}
      />
      <GlobeSphere
        stains={stains}
        intensity={intensity}
        scaleTarget={scaleTarget}
        reducedMotion={reducedMotion}
      />
      <BloodArcs
        points={points}
        radius={MARKER_RADIUS}
        maxYear={maxYear}
        hoverId={hover?.id ?? null}
        reducedMotion={reducedMotion}
        scaleTarget={scaleTarget}
      />
      <GrowingGroup scaleTarget={scaleTarget} reducedMotion={reducedMotion}>
        {visible.map((p, i) => (
          <TurningMarker
            key={p.id}
            point={p}
            radius={MARKER_RADIUS}
            phase={i * 0.7}
            active={hover?.id === p.id}
            dimmed={!!hover && hover.id !== p.id}
            isNewest={p.id === newestId}
            reducedMotion={reducedMotion}
            onHover={handleHover}
            onClick={() =>
              router.push(
                p.slug.startsWith("cast/") ? `/${p.slug}` : `/chapter/${p.slug}`
              )
            }
          />
        ))}
      </GrowingGroup>
      <OrbitControls
        enablePan={false}
        minDistance={3.4}
        maxDistance={9}
        autoRotate={!reducedMotion && !hover}
        autoRotateSpeed={0.22}
        enableDamping
        dampingFactor={0.08}
      />
      <EffectComposer>
        <Bloom
          intensity={0.85}
          luminanceThreshold={0.72}
          luminanceSmoothing={0.4}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
}

export function ReddeningGlobe({ points }: { points: TurningPoint[] }) {
  const years = points.map((p) => p.year);
  const minYear = years.length ? Math.min(...years) : 1700;
  const maxYearBound = years.length ? Math.max(...years) : 2026;
  const [maxYear, setMaxYear] = useState(maxYearBound);
  const [hoverHud, setHoverHud] = useState<TurningPoint | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const fn = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  // Scrubbing forward past a new year feels like a new turning arriving.
  useEffect(() => {
    setMaxYear(maxYearBound);
  }, [maxYearBound]);

  const visibleCount = points.filter((p) => p.year <= maxYear).length;
  const latest = [...points].filter((p) => p.year <= maxYear).at(-1) ?? null;

  return (
    <div className="relative">
      <div className="relative h-[72vh] min-h-[440px] w-full overflow-hidden border border-gilt/30 bg-soot">
        <Canvas
          camera={{ position: [0, 0.55, 5.4], fov: 40 }}
          dpr={[1, 1.75]}
          gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
        >
          <Suspense fallback={null}>
            <Scene
              points={points}
              maxYear={maxYear}
              reducedMotion={reducedMotion}
              onHover={setHoverHud}
            />
          </Suspense>
        </Canvas>

        <div className="pointer-events-none absolute top-4 left-4 right-4 flex justify-between gap-4">
          <div>
            <p className="font-ledger text-xs tracking-[0.18em] text-gilt uppercase">
              Pokousaná
            </p>
            <p className="mt-1 font-ledger text-[0.65rem] tracking-wider text-vellum-dim uppercase">
              {visibleCount} {visibleCount === 1 ? "vein" : "veins"} · grows
              with each turning
            </p>
          </div>
          {(hoverHud || latest) && (
            <div className="text-right">
              <p className="font-ledger text-xs text-arterial">
                {(hoverHud || latest)!.year} · {(hoverHud || latest)!.place}
              </p>
              <p className="font-display text-lg text-vellum">
                {(hoverHud || latest)!.turnedName}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto mt-6 max-w-3xl px-2">
        <label className="block">
          <div className="mb-2 flex justify-between font-ledger text-xs tracking-wider text-vellum-dim uppercase">
            <span>Century scrubber</span>
            <span className="text-arterial">{maxYear}</span>
          </div>
          <input
            type="range"
            min={minYear}
            max={maxYearBound}
            value={maxYear}
            onChange={(e) => {
              setMaxYear(Number(e.target.value));
              setHoverHud(null);
            }}
            className="w-full accent-[var(--arterial)]"
          />
          <div className="mt-1 flex justify-between font-ledger text-[0.65rem] text-gilt">
            <span>{minYear}</span>
            <span>{maxYearBound}</span>
          </div>
        </label>
        <p className="mt-4 text-center text-sm text-vellum-dim">
          Drag the globe. Scrub the centuries — each new pulse swells the
          world and draws another blood string.
        </p>
        {points.length === 0 && (
          <p className="mt-4 text-center text-vellum-dim">
            No sealed turnings with coordinates yet.{" "}
            <Link href="/write" className="text-arterial underline">
              Set the first in ink
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  );
}
