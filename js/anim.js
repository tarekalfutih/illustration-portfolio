/* Canvas-animated illustrations: Lärandets magi (cover), Animal friends and Be Happy.
   Each piece is a base <img> with a <canvas> overlay drawn in the image's own pixel space.
   Animation runs only while the piece is on screen and the tab is visible, and stops under
   prefers-reduced-motion. */
(function () {
  'use strict';
  var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  var TAU = Math.PI * 2;

  function rng(seed) {
    return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function canvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h || w; return c; }
  function radial(size, stops) {
    var c = canvas(size), x = c.getContext('2d'), g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    stops.forEach(function (s) { g.addColorStop(s[0], s[1]); });
    x.fillStyle = g; x.fillRect(0, 0, size, size); return c;
  }
  // Flood-fill a mask into connected components (4-neighbour), dropping ones under minArea.
  function components(m, W, H, minArea, X0, Y0) {
    var lab = new Int32Array(W * H), comps = [], st = [], n = 0;
    for (var p = 0; p < W * H; p++) {
      if (!m[p] || lab[p]) continue;
      n++; var area = 0, x0 = W, y0 = H, x1 = 0, y1 = 0, sx = 0, sy = 0; st.push(p); lab[p] = n;
      while (st.length) {
        var q = st.pop(), qx = q % W, qy = (q / W) | 0; area++; sx += qx; sy += qy;
        if (qx < x0) x0 = qx; if (qx > x1) x1 = qx; if (qy < y0) y0 = qy; if (qy > y1) y1 = qy;
        var nb = [q - 1, q + 1, q - W, q + W];
        for (var k = 0; k < 4; k++) { var v = nb[k]; if (v < 0 || v >= W * H) continue; if (k < 2 && ((v / W) | 0) !== qy) continue; if (m[v] && !lab[v]) { lab[v] = n; st.push(v); } }
      }
      if (area >= minArea) comps.push({ id: n, area: area, x0: x0, y0: y0, x1: x1, y1: y1, cx: sx / area + X0, cy: sy / area + Y0 });
    }
    return { comps: comps, lab: lab };
  }
  // Cut one component out of the source pixels as a sprite, with a 1px soft edge.
  function cutSprite(c, lab, d, W, H, X0, Y0, edgeA) {
    var pw = c.x1 - c.x0 + 5, ph = c.y1 - c.y0 + 5, sc = canvas(pw, ph), sx = sc.getContext('2d'), out = sx.createImageData(pw, ph);
    for (var y = 0; y < ph; y++) for (var x = 0; x < pw; x++) {
      var gx = x + c.x0 - 2, gy = y + c.y0 - 2; if (gx < 0 || gy < 0 || gx >= W || gy >= H) continue;
      var hit = false;
      for (var dy = -1; dy <= 1 && !hit; dy++) for (var dx = -1; dx <= 1; dx++) { var yy = gy + dy, xx = gx + dx; if (yy >= 0 && xx >= 0 && yy < H && xx < W && lab[yy * W + xx] === c.id) { hit = true; break; } }
      if (!hit) continue;
      var si = (gy * W + gx) * 4, di = (y * pw + x) * 4;
      out.data[di] = d[si]; out.data[di + 1] = d[si + 1]; out.data[di + 2] = d[si + 2]; out.data[di + 3] = lab[gy * W + gx] === c.id ? 255 : edgeA;
    }
    sx.putImageData(out, 0, 0);
    return { cv: sc, x: c.x0 - 2 + X0, y: c.y0 - 2 + Y0, cx: c.cx, cy: c.cy };
  }
  function loadImg(src, cb) { var im = new Image(); im.onload = function () { cb(im); }; im.src = src; }

  /* Shared lifecycle: size the canvas to the wrapper, run rAF only while visible. */
  function mount(wrap, piece) {
    var c = wrap.querySelector('canvas');
    piece.c = c; piece.wrap = wrap;
    var visible = false, raf = 0;
    function resize() {
      var r = wrap.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = Math.max(1, Math.round(r.width * dpr)); c.height = Math.max(1, Math.round(r.height * dpr));
      piece.scale = c.width / piece.IW;
    }
    function kick() {
      if (!piece.ready) return;
      var run = !mq.matches && visible && !document.hidden;
      if (run && !raf) { piece.last = performance.now(); var loop = function (now) { raf = requestAnimationFrame(loop); piece.frame(now); }; raf = requestAnimationFrame(loop); }
      if (!run && raf) { cancelAnimationFrame(raf); raf = 0; }
      if (!run) piece.still();
    }
    piece.kick = kick;
    new ResizeObserver(function () { resize(); if (piece.ready && !raf) piece.still(); kick(); }).observe(wrap);
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; kick(); }).observe(wrap);
    document.addEventListener('visibilitychange', kick);
    mq.addEventListener('change', kick);
    resize();
    piece.init();
  }

  /* ---------- Lärandets magi: glowing title, star trails, dust, twinkling stars with flares ---------- */
  function Magi() {
    var P = { IW: 1139, IH: 1381, loop: 7, I: 1 };
    P.init = function () {
      loadImg('images/larandets-magi-cover.jpg', function (img) { P.build(img); P.ready = true; P.kick(); });
    };
    P.build = function (img) {
      var R = rng(20261024), IW = P.IW, IH = P.IH;
      P.dot = radial(64, [[0, 'rgba(255,253,235,1)'], [.2, 'rgba(255,226,130,.95)'], [.5, 'rgba(255,188,60,.32)'], [1, 'rgba(255,170,40,0)']]);
      P.halo = radial(64, [[0, 'rgba(255,236,160,.9)'], [.35, 'rgba(255,200,80,.35)'], [1, 'rgba(255,180,50,0)']]);
      var sp = canvas(128), sx = sp.getContext('2d'), glow = radial(128, [[0, 'rgba(255,252,230,1)'], [.25, 'rgba(255,220,120,.7)'], [1, 'rgba(255,190,60,0)']]);
      [[1, .06], [.06, 1]].forEach(function (s) { sx.save(); sx.translate(64, 64); sx.scale(s[0], s[1]); sx.drawImage(glow, -64, -64); sx.restore(); });
      sx.drawImage(glow, 40, 40, 48, 48);
      P.spark = sp;

      // title glow mask: gold pixels inside the title block only
      var sw = Math.round(IW / 6), sh = Math.round(IH / 6), m = canvas(sw, sh), mx = m.getContext('2d');
      mx.drawImage(img, 0, 0, sw, sh);
      var d = mx.getImageData(0, 0, sw, sh), p = d.data;
      for (var i = 0; i < p.length; i += 4) {
        var px = (i / 4) % sw / sw * 100, py = Math.floor(i / 4 / sw) / sh * 100, r = p[i], g = p[i + 1], b = p[i + 2];
        var on = px > 12.5 && px < 59.5 && py > 8 && py < 31.5 && r > 185 && g > 135 && b < 130 && r - b > 90;
        p[i] = 255; p[i + 1] = 196; p[i + 2] = 70; p[i + 3] = on ? 255 : 0;
      }
      mx.putImageData(d, 0, 0);
      var m2 = canvas(Math.round(sw / 3), Math.round(sh / 3)), m2x = m2.getContext('2d');
      m2x.imageSmoothingQuality = 'high'; m2x.drawImage(m, 0, 0, m2.width, m2.height);
      P.glowNear = m; P.glowFar = m2;

      var Pt = function (x, y) { return { x: x / 100 * IW, y: y / 100 * IH }; };
      var segDefs = [
        { w: 5, n: 14, pts: [[54.5, 9.0], [57.5, 9.7], [59.6, 11.8], [60.0, 14.4], [59.2, 17.0]] },
        { w: 6, n: 20, pts: [[21, 27.0], [16, 26.6], [12.4, 25.4], [11.8, 23.4], [13.8, 21.5], [18, 20.0]] },
        { w: 5, n: 14, pts: [[63.5, 21.4], [61, 23.2], [57.5, 24.8], [53.5, 26.0]] },
        { w: 8, n: 34, pts: [[39, 41.4], [33, 41.0], [26.5, 39.8], [22, 37.8], [20.8, 35.6], [22.8, 33.0], [27, 31.3], [32, 30.3], [36, 29.9]] }
      ];
      P.segs = segDefs.map(function (s) {
        var line = spline(s.pts.map(function (q) { return Pt(q[0], q[1]); })), parts = [];
        for (var i = 0; i < s.n; i++) parts.push({ u0: R(), k: R() < .7 ? 1 : 2, off: (R() * 2 - 1), wob: 1 + R() * 3, m: 1 + Math.floor(R() * 3), ph: R(), size: 2 + R() * 4.5, j: 1 + Math.floor(R() * 3), ps: R(), a: .55 + R() * .45 });
        return { line: line, w: s.w, parts: parts };
      });
      var S = function (x, y, r) { var o = Pt(x, y); o.r = r; return o; };
      P.stars = [S(16, 10.8, 18), S(19.8, 8.2, 11), S(49, 8.1, 5), S(52.2, 8.7, 7), S(64, 12.7, 11), S(64.5, 15.4, 7), S(65.8, 16.3, 4), S(62.5, 18, 18), S(13.6, 18.2, 7), S(28.8, 18.5, 7), S(17.8, 30.6, 18), S(15.8, 33.5, 11), S(40.2, 38.3, 8), S(26.6, 43.6, 5)]
        .map(function (s) { s.k = 1 + Math.floor(R() * 3); s.ph = R(); return s; });
      [[0, .08], [7, .33], [10, .58], [4, .83]].forEach(function (f) { P.stars[f[0]].flare = f[1]; });
      P.dust = [];
      for (var j = 0; j < 38; j++) {
        var depth = R(), o = Pt(9 + R() * 60, 7 + R() * 38);
        P.dust.push({ x: o.x, y: o.y, depth: depth, size: 1.5 + depth * 4.5, a: .18 + depth * .42, c: depth > .7 ? 2 : 1, ph: R(), rise: 25 + depth * 45, dr: 3 + R() * 9, m: 1 + Math.floor(R() * 2), ph2: R() });
      }
    };
    function spline(pts) {
      var out = [], n = pts.length;
      for (var i = 0; i < n - 1; i++) {
        var p0 = pts[Math.max(i - 1, 0)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(i + 2, n - 1)];
        for (var s = 0; s < 24; s++) {
          var t = s / 24, t2 = t * t, t3 = t2 * t;
          var f = function (a, b, c, d) { return .5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3); };
          out.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) });
        }
      }
      out.push(pts[n - 1]);
      var L = [0]; for (var k = 1; k < out.length; k++) L.push(L[k - 1] + Math.hypot(out[k].x - out[k - 1].x, out[k].y - out[k - 1].y));
      return { pts: out, L: L, total: L[L.length - 1] };
    }
    function at(line, u) {
      var tg = Math.min(Math.max(u, 0), 1) * line.total, L = line.L, i = 1;
      while (i < L.length - 1 && L[i] < tg) i++;
      var a = line.pts[i - 1], b = line.pts[i], f = (tg - L[i - 1]) / ((L[i] - L[i - 1]) || 1);
      var dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
      return { x: a.x + dx * f, y: a.y + dy * f, nx: -dy / len, ny: dx / len };
    }
    P.frame = function (now) { P.draw((now / 1000 % P.loop) / P.loop, false); };
    P.still = function () { P.draw(.25, true); };
    P.draw = function (p, still) {
      var c = P.c, x = c.getContext('2d'), I = P.I;
      x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, c.width, c.height);
      x.setTransform(P.scale, 0, 0, P.scale, 0, 0);
      var dot = function (px, py, s, a) { if (a <= .003) return; x.globalAlpha = Math.min(1, a); x.drawImage(P.dot, px - s, py - s, s * 2, s * 2); };
      var pulse = .5 - .5 * Math.cos(TAU * p);
      x.globalCompositeOperation = 'screen';
      x.globalAlpha = Math.min(1, I * (.16 + .16 * pulse)); x.drawImage(P.glowFar, 0, 0, P.IW, P.IH);
      x.globalAlpha = Math.min(1, I * (.06 + .08 * pulse)); x.drawImage(P.glowNear, 0, 0, P.IW, P.IH);
      x.globalCompositeOperation = 'lighter';
      if (!still) {
        P.segs.forEach(function (s) {
          s.parts.forEach(function (q) {
            var u = (q.u0 + p * q.k) % 1, fade = Math.min(1, u / .12) * Math.min(1, (1 - u) / .12);
            var life = Math.pow(.5 - .5 * Math.cos(TAU * (p * q.j + q.ps)), 1.4), a = fade * life * q.a * I;
            if (a < .01) return;
            var lat = q.off * s.w + q.wob * Math.sin(TAU * (p * q.m + q.ph));
            for (var g = 0; g < 3; g++) {
              var pt = at(s.line, u - g * 9 / s.line.total * q.k);
              dot(pt.x + pt.nx * lat, pt.y + pt.ny * lat, q.size * (1 - g * .28), a * (1 - g * .38));
            }
          });
        });
        P.dust.forEach(function (d) {
          var qd = (p * d.c + d.ph) % 1;
          dot(d.x + Math.sin(TAU * (p * d.m + d.ph2)) * d.dr, d.y - qd * d.rise, d.size, Math.sin(Math.PI * qd) * d.a * I);
        });
      }
      P.stars.forEach(function (s) {
        var tw = still ? .5 : .5 + .5 * Math.sin(TAU * (p * s.k + s.ph));
        x.globalAlpha = Math.min(1, I * (.18 + .42 * tw));
        var h = s.r * 2.4; x.drawImage(P.halo, s.x - h, s.y - h, h * 2, h * 2);
        if (s.flare != null && !still) {
          var dd = Math.abs(p - s.flare); dd = Math.min(dd, 1 - dd);
          var f = Math.exp(-Math.pow(dd / .035, 2));
          if (f > .01) {
            var zz = s.r * (2.2 + 3.2 * f);
            x.globalAlpha = Math.min(1, f * .95 * I); x.drawImage(P.spark, s.x - zz, s.y - zz, zz * 2, zz * 2);
            x.save(); x.translate(s.x, s.y); x.rotate(Math.PI / 4); var z2 = zz * .55;
            x.globalAlpha = Math.min(1, f * .5 * I); x.drawImage(P.spark, -z2, -z2, z2 * 2, z2 * 2); x.restore();
          }
        }
      });
      x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    };
    return P;
  }

  /* ---------- Animal friends: blinking eyes, glinting mirrors, sparkling earring, floating sparkles ---------- */
  function Friends() {
    var P = { IW: 1800, IH: 900 };
    P.init = function () {
      loadImg('images/we-love-books.jpg', function (img) { P.build(img); P.ready = true; P.kick(); });
    };
    P.build = function (img) {
      var R = rng(7), full = canvas(P.IW, P.IH), fx = full.getContext('2d');
      fx.drawImage(img, 0, 0, P.IW, P.IH);
      var data = fx.getImageData(0, 0, P.IW, P.IH).data, IW = P.IW;
      // lid colour: skin sampled on a ring around the eye, ignoring dark brows/outlines
      var lidCol = function (ex, ey, rx, ry) {
        var s = [];
        for (var a = 0; a < 16; a++) { var t = a / 16 * TAU, X = Math.round(ex + Math.cos(t) * (rx + 4)), Y = Math.round(ey + Math.sin(t) * (ry + 4)), i = (Y * IW + X) * 4; s.push([data[i], data[i + 1], data[i + 2]]); }
        s.sort(function (a, b) { return (b[0] + b[1] + b[2]) - (a[0] + a[1] + a[2]); });
        var k = s.slice(2, 8), m = function (j) { return k.reduce(function (v, c) { return v + c[j]; }, 0) / k.length | 0; };
        return 'rgb(' + m(0) + ',' + m(1) + ',' + m(2) + ')';
      };
      // eyes: [cx, cy, rx, ry]; pairs blink together
      var pairs = [
        [[392.5, 171, 6, 8.5], [439.5, 164.5, 6, 8.5]],
        [[752.5, 267.5, 3.5, 5], [778.5, 267.5, 3.5, 5]],
        [[928.5, 440, 4, 6.5], [956, 440, 4, 6.5]],
        [[174.5, 398.5, 3, 5], [191, 397.5, 3, 5]],
        [[537.5, 673.5, 2, 3], [549, 672.5, 2, 3]],
        [[649.5, 664, 2, 2.8], [660.5, 664, 2, 2.8]],
        [[355, 643, 2.5, 3.6], [374, 642, 2.5, 3.6]]
      ];
      P.blinkers = pairs.map(function (eyes) {
        return { eyes: eyes.map(function (e) { return { x: e[0], y: e[1], rx: e[2], ry: e[3], lid: lidCol(e[0], e[1], e[2], e[3]) }; }), next: 200 + R() * 900, dur: 160 + R() * 40, dbl: R() < .45 };
      });
      P.dot = radial(32, [[0, 'rgba(255,252,235,1)'], [.3, 'rgba(255,240,200,.6)'], [1, 'rgba(255,230,180,0)']]);
      P.mirrors = [{ x: 127, y: 271, rx: 38, ry: 62, rot: -.05, ph: 0 }, { x: 608, y: 331, rx: 28, ry: 33, rot: -.08, ph: .5 }];
      P.ear = { x: 682, y: 313, ph: .2 };
      P.star = (function () {
        var c = canvas(64), x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
        g.addColorStop(0, 'rgba(255,255,240,1)'); g.addColorStop(.25, 'rgba(255,240,190,.6)'); g.addColorStop(1, 'rgba(255,230,160,0)');
        [[1, .07], [.07, 1]].forEach(function (s) { x.save(); x.translate(32, 32); x.scale(s[0], s[1]); x.fillStyle = g; x.beginPath(); x.arc(0, 0, 32, 0, TAU); x.fill(); x.restore(); });
        x.fillStyle = g; x.save(); x.translate(32, 32); x.scale(.35, .35); x.beginPath(); x.arc(0, 0, 32, 0, TAU); x.fill(); x.restore();
        return c;
      })();
      P.sparks = [];
      for (var i = 0; i < 40; i++) P.sparks.push({ x: 60 + R() * 1680, y: 60 + R() * 760, s: 2 + R() * 4, a: .18 + R() * .3, ph: R(), per: 7 + R() * 6, rise: 20 + R() * 40, dr: 4 + R() * 10 });
    };
    P.still = function () { var c = P.c; c.getContext('2d').clearRect(0, 0, c.width, c.height); };
    P.frame = function (now) {
      var c = P.c, x = c.getContext('2d'), t = now / 1000;
      x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, c.width, c.height);
      x.setTransform(P.scale, 0, 0, P.scale, 0, 0);
      x.globalCompositeOperation = 'screen';
      P.mirrors.forEach(function (m) {
        var k = ((t / 7 + m.ph) % 1) * 2.2 - .4;
        if (k <= 0 || k >= 1.2) return;
        x.save(); x.beginPath(); x.ellipse(m.x, m.y, m.rx, m.ry, m.rot, 0, TAU); x.clip();
        x.translate(m.x, m.y); x.rotate(-.55);
        var bx = (k - .5) * m.rx * 3.2, bw = m.rx * .55, g = x.createLinearGradient(bx - bw, 0, bx + bw, 0);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        x.globalAlpha = Math.sin(Math.PI * Math.min(1, k / 1.2)); x.fillStyle = g; x.fillRect(bx - bw, -m.ry * 2, bw * 2, m.ry * 4);
        x.restore();
      });
      var e = P.ear, d = Math.abs(((t / 5.5 + e.ph) % 1) - .5), f = Math.exp(-Math.pow(d / .035, 2));
      if (f > .02) { var zz = 6 + 10 * f; x.globalAlpha = f * .9; x.save(); x.translate(e.x, e.y); x.rotate(.3 * f); x.drawImage(P.star, -zz, -zz, zz * 2, zz * 2); x.restore(); }
      x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';

      P.blinkers.forEach(function (bl) {
        if (bl.t0 == null && now > bl.next) bl.t0 = now;
        if (bl.t0 == null) return;
        var k = (now - bl.t0) / bl.dur;
        if (k >= 1) { if (bl.dbl && !bl.second) { bl.second = true; bl.t0 = now + 90; } else { bl.t0 = null; bl.second = false; bl.dbl = Math.random() < .45; bl.next = now + 600 + Math.random() * 1200; } return; }
        if (k < 0) return;
        var cl = Math.sin(Math.PI * k);
        bl.eyes.forEach(function (e) {
          var top = e.y - e.ry - 2.5, hgt = (e.ry * 2 + 5) * cl;
          x.save(); x.beginPath(); x.ellipse(e.x, e.y, e.rx + 1.6, e.ry + 1.8, 0, 0, TAU); x.clip();
          x.fillStyle = e.lid; x.fillRect(e.x - e.rx - 3, top, e.rx * 2 + 6, hgt);
          if (cl > .25) { x.strokeStyle = 'rgba(45,30,60,.75)'; x.lineWidth = Math.max(1, e.rx * .3); x.beginPath(); var lw = e.rx + Math.min(2, e.rx * .4); x.moveTo(e.x - lw, top + hgt); x.quadraticCurveTo(e.x, top + hgt + e.ry * .25, e.x + lw, top + hgt); x.stroke(); }
          x.restore();
        });
      });

      x.globalCompositeOperation = 'lighter';
      P.sparks.forEach(function (s) {
        var q = ((t / s.per) + s.ph) % 1, a = Math.sin(Math.PI * q) * s.a;
        if (a < .01) return;
        x.globalAlpha = a;
        x.drawImage(P.dot, s.x + Math.sin(TAU * (t / s.per * 1.5 + s.ph)) * s.dr - s.s, s.y - q * s.rise - s.s, s.s * 2, s.s * 2);
      });
      x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    };
    return P;
  }

  /* ---------- Be Happy: bouncing title, ray pulses, sparkler, bubbles, confetti, twinkles, balloon, snail ---------- */
  function Happy() {
    var P = { IW: 1293, IH: 1217, t: 0 };
    P.init = function () {
      P.build(); P.ready = true; P.kick();
      // The balloon and title letters are cut from the version that still has its paper background.
      loadImg('images/be-happy-anim.jpg', function (img) {
        try { P.prepTitle(img); } catch (e) { console.warn(e); }
        try { P.prepBalloon(img); } catch (e) { console.warn(e); }
        P.kick();
      });
    };
    P.build = function () {
      var R = rng(21); P.R = R;
      var cols = ['#e8473d', '#f2c14e', '#9b6bd6', '#3b8fe0', '#4caf63', '#ff8fb8'];
      P.confetti = [];
      for (var i = 0; i < 36; i++) P.confetti.push({ x: R() * P.IW, y: R() * P.IH, vy: 38 + R() * 40, sw: 12 + R() * 26, sp: .6 + R() * 1.2, ph: R() * 6.28, rot: R() * 6.28, vr: (R() - .5) * 4, fl: 3 + R() * 5, w: 7 + R() * 7, h: 4 + R() * 4, c: cols[(R() * cols.length) | 0] });
      P.bubbles = []; for (var j = 0; j < 10; j++) P.bubbles.push(newBubble(true));
      P.sparks = [];
      P.twinkles = [[452, 165], [632, 212], [318, 352], [560, 300], [800, 236], [712, 438], [246, 392], [868, 420], [520, 470], [405, 255]].map(function (p) { return { x: p[0], y: p[1], per: 2.2 + R() * 2.4, ph: R(), s: 9 + R() * 8 }; });
      P.rays = [[268, 432], [292, 474], [322, 292], [352, 240], [728, 197], [752, 228], [892, 300], [892, 352]];
      P.eyes = [{ x: 890, y: 982, rx: 15, ry: 17 }, { x: 844, y: 1012, rx: 12, ry: 14 }];
      P.blink = { next: 1.5, dur: .2, dbl: false };
    };
    function newBubble(init) {
      var R = P.R;
      return { x: 120 + R() * (P.IW - 240), y: init ? R() * P.IH : P.IH + 40, r: 8 + R() * 18, v: 28 + R() * 30, sw: 10 + R() * 22, ph: R() * 6.28, sp: .5 + R() };
    }
    P.prepBalloon = function (img) {
      var X0 = 950, Y0 = 222, W = 200, H = 206, oc = canvas(W, H), ox = oc.getContext('2d');
      ox.drawImage(img, -X0, -Y0);
      var d = ox.getImageData(0, 0, W, H).data, br = 0, bg = 0, bb = 0, bn = 0, x, y, i;
      [0, 1, H - 2, H - 1].forEach(function (y) { for (var x = 0; x < W; x++) { var i = (y * W + x) * 4; if (x > 30 && x < 80 && y > H - 3) continue; br += d[i]; bg += d[i + 1]; bb += d[i + 2]; bn++; } });
      for (y = 0; y < H - 30; y++) [0, 1, W - 2, W - 1].forEach(function (x) { var i = (y * W + x) * 4; br += d[i]; bg += d[i + 1]; bb += d[i + 2]; bn++; });
      br /= bn; bg /= bn; bb /= bn;
      var m = new Uint8Array(W * H);
      for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
        var gx = x + X0, gy = y + Y0; i = (y * W + x) * 4;
        var inE = Math.pow((gx - 1052) / 92, 2) + Math.pow((gy - 320) / 102, 2) < 1, inK = gx > 982 && gx < 1022 && gy > 392 && gy < 424;
        if (!(inE || inK)) continue;
        if (Math.abs(d[i] - br) + Math.abs(d[i + 1] - bg) + Math.abs(d[i + 2] - bb) > 55) m[y * W + x] = 1;
      }
      var m1 = new Uint8Array(W * H);
      for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
        if (!m[y * W + x]) continue;
        for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) { var yy = y + dy, xx = x + dx; if (yy >= 0 && xx >= 0 && yy < H && xx < W) m1[yy * W + xx] = 1; }
      }
      var sp = canvas(W, H), sx = sp.getContext('2d'), so = sx.createImageData(W, H);
      for (var p = 0; p < W * H; p++) {
        i = p * 4;
        if (m1[p]) { so.data[i] = d[i]; so.data[i + 1] = d[i + 1]; so.data[i + 2] = d[i + 2]; so.data[i + 3] = m[p] ? 255 : 150; }
      }
      sx.putImageData(so, 0, 0);
      P.balloon = { sp: sp, x: X0, y: Y0, px: 1001, py: 412 };
    };
    P.prepTitle = function (img) {
      var X0 = 230, Y0 = 120, W = 710, H = 400, oc = canvas(W, H), ox = oc.getContext('2d');
      ox.drawImage(img, -X0, -Y0);
      var d = ox.getImageData(0, 0, W, H).data, m = new Uint8Array(W * H);
      for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
        var i = (y * W + x) * 4, r = d[i], g = d[i + 1], b = d[i + 2], gx = x + X0, gy = y + Y0;
        var yellow = r > 190 && g > 135 && b < 150 && r - b > 70;
        var blue = gy < 310 && gx > 380 && gx < 660 && b - r > 60 && g < 150 && b > 110;
        if (yellow || blue) m[y * W + x] = 1;
      }
      var res = components(m, W, H, 60, X0, Y0);
      var comps = res.comps.filter(function (c) { return !(c.cx > 625 && c.cx < 725 && c.cy > 400); });
      var sprite = function (c) { return cutSprite(c, res.lab, d, W, H, X0, Y0, 170); };
      P.letters = comps.filter(function (c) { return c.area >= 1500; }).sort(function (a, b) { return a.cx - b.cx; }).map(sprite);
      var rays = comps.filter(function (c) { return c.area < 1500; }).sort(function (a, b) { return Math.atan2(a.cy - 330, a.cx - 580) - Math.atan2(b.cy - 330, b.cx - 580); }).map(sprite);
      P.raySprites = rays;
      if (rays.length) P.rays = rays.map(function (r) { return [r.cx, r.cy]; });
    };
    // Paused (reduced motion, off screen, tab hidden): the balloon sprite must still be drawn.
    P.still = function () {
      var c = P.c, x = c.getContext('2d');
      x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, c.width, c.height);
      if (P.balloon) { x.setTransform(P.scale, 0, 0, P.scale, 0, 0); x.drawImage(P.balloon.sp, P.balloon.x, P.balloon.y); }
    };
    function star(x, cx, cy, s, a, col) {
      x.save(); x.translate(cx, cy); x.globalAlpha = a; x.fillStyle = col; x.beginPath();
      for (var k = 0; k < 8; k++) { var ang = k * Math.PI / 4, r = k % 2 ? s * .22 : s; x.lineTo(Math.cos(ang) * r, Math.sin(ang) * r); }
      x.closePath(); x.fill(); x.restore();
    }
    P.frame = function (now) {
      var dt = Math.min(.05, (now - P.last) / 1000); P.last = now; P.t += dt;
      var c = P.c, x = c.getContext('2d'), k = P.scale, t = P.t, R = P.R;
      x.setTransform(k, 0, 0, k, 0, 0); x.clearRect(0, 0, P.IW, P.IH);

      // title: letters bounce in a wave, rays pop
      if (P.letters && P.letters.length) {
        if (!P.tmp || P.tmp.width !== c.width || P.tmp.height !== c.height) P.tmp = canvas(c.width, c.height);
        var tx2 = P.tmp.getContext('2d');
        tx2.setTransform(1, 0, 0, 1, 0, 0); tx2.clearRect(0, 0, c.width, c.height); tx2.setTransform(k, 0, 0, k, 0, 0);
        var wrap = function (v) { return ((v % 1) + 1) % 1; };
        var drawSp = function (s, sc, dy, rot) { tx2.save(); tx2.translate(s.cx, s.cy + dy); tx2.rotate(rot); tx2.scale(sc, sc); tx2.drawImage(s.cv, s.x - s.cx, s.y - s.cy); tx2.restore(); };
        (P.raySprites || []).forEach(function (s, i) { var u = wrap(t / 1.8 - i * .11), p = u < .3 ? Math.sin(Math.PI * u / .3) : 0; drawSp(s, 1 + .22 * p, 0, 0); });
        P.letters.forEach(function (s, i) { var u = wrap((t - i * .14) / 3.4), p = u < .28 ? Math.sin(Math.PI * u / .28) : 0; drawSp(s, 1 + .07 * p, -12 * p, .05 * p * (i % 2 ? 1 : -1)); });
        x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(P.tmp, 0, 0); x.setTransform(k, 0, 0, k, 0, 0);
      }

      // ray shine
      x.globalCompositeOperation = 'screen';
      P.rays.forEach(function (r, i) {
        var p = Math.pow(Math.max(0, Math.sin(TAU * (t / 1.8 - i * .11))), 3);
        if (p < .02) return;
        var g = x.createRadialGradient(r[0], r[1], 0, r[0], r[1], 30);
        g.addColorStop(0, 'rgba(255,236,150,' + (.55 * p) + ')'); g.addColorStop(1, 'rgba(255,236,150,0)');
        x.fillStyle = g; x.beginPath(); x.arc(r[0], r[1], 30, 0, TAU); x.fill();
      });

      // balloon: sways on its string, highlight pulses
      if (P.balloon) {
        var b = P.balloon, ang = .07 * Math.sin(TAU * t / 3.2) + .025 * Math.sin(TAU * t / 1.7), bdy = 3 * Math.sin(TAU * t / 2.4);
        x.globalCompositeOperation = 'source-over';
        x.save(); x.translate(b.px, b.py + bdy); x.rotate(ang); x.translate(-b.px, -b.py);
        x.drawImage(b.sp, b.x, b.y);
        var hp = .5 + .5 * Math.sin(TAU * t / 2.6), hg = x.createRadialGradient(1016, 286, 0, 1016, 286, 34);
        hg.addColorStop(0, 'rgba(255,255,255,' + (.15 + .2 * hp) + ')'); hg.addColorStop(1, 'rgba(255,255,255,0)');
        x.globalCompositeOperation = 'screen'; x.fillStyle = hg; x.beginPath(); x.arc(1016, 286, 34, 0, TAU); x.fill();
        x.restore();
      }

      // title twinkles
      x.globalCompositeOperation = 'source-over';
      P.twinkles.forEach(function (s) {
        var q = ((t / s.per + s.ph) % 1), f = q < .3 ? Math.sin(Math.PI * q / .3) : 0;
        if (f > .02) { star(x, s.x, s.y, s.s * (.4 + .6 * f), .95 * f, '#fffbe8'); star(x, s.x, s.y, s.s * .45 * f, f, '#ffd760'); }
      });

      // sparkler on the party hat
      var hx = 673, hy = 405, nNew = Math.round(80 * dt) + (R() < 80 * dt % 1 ? 1 : 0);
      for (var n = 0; n < nNew; n++) {
        var a = -Math.PI / 2 + (R() - .5) * Math.PI * 1.7, v = 60 + R() * 130;
        P.sparks.push({ x: hx, y: hy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: .35 + R() * .5 });
      }
      x.globalCompositeOperation = 'lighter'; x.lineCap = 'round';
      P.sparks = P.sparks.filter(function (p) { return (p.life += dt) < p.max; });
      P.sparks.forEach(function (p) {
        var px = p.x, py = p.y; p.vy += 260 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        var u = p.life / p.max;
        x.strokeStyle = u < .35 ? 'rgba(255,252,230,' + (1 - u) + ')' : 'rgba(255,' + (200 - 80 * u | 0) + ',80,' + ((1 - u) * .9) + ')';
        x.lineWidth = 2.2 * (1 - u) + .6; x.beginPath(); x.moveTo(px, py); x.lineTo(p.x, p.y); x.stroke();
      });
      var fl = .7 + .3 * Math.sin(t * 31) * Math.sin(t * 17), cg = x.createRadialGradient(hx, hy, 0, hx, hy, 34 * fl);
      cg.addColorStop(0, 'rgba(255,255,235,.75)'); cg.addColorStop(.35, 'rgba(255,220,120,.35)'); cg.addColorStop(1, 'rgba(255,200,90,0)');
      x.fillStyle = cg; x.beginPath(); x.arc(hx, hy, 34 * fl, 0, TAU); x.fill();

      // bubbles
      x.globalCompositeOperation = 'source-over';
      P.bubbles.forEach(function (b, i) {
        b.y -= b.v * dt; if (b.y < -40) P.bubbles[i] = b = newBubble(false);
        var bx = b.x + Math.sin(t * b.sp + b.ph) * b.sw, fade = Math.min(1, (P.IH + 40 - b.y) / 160, (b.y + 40) / 160);
        x.globalAlpha = Math.max(0, fade);
        var g = x.createRadialGradient(bx - b.r * .3, b.y - b.r * .3, b.r * .1, bx, b.y, b.r);
        g.addColorStop(0, 'rgba(255,255,255,.05)'); g.addColorStop(.8, 'rgba(200,230,255,.12)'); g.addColorStop(1, 'rgba(255,255,255,.35)');
        x.fillStyle = g; x.beginPath(); x.arc(bx, b.y, b.r, 0, TAU); x.fill();
        x.strokeStyle = 'rgba(255,255,255,.7)'; x.lineWidth = 1.4; x.stroke();
        x.strokeStyle = 'rgba(255,180,230,.35)'; x.lineWidth = 1; x.beginPath(); x.arc(bx, b.y, b.r - 2, .3, 1.6); x.stroke();
        x.fillStyle = 'rgba(255,255,255,.85)'; x.beginPath(); x.ellipse(bx - b.r * .4, b.y - b.r * .4, b.r * .18, b.r * .1, -.7, 0, TAU); x.fill();
      });
      x.globalAlpha = 1;

      // confetti
      P.confetti.forEach(function (p) {
        p.y += p.vy * dt; p.rot += p.vr * dt;
        if (p.y > P.IH + 20) { p.y = -20; p.x = R() * P.IW; }
        x.save(); x.translate(p.x + Math.sin(t * p.sp + p.ph) * p.sw, p.y); x.rotate(p.rot); x.scale(1, Math.cos(t * p.fl + p.ph));
        x.fillStyle = p.c; x.globalAlpha = .9; x.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); x.restore();
      });
      x.globalAlpha = 1;

      // snail blink
      var bl = P.blink;
      if (t > bl.next + bl.dur) { bl.next = t + (bl.dbl ? .25 : 2.4 + R() * 3); bl.dbl = !bl.dbl && R() < .25; }
      var bt = t - bl.next;
      if (bt > 0 && bt < bl.dur) {
        var cl = Math.sin(Math.PI * bt / bl.dur);
        P.eyes.forEach(function (e) {
          x.save(); x.beginPath(); x.ellipse(e.x, e.y, e.rx + 1.5, e.ry + 1.5, 0, 0, TAU); x.clip();
          var ly = e.y - e.ry - 2 + (e.ry * 2 + 4) * cl;
          x.fillStyle = '#b9a3e6'; x.fillRect(e.x - e.rx - 3, e.y - e.ry - 3, e.rx * 2 + 6, ly - (e.y - e.ry - 3));
          x.strokeStyle = '#2a2030'; x.lineWidth = 2.2; x.beginPath(); x.moveTo(e.x - e.rx - 2, ly); x.quadraticCurveTo(e.x, ly + 4, e.x + e.rx + 2, ly); x.stroke();
          x.restore();
          x.strokeStyle = '#2a2030'; x.lineWidth = 2.4; x.beginPath(); x.ellipse(e.x, e.y, e.rx + .5, e.ry + .5, 0, 0, TAU); x.stroke();
        });
      }
    };
    return P;
  }

  var MAKERS = { magi: Magi, friends: Friends, happy: Happy };
  document.querySelectorAll('[data-anim-piece]').forEach(function (w) {
    var make = MAKERS[w.getAttribute('data-anim-piece')];
    if (make) mount(w, make());
  });
})();
