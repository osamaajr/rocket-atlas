"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Html, Lightformer, Line, OrbitControls, Stars } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { ROCKETS, ROCKET_BY_ID, type RocketId } from "@/lib/rockets";
import { useAtlas } from "@/lib/store";
import { buildRocket, type BuiltRocket } from "./rocketBuilder";

export const PAD_TOP = 0.6;
export const ROCKET_X: Record<RocketId, number> = {
  "mercury-redstone": -27,
  "gemini-titan": -10,
  "saturn-v": 13,
};
const ACCENT = new THREE.Color("#d8c39a");
const COUNTDOWN = 5; // seconds of countdown before liftoff
const TIME_SCALE = 2.5; // simulated seconds per real second

/* Registry so the camera / launch systems can reach each rocket */
const rigs: Partial<Record<RocketId, { built: BuiltRocket; lift: THREE.Group; padR: number }>> = {};

const padRadius = (id: RocketId) => {
  const r = ROCKET_BY_ID[id].diameterM / 2;
  return id === "saturn-v" ? 9.5 : Math.max(r * 2.4, 2.8);
};

/* ============================== ROCKET ============================== */
function RocketActor({ id }: { id: RocketId }) {
  const built = useMemo(() => buildRocket(id), [id]);
  const lift = useRef<THREE.Group>(null!);
  const ring = useRef<THREE.MeshBasicMaterial>(null!);
  const glow = useRef<THREE.MeshBasicMaterial>(null!);
  const rocket = ROCKET_BY_ID[id];
  const padR = padRadius(id);
  const selected = useAtlas((s) => s.selected);
  const hovered = useAtlas((s) => s.hovered);
  const launch = useAtlas((s) => s.launch);
  const view = useAtlas((s) => s.view);
  const tmp = useMemo(() => new THREE.Color(), []);

  useEffect(() => {
    rigs[id] = { built, lift: lift.current, padR };
  }, [id, built, padR]);

  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * 5);
    const dimmed = (selected && selected !== id) || (launch.status !== "idle" && launch.id !== id);
    const level = dimmed ? 0.22 : 1;
    for (const m of built.materials) {
      const mat = m as THREE.MeshStandardMaterial;
      mat.color.lerp(tmp.copy(mat.userData.base).multiplyScalar(level), k);
      mat.envMapIntensity += ((dimmed ? 0.12 : 1) - mat.envMapIntensity) * k;
    }
    const active = selected === id || hovered === id;
    const ringTarget = active ? 1 : dimmed ? 0.08 : 0.32;
    ring.current.opacity += (ringTarget - ring.current.opacity) * k;
    glow.current.opacity += ((selected === id ? 0.55 : hovered === id ? 0.3 : 0) - glow.current.opacity) * k;
  });

  const hitR = Math.max(rocket.diameterM * 1.1, 3.2);
  const showLabel = !selected && launch.status === "idle" && view === "collection";

  return (
    <group position={[ROCKET_X[id], 0, 0]}>
      {/* Pad */}
      <mesh position={[0, PAD_TOP / 2, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[padR, padR * 1.04, PAD_TOP, 96]} />
        <meshStandardMaterial color="#14171b" roughness={0.6} metalness={0.5} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, PAD_TOP + 0.02, 0]}>
        <ringGeometry args={[padR * 0.9, padR * 0.93, 128]} />
        <meshBasicMaterial ref={ring} color={ACCENT} transparent opacity={0.3} toneMapped={false} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, PAD_TOP + 0.03, 0]}>
        <circleGeometry args={[padR * 1.6, 64]} />
        <meshBasicMaterial ref={glow} map={glowTexture()} color={ACCENT} transparent opacity={0} depthWrite={false} toneMapped={false} />
      </mesh>

      <group ref={lift} position={[0, PAD_TOP, 0]}>
        <primitive object={built.root} />
        {/* Generous invisible hit volume so slim rockets are easy to click */}
        <mesh
          position={[0, rocket.heightM / 2, 0]}
          onPointerOver={(e) => {
            e.stopPropagation();
            useAtlas.getState().hover(id);
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            useAtlas.getState().hover(null);
            document.body.style.cursor = "";
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (e.delta > 6) return;
            const st = useAtlas.getState();
            st.select(st.selected === id ? null : id);
          }}
        >
          <cylinderGeometry args={[hitR, hitR, rocket.heightM, 16]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
        </mesh>
      </group>

      <Html position={[0, PAD_TOP, padR + 2.2]} center zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
        <div className={`pad-label ${showLabel ? "" : "is-hidden"} ${hovered === id ? "is-hot" : ""}`}>
          <span>{rocket.index}</span>
          {rocket.shortName}
        </div>
      </Html>
    </group>
  );
}

