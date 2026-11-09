/* PhysicsHero — wires the renderer, scenes, transitions, labels and pointer. */
(function () {
  'use strict';
  const DPX = window.DPX;
  const { clamp } = DPX;

  class PhysicsHero {
    constructor(root, opts = {}) {
      this.root = root;
      this.canvas = root.querySelector('canvas');
      this.buttons = Array.from(document.querySelectorAll('[data-scene]'));
      this.opts = Object.assign({ sceneDuration: 4, transitionDuration: 2.1, fontFamily: 'monospace' }, opts);
      this.renderer = new DPX.AsciiRenderer(this.canvas, { fontFamily: this.opts.fontFamily, background: DPX.BACKGROUND });
      this.scenes = [new DPX.RocketEngineScene(), new DPX.FlameScene(), new DPX.HeatExchangerScene(), new DPX.PipeFlowScene(), new DPX.CarEngineScene(), new DPX.GasTurbineScene(),
        new DPX.WindTurbineScene(), new DPX.PumpCavitationScene(), new DPX.NuclearLoopScene()];
      this.transition = new DPX.SceneTransition();
      this.index = 0;
      this.trans = null;
      this.sceneTime = 0;
      this.fontBoost = 0;
      this.costEMA = 0;
      this.lastAdapt = 0;
      this.pointer = { x: -999, y: -999, vx: 0, vy: 0, energy: 0, active: false, radius: 7 };
      this.motion = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.reduced = this.motion.matches;
      this.visible = true;

      const start = new URLSearchParams(location.search).get('scene');
      const key = (start || '').toLowerCase().replace(/[-_]+/g, ' ');
      const si = this.scenes.findIndex((s) => s.id === start || s.label.toLowerCase() === key);
      if (si >= 0) this.index = si;

      this._bind();
      this.resize();
      this._setActive(this.index);
      this.last = performance.now();
      this.loop = this.loop.bind(this);
      requestAnimationFrame(this.loop);
    }

    _bind() {
      this.buttons.forEach((b, i) => b.addEventListener('click', () => this.go(i)));
      let rt;
      new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(() => this.resize(), 120); }).observe(this.root);
      this.motion.addEventListener('change', (e) => (this.reduced = e.matches));
      new IntersectionObserver((es) => (this.visible = es[0].isIntersecting)).observe(this.root);

      const p = this.pointer;
      let lx = 0, ly = 0, lt = 0;
      this.canvas.addEventListener('pointermove', (e) => {
        if (this.reduced) return;
        const r = this.canvas.getBoundingClientRect();
        const g = this.renderer.toGrid(e.clientX - r.left, e.clientY - r.top);
        const now = performance.now();
        const dt = Math.max(8, now - lt) / 1000;
        if (now - lt < 200) {
          const vx = clamp((g.x - lx) / dt, -90, 90), vy = clamp((g.y - ly) / dt, -50, 50);
          p.vx = p.vx * 0.6 + vx * 0.4;
          p.vy = p.vy * 0.6 + vy * 0.4;
          p.energy = Math.min(1, p.energy + Math.hypot(vx, vy * 1.8) * dt * 0.08);
        }
        p.x = g.x; p.y = g.y; lx = g.x; ly = g.y; lt = now;
      });
      this.canvas.addEventListener('pointerleave', () => { p.energy *= 0.5; });
    }

    fontSize() {
      const w = this.root.clientWidth;
      const base = w < 480 ? 7.5 : w < 760 ? 9 : w < 1100 ? 10.5 : 12;
      return base + this.fontBoost;
    }

    resize() {
      const w = this.root.clientWidth, h = this.root.clientHeight;
      if (!w || !h) return;
      const { cols, rows, aspect } = this.renderer.resize(w, h, this.fontSize());
      this.outCode = new Uint8Array(cols * rows);
      this.outColor = new Uint8Array(cols * rows);
      this.drawCode = new Uint8Array(cols * rows);
      this.scenes.forEach((s) => s.resize(cols, rows, aspect));
      this.transition.resize(cols, rows);
      this.pointer.radius = Math.max(4, cols * 0.045);
    }

    go(i) {
      if (i === this.index && !this.trans) { this.sceneTime = 0; return; }
      if (this.trans) { this.index = this.trans.to; this.trans = null; }
      if (i === this.index) { this.sceneTime = 0; this._setActive(i); return; }
      if (this.reduced) {
        this.index = i; this.sceneTime = 0; this._setActive(i);
        return;
      }
      this.transition.seed(Math.random() * 50);
      this.trans = { from: this.index, to: i, p: 0 };
      this.sceneTime = 0;
      this._setActive(i);
    }

    _setActive(i) {
      this.buttons.forEach((b, n) => {
        b.setAttribute('aria-pressed', String(n === i));
        b.style.setProperty('--p', '0');
      });
      this.canvas.setAttribute('aria-label', `ASCII physics simulation — ${this.scenes[i].description}`);
    }

    loop(now) {
      requestAnimationFrame(this.loop);
      let dt = (now - this.last) / 1000;
      if (!this.visible || document.hidden) { this.last = now; return; }
      if (this.reduced && dt < 1 / 12) return; // throttle gently when motion is reduced
      this.last = now;
      dt = clamp(dt, 0, 1 / 20);
      const simDt = this.reduced ? dt * 0.3 : dt;

      const p = this.pointer;
      p.energy *= Math.exp(-2.2 * dt);
      p.active = p.energy > 0.03;

      const t0 = performance.now();
      if (!this.reduced) this.sceneTime += dt;
      if (!this.trans && this.sceneTime > this.opts.sceneDuration) this.go((this.index + 1) % this.scenes.length);

      if (this.trans) {
        const tr = this.trans;
        tr.p += dt / this.opts.transitionDuration;
        const A = this.scenes[tr.from], B = this.scenes[tr.to];
        if (tr.p < 0.9) A.step(simDt, p); // A stays partly visible while the scenes merge
        B.step(simDt, p);
        this.transition.compose(A, B, Math.min(1, tr.p), now / 1000, this.outCode, this.outColor);
        this.renderer.draw(DPX.resolveGlyphs(this.outCode, this.drawCode, now / 1000), this.outColor);
        if (tr.p >= 1) { this.index = tr.to; this.trans = null; }
      } else {
        const s = this.scenes[this.index];
        s.step(simDt, p);
        this.renderer.draw(DPX.resolveGlyphs(s.code, this.drawCode, now / 1000), s.color);
      }
      const active = this.buttons[this.trans ? this.trans.to : this.index];
      if (active) active.style.setProperty('--p', String(Math.min(1, this.sceneTime / this.opts.sceneDuration)));

      // Adaptive quality: enlarge glyphs (fewer cells) if frames are too expensive.
      const cost = performance.now() - t0;
      this.costEMA = this.costEMA * 0.95 + cost * 0.05;
      if (now - this.lastAdapt > 3000 && this.costEMA > 13 && this.fontBoost < 4) {
        this.lastAdapt = now;
        this.fontBoost += 1.5;
        this.costEMA = 0;
        this.resize();
      }
    }
  }

  DPX.PhysicsHero = PhysicsHero;
})();
