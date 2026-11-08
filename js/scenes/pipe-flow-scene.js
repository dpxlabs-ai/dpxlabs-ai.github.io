/* PipeFlowScene — flow past a cylinder inside a pipe.
 * Velocity = blunt turbulent profile + potential flow around the cylinder
 * + a Kármán street of Lamb–Oseen vortices + curl-noise turbulence in the wake.
 * A smoke-rake dye is advected through that field; glyphs follow the local
 * flow direction and density follows dye + speed. */
(function () {
  'use strict';
  const { PhysicsScene, G, rampColor, rampGlyph, flowGlyph, curl2, noise3, smoothstep, clamp } = window.DPX;
  const FLUID = 1, SOLID = 2;

  class PipeFlowScene extends PhysicsScene {
    constructor(opts = {}) {
      super('flow', 'FLUIDS', 'Flow past a cylinder in a pipe, shedding a turbulent vortex wake.');
      this.opts = Object.assign({ cylinderAt: 0.2, cylinderSize: 0.34, strouhal: 0.25 }, opts);
      this.warmupSteps = 150;
    }

    setup() {
      const { cols, ar, N } = this;
      const o = this.opts;
      this.Yc = this.H / 2;
      this.R = Math.min(this.H * 0.34, cols * 0.2);
      this.xL = Math.max(2, Math.round(cols * 0.03));
      this.xR = cols - this.xL;
      this.L = this.xR - this.xL;
      this.U = clamp(cols * 0.2, 14, 36);
      this.a = this.R * o.cylinderSize;
      this.Xc = this.xL + this.L * o.cylinderAt;
      this.kind = new Uint8Array(N);
      this.D = this.field();
      this.D2 = this.field();
      this.u = this.field();
      this.v = this.field();
      this.w = this.field();
      this.vortices = [];
      this.shedClock = 0;
      this.shedSign = 1;

      const ink = (v) => rampColor('ink', v);
      const flanges = [this.xL, this.xL + this.L * 0.55, this.xR];
      const R = this.R, a = this.a;
      for (let j = 0; j < this.rows; j++) {
        for (let i = 0; i < cols; i++) {
          const k = j * cols + i;
          const x = i + 0.5, y = (j + 0.5) * ar;
          const ady = Math.abs(y - this.Yc);
          const inPipe = x >= this.xL && x <= this.xR;
          let flange = false;
          for (const xf of flanges) if (Math.abs(x - xf) < 0.9 && ady >= R && ady < R + 3.2 * ar) flange = true;
          if (flange) { this.setGeo(i, j, G['|'], ink(0.92)); continue; }
          if (!inPipe) continue;
          if (ady < R) {
            const dx = x - this.Xc, dy = y - this.Yc;
            const rc = Math.sqrt(dx * dx + dy * dy);
            if (rc < a) {
              this.kind[k] = SOLID;
              if (rc > a - 1.6) this.setGeo(i, j, G['#'], ink(0.88));
              else this.setGeo(i, j, G['/'], ink(0.42));
            } else this.kind[k] = FLUID;
          } else if (ady < R + ar) {
            this.setGeo(i, j, G['='], ink(0.9));
          } else if (ady < R + 2 * ar) {
            this.setGeo(i, j, G['/'], ink(0.32));
          }
        }
      }
    }

    update(dt, p) {
      const { cols, rows, ar, U, R, a, Xc, Yc, kind, u, v, t } = this;
      // --- vortex shedding (Strouhal scaling)
      const period = (2 * a) / (this.opts.strouhal * U);
      this.shedClock += dt;
      if (this.shedClock > period / 2) {
        this.shedClock -= period / 2;
        this.shedSign = -this.shedSign;
        const s = this.shedSign;
        this.vortices.push({ x: Xc + a * 1.15, y: Yc - s * a * 0.42, g: s * 2.6 * U * a, age: 0 });
      }
      for (const w of this.vortices) {
        w.age += dt;
        w.x += U * 0.84 * dt;
        w.y += (w.g > 0 ? -1 : 1) * a * 0.06 * dt;
        w.rc = a * 0.42 * Math.sqrt(1 + 0.55 * w.age);
        w.gNow = w.g * Math.exp(-0.06 * w.age);
      }
      this.vortices = this.vortices.filter((w) => w.x < this.xR + a * 2);

      // --- velocity field
      const a2 = a * a, c = { x: 0, y: 0 };
      const tScale = 0.085, drift = U * 0.8 * t * tScale;
      let k = 0;
      for (let j = 0; j < rows; j++) {
        const y = (j + 0.5) * ar, dy = y - Yc, r = dy / R;
        const r2 = r * r, r8 = r2 * r2 * r2 * r2;
        const prof = 1 - r8;
        for (let i = 0; i < cols; i++, k++) {
          if (kind[k] !== FLUID) { u[k] = 0; v[k] = 0; this.w[k] = 0; continue; }
          let om = 0;
          const x = i + 0.5, dx = x - Xc;
          let uu = U * 1.12 * prof, vv = 0;
          const rr2 = dx * dx + dy * dy;
          const inv = a2 / (rr2 * rr2);
          uu -= U * inv * (dx * dx - dy * dy);
          vv -= U * 2 * inv * dx * dy;
          if (dx > 0) {
            const wid = a * (1 + dx / (4 * a));
            uu -= U * 0.5 * Math.exp(-(dy * dy) / (wid * wid)) * Math.exp(-dx / (0.5 * this.L));
          }
          for (let n = 0; n < this.vortices.length; n++) {
            const w = this.vortices[n];
            const ex = x - w.x, ey = y - w.y;
            const q = ex * ex + ey * ey + 1e-3;
            const f = (w.gNow / (6.2832 * q)) * (1 - Math.exp(-q / (w.rc * w.rc)));
            uu -= ey * f;
            vv += ex * f;
            const rc2 = w.rc * w.rc;
            om += (w.gNow / (3.1416 * rc2)) * Math.exp(-q / rc2);
          }
          this.w[k] = om;
          const wake = dx > 0 ? smoothstep(0, 0.45 * this.L, dx) : 0;
          const amp = U * (0.05 + 0.32 * wake);
          curl2(x * tScale - drift, y * tScale, t * 0.35, c);
          uu += amp * c.x * 0.6;
          vv += amp * c.y * 0.6;
          vv *= prof;
          if (p.active) {
            const g = this.pointerWeight(i, j, p);
            uu += p.vx * g * 0.9;
            vv += p.vy * ar * g * 0.9;
          }
          u[k] = uu;
          v[k] = vv;
        }
      }

      // --- dye: advect, inject, decay
      this.advect(this.D, this.D2, u, v, dt, kind);
      const tmp = this.D; this.D = this.D2; this.D2 = tmp;
      const D = this.D, decay = Math.exp(-0.1 * dt);
      k = 0;
      for (let j = 0; j < rows; j++) {
        const y = (j + 0.5) * ar, dy = y - Yc;
        const band = ((dy / R + 1) * 3.5) % 1;
        for (let i = 0; i < cols; i++, k++) {
          if (kind[k] !== FLUID) continue;
          const x = i + 0.5;
          let d = D[k] * decay;
          if (x < this.xL + 1.5) d = band < 0.3 ? 0.55 + 0.35 * Math.sin(t * 2.4 + dy * 0.15) : 0;
          const dx = x - Xc, rc = Math.sqrt(dx * dx + dy * dy);
          // Shear layers separate from the cylinder shoulders.
          if (rc < a + 1.6 && dx > -a * 0.15 && Math.abs(dy) > a * 0.55) d = Math.max(d, 0.7);
          D[k] = d;
        }
      }
    }

    compose() {
      this.w0 = (2.6 * this.U * this.a) / (3.1416 * (this.a * 0.42) ** 2) * 0.55;
      const { N, cols, kind, geoG, geoC, code, color, D, u, v, U, t } = this;
      for (let k = 0; k < N; k++) {
        if (geoG[k]) { code[k] = geoG[k]; color[k] = geoC[k]; continue; }
        if (kind[k] !== FLUID) { code[k] = 0; continue; }
        const uu = u[k], vv = v[k];
        const sp = Math.min(1.4, Math.sqrt(uu * uu + vv * vv) / U);
        const om = this.w[k] / this.w0;
        const aom = om < 0 ? -om : om;
        const i = k % cols, j = (k / cols) | 0;
        const streak = noise3((i - U * 0.9 * t) * 0.22, j * 0.55, t * 0.3);
        let I = 0.06 + 0.2 * sp + 0.09 * streak + 0.65 * D[k] + 0.55 * Math.min(1, aom);
        if (I > 1) I = 1;
        code[k] = flowGlyph(uu, vv, I);
        // Colour separates the two rows of the street: clockwise deep blue, counter-clockwise cyan.
        // Background flow in a light blue; vortices and dye keep the deeper blues.
        if (I < 0.45 && aom < 0.12) color[k] = rampColor('mist', I / 0.45);
        else color[k] = rampColor('cold', om > 0.12 ? 0.35 + 0.65 * I : 0.12 + 0.6 * I);
      }
    }
  }

  window.DPX.PipeFlowScene = PipeFlowScene;
})();