let _glow: THREE.Texture | null = null;
function glowTexture() {
  if (_glow) return _glow;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(255,255,255,0.9)");
  g.addColorStop(0.45, "rgba(255,255,255,0.25)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  _glow = new THREE.CanvasTexture(c);
  return _glow;
}

/* ============================= PLATFORM ============================= */
function Platform() {
  const grid = useMemo(() => {
    const W = 2048;
    const H = Math.round((W * 40) / 88);
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const ctx = c.getContext("2d")!;
    const px = W / 88;
    for (let m = 0; m <= 88; m += 2) {
      ctx.fillStyle = m % 10 === 0 ? "rgba(216,195,154,0.16)" : "rgba(255,255,255,0.045)";
      ctx.fillRect(m * px, 0, m % 10 === 0 ? 2 : 1, H);
    }
    for (let m = 0; m <= 40; m += 2) {
      ctx.fillStyle = m % 10 === 0 ? "rgba(216,195,154,0.16)" : "rgba(255,255,255,0.045)";
      ctx.fillRect(0, m * px, W, m % 10 === 0 ? 2 : 1);
    }
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 8;
    return t;
  }, []);

  const W = 88;
  const D = 40;
  const cx = -5;
  const edge = (
    <meshBasicMaterial color={new THREE.Color("#d8c39a").multiplyScalar(0.9)} toneMapped={false} />
  );
  return (
    <group>
      <mesh position={[cx, -1, 0]} receiveShadow>
        <boxGeometry args={[W, 2, D]} />
        <meshStandardMaterial color="#0c0e11" roughness={0.75} metalness={0.35} />
      </mesh>
      <mesh position={[cx, -3.2, 0]}>
        <boxGeometry args={[W - 4, 2.4, D - 4]} />
        <meshStandardMaterial color="#07080a" roughness={0.9} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[cx, 0.01, 0]} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial map={grid} transparent color="#ffffff" roughness={0.6} metalness={0.2} depthWrite={false} />
      </mesh>
      {/* glowing edge */}
      <mesh position={[cx, 0.02, D / 2]}>
        <boxGeometry args={[W, 0.06, 0.06]} />
        {edge}
      </mesh>
      <mesh position={[cx, 0.02, -D / 2]}>
        <boxGeometry args={[W, 0.06, 0.06]} />
        {edge}
      </mesh>
      <mesh position={[cx - W / 2, 0.02, 0]}>
        <boxGeometry args={[0.06, 0.06, D]} />
        {edge}
      </mesh>
      <mesh position={[cx + W / 2, 0.02, 0]}>
        <boxGeometry args={[0.06, 0.06, D]} />
        {edge}
      </mesh>
    </group>
  );
}

