// Scroll moments, one style per section. GSAP + ScrollTrigger (+ Lenis on desktop), self-hosted in js/vendor/.
// Nothing is hidden by CSS: if the libraries fail to load, or reduced motion is on, the page is simply static.
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const desk = matchMedia('(min-width: 760px) and (pointer: fine)').matches;   // phones get the lighter set
  const once = (trigger, start = 'top 85%') => ({ trigger, start, toggleActions: 'play none none none' });

  /* Smooth scrolling on desktop only */
  const hh = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hh'));
  let lenis = null;
  const startLenis = () => {
    lenis = window.__lenis = new Lenis({ lerp: .1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    // in-page links go through Lenis so they glide too; the skip link keeps the browser's own jump
    $$('a[href^="#"]:not(.skip):not([data-open-order])').forEach(a => a.addEventListener('click', e => {
      const href = a.getAttribute('href'), t = $(href); if (!t) return;
      e.preventDefault(); lenis.scrollTo(t, { offset: -hh() });
      if (!t.matches('a, button, [tabindex]')) t.tabIndex = -1;
      t.focus({ preventScroll: true });
      history.pushState(null, '', href);
    }));
  };
  // phones never download Lenis (13 KB); desktops fetch it here, after the page has loaded
  if (desk) { const s = document.createElement('script'); s.src = 'js/vendor/lenis.min.js'; s.onload = startLenis; document.head.append(s); }

  /* Headings: rise line by line through a mask */
  $$('.sec-h, .roast__h').forEach(h => {
    h.innerHTML = `<span class="mask"><span>${h.innerHTML}</span></span>`;
    gsap.from(h.firstChild.firstChild, { yPercent: 110, duration: 1.3, ease: 'expo.out', scrollTrigger: once(h, 'top 88%') });
  });
  /* Kickers: letter-spacing tightens into place. Phones just fade: on narrow screens the spacing changes how they wrap, which moves the page */
  $$('.kicker').forEach(k => gsap.from(k, { ...(desk ? { letterSpacing: '.9em' } : {}), opacity: 0, duration: 1.6, ease: 'power3.out', scrollTrigger: once(k, 'top 90%') }));
  $$('.sec-lede, .roast__when').forEach(p => gsap.from(p, { opacity: 0, y: 18, duration: 1.2, delay: .25, ease: 'power3.out', scrollTrigger: once(p, 'top 90%') }));

  /* 4 branches / 2 islands: the numbers count up, the red rule draws, the words settle */
  const count = $('.count');
  const tl = gsap.timeline({ scrollTrigger: once(count, 'top 70%') });
  tl.from('.count__rule', { scaleY: 0, transformOrigin: 'top', duration: 1.2, ease: 'expo.inOut' })
    .from('.count__n', { opacity: 0, y: 40, duration: 1.2, stagger: .15, ease: 'expo.out' }, '<.2');
  $$('.count__n').forEach(n => { const v = { n: 0 }, end = +n.textContent; tl.to(v, { n: end, duration: 1.1, ease: 'power2.out', snap: { n: 1 }, onUpdate: () => { n.textContent = v.n; } }, '<'); });
  tl.from('.count__w', { letterSpacing: '1.2em', opacity: 0, duration: 1.4, ease: 'power3.out' }, '<.2')
    .from('.count__isles', { opacity: 0, y: 20, duration: 1, ease: 'power3.out' }, '<.4');

  /* Order: each island column wipes open from the left, then its branches slide in */
  $$('.order__col').forEach((c, i) => {
    const t = gsap.timeline({ scrollTrigger: once(c) });
    t.from(c, { clipPath: 'inset(0 100% 0 0)', duration: 1.3, delay: i * .15, ease: 'expo.inOut' })
     .from($$('li', c), { opacity: 0, x: -24, duration: .9, stagger: .1, ease: 'power3.out' }, '-=.5');
  });

  /* Menu: rows rise in a stagger, their dotted leaders draw across; tabs crossfade */
  const rowsIn = els => {
    gsap.fromTo(els, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: .9, stagger: .05, ease: 'power3.out' });
    gsap.fromTo(els.map(e => $('.dish__lead', e)).filter(Boolean), { scaleX: 0 }, { scaleX: 1, duration: 1.1, stagger: .05, delay: .25, ease: 'expo.out' });
  };
  const first = $$('[role=tabpanel]:not([hidden]) .dish');
  gsap.set(first, { opacity: 0 });
  ScrollTrigger.batch(first, { start: 'top 92%', once: true, onEnter: rowsIn });
  $('.menu__tabs').addEventListener('click', e => {
    if (!e.target.closest('[role=tab]')) return;
    const panel = $('[role=tabpanel]:not([hidden])');
    gsap.fromTo(panel, { opacity: 0 }, { opacity: 1, duration: .6, ease: 'power2.out' });
    rowsIn($$('.dish', panel));
    gsap.fromTo($$('.menu-notes > div', panel), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: .8, stagger: .08, delay: .3, ease: 'power3.out' });
    ScrollTrigger.refresh();
  });

  /* Sunday roast: the frame settles, rows rise, prices count in */
  gsap.from('.roast__frame', { opacity: 0, scale: .985, duration: 1.4, ease: 'power3.out', scrollTrigger: once('.roast__frame') });
  $$('.roast .dishes').forEach(list => {
    const rows = $$('.dish', list);
    gsap.from(rows, { opacity: 0, y: 20, duration: .9, stagger: .09, ease: 'power3.out', scrollTrigger: once(list) });
    rows.forEach(r => {
      const p = $('.dish__p', r), m = p.textContent.match(/^(\+?)(\d+)$/); if (!m) return;
      const v = { n: 0 };
      gsap.to(v, { n: +m[2], duration: 1.4, ease: 'power2.out', snap: { n: 1 }, onUpdate: () => { p.textContent = m[1] + v.n; }, scrollTrigger: once(list) });
    });
  });

  /* Branches: the island outlines draw on, then the pins drop in */
  const paths = $$('.map__isle');
  paths.forEach(p => { const l = p.getTotalLength(); gsap.set(p, { strokeDasharray: l, strokeDashoffset: l }); });
  const mt = gsap.timeline({ scrollTrigger: once('.map', 'top 80%') });
  mt.to(paths, { strokeDashoffset: 0, duration: 2.2, stagger: .3, ease: 'power2.inOut' })
    .from('.map__depth, .map__ferry, .map__note-t, .map__sea, .map__deco', { opacity: 0, duration: 1.2, stagger: .1 }, '-=1.2')
    .from('.map__label', { opacity: 0, duration: .8 }, '-=1')
    .from('.pin', { y: -26, opacity: 0, duration: .8, stagger: .12, ease: 'expo.out' }, '-=.7');
  if (!desk) gsap.from('.tour__track > li', { opacity: 0, x: 40, duration: 1, stagger: .1, ease: 'power3.out', scrollTrigger: once('.tour__viewport') });

  /* Footer: logo rises, the branch names settle */
  gsap.from('.foot__logo', { y: 30, opacity: 0, duration: 1.2, ease: 'power3.out', scrollTrigger: once('.foot', 'top 95%') });
  gsap.from('.foot__places', { letterSpacing: '.8em', opacity: 0, duration: 1.6, ease: 'power3.out', scrollTrigger: once('.foot', 'top 95%') });

  /* Magnetic red buttons (pointer devices only) */
  if (desk) $$('.btn--red').forEach(b => {
    const x = gsap.quickTo(b, 'x', { duration: .5, ease: 'power3.out' }), y = gsap.quickTo(b, 'y', { duration: .5, ease: 'power3.out' });
    b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); x((e.clientX - r.left - r.width / 2) * .25); y((e.clientY - r.top - r.height / 2) * .35); });
    b.addEventListener('pointerleave', () => { x(0); y(0); });
  });

  // after the layout settles, land on the #hash once, instantly (smooth scrolling and the refresh would otherwise fight over it)
  addEventListener('load', () => {
    ScrollTrigger.refresh();
    let t = null; try { t = location.hash && $(decodeURIComponent(location.hash)); } catch (e) {}
    if (!t) return;
    const top = t.getBoundingClientRect().top + scrollY - hh();
    lenis ? lenis.scrollTo(top, { immediate: true, force: true }) : scrollTo({ top, behavior: 'instant' });
  });
})();
