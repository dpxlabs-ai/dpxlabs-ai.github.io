/* FlameScene — buoyant turbulent diffusion flame above a burner.
 * Temperature and smoke are advected by a buoyancy-driven velocity field with
 * entrainment, a puffing instability and curl-noise turbulence. Spatially
 * varying cooling tears the flame tip into rising pockets of hot gas. */
(function () {
  'use strict';
  const { PhysicsScene, G, rampColor, rampGlyph, curl2, noise3, fbm3, clamp } = window.DPX;
  const GAS = 1, FUEL = 2;

  class FlameScene extends PhysicsScene {
    constructor(opts = {}) {
      super('combustion', 'REACTIONS', 'A turbulent flame rising from a burner, with a hot core and curling plume.');
      this.opts = Object.assign({ puffHz: 1.6, nozzle: 0.11 }, opts);
      this.warmupSteps = 120;
    }

    setup() {
      const { cols, rows, N } = this;
      const ink = (v) => rampColor('ink', v);
      this.Xc = cols / 2;
      this.bw = clamp(Math.round(cols * this.opts.nozzle), 8, 22);
      this.jLip = rows - 6;
      this.jBase = rows - 2;
      this.Vb = this.H * 0.34;
      this.kind = new Uint8Array(N);
      this.T = this.field(); this.T2 = this.field();
      this.S = this.field(); this.S2 = this.field();
      this.u = this.field(); this.v = this.field();

      const hb = this.bw / 2;
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const k = j * cols + i;
          const ax = Math.abs(i + 0.5 - this.Xc);
          if (j < this.jLip) { this.kind[k] = GAS; continue; }
          if (j === this.jLip) {
            if (ax < hb) this.kind[k] = FUEL;
            else if (ax < hb + 2) this.setGeo(i, j, G['#'], ink(0.9));
          } else if (j < this.jBase) {
            if (ax < hb) this.kind[k] = FUEL;
            else if (ax < hb + 1.2) this.setGeo(i, j, G['|'], ink(0.9));
            else if (ax < hb + 2.2) this.setGeo(i, j, G['/'], ink(0.35));
          } else if (j === this.jBase) {
            if (ax < this.bw * 1.15) this.setGeo(i, j, G['='], ink(0.9));
          } else if (ax < this.bw * 1.35) {
            this.setGeo(i, j, G['/'], ink(0.3));
          }
        }
      }
    }

    update(dt, p) {
      const { cols, rows, ar, Xc, Vb, kind, u, v, t, jLip } = this;
      const o = this.opts;
      const puff = 1 + 0.28 * Math.sin(t * 6.2832 * o.puffHz) + 0.1 * Math.sin(t * 6.2832 * 0.47);
      const c = { x: 0, y: 0 }, s = 0.1;
      let k = 0;
      for (let j = 0; j < rows; j++) {
        const y = (j + 0.5) * ar;
        const h = clamp((jLip - j) / jLip, 0, 1);
        for (let i = 0; i < cols; i++, k++) {
          if (kind[k] !== GAS) { u[k] = 0; v[k] = 0; continue; }
          const x = i + 0.5;
          const Tl = this.T[k];
          let uu = -(x - Xc) * 0.35 * (1 - h) * (1 - h);
          let vv = -Vb * (0.35 + 0.9 * Tl) * puff - Vb * 0.1;
          const amp = Vb * (0.45 + 1.1 * h);
          curl2(x * s, (y + Vb * t * 0.85) * s, t * 0.6, c);
          uu += amp * c.x * 0.75;
          vv += amp * c.y * 0.45;
          if (p.active) {
            const g = this.pointerWeight(i, j, p);
            uu += p.vx * g * 1.1;
            vv += p.vy * ar * g * 1.1;
          }
          u[k] = uu;
          v[k] = vv;
        }
      }
      this.advect(this.T, this.T2, u, v, dt, kind);
      this.advect(this.S, this.S2, u, v, dt, kind);
      let tmp = this.T; this.T = this.T2; this.T2 = tmp;
      tmp = this.S; this.S = this.S2; this.S2 = tmp;

      const T = this.T, S = this.S, hb = this.bw / 2;
      const sDecay = Math.exp(-0.45 * dt);
      k = 0;
      for (let j = 0; j < rows; j++) {
        const y = (j + 0.5) * ar;
        const h = clamp((jLip - j) / jLip, 0, 1);
        for (let i = 0; i < cols; i++, k++) {
          if (kind[k] !== GAS) continue;
          const x = i + 0.5;
          let Tl = T[k];
          if (j >= jLip - 3 && Math.abs(x - Xc) < hb) {
            const src = (0.88 + 0.12 * noise3(x * 0.4, t * 3, 0)) * (0.85 + 0.15 * puff);
            Tl = Math.max(Tl, src);
          }
          const cool = (0.25 + 1.6 * Math.max(0, 0.45 + fbm3(x * 0.11, (y + Vb * t * 0.7) * 0.11, t * 0.6))) * (0.35 + 1.1 * h);
          Tl *= Math.exp(-cool * dt);
          T[k] = Tl;
          let sm = S[k] * sDecay + Tl * dt * 0.8;
          if (j < 2) sm *= 0.8;
          S[k] = sm > 1 ? 1 : sm;
        }
      }
    }

    compose() {
      const { cols, rows, kind, geoG, geoC, code, color, T, S, t, Xc } = this;
      let k = 0;
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++, k++) {
          if (geoG[k]) { code[k] = geoG[k]; color[k] = geoC[k]; continue; }
          const kd = kind[k];
          if (kd === FUEL) {
            const n = noise3((i - Xc) * 0.6, (j + t * 9) * 0.7, t * 0.4);
            code[k] = rampGlyph(n > 0.15 ? 0.25 : n > -0.25 ? 0.12 : 0);
            color[k] = rampColor('cold', 0.45);
            continue;
          }
          if (kd !== GAS) { code[k] = 0; continue; }
          const Tl = T[k];
          if (Tl > 0.07) {
            const fl = noise3(i * 0.45, j * 0.7 + t * 6, t * 1.3);
            code[k] = rampGlyph(clamp(Tl * 1.12 + fl * 0.16 * Math.min(1, Tl * 2), 0, 1));
            color[k] = rampColor('heat', clamp((Tl - 0.07) * 1.25, 0, 1));
          } else {
            const sm = S[k];
            if (sm > 0.1) {
              code[k] = rampGlyph(Math.min(0.32, sm * 0.42));
              color[k] = rampColor('ink', 0.12 + sm * 0.3);
            } else code[k] = 0;
          }
        }
      }
    }
  }

  window.DPX.FlameScene = FlameScene;
})();
