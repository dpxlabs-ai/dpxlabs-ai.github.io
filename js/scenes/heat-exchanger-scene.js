/* HeatExchangerScene — single-pass shell-and-tube exchanger.
 * Cold tube-side fluid flows left→right and warms; hot shell-side fluid enters
 * top-left and snakes around segmental baffles, cooling as it goes.
 * Each stream carries a texture transported along its own path coordinate, so
 * the structures move with the flow; colour comes from the local temperature. */
(function () {
  'use strict';
  const { PhysicsScene, G, rampColor, rampGlyph, noise3, fbm3, clamp } = window.DPX;
  const SHELL = 1, TUBE = 2;

  class HeatExchangerScene extends PhysicsScene {
    constructor(opts = {}) {
      super('thermal', 'HEAT TRANSFER', 'A shell-and-tube heat exchanger: cold fluid in the tubes, hot fluid around baffles in the shell.');
      this.opts = Object.assign({ baffles: 4 }, opts);
    }

    setup() {
      const { cols, rows, N } = this;
      const ink = (v) => rampColor('ink', v);
      const kind = (this.kind = new Uint8Array(N));
      const path = (this.path = new Float32Array(N));

      const x0 = Math.max(6, Math.round(cols * 0.07)), x1 = cols - 1 - x0;
      const hw = Math.max(4, Math.round(cols * 0.055));
      const xs0 = x0 + hw, xs1 = x1 - hw;
      const yT = Math.max(5, Math.round(rows * 0.2));
      const yB = rows - 1 - Math.max(5, Math.round(rows * 0.15));
      const ymid = Math.round((yT + yB) / 2);
      const span = yB - yT;
      const nt = clamp(Math.floor((span - 1) / 5), 3, 6);
      const nb = this.opts.baffles;
      const tubeOf = new Int8Array(rows).fill(-1), tubeWall = new Uint8Array(rows);
      for (let t = 0; t < nt; t++) {
        const r = Math.round(yT + ((t + 1) * span) / (nt + 1));
        tubeOf[r] = t; tubeWall[r - 1] = 1; tubeWall[r + 1] = 1;
      }
      const bx = [];
      for (let b = 0; b < nb; b++) bx.push(Math.round(xs0 + 1 + ((b + 1) * (xs1 - xs0 - 1)) / (nb + 1)));
      const bLen = Math.round(span * 0.72);
      Object.assign(this, { x0, x1, xs0, xs1, yT, yB, span, nb });

      const geo = (i, j, ch, v) => { const k = this.setGeo(i, j, G[ch], ink(v)); if (k >= 0) kind[k] = 0; };
      const fluid = (i, j, kd, s) => {
        if (i < 0 || j < 0 || i >= cols || j >= rows) return;
        const k = j * cols + i;
        this.geoG[k] = 0; kind[k] = kd; path[k] = s;
      };
      const shellPath = (i, j) => {
        let c = 0;
        while (c < nb && i > bx[c]) c++;
        const fy = (j - yT) / span;
        return c + (c % 2 === 0 ? fy : 1 - fy);
      };

      // Shell interior: tubes, tube walls, baffles, shell-side fluid.
      for (let j = yT + 1; j < yB; j++) {
        for (let i = xs0 + 1; i < xs1; i++) {
          if (tubeOf[j] >= 0) { fluid(i, j, TUBE, 0); continue; }
          if (tubeWall[j]) { geo(i, j, '-', 0.55); continue; }
          let baffle = false;
          for (let b = 0; b < nb; b++) {
            if (i === bx[b] && (b % 2 === 0 ? j <= yT + bLen : j >= yB - bLen)) baffle = true;
          }
          if (baffle) geo(i, j, '|', 0.8);
          else fluid(i, j, SHELL, shellPath(i, j));
        }
      }
      // Shell wall and tube sheets.
      for (let i = xs0; i <= xs1; i++) { geo(i, yT, '=', 0.9); geo(i, yB, '=', 0.9); }
      for (let j = yT - 1; j <= yB + 1; j++) {
        for (const i of [xs0, xs1]) {
          if (tubeOf[j] >= 0) fluid(i, j, TUBE, 0);
          else geo(i, j, '#', 0.75);
        }
      }
      // Channel heads (bonnets).
      for (let j = yT; j <= yB; j++) {
        for (let i = x0; i < xs0; i++) {
          if (j === yT || j === yB) geo(i, j, i === x0 ? (j === yT ? '/' : '\\') : '=', 0.9);
          else if (i === x0) geo(i, j, '|', 0.9);
          else fluid(i, j, TUBE, 0);
        }
        for (let i = xs1 + 1; i <= x1; i++) {
          if (j === yT || j === yB) geo(i, j, i === x1 ? (j === yT ? '\\' : '/') : '=', 0.9);
          else if (i === x1) geo(i, j, '|', 0.9);
          else fluid(i, j, TUBE, 0);
        }
      }
      // Tube-side nozzles (horizontal, centred on the heads).
      for (let i = x0 - 5; i <= x0; i++) {
        geo(i, ymid - 1, '=', 0.85); geo(i, ymid + 1, '=', 0.85); fluid(i, ymid, TUBE, 0);
      }
      for (let i = x1; i <= x1 + 5; i++) {
        geo(i, ymid - 1, '=', 0.85); geo(i, ymid + 1, '=', 0.85); fluid(i, ymid, TUBE, 0);
      }
      for (let d = -2; d <= 2; d++) {
        if (d === 0) continue;
        geo(x0 - 5, ymid + d, '|', 0.9); geo(x1 + 5, ymid + d, '|', 0.9);
      }
      // Shell-side nozzles: inlet on top of the first compartment, outlet under the last.
      const cin = Math.round((xs0 + bx[0]) / 2), cout = Math.round((bx[nb - 1] + xs1) / 2);
      for (let j = yT - 4; j <= yT; j++) {
        geo(cin - 2, j, '|', 0.9); geo(cin + 2, j, '|', 0.9);
        for (let d = -1; d <= 1; d++) fluid(cin + d, j, SHELL, (j - yT) / span);
      }
      for (let j = yB; j <= yB + 4; j++) {
        geo(cout - 2, j, '|', 0.9); geo(cout + 2, j, '|', 0.9);
        for (let d = -1; d <= 1; d++) fluid(cout + d, j, SHELL, nb + (j - yT) / span);
      }
      for (let d = -3; d <= 3; d++) {
        if (Math.abs(d) < 2) continue;
        geo(cin + d, yT - 4, '=', 0.9); geo(cout + d, yB + 4, '=', 0.9);
      }
    }

    compose() {
      const { cols, rows, ar, kind, path, geoG, geoC, code, color, dispX, dispY, t } = this;
      const { xs0, xs1, span, nb } = this;
      const Vt = Math.max(18, cols * 0.16), Vs = span * ar * 0.32;
      const lenS = span * ar;
      let k = 0;
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++, k++) {
          if (geoG[k]) { code[k] = geoG[k]; color[k] = geoC[k]; continue; }
          const kd = kind[k];
          if (!kd) { code[k] = 0; continue; }
          const x = i + 0.5 + dispX[k];
          const jj = j + dispY[k];
          const stir = Math.min(1, Math.abs(dispX[k]) + Math.abs(dispY[k]));
          if (kd === TUBE) {
            const xf = clamp((x - xs0) / (xs1 - xs0), 0, 1);
            const n = noise3((x - Vt * t) * 0.2, jj * 1.7, t * 0.35);
            const T = 0.03 + 0.6 * xf + n * 0.05 + stir * 0.15;
            const I = 0.5 + 0.8 * n;
            code[k] = rampGlyph(clamp(0.22 + 0.62 * I, 0.12, 1));
            color[k] = rampColor('thermal', T);
          } else {
            const s = path[k];
            const P = s * lenS;
            const n = fbm3(x * 0.16, (P - Vs * t) * 0.11 + jj * 0.02, t * 0.22);
            const T = 1 - 0.62 * clamp(s / (nb + 1), 0, 1) + n * 0.1 - stir * 0.15;
            code[k] = rampGlyph(clamp(0.4 + 1.05 * n + stir * 0.2, 0.12, 1));
            color[k] = rampColor('thermal', T);
          }
        }
      }
    }
  }

  window.DPX.HeatExchangerScene = HeatExchangerScene;
})();
