(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  document.documentElement.classList.toggle('motion', !reduce);

  /* ---------- Dark (Neon diner) / light (Cream) mode ----------
     The button shows the current setting and cycles Auto (follows the system) > the other mode > the same mode > Auto. */
  const root = document.documentElement, modeBtn = $('.mode'), sysLight = matchMedia('(prefers-color-scheme: light)');
  const NAMES = { auto: 'Auto', cream: 'Light', diner: 'Dark' };
  const stored = () => { let v = null; try { v = localStorage.getItem('mojos-mode'); } catch (e) {} return v === 'diner' || v === 'cream' ? v : null; };
  const sys = () => sysLight.matches ? 'cream' : 'diner';
  const applyMode = () => {
    const pick = stored() || 'auto'; root.dataset.palette = pick === 'auto' ? sys() : pick;
    modeBtn.querySelector('.mode__label').textContent = NAMES[pick];
    modeBtn.setAttribute('aria-label', `Colour mode: ${NAMES[pick]}${pick === 'auto' ? ', follows your device' : ''}. Change`);
  };
  modeBtn.addEventListener('click', () => {
    const pick = stored(), other = sys() === 'cream' ? 'diner' : 'cream';
    const next = !pick ? other : pick === other ? sys() : null;
    try { if (next) localStorage.setItem('mojos-mode', next); else localStorage.removeItem('mojos-mode'); } catch (e) {}
    applyMode();
  });
  sysLight.addEventListener('change', applyMode);
  applyMode();

  /* ---------- Order chooser ---------- */
  const chooser = $('#chooser');
  // these are links to #order, so without scripts they still go somewhere useful
  $$('[data-open-order]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); chooser.showModal(); }));
  chooser.addEventListener('click', e => { if (e.target === chooser) chooser.close(); });

  /* ---------- Menu: tabs over the typographic list (the menu itself is in the HTML; scripts off, every section shows) ---------- */
  const tabBtns = $$('.menu__tabs [role=tab]');
  const select = (t, focus = true) => {
    tabBtns.forEach(b => { const on = b === t; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; $('#' + b.getAttribute('aria-controls')).hidden = !on; });
    if (focus) t.focus({ preventScroll: true });
  };
  select(tabBtns[0], false);
  tabBtns.forEach((b, i) => {
    b.addEventListener('click', () => select(b));
    b.addEventListener('keydown', e => {
      const n = tabBtns.length, j = { ArrowRight: i + 1, ArrowLeft: i - 1 + n, Home: 0, End: n - 1 }[e.key];
      if (j !== undefined) { e.preventDefault(); select(tabBtns[j % n]); }
    });
  });

  /* ---------- Branches: side-scrolling run (adapted from version B's double album) ---------- */
  const tour = $('.tour'), track = $('.tour__track'), vp = $('.tour__viewport'), bar = $('.tour__bar i');
  const cards = $$('.branch', track), pins = $$('.pin');
  const wide = matchMedia('(min-width: 1000px)');
  let span = 0;
  const light = key => [...pins, ...cards].forEach(el => el.classList.toggle('is-on', el.dataset.branch === key));
  // the active branch is the card nearest a focus point that slides across the run as it scrolls,
  // so the first card is active at the start and the last one at the end
  let lockUntil = 0;   // after a pin click, keep its branch lit while the scroll glides there
  const follow = () => {
    if (Date.now() < lockUntil) return;
    const prog = parseFloat(bar.style.getPropertyValue('--p')) || 0;
    const vr = vp.getBoundingClientRect(), mid = vr.left + vr.width * (.15 + .7 * prog);
    let best = cards[0], d = 1e9;
    cards.forEach(c => { const r = c.getBoundingClientRect(), k = Math.abs(r.left + r.width / 2 - mid); if (k < d) { d = k; best = c; } });
    light(best.dataset.branch);
  };
  function layout() {
    const pin = wide.matches && !reduce && innerHeight >= 560;   // the tightened pinned layout fits down to about 600 px tall
    tour.classList.toggle('is-pinned', pin);
    // pinned, the run is driven by the page scroll, so it is not a scroll area of its own
    if (pin) vp.removeAttribute('tabindex'); else vp.tabIndex = 0;
    track.style.transform = '';
    if (!pin) { tour.style.height = ''; span = 0; follow(); return; }
    span = Math.max(0, track.scrollWidth - vp.clientWidth + parseFloat(getComputedStyle(vp).paddingLeft) * 2);
    tour.style.height = (innerHeight + span) + 'px';
    move();
  }
  function move() {
    if (!span) return;
    const p = clamp(-tour.getBoundingClientRect().top / span);
    track.style.transform = `translate3d(${-p * span}px,0,0)`;
    bar.style.setProperty('--p', p);
    follow();
  }
  vp.addEventListener('scroll', () => { bar.style.setProperty('--p', vp.scrollLeft / Math.max(1, vp.scrollWidth - vp.clientWidth)); follow(); }, { passive: true });
  addEventListener('scroll', move, { passive: true });
  addEventListener('resize', layout);
  addEventListener('load', layout);
  layout();
  // a pin takes you to its branch: scroll the page when pinned, the run when not
  const goTo = (key, instant) => {
    // offsetLeft is relative to the track (its will-change makes it the offset parent); solve for the progress at which this card sits on follow()'s focus point
    const c = $('#b-' + key), W = vp.clientWidth, run = span || (vp.scrollWidth - W);
    const centre = c.offsetLeft + parseFloat(getComputedStyle(vp).paddingLeft) + c.offsetWidth / 2;
    const p = clamp((centre - .15 * W) / (run + .7 * W));
    light(key); lockUntil = Date.now() + 1600;
    if (span) { const top = tour.offsetTop + p * span; window.__lenis ? window.__lenis.scrollTo(top, { immediate: !!instant }) : scrollTo({ top, behavior: reduce || instant ? 'instant' : 'smooth' }); }
    else vp.scrollTo({ left: c.offsetLeft, behavior: reduce ? 'auto' : 'smooth' });   // phones snap to the card
  };
  // Tab into a card in the pinned run: scroll the page to that card's point in the run (the viewport is clipped, so it cannot scroll itself)
  vp.addEventListener('focusin', e => { const c = e.target.closest('.branch'); if (span && c) goTo(c.dataset.branch, true); });
  pins.forEach(p => {
    p.addEventListener('click', () => goTo(p.dataset.branch));
    p.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goTo(p.dataset.branch); } });
  });

  if (reduce) return; // everything below is decorative motion

  /* ---------- Landing 3: on scroll the signature scales down and docks into the header ---------- */
  const hero = $('.hero'), big = $('.sig__logo'), small = $('.top__logo img'), rest = $$('.sig__dash, .sig__tag, .hero__count, .hero__cta');
  const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  let nat = null, ticking = false;
  const measure = () => { big.style.transform = ''; const r = big.getBoundingClientRect(); nat = { x: r.left, y: r.top + scrollY, w: r.width }; };
  root.classList.add('sig-dock');
  function frame() {
    ticking = false;
    if (!nat) measure();
    const t = small.getBoundingClientRect(), p = clamp(scrollY / (hero.offsetHeight * .7)), e = ease(p);
    const s = 1 + (t.width / nat.w - 1) * e;
    // in-flow position is nat.y - scrollY; hold it still against the scroll and glide it to the header logo
    big.style.transform = `translate3d(${(t.left - nat.x) * e}px, ${(t.top - nat.y) * e + scrollY}px, 0) scale(${s})`;
    const done = p >= 1;
    big.style.visibility = done ? 'hidden' : '';
    small.parentElement.style.opacity = done ? 1 : 0;
    small.parentElement.inert = !done;   // not focusable while it is hidden at the top
    rest.forEach(el => { el.style.opacity = 1 - clamp(p / .35); });
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
  addEventListener('resize', () => { scrollTo(0, scrollY); nat = null; requestAnimationFrame(frame); });
  frame();
})();

