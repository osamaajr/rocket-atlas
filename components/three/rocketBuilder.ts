import * as THREE from "three";
import type { RocketId } from "@/lib/rockets";

/* ------------------------------------------------------------------ *
 * Procedural, true-scale rocket models.                               *
 * Each rocket is a lathe-turned hull with a hand-painted canvas       *
 * livery mapped by real height, plus fins, engine bells, towers and   *
 * flame meshes for the launch simulator.                              *
 * ------------------------------------------------------------------ */

export interface BuiltRocket {
  root: THREE.Group; // positioned so the lowest point sits at y = 0, height = real height
  materials: THREE.Material[];
  flames: THREE.Mesh[];
  flameMaterial: THREE.ShaderMaterial;
  nozzleRadius: number; // world units
  baseRadius: number; // world units
}

const WHITE = "#ecebe6";
const BLACK = "#121315";
const RED = "#b23a2e";

type Painter = {
  ctx: CanvasRenderingContext2D;
  W: number;
  Hc: number;
  H: number;
  band: (y0: number, y1: number, color: string) => void;
  quads: (y0: number, y1: number, color: string, offset?: number) => void;
  vText: (text: string, u: number, yTop: number, letterH: number, radius: number, color: string, gap?: number) => void;
  flag: (u: number, y0: number, y1: number, radius: number) => void;
  lines: (y0: number, y1: number, every: number, alpha?: number) => void;
  vLines: (y0: number, y1: number, count: number, color: string, width?: number) => void;
};

function makePainter(H: number, Hc: number, base: string): { painter: Painter; texture: THREE.CanvasTexture } {
  const W = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = Hc;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, Hc);

  // subtle grain so surfaces don't look plastic
  const img = ctx.getImageData(0, 0, W, Hc);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 7;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);

  const py = (y: number) => (1 - y / H) * Hc;
  const painter: Painter = {
    ctx,
    W,
    Hc,
    H,
    band(y0, y1, color) {
      ctx.fillStyle = color;
      ctx.fillRect(0, py(y1), W, py(y0) - py(y1));
    },
    quads(y0, y1, color, offset = 0) {
      ctx.fillStyle = color;
      for (let k = 0; k < 4; k++) {
        if ((k + offset) % 2 === 0) ctx.fillRect((k / 4) * W, py(y1), W / 4 + 1, py(y0) - py(y1));
      }
    },
    vText(text, u, yTop, letterH, radius, color, gap = 0.25) {
      // letters stacked vertically, corrected for the texture's anisotropic mapping
      const pxPerMx = W / (2 * Math.PI * radius);
      const pxPerMy = Hc / H;
      ctx.save();
      ctx.fillStyle = color;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const fontPx = letterH * pxPerMx;
      ctx.font = `800 ${fontPx}px "Helvetica Neue", Arial, sans-serif`;
      let y = yTop;
      for (const ch of text) {
        if (ch === " ") {
          y -= letterH * 0.7;
          continue;
        }
        for (const off of [-W, 0, W]) {
          ctx.save();
          ctx.translate(u * W + off, py(y));
          ctx.scale(1, pxPerMy / pxPerMx);
          ctx.fillText(ch, 0, 0);
          ctx.restore();
        }
        y -= letterH * (1 + gap);
      }
      ctx.restore();
    },
    flag(u, y0, y1, radius) {
      // vertical US flag (stripes run vertically when hung on a rocket)
      const pxPerMx = W / (2 * Math.PI * radius);
      const h = y1 - y0;
      const wM = h * 0.53;
      const xc = u * W - (wM * pxPerMx) / 2;
      const wPx = wM * pxPerMx;
      const top = py(y1);
      const hPx = py(y0) - py(y1);
      for (const x0 of [xc - W, xc, xc + W]) {
        for (let s = 0; s < 13; s++) {
          ctx.fillStyle = s % 2 === 0 ? RED : "#f3f1ea";
          ctx.fillRect(x0 + (s / 13) * wPx, top, wPx / 13 + 0.5, hPx);
        }
        ctx.fillStyle = "#1f2f5a";
        ctx.fillRect(x0, top, wPx * (7 / 13), hPx * 0.4);
      }
    },
    lines(y0, y1, every, alpha = 0.08) {
      ctx.fillStyle = `rgba(0,0,0,${alpha})`;
      for (let y = y0; y <= y1; y += every) ctx.fillRect(0, py(y), W, Math.max(1, Hc / 2048));
    },
    vLines(y0, y1, count, color, width = 2) {
      ctx.fillStyle = color;
      for (let k = 0; k < count; k++) ctx.fillRect((k / count) * W, py(y1), width, py(y0) - py(y1));
    },
  };

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.wrapS = THREE.RepeatWrapping;
  return { painter, texture };
}

