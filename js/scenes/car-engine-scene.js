/* CarEngineScene — inline four-stroke engine in cross-section.
 * Exact slider–crank kinematics drive pistons and connecting rods from a
 * rotating crankshaft (firing order 1-3-4-2). Cam-timed valves open the
 * ports; each cylinder's charge goes intake → compression → spark and
 * flame-front propagation → power → exhaust. Hovering revs the engine. */
(function () {
  'use strict';
  const { PhysicsScene, G, rampColor, rampGlyph, dirGlyph, noise3, clamp } = window.DPX;
  const CHAMBER = 1, INTAKE = 2, EXHAUST = 3, CRANKCASE = 4;
  const DEG = Math.PI / 180;

  class CarEngineScene extends PhysicsScene {
    constructor(opts = {}) {
      super('engine', 'ENGINE', 'A four-stroke car engine: pistons, valves, spark ignition and a rotating crankshaft.');
      this.opts = Object.assign({ rps: 0.5 }, opts);
      this.theta = 0;
    }

    setup() {
      const { cols, rows, ar, H, N } = this;
      const ink = (v) => rampColor('ink', v);
      const n = (this.n = cols < 100 ? 2 : 4);
      const span = (this.span = Math.round(cols * 0.84));
      const x0 = (this.x0 = Math.round((cols - span) / 2));
      const pitch = (this.pitch = span / n);
      this.axes = [];
      for (let c = 0; c < n; c++) this.axes.push(Math.round(x0 + pitch * (c + 0.5)));
      this.offsets = n === 4 ? [0, 180, 540, 360] : [0, 360];
      this.B = Math.min(pitch * 0.62, H * 0.34);
      this.yHT = H * 0.14;
      this.yh = H * 0.27;
      this.clr = H * 0.035;
      this.r = H * 0.11;
      this.Yk = H * 0.79;
      this.L = this.Yk - this.r - (this.yh + this.clr);
      this.hp = H * 0.11;
      this.yLb = this.Yk - (this.L - this.r) + this.hp * 0.55;
      this.ySb = Math.min(H - ar * 0.6, this.Yk + this.r + H * 0.06);
      this.vOff = this.B * 0.26;
      this.portHalf = Math.max(1, Math.round(this.B * 0.11));
      this.liftMax = H * 0.04;
      const { B, yHT, yh, yLb, ySb, Yk, r, vOff, portHalf } = this;

      const kind = (this.kind = new Uint8Array(N));
      const cyl = (this.cyl = new Int8Array(N).fill(-1));
      for (let j = 0; j < rows; j++) {
        const y = (j + 0.5) * ar;
        for (let i = 0; i < cols; i++) {
          const k = j * cols + i;
          const x = i + 0.5;
          if (x < x0 || x > x0 + span || y < yHT || y > ySb) continue;
          const c = clamp(Math.floor((x - x0) / pitch), 0, n - 1);
          const dx = x - this.axes[c], adx = Math.abs(dx);
          cyl[k] = c;
          if (x < x0 + 1 || x > x0 + span - 1) { this.setGeo(i, j, G['|'], ink(0.92)); continue; }
          if (y < yh) {
            // Cylinder head: ports, spark-plug bore, hatch.
            if (Math.abs(dx + vOff) <= portHalf && y > yHT + ar) { kind[k] = INTAKE; continue; }
            if (Math.abs(dx - vOff) <= portHalf && y > yHT + ar) { kind[k] = EXHAUST; continue; }
            if (adx < 0.6) { this.setGeo(i, j, G['|'], ink(0.95)); continue; }
            if (y < yHT + ar || y > yh - ar) this.setGeo(i, j, G['='], ink(0.9));
            else this.setGeo(i, j, G['/'], ink(0.3));
          } else if (y < yLb) {
            // Block: bore, liner, water jacket.
            if (adx < B / 2) kind[k] = CHAMBER;
            else if (adx < B / 2 + 1) this.setGeo(i, j, G['|'], ink(0.92));
            else if (adx - B / 2 > 2 && adx - B / 2 < 4.2) this.setGeo(i, j, G[':'], rampColor('cold', 0.35));
            else this.setGeo(i, j, G['/'], ink(0.3));
          } else {
            // Crankcase and sump.
            if (y > ySb - ar) { this.setGeo(i, j, G['='], ink(0.92)); continue; }
            kind[k] = CRANKCASE;
            const ry = y - Yk, rr = Math.sqrt(dx * dx + ry * ry);
            if (Math.abs(rr - r) < 0.6) this.setGeo(i, j, G['.'], ink(0.25));
            else if (Math.abs(ry) < ar * 0.5) this.setGeo(i, j, G['='], ink(0.7));
          }
        }
      }
    }

    update(dt, p) {
      const rev = 1 + (p && p.active ? 0.9 * p.energy : 0);
      this.theta = (this.theta + 360 * this.opts.rps * rev * dt) % 720;
    }

    _lift(phi, open) {
      const u = (((phi - open) % 720) + 720) % 720;
      return u < 230 ? Math.sin((Math.PI * u) / 230) : 0;
    }

    compose() {
      const { cols, rows, ar, N, kind, cyl, geoG, geoC, code, color, t } = this;
      const { B, yHT, yh, clr, r, Yk, L, hp, vOff, liftMax, axes } = this;
      const ink = (v) => rampColor('ink', v);
      const put = (i, j, g, c) => {
        if (i < 0 || j < 0 || i >= cols || j >= rows) return;
        const k = j * cols + i;
        code[k] = g; color[k] = c;
      };
      const row = (y) => Math.floor(y / ar);

      // Per-cylinder kinematics.
      const S = axes.map((ax, c) => {
        const phi = (this.theta + this.offsets[c]) % 720;
        const a = phi * DEG, sa = Math.sin(a), ca = Math.cos(a);
        const yp = Yk - (r * ca + Math.sqrt(L * L - r * r * sa * sa));
        return {
          ax, phi, sa, ca, yp,
          px: ax + r * sa, py: Yk - r * ca,
          wx: ax, wy: yp + hp * 0.55,
          li: this._lift(phi, -15), le: this._lift(phi, 505),
        };
      });

      for (let k = 0; k < N; k++) { code[k] = geoG[k]; color[k] = geoC[k]; }

      // Field cells: charge, piston, ports.
      let k = 0;
      for (let j = 0; j < rows; j++) {
        const y = (j + 0.5) * ar;
        for (let i = 0; i < cols; i++, k++) {
          const kd = kind[k];
          if (!kd) continue;
          const s = S[cyl[k]];
          const x = i + 0.5 + this.dispX[k];
          const dx = i + 0.5 - s.ax;
          if ((kd === CHAMBER || kd === CRANKCASE) && Math.abs(dx) < B / 2 - 0.3 && y >= s.yp && y < s.yp + hp) {
            const py = y - s.yp;
            if (py < ar) { code[k] = G['=']; color[k] = ink(0.95); }
            else if (py < ar * 2.6) { code[k] = G['-']; color[k] = ink(0.6); }
            else if (Math.abs(y - s.wy) < ar * 0.6 && Math.abs(dx) < 1.2) { code[k] = G['o']; color[k] = ink(0.95); }
            else { code[k] = G['#']; color[k] = ink(0.42); }
            continue;
          }
          if (kd === CHAMBER) {
            if (y < s.yp) this._gas(k, x, y, dx, s, cyl[k]);
            else code[k] = 0;
          } else if (kd === INTAKE) {
            const n = noise3(x * 0.7, (y - t * 22 * (0.2 + s.li)) * 0.35, cyl[k] * 5.1);
            const I = 0.22 + (0.25 + 0.45 * s.li) * (n + 0.5);
            code[k] = rampGlyph(clamp(I, 0.08, 0.75));
            color[k] = rampColor('cold', 0.3 + 0.5 * I);
          } else if (kd === EXHAUST) {
            const n = noise3(x * 0.7, (y + t * 30 * (0.2 + s.le)) * 0.35, cyl[k] * 3.7);
            const I = 0.15 + (0.2 + 0.55 * s.le) * (n + 0.5);
            const u = (((s.phi - 505) % 720) + 720) % 720;
            const hot = s.le > 0 ? clamp(1 - u / 120, 0, 1) : 0;
            code[k] = rampGlyph(clamp(I, 0.08, 0.75));
            color[k] = hot > 0.15 ? rampColor('heat', 0.1 + 0.5 * hot) : ink(0.25 + 0.35 * I);
          }
        }
      }

      for (let c = 0; c < S.length; c++) {
        const s = S[c];
        // Connecting rod (below the piston skirt).
        const ux = s.px - s.wx, uy = s.py - s.wy, ul = Math.sqrt(ux * ux + uy * uy);
        const rg = dirGlyph(ux, uy);
        const j0 = row(s.yp + hp), j1 = row(s.py) + 1;
        for (let j = j0; j <= j1; j++) {
          const y = (j + 0.5) * ar;
          for (let i = Math.floor(Math.min(s.wx, s.px) - 2); i <= Math.ceil(Math.max(s.wx, s.px) + 2); i++) {
            const x = i + 0.5;
            const tt = clamp(((x - s.wx) * ux + (y - s.wy) * uy) / (ul * ul), 0, 1);
            const ex = x - (s.wx + ux * tt), ey = y - (s.wy + uy * tt);
            if (ex * ex + ey * ey < 0.75 && y > s.yp + hp) put(i, j, rg, ink(0.88));
          }
        }
        // Crank throw: counterweight, web, pin, main journal.
        const R = r * 1.2;
        for (let j = row(Yk - R); j <= row(Yk + R); j++) {
          const y = (j + 0.5) * ar;
          for (let i = Math.floor(s.ax - R); i <= Math.ceil(s.ax + R); i++) {
            const rx = i + 0.5 - s.ax, ry = y - Yk;
            const d = Math.sqrt(rx * rx + ry * ry);
            const proj = rx * s.sa - ry * s.ca, perp = Math.abs(rx * s.ca + ry * s.sa);
            const pdx = i + 0.5 - s.px, pdy = y - s.py;
            if (pdx * pdx + pdy * pdy < 2.2) put(i, j, G['@'], ink(0.97));
            else if (d < 1.3) put(i, j, G['O'], ink(0.97));
            else if (proj > -r * 0.1 && proj < r * 1.05 && perp < r * 0.3) put(i, j, G['#'], ink(0.78));
            else if (d < r * 0.82 && proj < -r * 0.2) put(i, j, G['%'], ink(0.5));
          }
        }
        // Valves: stem, disc, spring and retainer.
        const valves = [[s.ax - vOff, s.li], [s.ax + vOff, s.le]];
        for (const [vx, lift] of valves) {
          const vi = Math.floor(vx);
          const yd = yh + lift * liftMax;
          const jd = row(yd);
          const hw = this.portHalf + 1;
          for (let i = vi - hw; i <= vi + hw; i++) put(i, jd, G['='], ink(0.95));
          const yRet = yHT - ar * 3.4 + lift * liftMax;
          for (let j = row(yRet); j < jd; j++) put(vi, j, G['|'], ink(0.9));
          put(vi - 1, row(yRet), G['='], ink(0.9));
          put(vi + 1, row(yRet), G['='], ink(0.9));
          for (let j = row(yRet) + 1, z = 0; j < row(yHT); j++, z++) {
            put(vi - 1, j, G[z % 2 ? '>' : '<'], ink(0.6));
            put(vi + 1, j, G[z % 2 ? '<' : '>'], ink(0.6));
          }
        }
        // Spark plug and the spark itself.
        const ai = Math.floor(s.ax);
        put(ai, row(yHT) - 1, G['#'], ink(0.9));
        put(ai - 1, row(yHT) - 1, G['['], ink(0.9));
        put(ai + 1, row(yHT) - 1, G[']'], ink(0.9));
        put(ai, row(yHT) - 2, G['o'], ink(0.8));
        if (s.phi > 344 && s.phi < 366) {
          const jt = row(yh);
          put(ai, jt, G['*'], rampColor('heat', 1));
          put(ai - 1, jt, G['\\'], rampColor('heat', 0.9));
          put(ai + 1, jt, G['/'], rampColor('heat', 0.9));
          put(ai, jt + 1, G['+'], rampColor('heat', 0.85));
        }
      }
    }

    /** Charge inside the cylinder for the current stroke. */
    _gas(k, x, y, dx, s, c) {
      const { code, color, t, B, yh, clr, r } = this;
      const phi = s.phi;
      const swirlA = t * 1.6 + c;
      const cx = dx * Math.cos(swirlA) - (y - yh) * Math.sin(swirlA) * 0.3;
      const n = noise3(cx * 0.22 + c * 31, y * 0.22, t * 0.9);
      let I, col;
      if (phi < 180) {
        const jet = Math.exp(-(((dx + this.vOff) / (B * 0.2)) ** 2)) * s.li;
        I = 0.16 + 0.22 * (n + 0.6) + 0.35 * jet;
        col = rampColor('cold', 0.25 + 0.5 * I);
      } else if (phi < 346) {
        const comp = (2 * r + clr) / Math.max(clr, s.yp - yh);
        I = 0.14 + 0.07 * comp + 0.18 * (n + 0.5);
        col = rampColor('cold', 0.35 + 0.08 * comp);
      } else if (phi < 540) {
        const since = phi - 346;
        const Rf = (since / 32) * B * 1.1;
        const ey = y - yh, d = Math.sqrt(dx * dx + ey * ey);
        if (d < Rf) {
          const heat = clamp(1 - (phi - 370) / 190, 0.12, 1);
          const front = since < 45 && Rf - d < 1.8;
          I = front ? 1 : 0.38 + 0.5 * heat + 0.18 * n;
          col = rampColor('heat', front ? 0.95 : heat * 0.95 + n * 0.1);
        } else {
          I = 0.5 + 0.15 * n;
          col = rampColor('cold', 0.7);
        }
      } else {
        const u = (phi - 540) / 180;
        const toward = Math.exp(-(((dx - this.vOff) / (B * 0.3)) ** 2)) * s.le;
        I = 0.5 - 0.32 * u + 0.18 * n + 0.2 * toward;
        col = u < 0.2 ? rampColor('heat', 0.15) : rampColor('ink', 0.22 + 0.35 * I);
      }
      code[k] = rampGlyph(clamp(I, 0.08, 1));
      color[k] = col;
    }
  }

  window.DPX.CarEngineScene = CarEngineScene;
})();
