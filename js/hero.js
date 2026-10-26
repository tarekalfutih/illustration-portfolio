/* Hero: the pirate artboard for the current layout, with eyes that follow the mouse and blink,
   smoke from the pipe, the headline and the typing line. Also owns the breakpoint:
   it sets <html data-bp>, --z, --zh and --hdr, and fires a "layout" event when they change. */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Pirate eyes [left%, top%, w%, h%] in % of the illustration box; f = look-from point, m = pupil cap.
  var EYES_PORTRAIT = {
    eyes: [[28.83, 16.47, 1.33, .66], [32.08, 16.38, 1.33, .72]], pupil: [34, 48], eyeF: [.305, .164],
    crabs: [[46.55, 37.46, .6, .6], [48.07, 37.32, .65, .83]], cpupil: [55, 36], crabF: [.473, .374],
    smoke: [44.23, 7.44, 6.33, 8.8]
  };
  var BP = [
    { FW: 1920, FH: 960, HH: 80, img: 'pirate-desktop.jpg', artL: 0, artW: 1385, artH: 880, strip: 305, baseR: 80,
      txt: { left: 1040, top: 520, gap: 32, h: 116, lh: .98, ls: '-.02em', t: 34, tmin: 44 },
      eyes: [[28.9, 35.8, 1.2, 1.3], [32.14, 35.55, 1.3, 1.4]], pupil: [36, 42], eyeF: [.305, .357],
      crabs: [[46.55, 81.52, .5, 1.35], [48.05, 81.17, .6, 1.7]], cpupil: [55, 32], crabF: [.473, .814],
      smoke: [43.98, 15.7, 6.64, 19.54] },
    { FW: 1440, FH: 780, HH: 80, img: 'pirate-laptop-2x.jpg', artL: 0, artW: 1120, artH: 700, strip: 246, baseR: 56,
      txt: { left: 770, top: 430, gap: 26, h: 92, lh: .98, ls: '-.02em', t: 28, tmin: 36 },
      eyes: [[29.53, 35.92, 1.1, 1.45], [33, 35.65, 1.15, 1.45]], pupil: [36, 42], eyeF: [.313, .358],
      crabs: [[47.76, 81.8, .6, 1.3], [49.3, 81.42, .6, 1.6]], cpupil: [55, 32], crabF: [.485, .816],
      smoke: [44.98, 15.5, 6.64, 19.9] },
    { FW: 1180, FH: 820, HH: 72, img: 'pirate-tablet-land.jpg', artL: 0, artW: 1076, artH: 748, strip: 237, baseR: 44,
      txt: { left: 690, top: 440, gap: 22, h: 68, lh: .98, ls: '-.02em', t: 24, tmin: 31 },
      eyes: [[24.3, 35.75, 1.3, 1.4], [27.6, 35.5, 1.3, 1.4]], pupil: [36, 42], eyeF: [.26, .356],
      crabs: [[43.55, 81.6, .7, 1.45], [45.15, 81.24, .6, 1.85]], cpupil: [55, 32], crabF: [.444, .814],
      smoke: [40.3, 17.1, 6.6, 17.9] },
    Object.assign({ FW: 820, FH: 1180, HH: 72, img: 'pirate-portrait.jpg', artL: 0, artW: 820, artH: 1139, strip: 0,
      txt: { left: 56, right: 56, top: 650, gap: 22, h: 72, lh: 1, ls: '-.01em', t: 22, tmin: 29 } }, EYES_PORTRAIT),
    Object.assign({ FW: 390, FH: 844, HH: 60, img: 'pirate-portrait.jpg', artL: -20, artW: 560, artH: 778, strip: 0, clip: true,
      txt: { left: 24, right: 24, top: 430, gap: 14, h: 42, lh: 1.02, ls: '-.01em', t: 17, tmin: 22 } }, EYES_PORTRAIT)
  ];
  var PHRASES = ['game backgrounds', 'educational materials'];

  var hero = document.querySelector('[data-hero]');
  var state = { bp: -1, vw: 0, vh: 0 };
  var els = {};

  function pickBp(vw, vh) {
    var land = vw > vh;
    return vw >= 1680 ? 0 : vw >= 1300 ? 1 : (vw >= 1000 || (land && vw >= 600)) ? 2 : vw >= 600 ? 3 : land ? 2 : 4;
  }

  function el(tag, cls, css) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (css) e.style.cssText = css;
    return e;
  }

  function eye(def, pupil, white, lid) {
    var e = el('div', 'hero-eye', 'left:' + def[0] + '%;top:' + def[1] + '%;width:' + def[2] + '%;height:' + def[3] + '%;background:' + white);
    var p = el('i', '', 'width:' + pupil[0] + '%;height:' + pupil[1] + '%');
    var l = el('b', '', 'background:' + lid);
    e.appendChild(p); e.appendChild(l);
    return e;
  }

  // 13 hand-drawn wisps, each a wavy path that morphs (SMIL) while the group rises and fades.
  function smoke(pos) {
    var NS = 'http://www.w3.org/2000/svg', n = 13, dur = 5;
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 160 300');
    svg.setAttribute('class', 'hero-smoke');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = 'left:' + pos[0] + '%;top:' + pos[1] + '%;width:' + pos[2] + '%;height:' + pos[3] + '%';
    svg.innerHTML = '<defs><filter id="pfBlur" x="-50%" y="-20%" width="200%" height="140%"><feGaussianBlur stdDeviation="2.5"/></filter></defs>';
    var wave = function (x, s, top) { return 'M' + x + ' 290 C' + (x + 9 * s) + ' 250 ' + (x - 11 * s) + ' 215 ' + (x + 2 * s) + ' 180 S' + (x + 10 * s) + ' ' + (top + 30) + ' ' + (x - 3 * s) + ' ' + top; };
    for (var i = 0; i < n; i++) {
      var x = 40 + ((i * 23) % 80), top = 40 + ((i * 41) % 90), a = wave(x, 1, top), b = wave(x, -1, top);
      var g = document.createElementNS(NS, 'g');
      g.style.animation = 'pfWisp ' + dur + 's ease-out ' + (i * dur / n) + 's infinite';
      [['rgba(255,255,255,.45)', 10, 'url(#pfBlur)'], ['rgba(255,255,255,.92)', 3.5], ['#e5866a', 1.1, null, '4 6', .75]].forEach(function (s) {
        var p = document.createElementNS(NS, 'path');
        p.setAttribute('d', a); p.setAttribute('fill', 'none'); p.setAttribute('stroke-linecap', 'round');
        p.setAttribute('stroke', s[0]); p.setAttribute('stroke-width', s[1]);
        if (s[2]) p.setAttribute('filter', s[2]);
        if (s[3]) { p.setAttribute('stroke-dasharray', s[3]); p.setAttribute('opacity', s[4]); }
        var an = document.createElementNS(NS, 'animate');
        an.setAttribute('attributeName', 'd'); an.setAttribute('values', a + ';' + b + ';' + a);
        an.setAttribute('dur', (2.2 + (i % 3) * .5) + 's'); an.setAttribute('repeatCount', 'indefinite');
        p.appendChild(an); g.appendChild(p);
      });
      svg.appendChild(g);
    }
    return svg;
  }

  function headline(c) {
    var h = el('span', 'hero-h', 'font-size:' + c.txt.h + 'px;line-height:' + c.txt.lh + ';letter-spacing:' + c.txt.ls);
    h.innerHTML = 'I draw <span class="y">children\'s books</span>';
    return h;
  }

  function build(bp) {
    var c = BP[bp];
    hero.innerHTML = '';
    var art = el('div', 'hero-art', 'width:' + c.FW + 'px;height:' + c.FH + 'px;margin-top:-' + c.HH + 'px' + (c.clip ? ';overflow:hidden' : ''));
    var url = 'url(images/' + c.img + ')';
    // Mirrored strips of the illustration's right edge continue the cave wall to any width.
    if (c.strip) {
      for (var x = c.artW, k = 0; x < c.FW * 3.3; x += c.strip, k++) {
        art.appendChild(el('div', 'hero-strip' + (k % 2 ? '' : ' flip'),
          'left:' + x + 'px;top:' + c.HH + 'px;width:' + c.strip + 'px;height:' + c.artH + 'px;background-image:' + url + ';background-position:right center;background-size:' + c.artW + 'px 100%'));
      }
    }
    var pic = el('div', 'hero-pic', 'left:' + c.artL + 'px;top:' + c.HH + 'px;width:' + c.artW + 'px;height:' + c.artH + 'px;background-image:' + url + ';background-position:center;background-size:100% 100%');
    els.pirate = c.eyes.map(function (d) { var e = eye(d, c.pupil, '#f4efe3', '#e2a874'); pic.appendChild(e); return e; });
    els.crab = c.crabs.map(function (d) { var e = eye(d, c.cpupil, '#f7f3ea', '#d2452e'); pic.appendChild(e); return e; });
    if (!reduced) { els.smoke = smoke(c.smoke); pic.appendChild(els.smoke); } else els.smoke = null;
    art.appendChild(pic);
    els.pic = pic;

    var t = c.txt, wide = bp < 3;
    var box = el('div', 'hero-txt', 'left:' + t.left + 'px;top:' + t.top + 'px;gap:' + t.gap + 'px' + (wide ? ';transform:translateY(-50%)' : ';right:' + t.right + 'px'));
    box.setAttribute('aria-hidden', 'true');
    box.appendChild(headline(c));
    var line = el('span', 'hero-t', 'font-size:' + t.t + 'px;min-height:' + t.tmin + 'px');
    line.innerHTML = 'Also <span data-typed></span><span class="caret">▌</span>';
    box.appendChild(line);
    art.appendChild(box);
    els.txt = box;
    els.typed = line.querySelector('[data-typed]');
    els.typed.textContent = typed;

    var sr = el('h1', 'sr-only');
    sr.textContent = "I draw children's books. Also game backgrounds and educational materials.";
    hero.appendChild(sr);
    hero.appendChild(art);
    els.art = art;
  }

  function layout() {
    var vw = root.clientWidth, vh = window.innerHeight;
    if (vw === state.vw && vh === state.vh) return;
    state.vw = vw; state.vh = vh;
    var bp = pickBp(vw, vh), c = BP[bp];
    var zW = vw / c.FW, zh = bp >= 3 ? zW : Math.max(.3, (vh - c.HH * zW - 88) / (c.FH - c.HH));
    root.setAttribute('data-bp', bp);
    root.style.setProperty('--z', zW);
    root.style.setProperty('--zh', zh);
    if (bp !== state.bp) { state.bp = bp; build(bp); }
    // Wider crops shift the headline left so it stays on screen.
    if (bp < 3) els.txt.style.right = (c.baseR + Math.max(0, c.FW - vw / zh)) + 'px';
    var hd = document.querySelector('.hdr');
    if (hd) root.style.setProperty('--hdr', Math.round(hd.getBoundingClientRect().height) + 'px');
    document.dispatchEvent(new CustomEvent('layout'));
  }

  // Eyes follow the mouse; pupils are capped at m% of the eye box.
  function look(f, m, ev) {
    var r = els.pic.getBoundingClientRect();
    var cx = r.left + r.width * f[0], cy = r.top + r.height * f[1];
    var dx = ev.clientX - cx, dy = ev.clientY - cy, d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 220);
    return [Math.round(dx / d * k * m[0]), Math.round(dy / d * k * m[1])];
  }
  function setPupils(list, v) {
    list.forEach(function (e) { e.style.setProperty('--px', v[0]); e.style.setProperty('--py', v[1]); });
  }
  var moveRaf = 0, lastEv = null;
  window.addEventListener('mousemove', function (ev) {
    lastEv = ev;
    if (moveRaf) return;
    moveRaf = requestAnimationFrame(function () {
      moveRaf = 0;
      if (!els.pic) return;
      var c = BP[state.bp];
      setPupils(els.pirate, look(c.eyeF, [80, 45], lastEv));
      setPupils(els.crab, look(c.crabF, [45, 90], lastEv));
    });
  });

  function shut(list, ms) {
    list.forEach(function (e) { e.classList.add('shut'); });
    setTimeout(function () { list.forEach(function (e) { e.classList.remove('shut'); }); }, ms);
  }
  function blink() {
    shut(els.pirate, 130);
    if (Math.random() < .35) setTimeout(function () { shut(els.pirate, 130); }, 260);
    setTimeout(blink, 1200 + Math.random() * 1800);
  }
  function cblink() {
    shut(els.crab, 120);
    setTimeout(cblink, 900 + Math.random() * 1600);
  }

  // Typewriter: types a phrase, holds, deletes, moves to the next.
  var typed = reduced ? PHRASES[0] : '';
  function startTyping() {
    if (reduced) return;
    var p = 0, i = 0, dir = 1, hold = 0;
    setInterval(function () {
      if (hold > 0) { hold--; return; }
      var s = PHRASES[p];
      i += dir;
      if (i >= s.length) { dir = -1; hold = 25; }
      if (i <= 0) { dir = 1; p = (p + 1) % PHRASES.length; hold = 5; }
      typed = s.slice(0, i);
      if (els.typed) els.typed.textContent = typed;
    }, 60);
  }

  // Extra smoke puffs while the scroll button is hovered or focused. The layer lives inside the
  // zoomed stage and the origin comes from the inline px/% styles of the art and the pipe smoke,
  // not getBoundingClientRect(): Safari reports zoomed boxes unzoomed, which put the puffs on the head.
  var hoverTimer = 0;
  function smokeLayer() {
    if (reduced || !hero.animate || !els.art) return null;
    var stage = els.art, pipe = els.smoke, art = els.pic;
    var n = function (v) { return parseFloat(v) || 0; }, W = n(stage.style.width), H = n(stage.style.height);
    var layer = stage.querySelector(':scope > [data-smoke-layer]');
    if (!layer) { layer = el('div'); layer.setAttribute('data-smoke-layer', ''); stage.appendChild(layer); }
    layer.style.cssText = 'position:absolute;left:0;top:0;width:' + W + 'px;height:' + H + 'px;pointer-events:none;z-index:30;overflow:hidden';
    var ox = W * .35, oy = H * .4;
    if (pipe && art) {
      var aw = n(art.style.width), ah = n(art.style.height), ps = pipe.style;
      ox = n(art.style.left) + (n(ps.left) + n(ps.width) / 2) / 100 * aw;
      oy = n(art.style.top) + (n(ps.top) + n(ps.height) * .9) / 100 * ah;
    }
    return { layer: layer, W: W, H: H, ox: ox, oy: oy };
  }
  function puff(L, o) {
    var s = o.size * (.6 + Math.random() * .9);
    var p = el('div', '', 'position:absolute;left:' + (L.ox - s / 2) + 'px;top:' + (L.oy - s / 2) + 'px;width:' + s + 'px;height:' + s + 'px;border-radius:50%;background:radial-gradient(circle, rgba(255,255,255,.95) 0%, rgba(245,240,232,.7) 40%, rgba(245,240,232,0) 70%);filter:blur(' + (2 + Math.random() * 4) + 'px)');
    L.layer.appendChild(p);
    var ang = -Math.PI / 2 + (Math.random() - .5) * o.spread, dist = o.dist * (.5 + Math.random() * .7);
    var dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist * o.flat, sc = o.scale * (.6 + Math.random() * .8), wob = (Math.random() - .5) * o.wob, dur = o.dur * (.8 + Math.random() * .5);
    var an = p.animate([
      { transform: 'translate(0,0) scale(.2)', opacity: 0 },
      { transform: 'translate(' + (dx * .35 + wob) + 'px,' + (dy * .35) + 'px) scale(' + sc * .45 + ')', opacity: o.op, offset: .3 },
      { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + sc + ')', opacity: 0 }
    ], { duration: dur, easing: 'cubic-bezier(.2,.6,.3,1)', fill: 'both' });
    an.onfinish = function () { p.remove(); };
  }
  function smokeOn() {
    if (hoverTimer) return;
    var tick = function () {
      var L = smokeLayer(); if (!L) return;
      var b = Math.max(24, L.W * .022);
      for (var i = 0; i < 2; i++) puff(L, { size: b, spread: .9, dist: L.H * .45, flat: 1, scale: 2.6, wob: 50, dur: 1900, op: .85 });
    };
    tick(); hoverTimer = setInterval(tick, 110);
  }
  function smokeOff() { clearInterval(hoverTimer); hoverTimer = 0; }

  var btn = document.querySelector('[data-scroll-intro]');
  btn.addEventListener('mouseenter', smokeOn);
  btn.addEventListener('mouseleave', smokeOff);
  btn.addEventListener('focus', smokeOn);
  btn.addEventListener('blur', smokeOff);
  btn.addEventListener('click', function () {
    smokeOff();
    window.scrollToId && window.scrollToId('intro');
  });

  layout();
  window.addEventListener('resize', layout);
  startTyping();
  setTimeout(blink, 2000);
  setTimeout(cblink, 1300);
})();