/** Lathe a radius/height profile; UVs: u = angle, v = height / H (so the livery maps to real metres). */
function lathe(profile: [number, number][], H: number, material: THREE.Material, segments = 72) {
  const pts = profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.001), y));
  const geo = new THREE.LatheGeometry(pts, segments);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setY(i, pos.getY(i) / H);
  uv.needsUpdate = true;
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function bell(throatR: number, exitR: number, length: number, mat: THREE.Material) {
  const pts: THREE.Vector2[] = [];
  pts.push(new THREE.Vector2(throatR * 1.5, 0.12 * length));
  pts.push(new THREE.Vector2(throatR * 1.25, 0));
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    const r = throatR + (exitR - throatR) * Math.pow(t, 0.62);
    pts.push(new THREE.Vector2(r, -t * length));
  }
  const geo = new THREE.LatheGeometry(pts, 40);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  return m;
}

function strut(a: THREE.Vector3, b: THREE.Vector3, r: number, mat: THREE.Material) {
  const len = a.distanceTo(b);
  const geo = new THREE.CylinderGeometry(r, r, len, 6);
  const m = new THREE.Mesh(geo, mat);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  m.castShadow = true;
  return m;
}

function truss(y0: number, y1: number, r0: number, r1: number, legs: number, rod: number, mat: THREE.Material) {
  const g = new THREE.Group();
  const at = (k: number, y: number, r: number) => {
    const a = (k / legs) * Math.PI * 2 + Math.PI / legs;
    return new THREE.Vector3(Math.sin(a) * r, y, Math.cos(a) * r);
  };
  for (let k = 0; k < legs; k++) {
    g.add(strut(at(k, y0, r0), at(k, y1, r1), rod, mat));
    const ym = (y0 + y1) / 2;
    const rm = (r0 + r1) / 2;
    g.add(strut(at(k, y0, r0), at(k + 1, ym, rm), rod * 0.7, mat));
    g.add(strut(at(k + 1, ym, rm), at(k, y1, r1), rod * 0.7, mat));
  }
  return g;
}

function fin(points: [number, number][], thickness: number, mat: THREE.Material) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (const [x, y] of points.slice(1)) shape.lineTo(x, y);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false });
  geo.translate(0, 0, -thickness / 2);
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  return m;
}

function std(color: string, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.1, ...opts });
}

function flameMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
    uniforms: { uTime: { value: 0 }, uIntensity: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      uniform float uTime;
      uniform float uIntensity;
      void main() {
        vUv = uv;
        vec3 p = position;
        float wob = sin(uTime * 38.0 + p.y * 3.0) * 0.04 + sin(uTime * 57.0) * 0.03;
        p.xz *= 1.0 + wob * (1.0 - uv.y);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      uniform float uTime;
      uniform float uIntensity;
      void main() {
        float along = clamp(vUv.y, 0.0, 1.0); // 1 at nozzle, 0 at tail
        float flick = 0.85 + 0.15 * sin(uTime * 61.0 + vUv.x * 40.0);
        vec3 hot = vec3(1.6, 1.45, 1.2);
        vec3 mid = vec3(1.9, 0.85, 0.28);
        vec3 tail = vec3(0.9, 0.25, 0.08);
        vec3 col = mix(tail, mid, smoothstep(0.0, 0.55, along));
        col = mix(col, hot, smoothstep(0.7, 1.0, along));
        float a = pow(max(along, 1e-4), 1.4) * clamp(flick, 0.0, 1.0) * clamp(uIntensity, 0.0, 1.0);
        // mach diamond hints
        a *= 0.8 + 0.2 * smoothstep(0.4, 1.0, sin(along * 34.0));
        a = clamp(a, 0.0, 1.0);
        if (a < 0.002) discard;
        gl_FragColor = vec4(min(col * a * 1.6, vec3(4.0)), a);
      }`,
  });
}

function addFlames(group: THREE.Group, nozzles: { x: number; y: number; z: number; r: number }[], mat: THREE.ShaderMaterial) {
  const flames: THREE.Mesh[] = [];
  for (const n of nozzles) {
    const len = n.r * 9;
    const geo = new THREE.CylinderGeometry(n.r * 0.92, n.r * 0.25, len, 24, 1, true);
    geo.translate(0, -len / 2, 0);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(n.x, n.y, n.z);
    m.visible = false;
    m.renderOrder = 10;
    group.add(m);
    flames.push(m);
  }
  return flames;
}

function finish(inner: THREE.Group, realHeight: number, nozzles: { x: number; y: number; z: number; r: number }[], baseR: number): BuiltRocket {
  const box = new THREE.Box3().setFromObject(inner);
  const s = realHeight / (box.max.y - box.min.y);
  inner.scale.setScalar(s);
  inner.position.y = -box.min.y * s;

  const fm = flameMaterial();
  const flames = addFlames(inner, nozzles, fm);

  const materials: THREE.Material[] = [];
  inner.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh && mesh.material instanceof THREE.MeshStandardMaterial && !materials.includes(mesh.material)) {
      mesh.material.userData.base = mesh.material.color.clone();
      materials.push(mesh.material);
    }
  });
  const root = new THREE.Group();
  root.add(inner);
  return { root, materials, flames, flameMaterial: fm, nozzleRadius: nozzles[0].r * s, baseRadius: baseR * s };
}

/* ============================ SATURN V ============================ */
function buildSaturnV(): BuiltRocket {
  const R = 5.05;
  const H = 100.4;
  const { painter: p, texture } = makePainter(H, 4096, WHITE);

  // S-IC
  p.band(0, 4.5, BLACK);
  p.quads(4.5, 13, BLACK);
  p.quads(21.5, 26.5, BLACK, 1);
  p.quads(38.5, 42, BLACK);
  p.vText("UNITED STATES", 0.0, 34.2, 2.15, R, BLACK, 0.1);
  p.flag(0.0, 35.5, 40.5, R);
  p.lines(0, 42, 3.2);
  // S-II
  p.lines(42, 66.8, 2.8);
  p.band(47.3, 47.6, "rgba(0,0,0,0.35)");
  p.vText("USA", 0.5, 63, 2.2, R, RED, 0.15);
  p.band(42, 42.25, "rgba(0,0,0,0.5)");
  // S-IVB
  p.quads(71.5, 76.5, BLACK, 1);
  p.lines(71.5, 84.7, 2.4);
  // Instrument unit
  p.band(84.7, 85.6, "#9b9c9a");
  // SLA panels
  p.lines(85.6, 94.1, 2.1, 0.12);
  p.vLines(85.6, 94.1, 4, "rgba(0,0,0,0.18)", 2);
  // Service module (radiator panels) + boost cover
  p.band(94.1, 97.2, "#d5d6d3");
  p.vLines(94.1, 97.2, 24, "rgba(0,0,0,0.12)", 6);

  const hull = std("#ffffff", { map: texture, roughness: 0.48 });
  const dark = std("#2a2b2e", { metalness: 0.75, roughness: 0.38, side: THREE.DoubleSide });
  const grey = std("#c9cac6", { roughness: 0.5 });
  const g = new THREE.Group();

  g.add(
    lathe(
      [
        [0, 0],
        [R, 0],
        [R, 66.8],
        [3.3, 71.5],
        [3.3, 85.6],
        [1.95, 94.1],
        [1.95, 97.2],
        [0.48, 100.2],
        [0.25, 100.4],
        [0, 100.4],
      ],
      H,
      hull,
      96,
    ),
  );
  // seam rings
  for (const y of [42, 47.5, 66.8]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R + 0.02, 0.09, 6, 96), grey);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    g.add(ring);
  }

  // Engine fairings + fins at 45°
  const nozzles: { x: number; y: number; z: number; r: number }[] = [];
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2;
    const arm = new THREE.Group();
    arm.rotation.y = a;
    const fairing = new THREE.Mesh(new THREE.ConeGeometry(1.55, 9.5, 28), hull.clone());
    (fairing.material as THREE.MeshStandardMaterial).map = null;
    (fairing.material as THREE.MeshStandardMaterial).color.set(WHITE);
    fairing.position.set(0, 3.9, R - 0.35);
    fairing.castShadow = true;
    arm.add(fairing);
    const f = fin(
      [
        [0, 0.6],
        [2.9, -0.4],
        [2.9, 2.0],
        [0, 7.6],
      ],
      0.32,
      std(BLACK, { roughness: 0.6 }),
    );
    f.rotation.y = -Math.PI / 2;
    f.position.set(0, 0, R + 0.4);
    arm.add(f);
    g.add(arm);
  }
  // Five F-1 engines
  const f1 = [
    [0, 0],
    ...[0, 1, 2, 3].map((k) => {
      const a = Math.PI / 4 + (k * Math.PI) / 2;
      return [Math.sin(a) * 3.55, Math.cos(a) * 3.55];
    }),
  ];
  for (const [x, z] of f1) {
    const b = bell(0.5, 1.85, 5.8, dark);
    b.position.set(x, 0, z);
    g.add(b);
    nozzles.push({ x, y: -5.8, z, r: 1.75 });
  }

  // Launch escape system
  const les = std("#e4e3de", { roughness: 0.45 });
  g.add(truss(100.3, 103.4, 0.62, 0.26, 4, 0.06, std("#cfcfcb", { metalness: 0.4 })));
  g.add(
    lathe(
      [
        [0, 103.3],
        [0.42, 103.3],
        [0.33, 103.9],
        [0.33, 108.6],
        [0.2, 109.6],
        [0.1, 110.0],
        [0, 110.25],
      ],
      H,
      les,
      32,
    ),
  );
  return finish(g, 110.6, nozzles, R);
}

/* ========================= GEMINI-TITAN II ========================= */
function buildGeminiTitan(): BuiltRocket {
  const R = 1.525;
  const H = 33.2;
  const { painter: p, texture } = makePainter(H, 2048, "#e3e5e6");
  p.band(0, 1.1, "#3a3c3f");
  p.lines(0, 27.4, 1.6, 0.06);
  p.vText("UNITED STATES", 0.0, 16.6, 0.9, R, BLACK, 0.12);
  p.flag(0.0, 17.4, 19.0, R);
  // interstage truss region (open "fire-in-the-hole" structure)
  p.band(19.5, 20.6, "#1d1e21");
  p.vLines(19.5, 20.6, 24, "#6d6f72", 10);
  p.band(26.9, 27.4, "#2b2c2f");
  // Gemini adapter (white), re-entry module (black, corrugated)
  p.band(27.4, 29.7, "#f1f0eb");
  p.lines(27.4, 29.7, 0.45, 0.12);
  p.band(29.7, 33.2, "#141517");
  p.vLines(29.7, 33.2, 48, "rgba(255,255,255,0.07)", 4);

  const hull = std("#ffffff", { map: texture, roughness: 0.45, metalness: 0.15 });
  const dark = std("#2d2e31", { metalness: 0.75, roughness: 0.38, side: THREE.DoubleSide });
  const g = new THREE.Group();
  g.add(
    lathe(
      [
        [0, 0],
        [R, 0],
        [R, 27.4],
        [1.16, 29.7],
        [1.12, 29.75],
        [0.5, 32.4],
        [0.5, 32.95],
        [0.36, 33.2],
        [0, 33.2],
      ],
      H,
      hull,
      72,
    ),
  );
  const nozzles: { x: number; y: number; z: number; r: number }[] = [];
  for (const x of [-0.72, 0.72]) {
    const b = bell(0.24, 0.66, 2.1, dark);
    b.position.set(x, 0, 0);
    g.add(b);
    nozzles.push({ x, y: -2.1, z: 0, r: 0.62 });
  }
  return finish(g, 33.2, nozzles, R);
}

/* ========================= MERCURY-REDSTONE ======================== */
function buildMercuryRedstone(): BuiltRocket {
  const R = 0.89;
  const H = 22.1;
  const { painter: p, texture } = makePainter(H, 2048, WHITE);
  p.quads(0, 3.4, BLACK);
  p.quads(14.6, 17.6, BLACK, 1);
  p.lines(0, 17.6, 1.2, 0.06);
  p.vText("UNITED STATES", 0.0, 13.3, 0.62, R, BLACK, 0.12);
  p.flag(0.0, 13.6, 14.3, R);
  p.band(17.6, 18.6, "#b8b9b6"); // adapter
  p.band(18.6, 18.75, "#5b4636"); // heat shield edge
  p.band(18.75, 22.1, "#16171a"); // capsule
  p.vLines(18.75, 20.75, 40, "rgba(255,255,255,0.08)", 6);

  const hull = std("#ffffff", { map: texture, roughness: 0.48 });
  const dark = std("#2d2e31", { metalness: 0.7, roughness: 0.4, side: THREE.DoubleSide });
  const g = new THREE.Group();
  g.add(
    lathe(
      [
        [0, 0],
        [R, 0],
        [R, 17.6],
        [0.95, 18.6],
        [0.97, 18.68],
        [0.95, 18.75],
        [0.4, 20.75],
        [0.4, 21.6],
        [0.32, 21.62],
        [0.32, 22.05],
        [0, 22.1],
      ],
      H,
      hull,
      64,
    ),
  );
  for (let k = 0; k < 4; k++) {
    const arm = new THREE.Group();
    arm.rotation.y = Math.PI / 4 + (k * Math.PI) / 2;
    const f = fin(
      [
        [0, 0.25],
        [0.85, -0.25],
        [0.85, 0.55],
        [0, 1.9],
      ],
      0.08,
      std(BLACK, { roughness: 0.6 }),
    );
    f.rotation.y = -Math.PI / 2;
    f.position.set(0, 0, R);
    arm.add(f);
    g.add(arm);
  }
  const b = bell(0.24, 0.46, 1.05, dark);
  g.add(b);
  const nozzles = [{ x: 0, y: -1.05, z: 0, r: 0.44 }];

  // Bright red-orange escape tower
  const red = std("#c7472c", { roughness: 0.5 });
  g.add(truss(22.0, 24.1, 0.34, 0.14, 3, 0.03, red));
  g.add(
    lathe(
      [
        [0, 24.05],
        [0.21, 24.05],
        [0.16, 24.3],
        [0.16, 25.0],
        [0.1, 25.25],
        [0, 25.45],
      ],
      H,
      red,
      24,
    ),
  );
  return finish(g, 25.4, nozzles, R);
}

export function buildRocket(id: RocketId): BuiltRocket {
  switch (id) {
    case "saturn-v":
      return buildSaturnV();
    case "gemini-titan":
      return buildGeminiTitan();
    case "mercury-redstone":
      return buildMercuryRedstone();
  }
}
