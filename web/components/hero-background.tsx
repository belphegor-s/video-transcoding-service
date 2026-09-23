"use client";

import { useEffect, useRef, useState } from "react";

/*
 * "Signal topography" — a hand-written WebGL2 field of contour lines traced
 * over domain-warped simplex noise. No shader library, no runtime deps.
 * Noise: webgl-noise by Ashima Arts & Stefan Gustavson (MIT).
 */

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `#version 300 es
precision highp float;

uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uMouseAmt;

out vec4 outColor;

// ---- webgl-noise: 3D simplex noise (c) Ashima Arts & Stefan Gustavson, MIT ----
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 10.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.5 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 105.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
// ------------------------------------------------------------------------------

float fbm(vec3 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    s += a * snoise(p);
    p = p * 1.9 + vec3(1.7, -3.1, 0.0);
    a *= 0.42;
  }
  return s;
}

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

const vec3 BG = vec3(0.043, 0.043, 0.047);      // #0b0b0c
const vec3 ACCENT = vec3(0.804, 0.984, 0.275);  // #cdfb46
const vec3 COOL = vec3(0.30, 0.86, 0.72);       // teal undertone for depth

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float t = uTime * 0.035;

  // pointer lens: gently bends the terrain toward the cursor
  vec2 m = (uMouse - 0.5 * uRes) / uRes.y;
  vec2 dm = uv - m;
  float lens = exp(-4.0 * dot(dm, dm)) * uMouseAmt;

  // two-stage domain warp (Quilez-style) for slow, liquid motion
  vec2 p = uv * vec2(0.42, 0.62) + vec2(0.2, 0.0);
  vec2 q = vec2(fbm(vec3(p, t)), fbm(vec3(p + vec2(5.2, 1.3), t)));
  vec2 r = vec2(fbm(vec3(p + 1.1 * q + vec2(1.7, 9.2), t * 1.3)),
                fbm(vec3(p + 1.1 * q + vec2(8.3, 2.8), t * 1.3)));
  vec3 fp = vec3(p + 0.9 * r - dm * lens * 0.35, t * 0.8);
  float f = snoise(fp) * 0.75 + snoise(fp * 1.8 + 4.0) * 0.18;

  // contour lines, analytically anti-aliased
  float v = f * 11.0 + 20.0;
  float w = fwidth(v);
  float d = abs(fract(v - 0.5) - 0.5);
  float fine = 1.0 - smoothstep(w * 0.2, w * 1.1, d);
  float majorIdx = step(mod(floor(v + 0.5), 5.0), 0.5);
  float major = (1.0 - smoothstep(w * 0.6, w * 2.2, d)) * majorIdx;

  // soft glow pooling in the "valleys"
  float glow = smoothstep(-0.15, 0.55, f) * 0.5 + length(r) * 0.25;

  // composition: stronger on the right, quiet behind the headline
  float side = smoothstep(-0.55, 0.75, uv.x);
  float vign = 1.0 - smoothstep(0.35, 1.25, length(uv * vec2(0.8, 1.1) - vec2(0.35, 0.05)));
  float mask = side * vign;

  vec3 tint = mix(COOL, ACCENT, smoothstep(-0.3, 0.45, f + q.x * 0.35));
  vec3 col = BG;
  col += tint * glow * 0.12 * mask;
  col += tint * fine * 0.17 * mask;
  col += ACCENT * major * 0.5 * mask;
  col += ACCENT * lens * fine * 0.28;

  // blue-noise-ish dither to kill banding in the gradients
  col += (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) / 255.0;

  outColor = vec4(col, 1.0);
}
`;

export function HeroBackground() {
  const [webgl, setWebgl] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setWebgl(!!document.createElement("canvas").getContext("webgl2"));
    } catch {
      setWebgl(false);
    }
  }, []);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {webgl === null ? null : webgl ? <ShaderField /> : <StaticField />}

      <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/60 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-bg via-bg/80 to-transparent sm:h-40" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-bg" />
    </div>
  );
}

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(log ?? "shader compile failed");
  }
  return shader;
}

function ShaderField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, powerPreference: "low-power" });
    if (!gl) {
      setFailed(true);
      return;
    }

    let program: WebGLProgram;
    try {
      program = gl.createProgram()!;
      gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "link failed");
    } catch (err) {
      console.warn("[hero] shader unavailable:", err);
      setFailed(true);
      return;
    }
    gl.useProgram(program);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, "uRes");
    const uTime = gl.getUniformLocation(program, "uTime");
    const uMouse = gl.getUniformLocation(program, "uMouse");
    const uMouseAmt = gl.getUniformLocation(program, "uMouseAmt");

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(pointer: fine)").matches;

    // cap backing store so 4K / high-DPR screens stay cheap
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      const scale = Math.min(dpr, Math.sqrt(2_400_000 / Math.max(1, rect.width * rect.height)));
      canvas.width = Math.max(1, Math.round(rect.width * scale));
      canvas.height = Math.max(1, Math.round(rect.height * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      if (!running) draw(performance.now());
    };

    // pointer is eased so the lens drifts rather than snaps
    const target = { x: 0, y: 0, amt: 0 };
    const mouse = { x: 0, y: 0, amt: 0 };
    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const sx = canvas.width / rect.width;
      target.x = (e.clientX - rect.left) * sx;
      target.y = (rect.bottom - e.clientY) * sx;
      target.amt = e.clientY >= rect.top && e.clientY <= rect.bottom ? 1 : 0;
    };
    const onLeave = () => (target.amt = 0);

    const start = performance.now() - 40_000; // skip the symmetric t≈0 frame
    let raf = 0;
    let running = false;
    let visible = true;

    const draw = (now: number) => {
      mouse.x += (target.x - mouse.x) * 0.06;
      mouse.y += (target.y - mouse.y) * 0.06;
      mouse.amt += (target.amt - mouse.amt) * 0.04;
      gl.uniform1f(uTime, reduceMotion ? 40 : (now - start) / 1000);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.uniform1f(uMouseAmt, mouse.amt);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const loop = (now: number) => {
      draw(now);
      raf = requestAnimationFrame(loop);
    };
    const sync = () => {
      const shouldRun = !reduceMotion && visible && !document.hidden;
      if (shouldRun && !running) {
        running = true;
        raf = requestAnimationFrame(loop);
      } else if (!shouldRun && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    io.observe(canvas);
    document.addEventListener("visibilitychange", sync);
    if (finePointer && !reduceMotion) {
      window.addEventListener("pointermove", onMove, { passive: true });
      document.documentElement.addEventListener("pointerleave", onLeave);
    }

    resize();
    draw(performance.now());
    setReady(true);
    sync();

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      gl.deleteBuffer(buf);
      gl.deleteProgram(program);
    };
  }, []);

  if (failed) return <StaticField />;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full transition-opacity duration-[1600ms] ease-out"
      style={{ opacity: ready ? 1 : 0 }}
    />
  );
}

function StaticField() {
  return (
    <div
      className="absolute right-[-10%] top-[-10%] h-[560px] w-[820px] max-w-[120vw] rounded-full opacity-60 blur-[120px]"
      style={{
        background:
          "radial-gradient(closest-side, rgba(205,251,70,0.16), rgba(77,219,184,0.05) 60%, transparent)",
      }}
    />
  );
}
