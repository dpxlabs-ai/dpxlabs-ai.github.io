/* PageIndex — the sticky "on this page" row under the header (research page).
 * The active item follows the spread in view, and its 1px bar fills with reading
 * progress through that spread (the scene-tab pattern). On narrow screens the row
 * scrolls sideways and keeps the active item in view. */
(function () {
  'use strict';
  const nav = document.querySelector('.page-index');
  if (!nav) return;
  const links = Array.from(nav.querySelectorAll('a[href^="#"]'));
  const sections = links.map((a) => document.querySelector(a.getAttribute('href')));
  let active = -1, queued = false;

  const update = () => {
    queued = false;
    const line = nav.getBoundingClientRect().bottom + window.innerHeight * 0.25;
    let best = -1;
    sections.forEach((s, i) => { if (s && s.getBoundingClientRect().top <= line) best = i; });
    if (best !== active) {
      links.forEach((a, i) => (i === best ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));
      active = best;
      const a = links[best];
      if (a && nav.scrollWidth > nav.clientWidth) {
        const l = a.offsetLeft - nav.offsetLeft, r = l + a.offsetWidth;
        if (l < nav.scrollLeft) nav.scrollLeft = l - 16;
        else if (r > nav.scrollLeft + nav.clientWidth) nav.scrollLeft = r - nav.clientWidth + 16;
      }
    }
    links.forEach((a, i) => {
      let p = 0;
      if (i === best) {
        const r = sections[i].getBoundingClientRect();
        p = Math.min(1, Math.max(0, (line - r.top) / Math.max(1, r.height)));
      } else if (i < best) p = 1;
      a.style.setProperty('--p', i === best ? p.toFixed(3) : 0);
    });
  };
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  update();
})();