/* =============================== MOON =============================== */
function Moon() {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 512;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#9c9a95";
    ctx.fillRect(0, 0, 1024, 512);
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 26; i++) {
      ctx.fillStyle = `rgba(70,70,72,${0.25 + rnd() * 0.25})`;
      ctx.beginPath();
      ctx.ellipse(rnd() * 1024, 100 + rnd() * 300, 30 + rnd() * 110, 20 + rnd() * 70, rnd() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 420; i++) {
      const x = rnd() * 1024;
      const y = rnd() * 512;
      const r = Math.pow(rnd(), 3) * 18 + 1;
      ctx.strokeStyle = `rgba(30,30,30,${0.2 + rnd() * 0.2})`;
      ctx.lineWidth = Math.max(1, r * 0.25);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = `rgba(255,255,255,${0.04 + rnd() * 0.06})`;
      ctx.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((_, dt) => (ref.current.rotation.y += dt * 0.004));
  return (
    <mesh ref={ref} position={[980, 360, -1650]}>
      <sphereGeometry args={[52, 64, 64]} />
      <meshStandardMaterial map={tex} roughness={1} metalness={0} fog={false} />
    </mesh>
  );
}

/* ============================ HEIGHT RULER ============================ */
function HeightRuler() {
  const view = useAtlas((s) => s.view);
  const X = 30;
  if (view !== "compare") return null;
  const ticks = Array.from({ length: 13 }, (_, i) => i * 10);
  return (
    <group position={[0, PAD_TOP, 0]}>
      <Line points={[[X, 0, 0], [X, 120, 0]]} color="#d8c39a" lineWidth={1.2} transparent opacity={0.7} />
      {ticks.map((t) => (
        <group key={t}>
          <Line points={[[X, t, 0], [X + (t % 50 === 0 ? 2.4 : 1.2), t, 0]]} color="#d8c39a" lineWidth={1} transparent opacity={0.7} />
          {t % 20 === 0 && (
            <Html position={[X + 3.2, t, 0]} zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
              <div className="ruler-label">{t} m</div>
            </Html>
          )}
        </group>
      ))}
      {ROCKETS.map((r) => (
        <group key={r.id}>
          <Line
            points={[[ROCKET_X[r.id] + r.diameterM / 2 + 0.6, r.heightM, 0], [X, r.heightM, 0]]}
            color="#ffffff"
            lineWidth={1}
            dashed
            dashSize={0.8}
            gapSize={0.8}
            transparent
            opacity={0.45}
          />
          <Html position={[ROCKET_X[r.id], r.heightM + 3.5, 0]} center zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
            <div className="height-tag">
              {r.heightM} m<span>{r.shortName}</span>
            </div>
          </Html>
        </group>
      ))}
      {/* a person, for scale */}
      <group position={[-34.5, 0, 6]}>
        <mesh position={[0, 0.8, 0]}>
          <capsuleGeometry args={[0.22, 1.1, 4, 12]} />
          <meshStandardMaterial color="#d8c39a" emissive="#d8c39a" emissiveIntensity={0.4} />
        </mesh>
        <Html position={[0, 2.6, 0]} center zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
          <div className="ruler-label">Person · 1.8 m</div>
        </Html>
      </group>
    </group>
  );
}

/* ============================== SMOKE =============================== */
const MAX_P = 6000;
const smoke = {
  pos: new Float32Array(MAX_P * 3),
  vel: new Float32Array(MAX_P * 3),
  age: new Float32Array(MAX_P).fill(999),
  life: new Float32Array(MAX_P).fill(1),
  size0: new Float32Array(MAX_P),
  cursor: 0,
  emit(x: number, y: number, z: number, vx: number, vy: number, vz: number, size: number, life: number) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % MAX_P;
    this.pos.set([x, y, z], i * 3);
    this.vel.set([vx, vy, vz], i * 3);
    this.age[i] = 0;
    this.life[i] = life;
    this.size0[i] = size;
  },
  clear() {
    this.age.fill(999);
  },
};

