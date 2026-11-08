/* MicroField — small live ASCII fields for the sections below the hero.
 * Reuses AsciiRenderer and the shared noise/palette. Each field rebuilds out of
 * the quiet `.·:` lattice the first time it scrolls into view (the same idea as
 * the hero's scene transition), runs only while visible, and draws a single
 * static frame when the visitor prefers reduced motion. */
(function () {
  'use strict';
  const DPX = window.DPX;
  const { G, rampColor, noise3, fbm3, clamp, smoothstep, fract } = DPX;

  // Visual-weight buckets, faint → dense (same family as the hero's field glyphs).
  const BUCKETS = [
    ".,'`", ':;-_~^', '!il|/\\()rcv', '+=<>tjf71{}', 'xzsounaeykLTYJ',
    '*CZVXFPS2345', 'hdbpqwUOGEKA690', '#$&HDRB8', 'NWMQ%', '@',
  ].map((s) => Array.from(s).map((c) => G[c]));
  const LATTICE = [G['.'], G['·'], G[':']];

  const hash = (a, b) => {
    let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b, 0xc2b2ae35);
    h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2d); h ^= h >>> 15;
    return h >>> 0;
  };

  /* Field programs. Each returns, per cell, a density v ∈ [0, 1] and a palette id,
   * or a literal glyph for markers. x, y are normalised to [0, 1]. */
  const FIELDS = {
    // Physics Models — a travelling wave packet over a standing mode.
    wave(c, x, y, t, out) {
      const env = 0.55 + 0.45 * Math.sin(Math.PI * x);
      const a = 0.5 + 0.3 * env * Math.sin(2 * Math.PI * (1.6 * x) - 1.5 * t);
      const b = 0.5 + 0.22 * Math.sin(2 * Math.PI * x) * Math.cos(0.9 * t);
      const da = (y - a) * c.rows, db = (y - b) * c.rows;
      const v = Math.max(Math.exp(-(da * da) / 0.55), 0.5 * Math.exp(-(db * db) / 0.35));
      out.v = 0.72 * v;
      out.c = rampColor('ink', 0.3 + 0.65 * v);
    },
    // Simulation — a warped turbulent field advected left → right.
    flow(c, x, y, t, out) {
      const X = x * c.cols * 0.06, Y = y * c.rows * 0.15;
      const w = noise3(X * 0.6, Y * 0.8, t * 0.12) * 1.4;
      const n = fbm3(X - t * 0.45 + w, Y + w * 0.4, t * 0.18);
      const v = smoothstep(-0.25, 0.6, n);
      out.v = 0.78 * v;
      out.c = rampColor('cold', 0.25 + 0.75 * v);
    },
    // Physical Intelligence — sparse sensors; a model front reconstructs the field.
    sense(c, x, y, t, out, i, j) {
      const T = 0.5 + 0.9 * fbm3(x * c.cols * 0.05, y * c.rows * 0.16, t * 0.1);
      for (const s of c.sensors) {
        if (i === s.i && j === s.j) { out.g = G['o']; out.c = rampColor('ink', 0.92); return; }
        if (j === s.j && (i === s.i - 1 || i === s.i + 1)) { out.g = G[i < s.i ? '[' : ']']; out.c = rampColor('ink', 0.6); return; }
      }
      const front = (0.5 - 0.5 * Math.cos(t * 0.32)) * 1.15 - 0.05;
      let seen = smoothstep(front + 0.04, front - 0.04, x);
      for (const s of c.sensors) {
        const dx = (i - s.i) / 3.2, dy = (j - s.j) / 1.4;
        seen = Math.max(seen, Math.exp(-(dx * dx + dy * dy)));
      }
      const v = clamp(T, 0, 1) * seen;
      out.v = v * 0.72;
      out.c = rampColor('thermal', clamp(T, 0, 1));
    },
    // Computing — a regular compute lattice with activity sweeping through it.
    lattice(c, x, y, t, out, i, j) {
      const node = i % 3 === 1 && j % 2 === 0;
      const a = 0.5 + 0.5 * Math.sin(0.42 * i - 0.9 * j - 2.1 * t) * Math.sin(0.11 * i + 0.6 * t);
      if (node) {
        out.g = G[a < 0.35 ? '·' : a < 0.6 ? '+' : a < 0.8 ? 'o' : '#'];
        out.c = a > 0.6 ? rampColor('cold', 0.55 + 0.45 * a) : rampColor('ink', 0.3 + 0.5 * a);
      } else if (j % 2 === 0 && a > 0.68) {
        out.g = G['-']; out.c = rampColor('ink', 0.3 + 0.4 * a);
      } else {
        out.v = 0;
      }
    },
    // Closing band — the breathing lattice the hero dissolves into.
    calm(c, x, y, t, out, i, j) {
      const n = noise3(i * 0.18, j * 0.32, t * 0.5);
      out.g = n > 0.38 ? G[':'] : n > -0.1 ? G['·'] : G['.'];
      out.c = rampColor('ink', 0.1 + 0.28 * (n + 1) * 0.5);
    },
  };

  class MicroField {
    constructor(canvas, opts) {
      this.canvas = canvas;
      this.kind = canvas.dataset.field;
      this.fn = FIELDS[this.kind];
      this.fontSize = Number(canvas.dataset.font) || 11;
      this.renderer = new DPX.AsciiRenderer(canvas, { fontFamily: opts.fontFamily, background: DPX.BACKGROUND });
      this.reveal = this.kind === 'calm' ? 1 : 0;
      this.visible = false;
      this.cell = { v: 0, c: 0, g: -1 };
    }

    resize() {
      const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
      if (!w || !h) return false;
      const { cols, rows } = this.renderer.resize(w, h, this.fontSize);
      this.cols = cols; this.rows = rows;
      this.code = new Uint8Array(cols * rows);
      this.color = new Uint8Array(cols * rows);
      this.h = new Float32Array(cols * rows);
      this.phase = new Float32Array(cols * rows);
      let lo = Infinity, hi = -Infinity;
      for (let j = 0, k = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++, k++) {
          const v = 0.6 * fbm3(i * 0.08 + 3.1, j * 0.2, 1.7) + 0.4 * (i / cols);
          this.h[k] = v; if (v < lo) lo = v; if (v > hi) hi = v;
          this.phase[k] = fract(Math.sin(k * 12.9898) * 43758.5453) * 8;
        }
      }
      for (let k = 0; k < this.h.length; k++) this.h[k] = (this.h[k] - lo) / (hi - lo || 1);
      const n = Math.max(3, Math.round(cols / 11));
      this.sensors = [];
      for (let s = 0; s < n; s++) {
        const i = Math.round(((s + 0.5) / n) * cols + (hash(s, 7) % 5) - 2);
        const j = 1 + (hash(s, 3) % Math.max(1, rows - 2));
        this.sensors.push({ i: clamp(i, 1, cols - 2), j });
      }
      return true;
    }

    draw(t) {
      const { cols, rows, code, color, h, phase, cell, fn, reveal } = this;
      if (!cols) return;
      const ctx = { cols, rows, sensors: this.sensors };
      for (let j = 0, k = 0; j < rows; j++) {
        const y = (j + 0.5) / rows;
        for (let i = 0; i < cols; i++, k++) {
          const edge = reveal - h[k] * 0.85;
          if (edge < 0) {
            const n = noise3(i * 0.18, j * 0.32, t * 0.5);
            code[k] = LATTICE[n > 0.38 ? 2 : n > -0.1 ? 1 : 0];
            color[k] = rampColor('ink', 0.1 + 0.2 * (n + 1) * 0.5);
            continue;
          }
          cell.g = -1; cell.v = 0;
          fn(ctx, (i + 0.5) / cols, y, t, cell, i, j);
          if (edge < 0.05 && (cell.g >= 0 || cell.v > 0.05)) { code[k] = G['+']; color[k] = cell.c; continue; }
          if (cell.g >= 0) { code[k] = cell.g; color[k] = cell.c; continue; }
          if (cell.v <= 0.06) { code[k] = 0; continue; }
          const b = BUCKETS[Math.min(9, Math.floor(cell.v * 10))];
          code[k] = b[hash(k, Math.floor(t * 0.8 + phase[k])) % b.length];
          color[k] = cell.c;
        }
      }
      this.renderer.draw(code, color);
    }
  }

  function initMicroFields(opts = {}) {
    const canvases = Array.from(document.querySelectorAll('canvas[data-field]'));
    if (!canvases.length) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const fields = canvases.map((c) => new MicroField(c, opts));
    const STILL_T = 7.3;
    let t = 0, last = performance.now(), running = false;

    const still = () => fields.forEach((f) => { f.reveal = 1; f.draw(STILL_T); });

    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { const f = fields[canvases.indexOf(e.target)]; f.visible = e.isIntersecting; });
      if (!motion.matches) start();
    }, { rootMargin: '0px 0px -12% 0px' });

    const ro = new ResizeObserver((es) => {
      es.forEach((e) => {
        const f = fields[canvases.indexOf(e.target)];
        if (f.resize()) f.draw(motion.matches ? STILL_T : t);
      });
    });

    canvases.forEach((c) => { io.observe(c); ro.observe(c); });

    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (motion.matches) { running = false; still(); return; }
      if (document.hidden) { requestAnimationFrame(frame); return; }
      t += dt;
      let any = false;
      for (const f of fields) {
        if (!f.visible) continue;
        any = true;
        if (f.reveal < 1) f.reveal = Math.min(1, f.reveal + dt / 1.6);
        f.draw(t);
      }
      if (any) requestAnimationFrame(frame); else running = false;
    }
    function start() {
      if (running) return;
      running = true;
      last = performance.now();
      requestAnimationFrame(frame);
    }

    motion.addEventListener('change', () => (motion.matches ? still() : start()));
    if (motion.matches) still();
  }

  DPX.MicroField = MicroField;
  DPX.initMicroFields = initMicroFields;
})();
