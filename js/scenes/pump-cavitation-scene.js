/* PumpCavitationScene — centrifugal pump in front view.
 * A backward-curved impeller spins inside a spiral volute that discharges
 * into a pipe. Liquid is transported outward through the blade passages and
 * around the volute. When suction pressure drops (slow cycle, or hovering),
 * vapour bubbles nucleate on the blades' suction side near the eye, grow,
 * ride outward and collapse in sharp flashes where pressure recovers. */
(function () {
  'use strict';
  const { PhysicsScene, G, rampColor, rampGlyph, dirGlyph, noise3, clamp } = window.DPX;
  const IMP = 1, VOL = 2, PIPE = 3, EYE = 4;
  const TAU = Math.PI * 2;
  const wrap = (a) => a - TAU * Math.floor((a + Math.PI) / TAU);

  class PumpCavitationScene extends PhysicsScene {
    constructor(opts = {}) {
      super('pump', 'MULTIPHASE', 'A centrifugal pump: the impeller spins and vapour bubbles form and collapse as it cavitates.');
      this.opts = Object.assign({ blades: 6, curve: 1.2, omega: 2.4 }, opts);
      this.rot = 0;
      this.bubbles = [];
    }

    setup() {
      const { cols, rows, ar, H, W, N } = this;
      const ink = (v) => rampColor('ink', v);
      this.xc = W * 0.4;
      this.yc = H * 0.56;
      const Ri = (this.Ri = Math.min(H * 0.25, W * 0.15));
      this.Rh = Ri * 0.2;
      this.Re = Ri * 0.38;
      this.w0 = Math.max(2, Ri * 0.12);
      this.w1 = Ri * 0.62;
      const { xc, yc, Re, w0, w1 } = this;
      const kind = (this.kind = new Uint8Array(N));
      const aux = (this.aux = new Float32Array(N));
      const outerAt = (al) => Ri + 1 + w0 + (w1 - w0) * (al / TAU);
      const pipeTop = yc - (Ri + 1 + w1), pipeBot = yc - (Ri + 1 + w0) - ar;
      const xEnd = Math.min(W - 3, xc + W * 0.45);
      for (let j = 0; j < rows; j++) {
        const y = (j + 0.5) * ar;
        for (let i = 0; i < cols; i++) {
          const k = j * cols + i, x = i + 0.5;
          const dx = x - xc, dy = y - yc, r = Math.sqrt(dx * dx + dy * dy);
          const al = ((Math.atan2(dy, dx) + Math.PI / 2) % TAU + TAU) % TAU;
          // Discharge pipe leaving the volute tangentially at the top.
          if (x > xc && x < xEnd) {
            if (y >= pipeTop && y < pipeBot) { kind[k] = PIPE; aux[k] = x - xc; continue; }
            if (y >= pipeTop - ar && y < pipeTop) { this.setGeo(i, j, G['='], ink(0.92)); continue; }
            if (y >= pipeBot && y < pipeBot + ar && r > Ri + 1 + w0) { this.setGeo(i, j, G['='], ink(0.92)); continue; }
          }
          if (Math.abs(x - xEnd) < 0.9 && y > pipeTop - ar * 2.5 && y < pipeBot + ar * 1.5) { this.setGeo(i, j, G['|'], ink(0.95)); continue; }
          if (r < Re) { kind[k] = r < this.Rh ? 0 : EYE; continue; }
          if (r < Ri) { kind[k] = IMP; continue; }
          const ro = outerAt(al);
          if (r < ro) { kind[k] = VOL; aux[k] = al; continue; }
          if (r < ro + ar * 1.15 && !(x > xc && y < pipeBot + ar)) {
            const tx = -dy, ty = dx;
            this.setGeo(i, j, dirGlyph(tx, ty), ink(0.92));
          } else if (r < ro + ar * 2.2 && !(x > xc && y < pipeBot + ar)) {
            this.setGeo(i, j, G['/'], ink(0.28));
          }
        }
      }
      // Tongue (cutwater) between volute start and discharge.
      const jt = Math.floor((yc - Ri - 1 - w0) / ar);
      for (let i = Math.floor(xc); i < Math.floor(xc + w1 * 0.9); i++) {
        const k = this.setGeo(i, jt, G['='], ink(0.95));
        if (k >= 0) kind[k] = 0;
      }
      // Pump foot.
      const jb = Math.min(rows - 1, Math.floor((yc + Ri + w1 + ar * 2.4) / ar));
      for (let i = Math.floor(xc - Ri * 1.3); i <= Math.ceil(xc + Ri * 1.3); i++) {
        if (jb < rows) this.setGeo(i, jb, G['='], ink(0.85));
      }
      this.bubbles = [];
    }

    update(dt, p) {
      const gust = p && p.active ? p.energy : 0;
      const o = this.opts;
      this.omega = o.omega * (1 + 0.35 * gust);
      this.rot = (this.rot + this.omega * dt) % TAU;
      const sigma = 0.5 + 0.5 * Math.sin(this.t * 0.55);
      this.cav = clamp(0.95 - sigma + gust * 0.9, 0, 1);
      // Nucleate bubbles on each blade's suction side near the leading edge.
      const rate = this.cav > 0.15 ? this.cav * 55 : 0;
      let n = rate * dt;
      while (n > 0 && this.bubbles.length < 600) {
        if (Math.random() < n) {
          this.bubbles.push({
            b: Math.floor(Math.random() * o.blades),
            r: this.Re + Math.random() * (this.Ri - this.Re) * 0.12,
            side: 0.1 + Math.random() * 0.12,
            collapseAt: this.Re + (this.Ri - this.Re) * (0.35 + 0.35 * Math.random() * (1 - this.cav * 0.5)),
            flash: 0,
          });
        }
        n -= 1;
      }
      const vr = (this.Ri - this.Re) * 0.9;
      for (const bb of this.bubbles) {
        if (bb.flash > 0) { bb.flash -= dt; continue; }
        bb.r += vr * dt * (0.6 + 0.4 * Math.random());
        if (bb.r > bb.collapseAt) bb.flash = 0.14;
      }
      this.bubbles = this.bubbles.filter((bb) => !(bb.flash < 0));
    }

    bladeAngle(b, r) {
      const o = this.opts;
      return this.rot + (b * TAU) / o.blades - o.curve * ((r - this.Re) / (this.Ri - this.Re));
    }

    compose() {
      const { cols, rows, ar, N, kind, aux, geoG, geoC, code, color, t, xc, yc, Ri, Rh, Re } = this;
      const ink = (v) => rampColor('ink', v);
      const o = this.opts;
      const put = (i, j, g, c) => {
        if (i < 0 || j < 0 || i >= cols || j >= rows) return;
        code[j * cols + i] = g; color[j * cols + i] = c;
      };
      const cr = Math.cos(-this.rot * 0.35), sr = Math.sin(-this.rot * 0.35);
      let k = 0;
      for (let j = 0; j < rows; j++) {
        const y = (j + 0.5) * ar;
        for (let i = 0; i < cols; i++, k++) {
          if (geoG[k]) { code[k] = geoG[k]; color[k] = geoC[k]; continue; }
          const kd = kind[k];
          const x = i + 0.5 + this.dispX[k];
          const dx = x - xc, dy = y - yc, r = Math.sqrt(dx * dx + dy * dy);
          code[k] = 0;
          if (!kd) {
            if (r < Rh) {
              // Hub with a keyway that turns with the shaft.
              const ka = wrap(Math.atan2(dy, dx) - this.rot);
              code[k] = r < 1.2 ? G['O'] : Math.abs(ka) < 0.5 ? G['@'] : G['#'];
              color[k] = ink(r < 1.2 ? 0.97 : 0.75);
            }
            continue;
          }
          if (kd === IMP || kd === EYE) {
            const th = Math.atan2(dy, dx);
            if (kd === IMP) {
              let blade = -1;
              for (let b = 0; b < o.blades; b++) {
                if (Math.abs(wrap(th - this.bladeAngle(b, r))) * r < 0.85) { blade = b; break; }
              }
              if (blade >= 0) {
                const dth = -o.curve / (Ri - Re);
                const tx = Math.cos(th) - r * dth * Math.sin(th), ty = Math.sin(th) + r * dth * Math.cos(th);
                code[k] = dirGlyph(tx, ty);
                color[k] = ink(0.95);
                continue;
              }
            }
            // Liquid in the rotating passages, transported outward.
            const rx = dx * cr - dy * sr, ry = dx * sr + dy * cr;
            const n = noise3(rx * 0.22, ry * 0.22, r * 0.12 - t * 1.6);
            const pr = clamp((r - Re * 0.5) / (Ri - Re * 0.5), 0, 1);
            const vap = kd === EYE || r < Re + (Ri - Re) * 0.3 ? this.cav * 0.35 : 0;
            const I = 0.25 + 0.3 * pr + 0.3 * n;
            code[k] = rampGlyph(clamp(I - vap * 0.4, 0.08, 1));
            color[k] = vap > 0.12 ? ink(0.3 + 0.3 * I) : rampColor('cold', 0.2 + 0.45 * pr + 0.15 * n);
          } else if (kd === VOL) {
            const al = aux[k];
            const om = this.omega * 0.45 * t;
            const qx = dx * Math.cos(-om) - dy * Math.sin(-om), qy = dx * Math.sin(-om) + dy * Math.cos(-om);
            const n = noise3(qx * 0.16, qy * 0.16, t * 0.3);
            const I = 0.35 + 0.18 * (al / TAU) + 0.4 * n;
            code[k] = rampGlyph(clamp(I, 0.1, 1));
            color[k] = rampColor('cold', 0.45 + 0.35 * (al / TAU) + 0.1 * n);
          } else if (kd === PIPE) {
            const n = noise3((aux[k] - t * 26) * 0.15, y * 0.4, t * 0.3);
            code[k] = rampGlyph(clamp(0.5 + 0.45 * n, 0.15, 1));
            color[k] = rampColor('cold', 0.78 + 0.15 * n);
          }
        }
      }
      // Cavitation bubbles: grow while riding the blade, flash on collapse.
      for (const bb of this.bubbles) {
        const th = this.bladeAngle(bb.b, bb.r) + bb.side * (Re / bb.r) * 2.2;
        const px = xc + bb.r * Math.cos(th), py = yc + bb.r * Math.sin(th);
        const i = Math.floor(px), j = Math.floor(py / ar);
        if (bb.flash > 0) {
          put(i, j, G['*'], rampColor('heat', 0.95));
          if (bb.flash > 0.07) { put(i - 1, j, G['-'], rampColor('heat', 0.8)); put(i + 1, j, G['-'], rampColor('heat', 0.8)); }
        } else {
          const grow = (bb.r - Re) / (bb.collapseAt - Re);
          put(i, j, G[grow > 0.55 ? 'O' : grow > 0.2 ? 'o' : '.'], ink(0.97));
        }
      }
    }
  }

  window.DPX.PumpCavitationScene = PumpCavitationScene;
})();
