/* PhysicsScene — common interface for every simulation.
 *
 * A scene owns a character grid (cols × rows). Each frame `step(dt, pointer)`
 * evolves its fields and writes one glyph id + one palette id per cell into
 * `this.code` / `this.color`. Static equipment lives in `geoG` / `geoC`.
 *
 * Coordinates: cell (i, j) has physical centre x = i + 0.5, y = (j + 0.5) * ar,
 * where ar = cellHeight / cellWidth, so geometry stays round on screen.
 */
(function () {
  'use strict';
  const { clamp } = window.DPX;

  class PhysicsScene {
    constructor(id, label, description) {
      this.id = id;
      this.label = label;
      this.description = description;
      this.t = 0;
    }

    resize(cols, rows, ar) {
      this.cols = cols;
      this.rows = rows;
      this.ar = ar;
      this.N = cols * rows;
      this.W = cols;
      this.H = rows * ar;
      this.code = new Uint8Array(this.N);
      this.color = new Uint8Array(this.N);
      this.geoG = new Uint8Array(this.N);
      this.geoC = new Uint8Array(this.N);
      this.dispX = new Float32Array(this.N);
      this.dispY = new Float32Array(this.N);
      this._disturbed = false;
      this.setup();
      this.warmup();
    }

    /** Build geometry and fields. Override. */
    setup() {}

    /** Optionally pre-run the simulation so it starts developed. */
    warmup() {
      const idle = { active: false };
      for (let n = 0; n < (this.warmupSteps || 0); n++) {
        this.t += 1 / 30;
        this.update(1 / 30, idle);
      }
    }

    step(dt, pointer) {
      this.t += dt;
      this.disturb(dt, pointer);
      this.update(dt, pointer);
      this.compose();
    }

    update() {}
    compose() {}

    // ---------------------------------------------------------- helpers
    field() {
      return new Float32Array(this.N);
    }

    setGeo(i, j, glyph, color) {
      if (i < 0 || j < 0 || i >= this.cols || j >= this.rows) return -1;
      const k = j * this.cols + i;
      this.geoG[k] = glyph;
      this.geoC[k] = color;
      return k;
    }

    /** Bilinear sample with cell centres at integer coords. */
    sample(f, x, y) {
      const cols = this.cols, rows = this.rows;
      if (x < 0) x = 0; else if (x > cols - 1.001) x = cols - 1.001;
      if (y < 0) y = 0; else if (y > rows - 1.001) y = rows - 1.001;
      const i = x | 0, j = y | 0;
      const fx = x - i, fy = y - j;
      const k = j * cols + i;
      const a = f[k], b = f[k + 1], c = f[k + cols], d = f[k + cols + 1];
      return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
    }

    /** Semi-Lagrangian advection of `src` into `dst` by (u, v) in physical units/s.
     *  `mask` (optional) limits work to cells where mask[k] === 1. */
    advect(src, dst, u, v, dt, mask) {
      const cols = this.cols, rows = this.rows, inv = dt / this.ar;
      let k = 0;
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++, k++) {
          if (mask && mask[k] !== 1) { dst[k] = 0; continue; }
          dst[k] = this.sample(src, i - u[k] * dt, j - v[k] * inv);
        }
      }
    }

    /** Gaussian influence of the pointer at cell (i, j). */
    pointerWeight(i, j, p) {
      const dx = i - p.x, dy = (j - p.y) * this.ar;
      return Math.exp(-(dx * dx + dy * dy) / (p.radius * p.radius)) * p.energy;
    }

    /** Decaying displacement field used by analytic scenes to bend the flow
     *  around the cursor. Units: dispX in columns, dispY in rows. */
    disturb(dt, p) {
      if (!this._disturbed && !(p && p.active)) return;
      const dx = this.dispX, dy = this.dispY, d = Math.exp(-1.4 * dt);
      let any = false;
      for (let k = 0; k < this.N; k++) {
        dx[k] *= d;
        dy[k] *= d;
        if (!any && (dx[k] > 0.01 || dx[k] < -0.01 || dy[k] > 0.01 || dy[k] < -0.01)) any = true;
      }
      if (p && p.active) {
        any = true;
        const r = p.radius * 2;
        const i0 = Math.max(0, Math.floor(p.x - r)), i1 = Math.min(this.cols - 1, Math.ceil(p.x + r));
        const j0 = Math.max(0, Math.floor(p.y - r / this.ar)), j1 = Math.min(this.rows - 1, Math.ceil(p.y + r / this.ar));
        for (let j = j0; j <= j1; j++) {
          for (let i = i0; i <= i1; i++) {
            const g = this.pointerWeight(i, j, p);
            if (g < 0.01) continue;
            const k = j * this.cols + i;
            dx[k] = clamp(dx[k] - p.vx * g * dt * 0.35, -5, 5);
            dy[k] = clamp(dy[k] - p.vy * g * dt * 0.35, -3, 3);
          }
        }
      }
      this._disturbed = any;
    }
  }

  window.DPX.PhysicsScene = PhysicsScene;
})();