function Smoke() {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(MAX_P * 3), 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(new Float32Array(MAX_P), 1));
    g.setAttribute("aAlpha", new THREE.BufferAttribute(new Float32Array(MAX_P), 1));
    g.setAttribute("aHeat", new THREE.BufferAttribute(new Float32Array(MAX_P), 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
    return g;
  }, []);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { uScale: { value: 800 } },
        vertexShader: /* glsl */ `
          attribute float aSize; attribute float aAlpha; attribute float aHeat;
          varying float vAlpha; varying float vHeat;
          uniform float uScale;
          void main() {
            vAlpha = aAlpha; vHeat = aHeat;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = aSize * uScale / max(-mv.z, 0.1);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `
          varying float vAlpha; varying float vHeat;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            float a = smoothstep(0.5, 0.0, d);
            a = a * a * vAlpha;
            vec3 smokeCol = vec3(0.5, 0.5, 0.52);
            vec3 fire = vec3(1.5, 0.78, 0.34);
            gl_FragColor = vec4(mix(smokeCol, fire, vHeat), a);
          }`,
      }),
    [],
  );

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const cam = state.camera as THREE.PerspectiveCamera;
    mat.uniforms.uScale.value = state.size.height / (2 * Math.tan((cam.fov * Math.PI) / 360));
    const P = geo.attributes.position.array as Float32Array;
    const S = geo.attributes.aSize.array as Float32Array;
    const A = geo.attributes.aAlpha.array as Float32Array;
    const Ht = geo.attributes.aHeat.array as Float32Array;
    for (let i = 0; i < MAX_P; i++) {
      const age = (smoke.age[i] += dt);
      const life = smoke.life[i];
      if (age > life) {
        A[i] = 0;
        continue;
      }
      const t = age / life;
      const drag = Math.exp(-dt * 1.6);
      const i3 = i * 3;
      smoke.vel[i3] *= drag;
      smoke.vel[i3 + 1] = smoke.vel[i3 + 1] * drag + dt * 1.5; // gentle buoyancy
      smoke.vel[i3 + 2] *= drag;
      smoke.pos[i3] += smoke.vel[i3] * dt;
      smoke.pos[i3 + 1] = Math.max(PAD_TOP, smoke.pos[i3 + 1] + smoke.vel[i3 + 1] * dt);
      smoke.pos[i3 + 2] += smoke.vel[i3 + 2] * dt;
      P[i3] = smoke.pos[i3];
      P[i3 + 1] = smoke.pos[i3 + 1];
      P[i3 + 2] = smoke.pos[i3 + 2];
      S[i] = smoke.size0[i] * (1 + t * 3.2);
      A[i] = Math.min(1, t * 8) * (1 - t) * 0.42;
      Ht[i] = Math.max(0, 1 - t * 7);
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.aSize.needsUpdate = true;
    geo.attributes.aAlpha.needsUpdate = true;
    geo.attributes.aHeat.needsUpdate = true;
  });
  return <points geometry={geo} material={mat} frustumCulled={false} renderOrder={5} />;
}

/* ========================== LAUNCH SYSTEM ========================== */
function LaunchSystem() {
  const sim = useRef({ y: 0, v: 0, simT: 0, lastTel: 0, intensity: 0 });
  const light = useRef<THREE.PointLight>(null!);

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const st = useAtlas.getState();
    const { launch } = st;
    const s = sim.current;

    if (launch.status === "idle" || !launch.id) {
      if (s.y !== 0 || s.intensity !== 0) {
        for (const r of ROCKETS) {
          const rig = rigs[r.id];
          if (!rig) continue;
          rig.lift.position.y = PAD_TOP;
          rig.built.flames.forEach((f) => (f.visible = false));
          rig.built.flameMaterial.uniforms.uIntensity.value = 0;
        }
        Object.assign(s, { y: 0, v: 0, simT: 0, intensity: 0, lastTel: 0 });
        smoke.clear();
      }
      light.current.intensity = 0;
      return;
    }

    const r = ROCKET_BY_ID[launch.id];
    const rig = rigs[launch.id];
    if (!rig) return;
    const t = (performance.now() - launch.startedAt) / 1000 - COUNTDOWN; // real seconds rel. to liftoff

    // Engine start ~1.8 s before liftoff, ramping to full thrust
    const targetI = t < -1.8 ? 0 : t < 0 ? 0.35 + 0.65 * ((t + 1.8) / 1.8) : 1;
    s.intensity += (targetI - s.intensity) * (1 - Math.exp(-dt * 8));

    if (t >= 0) {
      if (launch.status === "countdown") st.setLaunchStatus("flight");
      const dts = dt * TIME_SCALE;
      s.simT += dts;
      const mass = Math.max(r.massT * 1000 - r.massFlowKgS * s.simT, r.massT * 250);
      const a = (r.liftoffThrustKN * 1000) / mass - 9.81;
      s.v += Math.max(a, 0) * dts;
      s.y += s.v * dts;
      if (launch.status === "flight" && (s.simT > 60 || s.y > 4000)) st.setLaunchStatus("done");
    }

    rig.lift.position.y = PAD_TOP + s.y;
    const fm = rig.built.flameMaterial;
    fm.uniforms.uTime.value = state.clock.elapsedTime;
    fm.uniforms.uIntensity.value = s.intensity;
    rig.built.flames.forEach((f) => {
      f.visible = s.intensity > 0.01;
      f.scale.set(1, 0.6 + s.intensity * 0.5 + Math.random() * 0.08, 1);
    });

    // Exhaust light + smoke
    const x = ROCKET_X[launch.id];
    const baseY = PAD_TOP + s.y;
    light.current.position.set(x, baseY + 1, 3);
    light.current.intensity = s.intensity * r.diameterM * r.diameterM * 22 * (0.85 + Math.random() * 0.3);
    light.current.distance = r.heightM * 1.6;

    if (s.intensity > 0.05) {
      const D = r.diameterM;
      const size = D * 1.6;
      const n = Math.round(3 + D * 0.9);
      for (let i = 0; i < n; i++) {
        const ang = Math.random() * Math.PI * 2;
        const rr = Math.random() * rig.built.baseRadius;
        smoke.emit(
          x + Math.cos(ang) * rr,
          baseY - rig.built.nozzleRadius * 2,
          Math.sin(ang) * rr,
          Math.cos(ang) * D * 1.5,
          -12 - D * 2 - s.v * 0.2,
          Math.sin(ang) * D * 1.5,
          size,
          2.5 + Math.random() * 2,
        );
      }
      // Ground plume while the rocket is still near the pad
      if (s.y < r.heightM * 1.5) {
        const m = Math.round(n * 1.2 * (1 - s.y / (r.heightM * 1.5)));
        for (let i = 0; i < m; i++) {
          const ang = Math.random() * Math.PI * 2;
          const sp = D * (4 + Math.random() * 6);
          smoke.emit(x, PAD_TOP + 0.4, 0, Math.cos(ang) * sp, Math.random() * D * 0.6, Math.sin(ang) * sp, size * 1.3, 3 + Math.random() * 3);
        }
      }
    }

    if (state.clock.elapsedTime - s.lastTel > 0.08) {
      s.lastTel = state.clock.elapsedTime;
      const mass = t >= 0 ? Math.max(r.massT * 1000 - r.massFlowKgS * s.simT, r.massT * 250) : r.massT * 1000;
      const accel = t >= 0 ? (r.liftoffThrustKN * 1000) / mass - 9.81 : 0;
      st.setTelemetry({
        t: t >= 0 ? s.simT : t,
        altitude: s.y,
        velocity: s.v,
        accelG: accel / 9.81,
        massT: mass / 1000,
      });
    }
  });

  return <pointLight ref={light} color="#ffb070" intensity={0} decay={2} />;
}

/* ============================ CAMERA RIG ============================ */
function CameraRig() {
  const controls = useRef<OrbitControlsImpl>(null!);
  const { camera, size } = useThree();
  const anim = useRef({ active: true, pos: new THREE.Vector3(), target: new THREE.Vector3() });
  const selected = useAtlas((s) => s.selected);
  const view = useAtlas((s) => s.view);
  const launchStatus = useAtlas((s) => s.launch.status);
  const launchId = useAtlas((s) => s.launch.id);
  const prevLift = useRef(0);

  // Compute where the camera should be for the current state
  useEffect(() => {
    const narrow = size.width < 900;
    const a = anim.current;
    if (launchStatus !== "idle" && launchId) {
      const r = ROCKET_BY_ID[launchId];
      const h = r.heightM;
      const x = ROCKET_X[launchId];
      const d = h * 2.3 + 18;
      const side = launchId === "saturn-v" ? 1 : -1; // look from the open side, away from Saturn V
      a.target.set(x - (narrow ? 0 : d * 0.08), h * 0.55, 0);
      a.pos.set(x + side * d * 0.42, h * 0.22, d * 0.92);
      prevLift.current = rigs[launchId]?.lift.position.y ?? PAD_TOP;
    } else if (selected) {
      const r = ROCKET_BY_ID[selected];
      const h = r.heightM;
      const x = ROCKET_X[selected];
      const d = (h * 1.75 + 10) * (narrow ? 1.9 : 1);
      a.target.set(x - (narrow ? 0 : d * 0.16), h * 0.5, 0);
      a.pos.set(a.target.x + d * 0.3, h * 0.62, d * 0.95);
    } else if (view === "compare") {
      const m = narrow ? 1.7 : 1;
      a.target.set(narrow ? 0 : -24, 58, 0);
      a.pos.set(a.target.x + 6, 64, 250 * m);
    } else {
      const m = narrow ? 1.8 : 1;
      a.target.set(narrow ? -2 : -36, 55, 0);
      a.pos.set(a.target.x - 36, 64, 232 * m);
    }
    a.active = true;
  }, [selected, view, launchStatus, launchId, size.width]);

  // On phones the panels sit at the bottom, so lift the rendered view into the top half
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    if (size.width < 900) cam.setViewOffset(size.width, size.height, 0, size.height * 0.24, size.width, size.height);
    else cam.clearViewOffset();
  }, [camera, size.width, size.height]);

  useEffect(() => {
    const c = controls.current;
    const stop = () => {
      // user takes over; keep following during flight
      anim.current.active = false;
    };
    c.addEventListener("start", stop);
    return () => c.removeEventListener("start", stop);
  }, []);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.12);
    const c = controls.current;
    const a = anim.current;
    const st = useAtlas.getState();

    // Follow a climbing rocket
    if (st.launch.status !== "idle" && st.launch.id) {
      const lift = rigs[st.launch.id]?.lift.position.y ?? PAD_TOP;
      const dy = lift - prevLift.current;
      prevLift.current = lift;
      a.pos.y += dy;
      a.target.y += dy;
      if (!a.active) {
        camera.position.y += dy;
        c.target.y += dy;
      }
    }

    if (a.active) {
      const k = 1 - Math.exp(-dt * 2.4);
      camera.position.lerp(a.pos, k);
      c.target.lerp(a.target, k);
      if (camera.position.distanceTo(a.pos) < 0.05 && c.target.distanceTo(a.target) < 0.05 && st.launch.status === "idle")
        a.active = false;
    }
    c.update();
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      enablePan={false}
      minDistance={12}
      maxDistance={520}
      maxPolarAngle={Math.PI * 0.495}
      rotateSpeed={0.6}
      zoomSpeed={0.8}
    />
  );
}

/* ============================== CANVAS ============================== */
export default function Scene() {
  const down = useRef({ x: 0, y: 0 });
  return (
    <div
      className="scene"
      onPointerDown={(e) => (down.current = { x: e.clientX, y: e.clientY })}
      onPointerLeave={() => {
        document.body.style.cursor = "";
      }}
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [-72, 64, 232], fov: 35, near: 0.5, far: 8000 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onCreated={({ gl, camera }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
          camera.lookAt(-36, 55, 0);
        }}
        onPointerMissed={(e) => {
          const moved = Math.hypot(e.clientX - down.current.x, e.clientY - down.current.y);
          if (moved < 6) useAtlas.getState().select(null);
        }}
      >
        <color attach="background" args={["#030405"]} />
        <fog attach="fog" args={["#030405", 420, 1600]} />
        <Suspense fallback={null}>
          <Stars radius={900} depth={400} count={9000} factor={9} saturation={0} fade speed={0.35} />
          <Moon />
          <ambientLight intensity={0.12} />
          <hemisphereLight args={["#9fb4d6", "#0a0a0c", 0.35]} />
          <directionalLight
            position={[90, 170, 110]}
            intensity={2.4}
            color="#fff6ea"
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-camera-left={-70}
            shadow-camera-right={70}
            shadow-camera-top={130}
            shadow-camera-bottom={-30}
            shadow-camera-far={600}
            shadow-bias={-0.0004}
          />
          <directionalLight position={[-140, 70, -150]} intensity={1.3} color="#7ea2ff" />
          <Environment resolution={256} frames={1}>
            <Lightformer form="rect" intensity={1.6} position={[0, 6, -10]} scale={[20, 6, 1]} />
            <Lightformer form="rect" intensity={0.8} color="#9db7ff" position={[-10, 2, 6]} scale={[10, 10, 1]} rotation-y={Math.PI / 2} />
            <Lightformer form="ring" intensity={1.2} color="#ffe2b8" position={[10, 8, 6]} scale={4} rotation-y={-Math.PI / 2} />
          </Environment>
          {/* drei <Html> leaves its first instance empty under React 19 — absorb it with an inert one */}
          <Html position={[0, -1000, 0]} style={{ display: "none" }}>
            <span />
          </Html>
          <Platform />
          {ROCKETS.map((r) => (
            <RocketActor key={r.id} id={r.id} />
          ))}
          <HeightRuler />
          <Smoke />
          <LaunchSystem />
          <CameraRig />
          <EffectComposer multisampling={4}>
            <Bloom mipmapBlur intensity={0.85} luminanceThreshold={0.85} luminanceSmoothing={0.25} />
            <Vignette offset={0.28} darkness={0.62} />
          </EffectComposer>
        </Suspense>
      </Canvas>
    </div>
  );
}
