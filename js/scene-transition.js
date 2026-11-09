/* SceneTransition — a masked-diffusion hand-off between two physical systems,
 * staged the way a diffusion language model rewrites a reply in place.
 *
 * The two scenes merge rather than take turns: every cell morphs directly
 * from the outgoing scene to the incoming one on its own staggered schedule,
 * so at any moment part of the frame is still A, part is already B, and the
 * cells in between are drafts. A draft dips towards a pale, low-confidence
 * guess (occasionally just a mask token) and then sharpens into the target:
 * a character of the right kind whose density and colour converge onto B.
 * The most confident cells (equipment outlines, dense flow) resolve first;
 * empty space resolves last. The final frame equals the scene's first frame. */
(function () {
  'use strict';
  const { G, FIELD, PALETTE, RAMPS, fbm3 } = window.DPX;

  // Per-cell schedule in transition progress p ∈ [0, 1].
  const MORPH_START = 0.0;   // earliest moment a cell starts to morph
  const MORPH_SPREAD = 0.5;  // start times are spread over this much of p
  const MORPH_LEN = 0.48;    // how long one cell takes to go from A to B
  const DIP = 0.55;          // how far a draft thins out mid-morph (0 = no dip)
  const MASK_DENSITY = 0.4;  // share of empty cells that show a mask token mid-morph

  const LEVELS = 10;
  const MASK_GLYPH = G['·'];

  // Visual weight (1 faint … 10 dense) of each literal glyph, so a draft of an
  // equipment outline can blend with field characters of comparable weight.
  const BUCKET_CHARS = [null, ".,'`·", ':;-_~^"', '!il|/\\()rcv?', '+=<>tjf71{}[]',
    'xzsounaeykLTYJ', '*CZVXFPS2345', 'hdbpqwUOGEKA690', '#$&HDRB8', 'NWMQ%', '@'];
  const LIT_LEVEL = new Uint8Array(256).fill(4);
  BUCKET_CHARS.forEach((s, l) => s && Array.from(s).forEach((ch) => {
    if (G[ch] !== undefined) LIT_LEVEL[G[ch]] = l;
  }));
  const levelOf = (g) => (g === 0 ? 0 : g >= FIELD ? g - FIELD : LIT_LEVEL[g]);

  // For every palette colour, the lighter colours of its own ramp ordered from
  // palest to itself, so a draft can fade from one hue and grow into another.
  const lum = (css) => {
    const [r, g, b] = css.match(/\d+/g).map(Number);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const CHAIN = new Array(PALETTE.length);
  Object.values(RAMPS).forEach((ids) => {
    ids.forEach((id) => {
      const L = lum(PALETTE[id]);
      CHAIN[id] = ids.filter((o) => lum(PALETTE[o]) >= L).sort((a, b) => lum(PALETTE[b]) - lum(PALETTE[a]));
    });
  });
  const INK_PALEST = RAMPS.ink[0];
  /** Colour on the way from the ramp's palest step (t = 0) to `id` itself (t = 1). */
  const toward = (id, t) => {
    const c = CHAIN[id];
    if (!c) return id;
    return c[Math.round(Math.min(1, Math.max(0, t)) * (c.length - 1))];
  };

  const hash = (a, b) => {
    let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35);
    h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2d); h ^= h >>> 15;
    return (h >>> 0) / 4294967296;
  };
  const ease = (x) => x * x * (3 - 2 * x);

  class SceneTransition {
    resize(cols, rows) {
      this.cols = cols;
      this.rows = rows;
      this.N = cols * rows;
      this.begin = new Float32Array(this.N); // when the cell starts to morph
      this.mask = new Uint8Array(this.N);    // whether an empty cell shows a mask token
      this.seed(0);
    }

    seed(s) {
      const { N, mask } = this;
      const salt = (s * 1000) | 0;
      for (let k = 0; k < N; k++) mask[k] = hash(k, salt + 104729) < MASK_DENSITY ? 1 : 0;
      this.salt = salt;
      this.ranked = false; // the morph order is ranked against B on the first frame
    }

    /** Confidence-ordered unmasking: structure first, empty space last. */
    _rank(B) {
      const { cols, rows, begin, salt } = this;
      let k = 0;
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++, k++) {
          const g = B.code[k];
          const conf = g === 0 ? 0.15 : g >= FIELD ? 0.35 + 0.55 * ((g - FIELD) / LEVELS) : 1;
          const clump = fbm3(i * 0.06 + salt * 0.001, j * 0.1, 3.3) * 0.5 + 0.5;
          const r = 0.45 * hash(k, salt + 7919) + 0.35 * (1 - conf) + 0.2 * clump;
          begin[k] = MORPH_START + r * MORPH_SPREAD;
        }
      }
      this.ranked = true;
    }

    /** p ∈ [0,1]. Writes the blended frame into outCode / outColor. */
    compose(A, B, p, t, outCode, outColor) {
      if (!this.ranked) this._rank(B);
      const { N, begin, mask } = this;
      for (let k = 0; k < N; k++) {
        const b0 = begin[k];
        if (p < b0) { outCode[k] = A.code[k]; outColor[k] = A.color[k]; continue; }
        const s = ease(Math.min(1, (p - b0) / MORPH_LEN));
        const bg = B.code[k];
        if (s >= 1) { outCode[k] = bg; outColor[k] = B.color[k]; continue; }

        const ag = A.code[k];
        const la = levelOf(ag), lb = levelOf(bg);
        // Density blends A → B with a soft dip in the middle (the "noisy" draft).
        const dip = 1 - DIP * Math.sin(Math.PI * s);
        const level = Math.round((la + (lb - la) * s) * dip);

        if (level < 1) {
          // Nothing to draw here mid-morph: show a faint mask token on some cells.
          if (mask[k] && s > 0.15 && s < 0.85) { outCode[k] = MASK_GLYPH; outColor[k] = INK_PALEST; }
          else outCode[k] = 0;
          continue;
        }

        // Literal line art holds at the ends of the morph; the middle is field glyphs.
        if (s < 0.3 && ag !== 0 && ag < FIELD) outCode[k] = ag;
        else if (s > 0.7 && bg !== 0 && bg < FIELD) outCode[k] = bg;
        else outCode[k] = FIELD + Math.min(LEVELS, level);

        // Colour fades out of A's hue, through pale, and grows into B's hue.
        if (s < 0.5 && ag !== 0) outColor[k] = toward(A.color[k], 1 - 2 * s);
        else if (bg !== 0) outColor[k] = toward(B.color[k], 2 * s - 1);
        else outColor[k] = toward(A.color[k], 0);
      }
    }
  }

  window.DPX.SceneTransition = SceneTransition;
})();
