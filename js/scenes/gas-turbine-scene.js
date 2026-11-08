/* GasTurbineScene — power-plant gas turbine generator set, side cross-section.
 * Intake bellmouth → multi-stage axial compressor (rotating blade rows,
 * converging annulus, air heating as it is compressed) → two combustor cans
 * with flames and dilution jets → turbine stages (hot gas expanding and
 * cooling) → exhaust diffuser. One shaft drives an electrical generator whose
 * output leaves as pulses along a cable to a transmission tower.
 * Gas parcels are transported with a time-of-flight coordinate built from the
 * annulus area, so flow speeds up where the passage narrows. Hovering adds load. */
(function () {
  'use strict';
  const { PhysicsScene, G, rampColor, rampGlyph, dirGlyph, noise3, smoothstep, mix, clamp } = window.DPX;
  const PATH = 1, ROTOR_C = 2, STATOR_C = 3, ROTOR_T = 4, STATOR_T = 5, CAN = 6, ANNULUS = 7, GEN_ROTOR = 8, WINDING = 9, CABLE = 10, SHAFT = 11;

  class GasTurbineScene extends PhysicsScene {
    constructor(opts = {}) {
      super('power', 'POWER', 'A power-plant gas turbine: compressor, combustors and turbine spin a generator that sends electricity to the grid.');
      this.opts = Object.assign({ compressorStages: 8, turbineStages: 3 }, opts);
    }

    setup() {
      const { cols, rows, ar, H, W, N } = this;
      const ink = (v) => rampColor('ink', v);
      const Yc = (this.Yc = H / 2);
      const X = (this.X = {
        g0: Math.round(W * 0.05), g1: Math.round(W * 0.16),
        b0: W * 0.19, c0: W * 0.24, c1: W * 0.45, k0: W * 0.5, k1: W * 0.57, t0: W * 0.6, t1: W * 0.73, e1: W * 0.94,
      });
      const rO = (x) => {
        if (x < X.c0) { const f = clamp((x - X.b0) / (X.c0 - X.b0), 0, 1); return mix(H * 0.4, H * 0.34, 1 - (1 - f) * (1 - f)); }
        if (x < X.c1) return mix(H * 0.34, H * 0.21, (x - X.c0) / (X.c1 - X.c0));
        if (x < X.t0) {
          const up = smoothstep(X.c1, X.c1 + W * 0.035, x), dn = smoothstep(X.t0 - W * 0.03, X.t0, x);
          return mix(mix(H * 0.21, H * 0.36, up), H * 0.2, dn);
        }
        if (x < X.t1) return mix(H * 0.2, H * 0.3, (x - X.t0) / (X.t1 - X.t0));
        return mix(H * 0.3, H * 0.38, clamp((x - X.t1) / (X.e1 - X.t1), 0, 1));
      };
      const rI = (x) => {
        if (x < X.c0) return H * 0.11 * Math.sqrt(clamp((x - X.b0 - 1) / (X.c0 - X.b0 - 1), 0, 1));
        if (x < X.c1) return mix(H * 0.11, H * 0.14, (x - X.c0) / (X.c1 - X.c0));
        if (x < X.t0) return H * 0.09;
        if (x < X.t1) return H * 0.12;
        return H * 0.12 * Math.pow(1 - clamp((x - X.t1) / (X.e1 - X.t1), 0, 1), 1.4);
      };
      this.rOc = new Float32Array(cols); this.rIc = new Float32Array(cols);
      const sO = new Float32Array(cols), sI = new Float32Array(cols);
      this.tau = new Float32Array(cols);
      const U0 = (this.U0 = clamp(cols * 0.2, 16, 36));
      const A0 = (H * 0.34) ** 2 - (H * 0.11) ** 2;
      let tau = 0;
      for (let i = 0; i < cols; i++) {
        const x = i + 0.5;
        this.rOc[i] = rO(x); this.rIc[i] = rI(x);
        sO[i] = rO(x + 0.5) - rO(x - 0.5); sI[i] = rI(x + 0.5) - rI(x - 0.5);
        const A = Math.max(1, this.rOc[i] ** 2 - this.rIc[i] ** 2);
        const hot = x > X.k0 ? 2.2 : 1; // gas expands once burned
        tau += 1 / clamp((U0 * A0 * hot) / A, U0 * 0.4, U0 * 3.5);
        this.tau[i] = tau;
      }
      this.rc = H * 0.235; this.hc = H * 0.075;
      this.holes = [0.42, 0.66].map((f) => X.k0 + (X.k1 - X.k0) * f);

      // Blade-row columns.
      const nc = this.opts.compressorStages, nt = this.opts.turbineStages;
      const bladeKind = new Uint8Array(cols);
      for (let s = 0; s < nc; s++) {
        const xr = Math.round(X.c0 + 1 + ((X.c1 - X.c0 - 3) * s) / nc);
        bladeKind[xr] = ROTOR_C; bladeKind[xr + 2] = STATOR_C;
      }
      for (let s = 0; s < nt; s++) {
        const xs = Math.round(X.t0 + 1 + ((X.t1 - X.t0 - 3) * s) / nt);
        bladeKind[xs] = STATOR_T; bladeKind[xs + 2] = ROTOR_T;
      }

      const kind = (this.kind = new Uint8Array(N));
      const slope = (s, top) => (Math.abs(s) > 2.6 ? '|' : s > 0.3 ? (top ? '/' : '\\') : s < -0.3 ? (top ? '\\' : '/') : '=');
      const geo = (i, j, ch, v) => { const k = this.setGeo(i, j, G[ch], ink(v)); if (k >= 0) kind[k] = 0; };
      const Gh = (this.Gh = H * 0.2);
      this.jShaft = Math.floor(Yc / ar);
      for (let j = 0; j < rows; j++) {
        const y = (j + 0.5) * ar, dy = y - Yc, ady = Math.abs(dy), top = dy < 0;
        for (let i = 0; i < cols; i++) {
          const k = j * cols + i, x = i + 0.5;
          // Generator.
          if (x >= X.g0 && x <= X.g1 && ady < Gh) {
            if (ady > Gh - ar || x < X.g0 + 1 || x > X.g1 - 1) geo(i, j, ady > Gh - ar ? '=' : '|', 0.92);
            else if (ady > Gh * 0.62) kind[k] = WINDING;
            else if (ady > Gh * 0.52) continue;
            else kind[k] = GEN_ROTOR;
            continue;
          }
          // Coupling shaft from generator to compressor nose.
          if (j === this.jShaft && x > X.g1 && x < X.b0 + 2) { kind[k] = SHAFT; continue; }
          if (x < X.b0 || x > X.e1) continue;
          const ro = this.rOc[i], ri = this.rIc[i];
          // Casing.
          const dO = ady - ro;
          if (dO >= 0 && dO < ar * 1.05 * Math.sqrt(1 + sO[i] * sO[i])) { geo(i, j, slope(sO[i], top), 0.92); continue; }
          if (dO >= 0) continue;
          // Hub / rotor drum with the shaft running through it.
          if (ady < ri) {
            if (j === this.jShaft) kind[k] = SHAFT;
            else if (ri - ady < ar * 1.05 * Math.sqrt(1 + sI[i] * sI[i])) geo(i, j, slope(-sI[i], top), 0.88);
            continue; // drum interior left open

          }
          // Combustor cans with fuel injectors.
          if (x >= X.k0 - 2 && x <= X.k1) {
            const q = ady - this.rc;
            const inCan = Math.abs(q) < this.hc && x >= X.k0;
            const onWall = inCan && (Math.abs(q) > this.hc - ar || x < X.k0 + 1);
            if (onWall) {
              const hole = this.holes.some((h) => Math.abs(x - h) < 1.1) && x > X.k0 + 1;
              if (hole) kind[k] = ANNULUS; else geo(i, j, x < X.k0 + 1 ? '(' : '=', 0.9);
              continue;
            }
            if (inCan) { kind[k] = CAN; continue; }
            if (Math.abs(x - (X.k0 - 1.5)) < 0.6 && ady > this.rc - 0.5 && ady < ro) { geo(i, j, '|', 0.85); continue; }
            if (Math.abs(x - (X.k0 - 0.5)) < 0.6 && Math.abs(q) < ar * 0.6) { geo(i, j, '>', 0.95); continue; }
          }
          if (x > X.c1 + 1 && x < X.k1) { kind[k] = ANNULUS; continue; }
          kind[k] = bladeKind[i] || PATH;
        }
      }
      // Base skid under the whole set.
      const jb = rows - 1;
      for (let i = X.g0; i <= Math.round(X.e1); i++) geo(i, jb, '=', 0.8);
      for (const xs of [X.g0 + 2, X.g1 - 2, Math.round(X.c0), Math.round(X.t0), Math.round(X.t1 + 4)]) {
        for (let j = Math.floor((Yc + (xs < X.b0 ? Gh : this.rOc[xs])) / ar) + 1; j < jb; j++) geo(xs, j, '|', 0.6);
      }
      // Power cable: up from the generator, across the top to a transmission tower.
      const cx = Math.round((X.g0 + X.g1) / 2), jTop = 1, jGen = Math.floor((Yc - Gh) / ar);
      this.cable = [];
      for (let j = jGen - 1; j > jTop; j--) this.cable.push([cx, j]);
      const towerX = 2;
      for (let i = cx; i >= towerX + 3; i--) this.cable.push([i, jTop]);
      this.cable.forEach(([i, j]) => { kind[j * cols + i] = CABLE; });
      this.cableIndex = new Map(this.cable.map(([i, j], n) => [j * cols + i, n]));
      // Small lattice tower where the line lands.
      const tw = [' /\\ ', '/__\\', '|\\/|', '|/\\|'];
      tw.forEach((row, dj) => Array.from(row).forEach((ch, di) => { if (ch !== ' ') geo(towerX - 1 + di, jTop - 1 + dj, ch, 0.75); }));
    }

    update(dt, p) {
      this.load = clamp(0.7 + (p && p.active ? p.energy * 0.6 : 0), 0, 1.3);
    }

    compose() {
      const { cols, rows, ar, N, kind, geoG, geoC, code, color, t, Yc, X, rOc, rIc, tau } = this;
      const ink = (v) => rampColor('ink', v);
      const th = (v) => rampColor('thermal', clamp(v, 0, 1));
      const load = this.load || 0.7;
      const spin = Math.floor(t * 14);
      let k = 0;
      for (let j = 0; j < rows; j++) {
        const y = (j + 0.5) * ar, dy = y - Yc, ady = Math.abs(dy);
        for (let i = 0; i < cols; i++, k++) {
          if (geoG[k]) { code[k] = geoG[k]; color[k] = geoC[k]; continue; }
          const kd = kind[k];
          code[k] = 0;
          if (!kd) continue;
          const x = i + 0.5 + this.dispX[k];
          switch (kd) {
            case SHAFT:
              code[k] = (i + spin) % 5 === 0 ? G['#'] : G['='];
              color[k] = ink(0.9);
              continue;
            case GEN_ROTOR:
              code[k] = (j + spin) % 4 < 2 ? G['#'] : G[':'];
              color[k] = ink((j + spin) % 4 < 2 ? 0.75 : 0.35);
              continue;
            case WINDING: {
              const n = noise3(i * 0.5, j * 0.8, t * 3);
              code[k] = rampGlyph(0.45 + 0.3 * n * load);
              color[k] = rampColor('heat', 0.55 + 0.25 * n);
              continue;
            }
            case CABLE: {
              const s = this.cableIndex.get(k);
              const pulse = ((s - t * 28) % 9 + 9) % 9;
              if (pulse < 1.6 * load) { code[k] = G['*']; color[k] = rampColor('heat', 0.95); }
              else { code[k] = s < this.cable.length && this.cable[s][1] === 1 ? G['-'] : G['|']; color[k] = ink(0.55); }
              continue;
            }
            case CAN: {
              const s = (x - X.k0) / (X.k1 - X.k0), q = (ady - this.rc) / this.hc;
              const n = noise3(x * 0.35 - t * 3.2, ady * 0.35, t * 1.4);
              const core = Math.exp(-(q * q) / (0.18 + 0.55 * s)) * (1 - 0.45 * s);
              const T = clamp((0.55 + 0.45 * core + 0.3 * n) * (0.75 + 0.25 * load), 0, 1);
              code[k] = rampGlyph(0.3 + 0.7 * T);
              color[k] = rampColor('heat', T);
              continue;
            }
            case ANNULUS: {
              const n = noise3((tau[i] - t) * 1.6, dy * 0.35, t * 0.2);
              const hole = this.holes.some((h) => Math.abs(x - h) < 1.3) && Math.abs(ady - this.rc) < this.hc + ar;
              code[k] = rampGlyph(clamp(hole ? 0.7 : 0.3 + 0.4 * n, 0.1, 1));
              color[k] = hole ? rampColor('cold', 0.6) : th(0.4 + 0.05 * n);
              continue;
            }
          }
          // Through-flow: compressor, transition, turbine, exhaust.
          const ro = rOc[i], ri = rIc[i];
          const eta = (ady - ri) / Math.max(1, ro - ri);
          const n = noise3((tau[i] - t) * 1.8, eta * 5 + (dy < 0 ? 0 : 9), t * 0.25);
          let T, I;
          if (x < X.c0) { T = 0.1; I = 0.2 + 0.3 * n; }
          else if (x < X.c1) { const f = (x - X.c0) / (X.c1 - X.c0); T = 0.12 + 0.28 * f; I = 0.3 + 0.15 * f + 0.35 * n; }
          else if (x < X.t0) { T = 0.95; I = 0.6 + 0.3 * n; }
          else if (x < X.t1) { const f = (x - X.t0) / (X.t1 - X.t0); T = 0.95 - 0.3 * f; I = 0.55 - 0.15 * f + 0.35 * n; }
          else { const f = (x - X.t1) / (X.e1 - X.t1); T = 0.65 - 0.15 * f; I = 0.4 - 0.15 * f + 0.4 * n; }
          T = clamp(T * (x > X.k0 ? 0.85 + 0.15 * load : 1), 0, 1);
          if (kd === ROTOR_C || kd === ROTOR_T) {
            if ((j + spin) % 3 !== 2) { code[k] = G[kd === ROTOR_C ? '/' : '\\']; color[k] = ink(0.92); continue; }
          } else if (kd === STATOR_C || kd === STATOR_T) {
            code[k] = G[kd === STATOR_C ? ')' : '(']; color[k] = ink(0.7); continue;
          }
          code[k] = rampGlyph(clamp(I, 0.08, 1));
          color[k] = T > 0.5 ? rampColor('heat', (T - 0.5) * 2) : th(T);
        }
      }
    }
  }

  window.DPX.GasTurbineScene = GasTurbineScene;
})();
