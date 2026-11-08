/* WindTurbineScene — two turbines in an atmospheric boundary layer.
 * Sheared inflow, momentum-theory wake deficit that expands downstream, and
 * tip vortices shed each time a blade passes the top or bottom of the rotor.
 * The downstream turbine sits in the first one's wake and turns visibly
 * slower. Smoke-like dye is advected through the field; hovering adds a gust. */
(function () {
  'use strict';
  const { PhysicsScene, G, rampColor, rampGlyph, dirGlyph, curl2, noise3, clamp } = window.DPX;
  const AIR = 1;
  const TAU = Math.PI * 2;

  class WindTurbineScene extends PhysicsScene {
    constructor(opts = {}) {
      super('wind', 'WIND', 'Two wind turbines: tip vortices spiral off the blades and the downstream rotor turns slower in the wake.');
      this.opts = Object.assign({ tsr: 5, induction: 0.3, spread: 0.075 }, opts);
      this.warmupSteps = 160;
    }

    setup() {
      const { cols, rows, ar, H, W, N } = this;
      const ink = (v) => rampColor('ink', v);
      this.yG = H * 0.93;
      this.Yh = H * 0.42;
      this.Rr = Math.min(H * 0.3, W * 0.1);
      this.U0 = clamp(cols * 0.16, 12, 30);
      this.turbines = [W * 0.16, W * 0.6].map((x) => ({ x, phi: Math.random() * TAU, omega: 0, lastTip: [] }));
      this.marks = [];
      this.kind = new Uint8Array(N);
      this.D = this.field(); this.D2 = this.field();
      this.u = this.field(); this.v = this.field();
      const jG = Math.floor(this.yG / ar);
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const k = j * cols + i;
          if (j < jG) this.kind[k] = AIR;
          else if (j === jG) this.setGeo(i, j, G['='], ink(0.85));
          else this.setGeo(i, j, G['/'], ink(0.28));
        }
      }
    }

    /** Free-stream speed at height y (power-law shear). */
    inflow(y) {
      const z = clamp((this.yG - y) / (this.yG - this.Yh), 0.02, 1.6);
      return this.U0 * Math.pow(z, 0.18);
    }

    /** Wake deficit multiplier of turbine n at (x, y). */
    wake(n, x, y) {
      const tb = this.turbines[n];
      const dx = x - tb.x;
      if (dx <= 0) return 1;
      const Rw = this.Rr * (1 + this.opts.spread * dx / this.Rr);
      const d = 2 * this.opts.induction * (this.Rr / Rw) ** 2 * Math.min(1, dx / (this.Rr * 0.6) + 0.3);
      const e = (y - this.Yh) / (Rw * 0.95);
      return 1 - d * Math.exp(-(e * e) * (e * e) * 1.5);
    }

    update(dt, p) {
      const { cols, rows, ar, kind, u, v, t, Yh, Rr } = this;
      const gust = p.active ? p.energy : 0;
      // Rotor speeds follow the local hub-height inflow.
      this.turbines.forEach((tb, n) => {
        let Uin = this.inflow(Yh) * (1 + 0.25 * gust);
        for (let m = 0; m < n; m++) Uin *= this.wake(m, tb.x, Yh);
        tb.Uin = Uin;
        tb.omega = (this.opts.tsr * Uin) / Rr * 0.2;
        const before = tb.phi;
        tb.phi += tb.omega * dt;
        // Tip vortex markers whenever a blade passes the top (2πn) or bottom (π + 2πn).
        for (let bl = 0; bl < 3; bl++) {
          const off = (bl * TAU) / 3;
          const n0 = Math.floor((before + off) / Math.PI), n1 = Math.floor((tb.phi + off) / Math.PI);
          for (let q = n0 + 1; q <= n1; q++) this.marks.push({ n, x: tb.x + 1, s: q % 2 === 0 ? 1 : -1, age: 0 });
        }
      });
      for (const m of this.marks) {
        const tb = this.turbines[m.n];
        m.age += dt;
        m.x += tb.Uin * 0.82 * dt;
        const Rw = Rr * (1 + this.opts.spread * (m.x - tb.x) / Rr);
        m.y = Yh - m.s * Rw * (0.98 + 0.04 * Math.sin(m.age * 3));
      }
      this.marks = this.marks.filter((m) => m.x < cols + 2 && m.age < 14);

      const c = { x: 0, y: 0 };
      let k = 0;
      for (let j = 0; j < rows; j++) {
        const y = (j + 0.5) * ar;
        const U = this.inflow(y);
        for (let i = 0; i < cols; i++, k++) {
          if (kind[k] !== AIR) { u[k] = 0; v[k] = 0; continue; }
          const x = i + 0.5;
          let w = 1, turb = 0.04;
          for (let n = 0; n < this.turbines.length; n++) {
            const f = this.wake(n, x, y);
            w *= f;
            if (f < 0.97) turb += (1 - f) * 0.9;
          }
          let uu = U * w, vv = 0;
          curl2(x * 0.08 - t * U * 0.08, y * 0.08, t * 0.4, c);
          uu += U * turb * c.x * 0.5;
          vv += U * turb * c.y * 0.5;
          if (p.active) { const g = this.pointerWeight(i, j, p); uu += p.vx * g; vv += p.vy * ar * g; }
          u[k] = uu * (1 + 0.25 * gust);
          v[k] = vv;
        }
      }
      this.advect(this.D, this.D2, u, v, dt, kind);
      const tmp = this.D; this.D = this.D2; this.D2 = tmp;
      const D = this.D, decay = Math.exp(-0.12 * dt);
      for (let j = 0; j < rows; j++) {
        const y = (j + 0.5) * ar;
        for (let i = 0; i < cols; i++) {
          const kk = j * cols + i;
          if (kind[kk] !== AIR) continue;
          if (i < 2) { const q = noise3(y * 0.22, t * 1.1, 3.1); D[kk] = q > 0.18 ? 0.55 + q : 0; }
          else D[kk] *= decay;
        }
      }
    }

    compose() {
      const { cols, rows, ar, kind, geoG, geoC, code, color, D, u, v, Yh, Rr, U0 } = this;
      const ink = (q) => rampColor('ink', q);
      const put = (i, j, g, cl) => {
        if (i < 0 || j < 0 || i >= cols || j >= rows) return;
        code[j * cols + i] = g; color[j * cols + i] = cl;
      };
      // Air.
      for (let k = 0; k < this.N; k++) {
        if (geoG[k]) { code[k] = geoG[k]; color[k] = geoC[k]; continue; }
        if (kind[k] !== AIR) { code[k] = 0; continue; }
        // Keep the swept disc clear so the blades read cleanly.
        const ci = k % cols, cy = (((k / cols) | 0) + 0.5) * ar;
        let disc = false;
        for (const tb of this.turbines) {
          if (Math.abs(ci + 0.5 - tb.x) < 0.28 * Rr + 1.5 && Math.abs(cy - Yh) < Rr + ar) disc = true;
        }
        if (disc) { code[k] = 0; continue; }
        const sp = Math.min(1.4, Math.hypot(u[k], v[k]) / U0);
        const I = 0.075 * sp + 0.62 * D[k];
        code[k] = rampGlyph(clamp(I, 0, 1));
        color[k] = D[k] > 0.25 ? rampColor('cold', 0.3 + 0.45 * D[k]) : rampColor('mist', 0.25 + 0.5 * Math.min(1, sp));
      }
      // Tip vortices.
      for (const m of this.marks) {
        const fade = Math.exp(-m.age * 0.18);
        const ci = Math.floor(m.x), cj = Math.floor(m.y / ar);
        for (let dj = -2; dj <= 2; dj++) {
          for (let di = -3; di <= 3; di++) {
            const ex = di, ey = dj * ar, d = Math.sqrt(ex * ex + ey * ey);
            if (d > 3.2) continue;
            const I = (d < 1.4 ? 1 : 0.55) * fade;
            if (I < 0.15) continue;
            put(ci + di, cj + dj, rampGlyph(I), rampColor('cold', 0.55 + 0.45 * I));
          }
        }
      }
      // Turbines: tower, nacelle, swept-disc trace, blades.
      const jG = Math.floor(this.yG / ar), jh = Math.floor(Yh / ar);
      for (const tb of this.turbines) {
        const xr = Math.floor(tb.x);
        for (let j = jh + 1; j < jG; j++) {
          const wid = j > jG - 3 ? 1 : 0;
          put(xr + 2 - wid, j, G['|'], ink(0.9));
          put(xr + 3 + wid, j, G['|'], ink(0.9));
        }
        for (let a = 0; a < 48; a++) {
          const ang = (a / 48) * TAU;
          put(Math.floor(tb.x + 0.5 + 0.28 * Rr * Math.sin(ang)), Math.floor((Yh - Rr * Math.cos(ang)) / ar), G['.'], ink(0.3));
        }
        for (let b = 0; b < 3; b++) {
          const ang = tb.phi + (b * TAU) / 3;
          const tx = 0.28 * Rr * Math.sin(ang), ty = -Rr * Math.cos(ang);
          const g = dirGlyph(tx, ty);
          const steps = Math.ceil(Rr * 1.1);
          for (let s = 2; s <= steps; s++) {
            const f = s / steps;
            put(Math.floor(tb.x + 0.5 + tx * f), Math.floor((Yh + ty * f) / ar), g, ink(0.95));
          }
        }
        put(xr - 1, jh, G['('], ink(0.95));
        put(xr, jh, G['@'], ink(0.95));
        for (let i = xr + 1; i <= xr + 6; i++) { put(i, jh, G['#'], ink(0.8)); put(i, jh - 1, G['_'], ink(0.7)); }
        put(xr + 7, jh, G[']'], ink(0.9));
      }
    }
  }

  window.DPX.WindTurbineScene = WindTurbineScene;
})();
