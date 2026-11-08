/* NuclearLoopScene — pressurised-water reactor primary loop.
 * Coolant flows down the vessel downcomer, up through the fuel rods (with a
 * Cherenkov-blue glow whose strength follows reactor power), out the hot leg
 * into the steam generator's U-tubes, and back through the cold leg and
 * reactor coolant pump. On the secondary side, water boils around the tubes
 * and steam leaves for the turbine. Control rods move with power demand;
 * hovering withdraws them and the whole loop runs hotter. */
(function () {
  'use strict';
  const { PhysicsScene, G, rampColor, rampGlyph, dirGlyph, noise3, clamp } = window.DPX;
  const DOWN = 1, LOWER = 2, CORE = 3, UPPER = 4, PIPE = 5, HOTHEAD = 6, COLDHEAD = 7, TUBE = 8, WATER = 9, STEAM = 10;

  class NuclearLoopScene extends PhysicsScene {
    constructor(opts = {}) {
      super('nuclear', 'NUCLEAR', 'A pressurised-water reactor loop: glowing core, steam generator, coolant pump and steam to the turbine.');
      this.opts = Object.assign({}, opts);
    }

    setup() {
      const { cols: C, rows: R, ar, N } = this;
      const ink = (v) => rampColor('ink', v);
      const kind = (this.kind = new Uint8Array(N));
      const sArr = (this.s = new Float32Array(N));
      const pid = (this.pid = new Int8Array(N).fill(-1));
      const K = (i, j) => (i < 0 || j < 0 || i >= C || j >= R ? -1 : j * C + i);
      const geo = (i, j, ch, v) => { const k = this.setGeo(i, j, G[ch], ink(v)); if (k >= 0) kind[k] = 0; };
      const fluid = (i, j, kd, s = 0, p = -1) => {
        const k = K(i, j); if (k < 0) return;
        this.geoG[k] = 0; kind[k] = kd; sArr[k] = s; pid[k] = p;
      };

      // Capsule vessel (straight sides, elliptical heads) drawn with tangent glyphs.
      const capsule = (i0, i1, j0, j1, hd, fill) => {
        const cx = (i0 + i1 + 1) / 2, a = (i1 - i0 + 1) / 2;
        const ys0 = j0 + hd, ys1 = j1 - hd;
        const inside = (x, jj, shrink) => {
          const aa = a - shrink, hh = hd - shrink * 0.8;
          if (Math.abs(x - cx) > aa) return false;
          if (jj >= ys0 && jj <= ys1) return jj > j0 - 1 + shrink && jj < j1 + 1 - shrink;
          const yc = jj < ys0 ? ys0 : ys1;
          const ex = (x - cx) / aa, ey = (jj - yc) / hh;
          return ex * ex + ey * ey <= 1;
        };
        for (let j = j0; j <= j1; j++) {
          for (let i = i0; i <= i1; i++) {
            const x = i + 0.5, jj = j + 0.5;
            if (!inside(x, jj, 0)) continue;
            if (!inside(x, jj, 1)) {
              let ch = '|';
              if (jj < ys0 || jj > ys1) {
                const yc = jj < ys0 ? ys0 : ys1;
                const nx = (x - cx) / (a * a), ny = ((jj - yc) * ar) / ((hd * ar) * (hd * ar));
                ch = GLYPHS_BY_ID(dirGlyph(-ny, nx));
              }
              geo(i, j, ch, 0.92);
            } else fill(i, j);
          }
        }
      };
      const GLYPHS_BY_ID = (id) => window.DPX.GLYPHS[id];

      // ---------- reactor pressure vessel
      const v0 = Math.round(C * 0.07), v1 = Math.round(C * 0.27);
      const t0 = Math.max(4, Math.round(R * 0.12)), b0 = Math.round(R * 0.9);
      const coreTop = Math.round(R * 0.5), coreBot = Math.round(R * 0.78);
      Object.assign(this, { v0, v1, t0, b0, coreTop, coreBot });
      capsule(v0, v1, t0, b0, 4, (i, j) => {
        const inBarrel = i > v0 + 3 && i < v1 - 3;
        if (!inBarrel && j <= coreBot + 1) {
          if (i === v0 + 3 || i === v1 - 3) { if (j >= coreTop - 5) geo(i, j, '|', 0.55); else fluid(i, j, UPPER); }
          else fluid(i, j, j >= coreTop - 5 ? DOWN : UPPER);
          return;
        }
        if (j > coreBot) { fluid(i, j, LOWER); return; }
        if (j >= coreTop) {
          if ((i - v0) % 2 === 0) geo(i, j, '|', 0.85);
          else fluid(i, j, CORE);
          return;
        }
        fluid(i, j, UPPER);
      });
      // Control-rod columns and drive mechanisms above the head.
      this.rodCols = [];
      for (let i = v0 + 5; i < v1 - 4; i += 4) if ((i - v0) % 2 === 1) this.rodCols.push(i);
      for (const i of this.rodCols) for (let j = t0 - 3; j < t0; j++) geo(i, j, '|', 0.85);

      // ---------- steam generator
      const s0 = Math.round(C * 0.56), s1 = Math.round(C * 0.76);
      const g0 = Math.max(2, Math.round(R * 0.06)), g1 = Math.round(R * 0.9);
      const ts = Math.round(R * 0.72), sm = Math.round((s0 + s1) / 2);
      const level = Math.round(R * 0.36);
      Object.assign(this, { s0, s1, g0, g1, ts, sm, level });
      capsule(s0, s1, g0, g1, 4, (i, j) => {
        if (j === ts) { geo(i, j, '#', 0.8); return; }
        if (j > ts) {
          if (i === sm) geo(i, j, '|', 0.85);
          else fluid(i, j, i < sm ? HOTHEAD : COLDHEAD);
          return;
        }
        fluid(i, j, j < level ? STEAM : WATER);
      });
      // U-tubes: up the hot leg side, across the bend, down the cold side.
      const nU = Math.max(2, Math.min(4, Math.floor((s1 - s0 - 6) / 4)));
      for (let u = 0; u < nU; u++) {
        const L = sm - 2 - 2 * u, Rc = sm + 2 + 2 * u, T = Math.max(g0 + 5, Math.round(R * 0.3) - 2 * u);
        const legLen = ts - 1 - T, total = 2 * legLen + (Rc - L);
        let s = 0;
        for (let j = ts; j > T; j--, s++) fluid(L, j, TUBE, s / total);
        for (let i = L; i <= Rc; i++, s++) fluid(i, T, TUBE, s / total);
        for (let j = T + 1; j <= ts; j++, s++) fluid(Rc, j, TUBE, s / total);
      }

      // ---------- piping
      this.paths = [];
      const pipe = (pts, kd, temp, speed) => {
        const p = this.paths.length;
        this.paths.push({ temp, speed, kd });
        const cells = [];
        for (let n = 0; n < pts.length - 1; n++) {
          const [ia, ja] = pts[n], [ib, jb] = pts[n + 1];
          const di = Math.sign(ib - ia), dj = Math.sign(jb - ja);
          const len = Math.max(Math.abs(ib - ia), Math.abs(jb - ja));
          for (let q = 0; q <= len; q++) cells.push([ia + di * q, ja + dj * q, di !== 0]);
        }
        for (const [i, j, horiz] of cells) {
          for (const d of [-1, 1]) {
            const wi = horiz ? i : i + d, wj = horiz ? j + d : j;
            const k = K(wi, wj);
            if (k >= 0 && !kind[k] && !this.geoG[k]) geo(wi, wj, horiz ? '=' : '|', 0.9);
          }
        }
        cells.forEach(([i, j], q) => fluid(i, j, PIPE, q, p));
      };
      const jh = Math.round(R * 0.36), xh = Math.round(C * 0.46), jsg = Math.round(R * 0.82);
      pipe([[v1 - 1, jh], [xh, jh], [xh, jsg], [s0 + 2, jsg]], PIPE, 0.92, 16);             // hot leg
      const jb = R - 2, xp = Math.round(C * 0.38), jc = Math.round(R * 0.62);
      pipe([[sm + 3, g1 - 1], [sm + 3, jb], [xp, jb], [xp, jc], [v1 - 1, jc]], PIPE, 0.18, 16); // cold leg
      const jst = Math.round(R * 0.16);
      pipe([[s1 - 1, jst], [C - 1, jst]], STEAM, 0.6, 22);                                    // main steam
      const jfw = Math.round(R * 0.5);
      pipe([[C - 1, jfw], [s1 - 1, jfw]], PIPE, 0.08, 10);                                    // feedwater
      // Reactor coolant pump on the cold leg's vertical run.
      this.pump = { i: xp, j: Math.round((jb + jc) / 2) };
      for (let dj = -2; dj <= 2; dj++) for (let di = -3; di <= 3; di++) {
        const d = Math.hypot(di, dj * ar);
        if (d > 2.6 && d < 3.9) geo(xp + di, this.pump.j + dj, d > 3.3 ? 'O' : 'o', 0.9);
      }
      geo(xp + 5, this.pump.j, '#', 0.85); geo(xp + 4, this.pump.j, '=', 0.85); // motor coupling
    }

    update(dt, p) {
      const gust = p && p.active ? p.energy : 0;
      const demand = 0.62 + 0.3 * Math.sin(this.t * 0.35) + gust * 0.5;
      this.power = clamp((this.power === undefined ? demand : this.power) + (clamp(demand, 0.2, 1) - (this.power || demand)) * Math.min(1, dt * 0.8), 0.2, 1);
    }

    compose() {
      const { cols: C, rows: R, N, kind, s: sArr, pid, geoG, geoC, code, color, t, dispX } = this;
      const { coreTop, coreBot, t0, level } = this;
      const P = this.power === undefined ? 0.7 : this.power;
      const ink = (v) => rampColor('ink', v);
      const th = (T) => rampColor('thermal', clamp(T, 0, 1));
      const Thot = 0.55 + 0.4 * P, Tcold = 0.18;
      const rodDepth = Math.round((coreBot - coreTop) * (1 - P) * 0.95);
      let k = 0;
      for (let j = 0; j < R; j++) {
        for (let i = 0; i < C; i++, k++) {
          if (geoG[k]) { code[k] = geoG[k]; color[k] = geoC[k]; continue; }
          const kd = kind[k];
          code[k] = 0;
          if (!kd) continue;
          const x = i + dispX[k];
          let n, I, cl;
          switch (kd) {
            case DOWN:
              n = noise3(x * 0.5, (j - t * 7) * 0.35, 1.3);
              I = 0.3 + 0.35 * n; cl = th(Tcold + 0.02 * n); break;
            case LOWER:
              n = noise3(x * 0.3 + Math.sin(t) , j * 0.4 - t * 0.6, 2.1);
              I = 0.3 + 0.35 * n; cl = th(Tcold + 0.04); break;
            case CORE: {
              n = noise3(x * 0.6, (j + t * 8) * 0.45, t * 0.5);
              const h = (coreBot - j) / (coreBot - coreTop);
              I = 0.35 + 0.45 * P + 0.25 * n;
              cl = rampColor('cold', 0.35 + 0.5 * P + 0.1 * n - 0.15 * h * 0);
              break;
            }
            case UPPER:
              n = noise3(x * 0.3, (j + t * 6) * 0.3, t * 0.4);
              I = 0.32 + 0.4 * n; cl = th(Thot + 0.05 * n); break;
            case HOTHEAD:
              n = noise3(x * 0.4, (j + t * 5) * 0.4, 3.3);
              I = 0.35 + 0.35 * n; cl = th(Thot); break;
            case COLDHEAD:
              n = noise3(x * 0.4, (j - t * 5) * 0.4, 4.4);
              I = 0.35 + 0.35 * n; cl = th(Tcold + 0.03); break;
            case TUBE: {
              const f = sArr[k];
              n = noise3((f * 40 - t * 9) * 0.5, i * 0.7, 5.5);
              I = 0.45 + 0.4 * n; cl = th(Thot - (Thot - Tcold) * f); break;
            }
            case WATER: {
              // Boiling around the tubes: bubbles rise faster with power.
              n = noise3(x * 0.7, (j + t * (6 + 10 * P)) * 0.6, t * 0.4);
              if (n > 0.62 - 0.25 * P) { code[k] = G[n > 0.75 ? 'O' : 'o']; color[k] = ink(0.75); continue; }
              I = 0.25 + 0.25 * n; cl = rampColor('cold', 0.3 + 0.15 * n); break;
            }
            case STEAM:
              n = noise3(x * 0.25, (j + t * 9) * 0.3, t * 0.6);
              I = (0.12 + 0.3 * P) * (0.6 + n); cl = ink(0.25 + 0.2 * n); break;
            case PIPE: {
              const pa = this.paths[pid[k]];
              n = noise3((sArr[k] - t * pa.speed) * 0.25, pid[k] * 7.7, t * 0.3);
              if (pa.kd === STEAM) { I = (0.15 + 0.3 * P) * (0.7 + n); cl = ink(0.3 + 0.2 * n); }
              else { I = 0.45 + 0.4 * n; cl = th(pa.temp === 0.92 ? Thot : pa.temp); }
              break;
            }
          }
          if (pid[k] >= 0 && this.paths[pid[k]].kd === STEAM) { code[k] = rampGlyph(clamp(I, 0.06, 1)); color[k] = cl; continue; }
          code[k] = rampGlyph(clamp(I, 0.08, 1));
          color[k] = cl;
        }
      }
      // Control rods: inserted from the top, depth set by power demand.
      for (const i of this.rodCols) {
        for (let j = t0 + 1; j < coreTop + rodDepth; j++) {
          const kk = j * C + i;
          if (kind[kk] === UPPER || kind[kk] === CORE || kind[kk] === DOWN) { code[kk] = G['#']; color[kk] = ink(0.95); }
        }
      }
      // Pump impeller.
      const ph = Math.floor(t * 12) % 4;
      const pk = this.pump.j * C + this.pump.i;
      if (pk >= 0 && pk < N) { code[pk] = G[['|', '/', '-', '\\'][ph]]; color[pk] = ink(0.97); }
    }
  }

  window.DPX.NuclearLoopScene = NuclearLoopScene;
})();
