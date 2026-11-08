/* SceneTransition — dissolves one physical system back into the bare character
 * matrix, then rebuilds the next system out of that same matrix.
 * Each cell gets a release time and a rebuild time from a smooth noise field
 * blended with a left→right sweep, so the change travels as a coherent front. */
(function () {
  'use strict';
  const { G, rampColor, fbm3, noise3 } = window.DPX;

  class SceneTransition {
    resize(cols, rows) {
      this.cols = cols;
      this.rows = rows;
      this.N = cols * rows;
      this.h = new Float32Array(this.N);
      this.seed(0);
    }

    seed(s) {
      const { cols, rows, h } = this;
      let lo = Infinity, hi = -Infinity, k = 0;
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++, k++) {
          const n = fbm3(i * 0.06 + s * 13.1, j * 0.11 + s * 7.7, s * 0.37);
          const v = 0.62 * n + 0.38 * (i / cols - 0.5);
          h[k] = v;
          if (v < lo) lo = v;
          if (v > hi) hi = v;
        }
      }
      for (k = 0; k < this.N; k++) h[k] = (h[k] - lo) / (hi - lo || 1);
    }

    /** p ∈ [0,1]. Writes the blended frame into outCode / outColor. */
    compose(A, B, p, t, outCode, outColor) {
      const { cols, rows, h } = this;
      const { FIELD } = window.DPX;
      const dotA = FIELD + 1, dotB = FIELD + 2, colon = FIELD + 3, plus = FIELD + 6;
      let k = 0;
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++, k++) {
          const out = h[k] * 0.55, back = 0.45 + h[k] * 0.55;
          if (p < out) { outCode[k] = A.code[k]; outColor[k] = A.color[k]; continue; }
          if (p >= back) { outCode[k] = B.code[k]; outColor[k] = B.color[k]; continue; }
          const e1 = p - out, e2 = back - p;
          if (e1 < 0.02 && A.code[k]) {
            outCode[k] = plus; outColor[k] = A.color[k];
          } else if (e2 < 0.02 && B.code[k]) {
            outCode[k] = plus; outColor[k] = B.color[k];
          } else {
            // The underlying matrix: a quiet lattice that breathes slowly.
            const n = noise3(i * 0.18, j * 0.32, t * 0.7);
            outCode[k] = n > 0.38 ? colon : n > -0.1 ? dotB : dotA;
            outColor[k] = rampColor('ink', 0.1 + 0.28 * (n + 1) * 0.5);
          }
        }
      }
    }
  }

  window.DPX.SceneTransition = SceneTransition;
})();
