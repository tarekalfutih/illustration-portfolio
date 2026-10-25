/* Page behaviour: in-page scrolling, phone menu, intro sizing and entrance, category scroll-spy,
   day/night compare, lightbox with zoom, and image protection. */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hdr = document.querySelector('.hdr');
  var bar = document.querySelector('[data-cats]');
  var hdrH = function () { return hdr.getBoundingClientRect().height; };

  /* ---------- In-page scrolling ----------
     Scroll so the target starts right under the sticky header, then re-check once scrolling ends:
     lazy images above the target can shift the layout on the way. */
  var fixTimer = 0;
  var stickyH = function () { return hdrH() + bar.getBoundingClientRect().height; };
  /* #work lands further down so the Skräphjältarna cover is fully in view. Desktop (≥ 1680px) also
     shows the top 56px of the first spread, unless that would push the cover under the sticky bar.
     Elsewhere: cover bottom + 24px, but never past #picture-books reaching the sticky bar. */
  function workTop() {
    var y = window.scrollY, rect = function (s) { return document.querySelector(s).getBoundingClientRect(); };
    var top = rect('#work').top + y - hdrH(), cv = rect('.book-sk .book-cover');
    var peek = window.innerWidth >= 1680 ? rect('.spreads img').top + y + 56 - window.innerHeight : null;
    if (peek !== null && peek <= cv.top + y - stickyH() - 16) {
      top = Math.max(top, peek);
    } else {
      var need = cv.bottom + y + 24 - window.innerHeight, cap = rect('#picture-books').top + y - stickyH();
      top = Math.max(top, Math.min(need, cap));
    }
    return Math.max(0, top);
  }
  function scrollToId(id, extra) {
    var el = document.getElementById(id); if (!el) return;
    var go = function () {
      var top = id === 'work' ? workTop() : Math.max(0, el.getBoundingClientRect().top + window.scrollY - hdrH() - (extra || 0));
      if (Math.abs(top - window.scrollY) > 2) window.scrollTo({ top: top, behavior: reduced ? 'auto' : 'smooth' });
    };
    go(); clearTimeout(fixTimer);
    if ('onscrollend' in window) window.addEventListener('scrollend', go, { once: true });
    else fixTimer = setTimeout(go, 1500);
  }
  window.scrollToId = scrollToId;

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    var a = e.target.closest && e.target.closest('a[href^="#"]'); if (!a) return;
    var id = a.getAttribute('href').slice(1);
    e.preventDefault();
    closeMenu();
    if (!id) window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    else scrollToId(id);
  });
  document.querySelector('[data-to-top]').addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  });

  /* ---------- Phone menu ---------- */
  var burger = document.querySelector('.hdr-burger'), menu = document.getElementById('hdr-menu');
  function closeMenu() { menu.hidden = true; burger.setAttribute('aria-expanded', 'false'); }
  burger.addEventListener('click', function () {
    menu.hidden = !menu.hidden;
    burger.setAttribute('aria-expanded', String(!menu.hidden));
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { closeMenu(); burger.focus(); } });
  document.addEventListener('layout', function () { if (root.getAttribute('data-bp') !== '4') closeMenu(); });

  /* ---------- Intro ----------
     Heading, text, collage and "Explore My Work" fit one screen: the collage gets whatever height
     the rest of the section leaves (--extra). */
  var intro = document.getElementById('intro');
  function sizeIntro() {
    var g = [].filter.call(intro.querySelectorAll('[data-grid]'), function (x) { return x.offsetParent !== null; })[0];
    if (!g) return;
    var ex = intro.getBoundingClientRect().height - g.getBoundingClientRect().height;
    intro.style.setProperty('--extra', Math.ceil(ex + 2) + 'px');
  }
  document.addEventListener('layout', function () { setTimeout(sizeIntro, 50); });
  window.addEventListener('load', sizeIntro);
  sizeIntro();

  (function introEntrance() {
    var box = intro.querySelector('[data-intro]');
    if (reduced || !box.animate) return;
    var words = box.querySelectorAll('[data-anim="head"] > span'), para = box.querySelector('[data-anim="para"]'), rule = box.querySelector('[data-anim="rule"]');
    words.forEach(function (w) { w.style.opacity = 0; }); para.style.opacity = 0; rule.style.transform = 'scaleX(0)';
    var io = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return;
      io.disconnect();
      var ease = 'cubic-bezier(.2,.9,.25,1.25)';
      rule.style.transform = '';
      rule.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 900, easing: 'cubic-bezier(.65,0,.25,1)', fill: 'both' });
      words.forEach(function (w, i) {
        w.style.opacity = '';
        w.animate([{ opacity: 0, transform: 'translateY(.55em) rotate(2deg)' }, { opacity: 1, transform: 'none' }], { duration: 620, delay: 150 + i * 90, easing: ease, fill: 'both' });
      });
      para.style.opacity = '';
      para.animate([{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 700, delay: 150 + words.length * 90 + 120, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'both' });
    }, { threshold: .3 });
    io.observe(box);
  })();

  /* ---------- Category bar ----------
     Active chip = the last section whose top has passed header + bar + 40px. */
  var CATS = ['picture-books', 'covers', 'backgrounds', 'cards', 'animated', 'more'];
  var chips = {}, spyCur;
  bar.querySelectorAll('[data-chip]').forEach(function (b) {
    chips[b.getAttribute('data-chip')] = b;
    b.addEventListener('click', function () { scrollToId(b.getAttribute('data-chip'), bar.getBoundingClientRect().height + 16); });
  });
  function spy() {
    var off = hdrH() + bar.getBoundingClientRect().height + 40, cur = null, work = document.getElementById('work');
    CATS.forEach(function (k) { var el = document.getElementById(k); if (el && el.getBoundingClientRect().top <= off) cur = k; });
    if (!cur && work.getBoundingClientRect().top < window.innerHeight * .6) cur = CATS[0];
    if (work.getBoundingClientRect().bottom < off) cur = null;
    if (cur === spyCur) return;
    spyCur = cur;
    CATS.forEach(function (k) { if (k === cur) chips[k].setAttribute('aria-current', 'true'); else chips[k].removeAttribute('aria-current'); });
    var b = cur && chips[cur];
    if (b) { var sc = b.parentElement; sc.scrollTo({ left: b.offsetLeft - sc.offsetLeft - 20, behavior: reduced ? 'auto' : 'smooth' }); }
  }
  window.addEventListener('scroll', spy, { passive: true });
  setTimeout(spy, 400);

  /* ---------- Day / night compare ---------- */
  var cmp = document.querySelector('[data-compare]');
  cmp.querySelector('input').addEventListener('input', function (e) { cmp.style.setProperty('--split', e.target.value + '%'); });

  /* ---------- Image protection ---------- */
  ['contextmenu', 'dragstart'].forEach(function (t) {
    document.addEventListener(t, function (e) { if (e.target && e.target.tagName === 'IMG') e.preventDefault(); });
  });

  /* ---------- Lightbox ----------
     Opens every zoomable image in Selected work (all categories), or in the clicked image's own
     section outside it; click toggles 1× / 2.5× at the click point,
     − / + step by .75 (1–4×), drag pans when zoomed. */
  var lb = document.querySelector('.lb'), sc = lb.querySelector('.lb-sc'), img = sc.querySelector('img');
  var cap = lb.querySelector('.lb-cap'), pct = lb.querySelector('.lb-pct'), hint = lb.querySelector('.lb-hint');
  var prev = lb.querySelector('.lb-prev'), next = lb.querySelector('.lb-next');
  var L = null, z = 1, nat = null, moved = false, opener = null;
  var touch = window.matchMedia && matchMedia('(hover: none)').matches;

  function padX() { var vw = root.clientWidth; return vw < 600 ? 8 : Math.min(80, Math.round(vw * .05)); }
  function sizeImg() {
    if (!nat) { img.classList.remove('sized'); img.style.width = ''; return; }
    var vw = root.clientWidth, vh = window.innerHeight, px = padX();
    var fit = Math.min((vw - px * 2) / nat.w, (vh - 128) / nat.h);
    img.classList.add('sized');
    img.style.width = Math.round(nat.w * fit * z) + 'px';
  }
  function chrome() {
    var many = L.list.length > 1;
    cap.textContent = many ? (L.i + 1) + ' / ' + L.list.length : '';
    prev.hidden = next.hidden = !many;
    pct.textContent = Math.round(z * 100) + '%';
    img.classList.toggle('zoomed', z > 1);
    hint.textContent = z > 1
      ? (touch ? 'Drag to look around · tap to zoom out' : 'Drag to look around · click to zoom out')
      : (touch ? 'Tap the image to zoom in' : 'Click the image to zoom in · Esc to close');
  }
  function show() {
    var cur = L.list[L.i];
    z = 1; nat = null;
    lb.style.setProperty('--lbpx', padX() + 'px');
    img.classList.remove('sized'); img.style.width = '';
    img.onload = function () { nat = { w: img.naturalWidth, h: img.naturalHeight }; sizeImg(); };
    img.src = cur[0]; img.alt = cur[1];
    chrome();
  }
  function open(t) {
    var sec = t.closest('#work') || t.closest('section[id]') || document.body;
    var list = [].filter.call(sec.querySelectorAll('img[data-zoom],[data-zoom-src]'), function (x) { return x.offsetParent !== null; });
    L = {
      list: list.map(function (x) { return x.hasAttribute('data-zoom-src') ? [x.getAttribute('data-zoom-src'), x.getAttribute('data-zoom-alt')] : [x.getAttribute('data-full') || x.getAttribute('src'), x.alt]; }),
      i: Math.max(0, list.indexOf(t))
    };
    opener = document.activeElement;
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
    show();
    lb.querySelector('.lb-close').focus();
  }
  function close() {
    lb.hidden = true; L = null; img.removeAttribute('src');
    document.body.style.overflow = '';
    if (opener && opener.focus) opener.focus();
  }
  function step(d) { var n = L.list.length; L.i = (L.i + d + n) % n; show(); }
  function setZ(nz, fx, fy) {
    nz = Math.max(1, Math.min(4, nz));
    if (fx == null) { fx = (sc.scrollLeft + sc.clientWidth / 2) / img.offsetWidth; fy = (sc.scrollTop + sc.clientHeight / 2) / img.offsetHeight; }
    z = nz; sizeImg(); chrome();
    sc.scrollLeft = fx * img.offsetWidth - sc.clientWidth / 2;
    sc.scrollTop = fy * img.offsetHeight - sc.clientHeight / 2;
  }

  document.querySelector('main').addEventListener('click', function (e) {
    if (L) return;
    var t = e.target, wrap = t.closest && t.closest('[data-zoom-src]');
    if (wrap) t = wrap; else if (t.tagName !== 'IMG' || !t.hasAttribute('data-zoom')) return;
    open(t);
  });
  // Zoomable images are keyboard reachable too.
  document.querySelectorAll('main img[data-zoom], main [data-zoom-src]').forEach(function (x) {
    x.tabIndex = 0;
    x.setAttribute('role', 'button');
    if (!x.hasAttribute('aria-label')) x.setAttribute('aria-label', 'Open full size: ' + (x.alt || x.getAttribute('data-zoom-alt')));
    x.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(x); } });
  });

  lb.addEventListener('click', function (e) {
    var b = e.target.closest('[data-lb]');
    if (b) {
      e.stopPropagation();
      var a = b.getAttribute('data-lb');
      if (a === 'close') close(); else if (a === 'prev') step(-1); else if (a === 'next') step(1);
      else if (a === 'in') setZ(z + .75); else if (a === 'out') setZ(z - .75);
    }
  });
  sc.addEventListener('click', function (e) { if (e.target === sc) close(); });
  img.addEventListener('click', function (e) {
    e.stopPropagation();
    if (moved) { moved = false; return; }
    var r = img.getBoundingClientRect();
    setZ(z > 1 ? 1 : 2.5, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
  });
  img.addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'mouse' || z <= 1) return;
    e.preventDefault();
    var sx = e.clientX, sy = e.clientY, sl = sc.scrollLeft, st = sc.scrollTop;
    moved = false;
    var mv = function (ev) { var dx = ev.clientX - sx, dy = ev.clientY - sy; if (Math.abs(dx) + Math.abs(dy) > 4) moved = true; sc.scrollLeft = sl - dx; sc.scrollTop = st - dy; };
    var up = function () { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
  });
  window.addEventListener('keydown', function (e) {
    if (!L) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'ArrowRight') step(1);
    else if (e.key === '+' || e.key === '=') setZ(z + .75);
    else if (e.key === '-') setZ(z - .75);
    else if (e.key === 'Tab') {
      // keep focus inside the viewer
      var f = [].filter.call(lb.querySelectorAll('button'), function (b) { return !b.hidden; });
      var i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  });
  window.addEventListener('resize', function () { if (L) { lb.style.setProperty('--lbpx', padX() + 'px'); sizeImg(); } });
})();
