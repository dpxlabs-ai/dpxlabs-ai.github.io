/* RocketEngineScene — combustion chamber, converging–diverging nozzle, plume.
 * Mach number along the nozzle comes from the isentropic area–Mach relation;
 * gas parcels are transported with a time-of-flight coordinate so streaks
 * accelerate through the throat. The plume shows oblique shocks, Mach
 * diamonds and a turbulent mixing layer that thickens downstream. */
(function () {
  'use strict';
  const { PhysicsScene, G, rampColor, rampGlyph, noise3, fbm3, smoothstep, clamp } = window.DPX;
  const GAMMA = 1.2;

  function areaRatio(M) {
    const t = (2 / (GAMMA + 1)) * (1 + ((GAMMA - 1) / 2) * M * M);
    return Math.pow(t, (GAMMA + 1) / (2 * (GAMMA - 1))) / M;
  }
  function machFromArea(A, supersonic) {
    let lo = supersonic ? 1 : 1e-4, hi = supersonic ? 12 : 1;
    for (let n = 0; n < 48; n++) {
      const m = (lo + hi) / 2;
      const f = areaRatio(m) - A;
      if (supersonic ? f > 0 : f < 0) hi = m; else lo = m;
    }
    return (lo + hi) / 2;
  }

  class RocketEngineScene extends PhysicsScene {
    constructor(opts = {}) {
      super('propulsion', 'PROPULSION', 'A rocket engine: combustion chamber, converging–diverging nozzle and supersonic exhaust plume.');
      this.opts = Object.assign({ expansion: 0.82 }, opts);
    }

    setup() {
      const { cols, rows, ar, H } = this;
      const ink = (v) => rampColor('ink', v);
      this.Yc = H / 2;
      const x0 = (this.x0 = Math.max(6, cols * 0.06));
      const xch = (this.xch = cols * 0.19);
      const xt = (this.xt = cols * 0.28);
      const xe = (this.xe = cols * 0.43);
      const Rc = (this.Rc = Math.min(H * 0.26, cols * 0.11));
      const Rt = (this.Rt = Rc * 0.36);
      const Re = (this.Re = Rc * this.opts.expansion);
      this.lambda = Re * 1.45;
      const rAt = (x) => {
        if (x < xch) return Rc;
        if (x < xt) { const f = (x - xch) / (xt - xch); return Rt + (Rc - Rt) * (0.5 + 0.5 * Math.cos(Math.PI * f)); }
        const f = clamp((x - xt) / (xe - xt), 0, 1);
        return Rt + (Re - Rt) * (1 - Math.pow(1 - f, 2.2));
      };

      // Per-column 1D isentropic solution.
      this.rCol = new Float32Array(cols);
      this.sCol = new Float32Array(cols);
      this.MCol = new Float32Array(cols);
      this.TCol = new Float32Array(cols);
      this.tau = new Float32Array(cols);
      const Mexit = machFromArea((Re / Rt) ** 2, true);
      const Uref = Math.max(40, cols * 0.55) / (Mexit * Math.sqrt(1 / (1 + 0.1 * Mexit * Mexit)));
      let tau = 0;
      for (let i = 0; i < cols; i++) {
        const x = i + 0.5;
        const r = rAt(Math.min(x, xe));
        this.rCol[i] = r;
        this.sCol[i] = x <= xe ? (rAt(Math.min(x + 0.5, xe)) - rAt(x - 0.5)) : 0;
        const M = machFromArea(Math.max(1.0001, (r / Rt) ** 2), x > xt);
        const Tr = 1 / (1 + ((GAMMA - 1) / 2) * M * M);
        this.MCol[i] = M;
        this.TCol[i] = Tr;
        tau += 1 / (Uref * M * Math.sqrt(Tr) + 1.5);
        this.tau[i] = tau;
      }
      this.Uj = Uref * Mexit * Math.sqrt(1 / (1 + 0.1 * Mexit * Mexit));

      // Walls, slope-aware glyphs.
      for (let j = 0; j < rows; j++) {
        const y = (j + 0.5) * ar, dy = y - this.Yc, ady = Math.abs(dy), top = dy < 0;
        for (let i = 0; i < cols; i++) {
          const x = i + 0.5;
          if (x >= x0 && x <= xe + 0.5) {
            const r = this.rCol[i], s = this.sCol[i];
            const d = ady - r;
            if (d >= 0 && d < ar * 1.05 * Math.sqrt(1 + s * s)) {
              let ch = '=';
              if (Math.abs(s) > 2.6) ch = '|';
              else if (s > 0.3) ch = top ? '/' : '\\';
              else if (s < -0.3) ch = top ? '\\' : '/';
              this.setGeo(i, j, G[ch], ink(0.92));
            } else if (d >= 0 && x < xt && d < ar * 2.1 * Math.sqrt(1 + s * s)) {
              this.setGeo(i, j, G[':'], ink(0.3)); // regenerative cooling jacket
            }
          }
          // Injector face and manifold dome.
          if (x >= x0 - 1.4 && x < x0 && ady < Rc + ar) this.setGeo(i, j, G['|'], ink(0.95));
          else if (x >= x0 - 4.5 && x < x0 - 1.4 && ady < Rc * 0.62) {
            const edge = x < x0 - 3.5 || ady > Rc * 0.62 - ar;
            this.setGeo(i, j, G[edge ? (x < x0 - 3.5 ? '[' : '=') : '·'], ink(edge ? 0.9 : 0.35));
          }
        }
      }
      // Propellant feed lines.
      this.feedRows = [];
      for (const sgn of [-1, 1]) this.feedRows.push(Math.round((this.Yc + sgn * Rc * 0.32) / ar - 0.5));
    }

    compose() {
      const { cols, rows, ar, geoG, geoC, code, color, dispX, dispY, t } = this;
      const { x0, xch, xt, xe, Yc, Re, Uj, lambda, rCol, sCol, MCol, TCol, tau } = this;
      const xConv = xch + (xt - xch) * 0.3;
      let k = 0;
      for (let j = 0; j < rows; j++) {
        const yRaw = (j + 0.5) * ar;
        const isFeed = this.feedRows.indexOf(j) >= 0;
        for (let i = 0; i < cols; i++, k++) {
          if (geoG[k]) { code[k] = geoG[k]; color[k] = geoC[k]; continue; }
          const xRaw = i + 0.5;
          const x = xRaw + dispX[k];
          const dy = yRaw + dispY[k] * ar - Yc;
          code[k] = 0;

          if (isFeed && xRaw < x0 - 4.5 && xRaw > 1) {
            const n = noise3(xRaw * 0.45 - t * 5, j, 0);
            code[k] = rampGlyph(n > 0.2 ? 0.45 : 0.3);
            color[k] = rampColor('cold', 0.55 + 0.2 * n);
            continue;
          }

          if (xRaw >= x0 && xRaw <= xe && Math.abs(yRaw - Yc) < rCol[i]) {
            const eta = dy / rCol[i], aeta = Math.abs(eta);
            if (xRaw < xConv) {
              // Combustion chamber: turbulent burning with injector spray.
              const n = fbm3(x * 0.14 - t * 0.7, yRaw * 0.14, t * 0.9);
              const n2 = noise3(x * 0.32 - t * 2.6, yRaw * 0.3, t * 1.6);
              const I = clamp(0.5 + 0.75 * n + 0.2 * n2, 0.1, 1);
              const spray = xRaw - x0 < 5 && Math.abs(((eta * 2.5 + 10.5) % 1) - 0.5) < 0.13;
              if (spray) { code[k] = rampGlyph(0.35); color[k] = rampColor('cold', 0.6); }
              else { code[k] = rampGlyph(I); color[k] = rampColor('heat', 0.45 + 0.6 * n + 0.15 * n2); }
            } else {
              // Accelerating gas: streaks transported with time-of-flight.
              const st = noise3((tau[i] - t) * 2.4, eta * 4.5 + 7, t * 0.25);
              const Tr = TCol[i];
              let I = 0.32 + 0.55 * Tr * Tr + 0.5 * st;
              if (aeta > 0.82) I *= 0.72;
              I = clamp(I, 0.1, 1);
              code[k] = rampGlyph(I);
              const M = MCol[i];
              if (M > 0.75 && M < 1.45 && aeta < 0.7 && I > 0.6) color[k] = rampColor('ink', 0.95);
              else color[k] = rampColor('heat', Tr * 1.15 - (aeta > 0.82 ? 0.2 : 0) + st * 0.15);
            }
            continue;
          }

          if (xRaw > xe) {
            const xp = x - xe;
            const Rj = Re * (1 + 0.05 * xp / Re);
            const ady = Math.abs(dy);
            const ep = ady / Rj;
            const e = Math.exp(-xp / (3.4 * lambda));
            let I = 0, g = 0, col = 0;

            if (ep < 1) {
              const st = noise3((xp - Uj * t) * 0.06, dy * 0.22, t * 0.4);
              I = (0.3 + 0.55 * st) * (0.35 + 0.65 * e) * (1 - 0.45 * ep * ep);
              g = rampGlyph(I);
              col = rampColor('heat', 0.5 + 0.4 * e + 0.2 * st);
            }
            // Oblique shocks and Mach diamonds.
            const u = xp / (0.5 * lambda), m = u % 2, tri = Math.abs(1 - m);
            if (e > 0.18 && ep < 1.02) {
              const dRows = Math.abs(ep - tri * 0.95) * Rj / ar;
              if (dRows < 0.55) {
                I = 1; g = rampGlyph(0.78);
                col = rampColor('cold', 0.45 + 0.4 * e);
              } else {
                const D = Math.max(0, 1 - Math.abs(m - 1) * 2.4 - ep * 1.5) * e * 1.4;
                if (D > I && D > 0.12) { I = D; g = rampGlyph(clamp(0.45 + 0.55 * D, 0, 1)); col = rampColor('ink', 0.55 + 0.4 * D); }
              }
            }
            // Turbulent shear layer, thickening downstream.
            if (ep > 0.55) {
              const delta = 0.12 + xp / (Re * 18);
              const env = Math.exp(-((ep - 1) * (ep - 1)) / (delta * delta));
              const n = fbm3((xp - 0.45 * Uj * t) * 0.09, dy * 0.15, t * 0.5);
              const Im = env * (0.3 + 1.0 * n) * (0.65 + 0.35 * (1 - e));
              if (Im > I && Im > 0.08) {
                I = Im; g = rampGlyph(clamp(Im, 0, 1));
                const hv = 0.15 + 0.45 * e + 0.25 * n;
                col = hv < 0.12 ? rampColor('ink', 0.3 + 0.2 * Im) : rampColor('heat', hv);
              }
            }
            code[k] = g;
            color[k] = col;
          }
        }
      }
    }
  }

  window.DPX.RocketEngineScene = RocketEngineScene;
})();
