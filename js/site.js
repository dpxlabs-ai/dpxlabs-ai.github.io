/* Site chrome — header rule once the page scrolls, and the active nav link
 * following the section in view. */
(function () {
  'use strict';
  const header = document.querySelector('.site-header');
  const hero = document.getElementById('top');
  if (header && hero) {
    new IntersectionObserver(([e]) => header.classList.toggle('is-scrolled', !e.isIntersecting), {
      rootMargin: '-72px 0px 0px 0px',
      threshold: 0.9,
    }).observe(hero.querySelector('.intro') || hero.querySelector('h1') || hero);
  }

  // Only same-page #hash links follow the scroll; links to other pages keep their own state.
  const links = Array.from(document.querySelectorAll('.site-nav a')).filter((a) => /^#[\w-]+$/.test(a.getAttribute('href')));
  const targets = links.map((a) => document.querySelector(a.getAttribute('href')));
  const inView = new Map();
  const update = () => {
    let best = -1, bestTop = -Infinity;
    targets.forEach((s, i) => {
      if (!inView.get(s)) return;
      const top = s.getBoundingClientRect().top;
      if (top <= window.innerHeight * 0.5 && top > bestTop) { best = i; bestTop = top; }
    });
    links.forEach((a, i) => (i === best ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));
    // A link to the current page keeps aria-current="page" unless a section link is active.
    document.querySelectorAll('.site-nav a[data-page]').forEach((a) =>
      best < 0 ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
  };
  const io = new IntersectionObserver((es) => {
    es.forEach((e) => inView.set(e.target, e.isIntersecting));
    update();
  }, { threshold: [0, 0.25, 0.5, 0.75, 1] });
  targets.forEach((s) => s && io.observe(s));
  window.addEventListener('scroll', update, { passive: true });
})();
