/* DPX Labs — shared math, noise, glyph table and colour palette. */
(function () {
  'use strict';
  const DPX = (window.DPX = window.DPX || {});

  // ---------------------------------------------------------------- math
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const mix = (a, b, t) => a + (b - a) * t;
  const smoothstep = (a, b, v) => {
    let t = (v - a) / (b - a);
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return t * t * (3 - 2 * t);
  };
  const fract = (v) => v - Math.floor(v);

  // ------------------------------------------------- smooth value noise
  const P = new Uint8Array(512);
  const V = new Float32Array(256);
  (function seed() {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    let s = 20260611;
    for (let i = 255; i > 0; i--) {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      const j = s % (i + 1);
      const tmp = p[i];
      p[i] = p[j];
      p[j] = tmp;
    }
    for (let i = 0; i < 512; i++) P[i] = p[i & 255];
    for (let i = 0; i < 256; i++) V[i] = i / 127.5 - 1;
  })();

  /** Trilinear value noise in [-1, 1]. */
  function noise3(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = x - xi, yf = y - yi, zf = z - zi;
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    const w = zf * zf * (3 - 2 * zf);
    const X = xi & 255, Y = yi & 255, Z = zi & 255;
    const A = P[X] + Y, AA = P[A] + Z, AB = P[A + 1] + Z;
    const B = P[X + 1] + Y, BA = P[B] + Z, BB = P[B + 1] + Z;
    const a0 = V[P[AA]], b0 = V[P[BA]], c0 = V[P[AB]], d0 = V[P[BB]];
    const a1 = V[P[AA + 1]], b1 = V[P[BA + 1]], c1 = V[P[AB + 1]], d1 = V[P[BB + 1]];
    const x00 = a0 + u * (b0 - a0), x10 = c0 + u * (d0 - c0);
    const x01 = a1 + u * (b1 - a1), x11 = c1 + u * (d1 - c1);
    const y0 = x00 + v * (x10 - x00), y1 = x01 + v * (x11 - x01);
    return y0 + w * (y1 - y0);
  }

  /** Three-octave fractal noise, roughly in [-0.8, 0.8]. */
  function fbm3(x, y, z) {
    return (
      (noise3(x, y, z) * 0.5 +
        noise3(x * 2.03 + 17.1, y * 2.03 + 3.7, z * 1.7 + 9.2) * 0.25 +
        noise3(x * 4.07 + 41.3, y * 4.07 + 27.9, z * 2.3 + 1.3) * 0.125) /
      0.875
    );
  }

  /** Divergence-free 2D velocity from a noise stream function. */
  const CURL_E = 0.35;
  function curl2(x, y, z, out) {
    const n1 = noise3(x, y + CURL_E, z), n2 = noise3(x, y - CURL_E, z);
    const n3 = noise3(x + CURL_E, y, z), n4 = noise3(x - CURL_E, y, z);
    out.x = (n1 - n2) / (2 * CURL_E);
    out.y = -(n3 - n4) / (2 * CURL_E);
    return out;
  }

  // ------------------------------------------------------------- glyphs
  const GLYPHS = [' ', '.', '·', ':', '-', '=', '+', '*', '#', '%', '@',
    '/', '\\', '|', '_', '(', ')', '[', ']', '<', '>', '~', '^', 'o', "'", ',', ';', 'x', 'v', 'O'];
  // Every remaining printable ASCII character, so random field glyphs can be drawn.
  for (let c = 33; c <= 126; c++) {
    const ch = String.fromCharCode(c);
    if (GLYPHS.indexOf(ch) < 0) GLYPHS.push(ch);
  }
  const G = {};
  GLYPHS.forEach((c, i) => (G[c] = i));

  /* Field cells (fluid, flame, gas) are written as *virtual* glyph ids
   * FIELD + level (level 1 = faintest … 10 = densest). Just before drawing,
   * resolveGlyphs() swaps each one for a random ASCII character of matching
   * visual weight. Equipment geometry keeps its literal line-art glyphs. */
  const FIELD = 200;
  const LEVELS = 10;
  const BUCKETS = [
    null,
    ".,'`",
    ':;-_~^"',
    '!il|/\\()rcv?',
    '+=<>tjf71{}[]',
    'xzsounaeykLTYJ',
    '*CZVXFPS2345',
    'hdbpqwUOGEKA690',
    '#$&HDRB8',
    'NWMQ%',
    '@',
  ].map((s) => (s ? Array.from(s).map((ch) => G[ch]) : null));

  /** Density ramp: 0 → blank, 1 → densest. Returns a virtual field glyph. */
  function rampGlyph(v) {
    if (v <= 0.05) return 0;
    const l = 1 + Math.floor(v * LEVELS);
    return FIELD + (l > LEVELS ? LEVELS : l);
  }

  /** Field glyph for flowing media; kept as a hook for direction-aware styles. */
  function flowGlyph(u, v, I) {
    return rampGlyph(I);
  }

  let phase = null;
  /** Map virtual field glyphs to random ASCII. Each cell re-rolls roughly once
   *  a second at its own staggered moment, so the matrix shimmers without flicker. */
  function resolveGlyphs(src, dst, t, rate = 0.8) {
    const n = src.length;
    if (!phase || phase.length !== n) {
      phase = new Float32Array(n);
      for (let k = 0; k < n; k++) phase[k] = fract(Math.sin(k * 12.9898) * 43758.5453) * 8;
    }
    for (let k = 0; k < n; k++) {
      const g = src[k];
      if (g < FIELD) { dst[k] = g; continue; }
      const b = BUCKETS[g - FIELD];
      const e = Math.floor(t * rate + phase[k]);
      let h = Math.imul(k ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(e + g * 131, 0xc2b2ae35);
      h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2d); h ^= h >>> 15;
      dst[k] = b[(h >>> 0) % b.length];
    }
    return dst;
  }

  /** Line glyph that follows a direction (physical units, y pointing down). */
  function dirGlyph(u, v) {
    const a = Math.atan2(v, u);
    const aa = Math.abs(a);
    if (aa < 0.42 || aa > Math.PI - 0.42) return G['-'];
    if (aa > 1.18 && aa < Math.PI - 1.18) return G['|'];
    return (a > 0) === (aa < Math.PI / 2) ? G['\\'] : G['/'];
  }

  // ------------------------------------------------------------ palette
  const PALETTE = [];
  const RAMPS = {};
  const hex = (h) => [1, 3, 5].map((o) => parseInt(h.slice(o, o + 2), 16));
  function addRamp(name, stops, n) {
    const cols = stops.map(hex);
    const ids = [];
    for (let i = 0; i < n; i++) {
      const t = (i / (n - 1)) * (cols.length - 1);
      const a = Math.min(cols.length - 2, Math.floor(t));
      const f = t - a;
      const c = cols[a].map((ch, k) => Math.round(mix(ch, cols[a + 1][k], f)));
      ids.push(PALETTE.length);
      PALETTE.push(`rgb(${c[0]},${c[1]},${c[2]})`);
    }
    RAMPS[name] = ids;
  }
  // Tuned for a warm off-white background (#F3F0E9).
  addRamp('ink', ['#DAD4C8', '#A39C90', '#615B52', '#1E1C19'], 14);
  addRamp('cold', ['#D3E7EC', '#9FCDD8', '#68B1C4', '#3D93AD', '#286F8E'], 14);
  addRamp('mist', ['#DCEBEF', '#B4D6DE', '#8EC3CF'], 10);
  addRamp('heat', ['#9C2F1D', '#C9481B', '#DE6F1F', '#E0921F', '#C99419'], 14);
  addRamp('thermal', ['#3A8DAA', '#68B1C4', '#A6CFD8', '#C9BBA2', '#E0A04A', '#D9661F', '#A5361A'], 18);

  function rampColor(name, v) {
    const r = RAMPS[name];
    const i = Math.round(clamp(v, 0, 1) * (r.length - 1));
    return r[i];
  }

  Object.assign(DPX, {
    clamp, mix, smoothstep, fract, noise3, fbm3, curl2,
    GLYPHS, G, FIELD, rampGlyph, flowGlyph, dirGlyph, resolveGlyphs,
    PALETTE, RAMPS, rampColor,
    BACKGROUND: '#F3F0E9',
  });
})();