/* Page progress line: follows the real scroll position, so it works with or without Lenis and with reduced motion */
(() => {
  const bar = document.querySelector('.progress'); if (!bar) return;
  let queued = false;
  const set = () => { queued = false; const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.setProperty('--p', max > 0 ? Math.min(1, scrollY / max) : 0); };
  const ask = () => { if (!queued) { queued = true; requestAnimationFrame(set); } };
  addEventListener('scroll', ask, { passive: true }); addEventListener('resize', ask); addEventListener('load', ask); set();
})();

/* Hero photo parallax: the photo moves slower than the page and zooms a little; still with reduced motion */
(() => {
  const wrap = document.querySelector('.hero__photo'); if (!wrap || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const hero = wrap.parentElement; let queued = false;
  const move = () => { queued = false; const y = Math.min(scrollY, hero.offsetHeight);
    wrap.style.transform = `translate3d(0, ${y * 0.35}px, 0) scale(${1 + y / hero.offsetHeight * 0.06})`; };
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(move); } }, { passive: true });
  move();
})();

/* Phone menu: a modal dialog (focus stays inside, Esc closes, focus goes back to the burger) */
(() => {
  const menu = document.getElementById('phone-menu'), burger = document.querySelector('.burger'); if (!menu || !burger) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, html = document.documentElement;
  const links = [...menu.querySelectorAll('.pmenu__nav a')];
  burger.addEventListener('click', () => {
    // mark the section you are in with the red dash
    const y = scrollY + innerHeight * .35; let cur = null;
    links.forEach(a => { const s = document.querySelector(a.hash); if (s && s.offsetTop <= y) cur = a; });
    links.forEach(a => a.setAttribute('aria-current', a === cur));
    html.classList.add('menu-open'); menu.showModal();
  });
  menu.addEventListener('close', () => html.classList.remove('menu-open'));
  links.forEach(a => a.addEventListener('click', e => {
    const t = document.querySelector(a.hash); if (!t) return;
    e.preventDefault(); menu.close();
    t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    if (!t.matches('a, button, [tabindex]')) t.tabIndex = -1;
    t.focus({ preventScroll: true }); history.pushState(null, '', a.hash);
  }));
  menu.querySelector('.pmenu__order').addEventListener('click', e => { e.preventDefault(); menu.close(); document.getElementById('chooser').showModal(); });
  // the menu is for phones; if the window grows past 760px, close it
  matchMedia('(min-width: 760px)').addEventListener('change', m => { if (m.matches && menu.open) menu.close(); });
})();


/* Logo drop: runs once on load (reduced motion: nothing moves) */
(() => {
  const html = document.documentElement; if (html.classList.contains('motion')) html.classList.add('drop');
})();
