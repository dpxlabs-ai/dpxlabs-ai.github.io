/* AsciiRenderer — draws a monospaced character grid onto a canvas.
 * Every (glyph, colour) pair is rasterised once into an atlas and then blitted,
 * so a full frame of several thousand cells is a few milliseconds. */
(function () {
  'use strict';
  const { GLYPHS, PALETTE } = window.DPX;

  class AsciiRenderer {
    constructor(canvas, opts = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: false });
      this.fontFamily = opts.fontFamily || 'monospace';
      this.background = opts.background || '#fff';
      this.lineHeight = opts.lineHeight || 1.14;
      this.cols = 0;
      this.rows = 0;
    }

    /** Size the canvas and rebuild the grid. Returns {cols, rows, aspect}. */
    resize(cssW, cssH, fontSize) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const c = this.canvas;
      c.width = Math.max(1, Math.round(cssW * dpr));
      c.height = Math.max(1, Math.round(cssH * dpr));
      this.dpr = dpr;

      const fs = fontSize * dpr;
      this.font = `${fs}px ${this.fontFamily}`;
      this.ctx.font = this.font;
      this.cellW = Math.max(2, Math.round(this.ctx.measureText('M').width));
      this.cellH = Math.max(3, Math.round(fs * this.lineHeight));
      this.cols = Math.floor(c.width / this.cellW);
      this.rows = Math.floor(c.height / this.cellH);
      this.offX = Math.floor((c.width - this.cols * this.cellW) / 2);
      this.offY = Math.floor((c.height - this.rows * this.cellH) / 2);
      this.aspect = this.cellH / this.cellW;
      this._buildAtlas();
      return { cols: this.cols, rows: this.rows, aspect: this.aspect };
    }

    _buildAtlas() {
      const nSlots = GLYPHS.length * PALETTE.length;
      this.atlasCols = 64;
      const atlasRows = Math.ceil(nSlots / this.atlasCols);
      const a = (this.atlas = document.createElement('canvas'));
      a.width = this.atlasCols * this.cellW;
      a.height = atlasRows * this.cellH;
      const actx = (this.actx = a.getContext('2d'));
      actx.font = this.font;
      actx.textAlign = 'center';
      actx.textBaseline = 'middle';
      this.slots = new Int16Array(nSlots).fill(-1);
      this.nextSlot = 0;
      this.nColors = PALETTE.length;
    }

    _slot(g, c) {
      const key = g * this.nColors + c;
      let s = this.slots[key];
      if (s < 0) {
        s = this.nextSlot++;
        this.slots[key] = s;
        const sx = (s % this.atlasCols) * this.cellW;
        const sy = Math.floor(s / this.atlasCols) * this.cellH;
        this.actx.fillStyle = PALETTE[c];
        this.actx.fillText(GLYPHS[g], sx + this.cellW / 2, sy + this.cellH / 2 + this.cellH * 0.04);
      }
      return s;
    }

    /** Convert a CSS-pixel position inside the canvas to fractional grid coords. */
    toGrid(cssX, cssY) {
      return {
        x: (cssX * this.dpr - this.offX) / this.cellW,
        y: (cssY * this.dpr - this.offY) / this.cellH,
      };
    }

    draw(code, color) {
      const { ctx, cols, rows, cellW, cellH, offX, offY, atlas, atlasCols } = this;
      ctx.fillStyle = this.background;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      let k = 0;
      for (let j = 0; j < rows; j++) {
        const dy = offY + j * cellH;
        for (let i = 0; i < cols; i++, k++) {
          const g = code[k];
          if (g === 0) continue;
          const s = this._slot(g, color[k]);
          ctx.drawImage(atlas, (s % atlasCols) * cellW, ((s / atlasCols) | 0) * cellH, cellW, cellH,
            offX + i * cellW, dy, cellW, cellH);
        }
      }
    }
  }

  window.DPX.AsciiRenderer = AsciiRenderer;
})();
