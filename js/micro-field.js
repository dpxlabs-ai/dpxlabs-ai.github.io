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

  /* Stateful field programs: { setup(c), step(c, dt, f), still(c), cell(c, x, y, t, out, i, j) }.
   * `c` persists between frames and is rebuilt on resize. */
  const ease = (x) => 1 - Math.pow(1 - clamp(x, 0, 1), 4);
  const rand = (a, b) => a + Math.random() * (b - a);

  // Discrete triplet map on a segment of length L = 3k: three compressed copies,
  // the middle one reversed. Returns the source offset for output offset s.
  const tripletSource = (s, L) => {
    const k = L / 3;
    return s < k ? 3 * s : s < 2 * k ? 2 * L - 3 * s - 1 : 3 * s - 2 * L;
  };
  const triplet = (pre) => {
    const L = pre.length, post = new Float32Array(L);
    for (let s = 0; s < L; s++) post[s] = pre[tripletSource(s, L)];
    return post;
  };

  /* One-Dimensional Turbulence — a line of sight through a dim turbulent field,
   * unrolled below as its temperature profile. Every ~2 s a triplet map (the ODT
   * eddy event) folds a segment of the line: the ramp becomes a cold–hot–cold zigzag,
   * then diffusion softens it. Illustration, not simulation output. */
  const ODT = {
    STRIP: 7, GAP: 3,
    setup(c) {
      const n = c.cols;
      c.fieldR = Math.max(3, c.rows - this.STRIP - this.GAP);
      c.lineJ = Math.round(c.fieldR * 0.55);
      c.s0 = c.rows - this.STRIP;
      c.T0 = new Float32Array(n);
      for (let i = 0; i < n; i++) c.T0[i] = 0.5 + 0.5 * Math.tanh(((i + 0.5) / n - 0.45) / 0.16);
      c.T = c.T0.slice(); c.D = c.T0.slice(); c.tmp = new Float32Array(n);
      c.ev = null; c.clock = 0; c.next = 0.6;
      const fig = c.canvas.closest('.field-figure');
      if (fig) {
        fig.style.setProperty('--odt-line', `${c.offY + (c.lineJ + 0.5) * c.ch}px`);
        fig.style.setProperty('--odt-strip', `${c.offY + c.s0 * c.ch}px`);
        fig.style.setProperty('--odt-top', `${c.offY}px`);
      }
    },
    segment(c, frac, center) {
      const n = c.cols;
      let L = Math.max(12, 3 * Math.round((frac * n) / 3));
      L = Math.min(L, 3 * Math.floor((n - 4) / 3));
      const a = clamp(Math.round(center * n - L / 2), 1, n - 1 - L);
      const pre = c.T.slice(a, a + L);
      return { a, L, t: 0, pre, post: triplet(pre), done: false };
    },
    step(c, dt, f) {
      if (f.reveal < 1) return;
      const { T, T0, D, tmp } = c, n = c.cols;
      c.clock += dt;
      if (!c.ev && c.clock >= c.next) c.ev = this.segment(c, rand(0.18, 0.4), 0.45 + rand(-0.12, 0.12));
      const ev = c.ev;
      const sliding = ev && ev.t >= 0.25 && !ev.done;
      if (!sliding) {
        // explicit diffusion, plus a weak pull back to the mixing layer so it never greys out
        const k = 7 * dt, sub = Math.max(1, Math.ceil(k / 0.4)), kk = k / sub;
        for (let s = 0; s < sub; s++) {
          tmp.set(T);
          for (let i = 1; i < n - 1; i++) T[i] = tmp[i] + kk * (tmp[i - 1] - 2 * tmp[i] + tmp[i + 1]);
        }
        const r = Math.min(1, dt / 12);
        for (let i = 0; i < n; i++) T[i] += (T0[i] - T[i]) * r;
      }
      D.set(T);
      if (ev) {
        ev.t += dt;
        if (!ev.done && ev.t >= 0.25) {
          const e = ease((ev.t - 0.25) / 0.7);
          for (let s = 0; s < ev.L; s++) D[ev.a + s] = ev.pre[s] + (ev.post[s] - ev.pre[s]) * e;
          if (ev.t >= 0.95) { T.set(ev.post, ev.a); D.set(T); ev.done = true; }
        }
        if (ev.t >= 1.8) { c.ev = null; c.next = c.clock + rand(0.2, 0.8); }
      }
    },
    still(c) {
      c.T = c.T0.slice();
      const ev = this.segment(c, 0.3, 0.45);
      c.T.set(ev.post, ev.a);
      c.D = c.T.slice();
      ev.t = 0.6; ev.done = true;
      c.ev = ev;
    },
    cell(c, x, y, t, out, i, j) {
      const ev = c.ev, D = c.D;
      const marks = ev && ev.t < 1.3;
      const edge = marks && (i === ev.a - 1 ? '[' : i === ev.a + ev.L ? ']' : null);
      if (j < c.fieldR) {
        if (j === c.lineJ) {
          if (edge) { out.g = G[edge]; out.c = rampColor('ink', 0.9); return; }
          out.v = 0.85; out.c = rampColor('thermal', D[i]); return;
        }
        if (ev && ev.t > 0.2 && ev.t < 1.15) {
          // the 3D eddy acting on the line: an ink ellipse turning once, kept inside the field
          const R = ev.L / 2, ry = Math.min(R / c.ar, c.fieldR * 0.42);
          const dx = i + 0.5 - (ev.a + R), dyr = j - c.lineJ;
          const q = Math.hypot(dx / R, dyr / ry);
          if (Math.abs(q - 1) * Math.min(R, ry * c.ar) < 0.8) {
            const p = ease((ev.t - 0.25) / 0.7);
            const fade = smoothstep(0.2, 0.35, ev.t) * (1 - smoothstep(0.95, 1.15, ev.t));
            const w = (0.5 + 0.5 * Math.cos(Math.atan2(dyr * c.ar, dx) - p * 2 * Math.PI)) * fade;
            if (w > 0.3) {
              const side = Math.abs(dx) / R;
              out.g = G[side > 0.8 ? (dx < 0 ? '(' : ')') : side < 0.35 ? '-' : (dx < 0) === (dyr < 0) ? '/' : '\\'];
              out.c = rampColor('ink', 0.35 + 0.55 * w);
              return;
            }
          }
        }
        const X = x * c.cols * 0.06, Y = j * 0.15;
        const w = noise3(X * 0.6, Y * 0.8, t * 0.06) * 1.4;
        const v = smoothstep(-0.25, 0.6, fbm3(X - t * 0.22 + w, Y + w * 0.4, t * 0.09));
        if (v < 0.2) { out.v = 0; return; }
        out.v = 0.1 + 0.22 * v; out.c = rampColor('ink', 0.1 + 0.26 * v);
        return;
      }
      if (j < c.s0) {
        if (edge) { out.g = G[':']; out.c = rampColor('ink', 0.55); } else out.v = 0;
        return;
      }
      if (edge) { out.g = G[edge]; out.c = rampColor('ink', 0.85); return; }
      const r = j - c.s0, cr = Math.round((1 - D[i]) * (ODT.STRIP - 1));
      if (r === cr) { out.v = 0.88; out.c = rampColor('thermal', D[i]); return; }
      // faint fill under the curve, so the strip reads as a graph
      if (r > cr) { out.g = G[r === ODT.STRIP - 1 ? '_' : '.']; out.c = rampColor('ink', 0.22); return; }
      out.v = 0;
    },
  };

  /* Conduit — the wiring of the "How we build" diagram. The stage labels are HTML;
   * this canvas sits behind them and carries packets along the spine. About one in
   * five drops out at the trust check, returns through the reference solver (in
   * `cold`) and rejoins before the learned surrogate. Reads stage positions from the
   * DOM, so it works for the horizontal and the stacked (≤640px) layout. */
  const CONDUIT = {
    setup(c) {
      const root = c.canvas.closest('.arch');
      c.ok = false;
      if (!root) return;
      const stages = Array.from(root.querySelectorAll('.arch-stage'));
      if (stages.length < 5) return;
      const box = c.canvas.getBoundingClientRect();
      const col = (px) => clamp(Math.round((px - box.left - c.offX) / c.cw), 0, c.cols - 1);
      const row = (py) => clamp(Math.floor((py - box.top - c.offY) / c.ch), 0, c.rows - 1);
      const mid = (el) => { const r = el.getBoundingClientRect(); return r.top + r.height / 2; };
      c.vertical = window.matchMedia('(max-width: 640px)').matches;
      let main, ret, stops, branchAt, mergeAt;
      if (!c.vertical) {
        const sr = row(mid(stages[0].querySelector('.arch-wire')));
        const rr = row(mid(root.querySelector('.arch-loop')));
        const left = stages.map((s) => col(s.getBoundingClientRect().left));
        const bx = left[4] - 2, mx = left[2] - 2;
        main = [[0, sr], [c.cols - 2, sr]];
        ret = [[bx, sr], [bx, rr], [mx, rr], [mx, sr]];
        stops = left.map((l) => l + 1);
        branchAt = bx; mergeAt = mx;
      } else {
        const tops = stages.map((s) => row(s.getBoundingClientRect().top + 6));
        main = [[1, 0], [1, c.rows - 2]];
        const b = tops[3] + 2, m = tops[2] - 1;
        ret = [[1, b], [4, b], [4, m], [1, m]];
        stops = tops;
        branchAt = b; mergeAt = m;
      }
      c.main = this.raster(main); c.ret = this.raster(ret);
      const idx = (path, v) => path.findIndex((p) => (c.vertical ? p[1] : p[0]) === v);
      c.stops = stops.map((v) => idx(c.main, v)).filter((k) => k > 0);
      c.branch = idx(c.main, branchAt); c.merge = idx(c.main, mergeAt);
      const N = c.cols * c.rows;
      c.base = new Int16Array(N).fill(-1); c.pk = new Int16Array(N).fill(-1); c.pc = new Uint8Array(N);
      const mark = (path) => path.forEach(([i, j], k) => {
        const prev = path[k - 1], next = path[k + 1];
        const turn = prev && next && prev[0] !== next[0] && prev[1] !== next[1];
        const horiz = (prev && prev[1] === j) || (next && next[1] === j);
        c.base[j * c.cols + i] = G[turn ? '+' : horiz ? (i % 2 ? '-' : '·') : ':'];
      });
      mark(c.main); mark(c.ret);
      const [ei, ej] = c.main[c.main.length - 1];
      const ai = c.vertical ? ei : ei + 1, aj = c.vertical ? ej + 1 : ej;
      if (ai < c.cols && aj < c.rows) c.base[aj * c.cols + ai] = G[c.vertical ? 'v' : '>'];
      c.packets = []; c.spawn = 0;
      c.speed = c.vertical ? 6 : 13;
      c.ok = c.branch > 0 && c.merge > 0;
      // Pre-warm: advance the simulation long enough for packets to span the
      // whole line, so the first frame already shows traffic in flight.
      if (c.ok) {
        const warm = c.main.length / c.speed + c.stops.length * 0.3 + 1;
        for (let t = 0; t < warm; t += 1 / 30) this.step(c, 1 / 30);
      }
    },
    raster(pts) {
      const out = [];
      for (let s = 0; s < pts.length - 1; s++) {
        let [i, j] = pts[s]; const [i1, j1] = pts[s + 1];
        const di = Math.sign(i1 - i), dj = Math.sign(j1 - j);
        if (s === 0) out.push([i, j]);
        while (i !== i1 || j !== j1) { i += di; j += dj; out.push([i, j]); }
      }
      return out;
    },
    paint(c) {
      c.pk.fill(-1);
      for (const p of c.packets) {
        const path = p.ret ? c.ret : c.main, h = Math.floor(p.s);
        for (let d = 0; d < 3; d++) {
          const q = path[h - d];
          if (!q) break;
          const k = q[1] * c.cols + q[0];
          c.pk[k] = G[d === 0 ? '#' : '='];
          c.pc[k] = p.cold ? rampColor('cold', 0.85 - 0.2 * d) : rampColor('ink', 0.9 - 0.25 * d);
        }
      }
    },
    step(c, dt) {
      if (!c.ok) return;
      c.spawn -= dt;
      if (c.spawn <= 0) { c.packets.push({ s: 0, ret: false, pause: 0, seen: new Set(), decided: false, cold: false }); c.spawn = c.vertical ? 1.2 : 0.75; }
      for (const p of c.packets) {
        if (p.pause > 0) { p.pause -= dt; continue; }
        const s1 = p.s + c.speed * dt;
        if (p.ret) {
          p.s = s1;
          if (p.s >= c.ret.length - 1) {
            p.ret = false; p.s = c.merge; p.cold = true;
            p.seen.forEach((k) => k > c.merge && p.seen.delete(k));
          }
          continue;
        }
        const stop = c.stops.find((k) => k > p.s && k <= s1 && !p.seen.has(k));
        if (stop !== undefined && (!p.decided || stop !== c.branch)) {
          p.s = stop; p.seen.add(stop); p.pause = 0.3;
        } else p.s = s1;
        if (!p.decided && p.s >= c.branch) {
          p.decided = true;
          if (Math.random() < 0.2) { p.ret = true; p.s = 0; }
        }
      }
      c.packets = c.packets.filter((p) => p.ret || p.s < c.main.length - 1);
      this.paint(c);
    },
    still(c) {
      if (!c.ok) return;
      c.packets = [
        { s: c.stops[0] || 4, ret: false },
        { s: c.stops[2] || 12, ret: false },
        { s: Math.floor(c.ret.length * 0.55), ret: true, cold: true },
        { s: c.main.length - 4, ret: false },
      ];
      this.paint(c);
    },
    cell(c, x, y, t, out, i, j) {
      if (!c.ok) { out.v = 0; return; }
      const k = j * c.cols + i;
      if (c.pk[k] >= 0) { out.g = c.pk[k]; out.c = c.pc[k]; return; }
      if (c.base[k] >= 0) { out.g = c.base[k]; out.c = rampColor('ink', 0.32); return; }
      out.v = 0;
    },
  };

  const PROGRAMS = { odt: ODT, conduit: CONDUIT };

  class MicroField {
    constructor(canvas, opts) {
      this.canvas = canvas;
      this.kind = canvas.dataset.field;
      this.prog = PROGRAMS[this.kind] || { cell: FIELDS[this.kind] };
      this.fontSize = Number(canvas.dataset.font) || 11;
      this.renderer = new DPX.AsciiRenderer(canvas, { fontFamily: opts.fontFamily, background: DPX.BACKGROUND });
      this.reveal = this.kind === 'calm' || this.kind === 'conduit' ? 1 : 0;
      this.frozen = false;
      this.visible = false;
      this.cell = { v: 0, c: 0, g: -1 };
    }

    resize() {
      const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
      if (!w || !h) return false;
      const r = this.renderer;
      const { cols, rows, aspect } = r.resize(w, h, this.fontSize);
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
      this.ctx = {
        cols, rows, ar: aspect, sensors: this.sensors, canvas: this.canvas,
        cw: r.cellW / r.dpr, ch: r.cellH / r.dpr, offX: r.offX / r.dpr, offY: r.offY / r.dpr,
      };
      if (this.prog.setup) this.prog.setup(this.ctx);
      if (this.frozen && this.prog.still) this.prog.still(this.ctx);
      return true;
    }

    step(dt) {
      if (this.ctx && this.prog.step) this.prog.step(this.ctx, dt, this);
    }

    freeze() {
      this.frozen = true;
      if (this.ctx && this.prog.still) this.prog.still(this.ctx);
    }

    draw(t) {
      const { cols, rows, code, color, h, phase, cell, reveal, ctx } = this;
      if (!cols) return;
      const fn = this.prog.cell;
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

    const still = () => fields.forEach((f) => { f.reveal = 1; f.freeze(); f.draw(STILL_T); });

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
        f.step(dt);
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

    motion.addEventListener('change', () => {
      if (motion.matches) { still(); return; }
      fields.forEach((f) => { f.frozen = false; if (f.resize()) f.draw(t); });
      start();
    });
    if (motion.matches) still();
  }

  DPX.MicroField = MicroField;
  DPX.initMicroFields = initMicroFields;
})();
