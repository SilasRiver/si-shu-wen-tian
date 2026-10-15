/* ============================================================
   天机阁 · 核心层
   星空粒子 / 开场动画 / 音效 / 路由与过场 / 交互反馈
   ============================================================ */
(function () {
  'use strict';

  TJ.modules = TJ.modules || {};

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  TJ.$ = $;
  TJ.$$ = $$;

  /* ==========================================================
     一、星空粒子背景
     ========================================================== */
  (function starfield() {
    var cv = $('#starfield');
    if (!cv) return;
    var ctx = cv.getContext('2d');
    var w = 0, h = 0, dpr = 1;
    var stars = [], anchors = [], links = [];
    var t0 = performance.now();

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = cv.clientWidth;
      h = cv.clientHeight;
      cv.width = Math.floor(w * dpr);
      cv.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    }

    function build() {
      var area = w * h;
      var n = Math.round(Math.min(area / 13000, window.innerWidth < 768 ? 110 : 240));
      stars = [];
      for (var i = 0; i < n; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 1.25 + 0.25,
          a: Math.random() * 0.55 + 0.18,
          ph: Math.random() * Math.PI * 2,
          sp: Math.random() * 0.0012 + 0.0004,
          vx: (Math.random() - 0.5) * 0.045,
          vy: (Math.random() - 0.5) * 0.045,
          gold: Math.random() < 0.24
        });
      }
      anchors = [];
      var an = window.innerWidth < 768 ? 9 : 15;
      for (var j = 0; j < an; j++) {
        anchors.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.07,
          vy: (Math.random() - 0.5) * 0.07,
          a: Math.random() * 0.35 + 0.2
        });
      }
      links = [];
      anchors.forEach(function (a, i) {
        var best = [];
        anchors.forEach(function (b, k) {
          if (i === k) return;
          var d = Math.hypot(a.x - b.x, a.y - b.y);
          best.push({ k: k, d: d });
        });
        best.sort(function (p, q) { return p.d - q.d; });
        for (var m = 0; m < 2 && m < best.length; m++) {
          var pair = i < best[m].k ? i + '-' + best[m].k : best[m].k + '-' + i;
          if (links.indexOf(pair) === -1) links.push(pair);
        }
      });
    }

    function frame(now) {
      var t = (now - t0) / 1000;
      ctx.clearRect(0, 0, w, h);

      // 星图连线
      ctx.lineWidth = 0.6;
      links.forEach(function (p) {
        var ab = p.split('-');
        var a = anchors[+ab[0]], b = anchors[+ab[1]];
        if (!a || !b) return;
        var d = Math.hypot(a.x - b.x, a.y - b.y);
        var fade = Math.max(0, 1 - d / 320);
        if (fade <= 0) return;
        ctx.strokeStyle = 'rgba(217,180,106,' + (0.09 * fade).toFixed(3) + ')';
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      });
      anchors.forEach(function (a) {
        a.x += a.vx; a.y += a.vy;
        if (a.x < -20) a.x = w + 20; if (a.x > w + 20) a.x = -20;
        if (a.y < -20) a.y = h + 20; if (a.y > h + 20) a.y = -20;
        ctx.beginPath();
        ctx.arc(a.x, a.y, 1.7, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(242,221,168,' + a.a.toFixed(2) + ')';
        ctx.fill();
      });

      // 星尘
      stars.forEach(function (s) {
        s.x += s.vx; s.y += s.vy;
        if (s.x < -4) s.x = w + 4; if (s.x > w + 4) s.x = -4;
        if (s.y < -4) s.y = h + 4; if (s.y > h + 4) s.y = -4;
        var tw = 0.62 + 0.38 * Math.sin(t * (s.sp * 1000) + s.ph);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = s.gold
          ? 'rgba(217,180,106,' + (s.a * tw).toFixed(3) + ')'
          : 'rgba(214,226,240,' + (s.a * tw * 0.85).toFixed(3) + ')';
        ctx.fill();
      });

      raf = requestAnimationFrame(frame);
    }

    var raf = 0;
    resize();
    window.addEventListener('resize', function () {
      clearTimeout(resize._t);
      resize._t = setTimeout(resize, 180);
    });

    if (REDUCED) {
      // 静态绘制一帧
      t0 = performance.now();
      frame(performance.now());
      cancelAnimationFrame(raf);
    } else {
      raf = requestAnimationFrame(frame);
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
        else if (!raf) { raf = requestAnimationFrame(frame); }
      });
    }
  })();

  /* ==========================================================
     二、音效（WebAudio 合成，无外部素材）
     ========================================================== */
  var Audio2 = (function () {
    var ctx = null, master = null, on = true;
    function ensure() {
      if (ctx) return ctx;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.16;
      master.connect(ctx.destination);
      return ctx;
    }
    function tone(freq, dur, type, delay, gain) {
      if (!on) return;
      var c = ensure(); if (!c) return;
      if (c.state === 'suspended') c.resume();
      var t = c.currentTime + (delay || 0);
      var osc = c.createOscillator();
      var g = c.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime((gain == null ? 0.6 : gain), t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g); g.connect(master);
      osc.start(t); osc.stop(t + dur + 0.05);
    }
    return {
      get enabled() { return on; },
      toggle: function () { on = !on; if (on) { ensure(); this.click(); } return on; },
      click: function () { tone(1180, 0.09, 'sine', 0, 0.3); tone(1760, 0.06, 'sine', 0.02, 0.14); },
      hover: function () { tone(1560, 0.05, 'sine', 0, 0.08); },
      open: function () { [523.25, 659.25, 783.99].forEach(function (f, i) { tone(f, 0.42, 'sine', i * 0.07, 0.34); }); },
      cast: function () {
        tone(110, 1.5, 'sine', 0, 0.7);
        tone(164.81, 1.1, 'sine', 0.04, 0.3);
        [1046.5, 1318.5, 1568].forEach(function (f, i) { tone(f, 0.5, 'triangle', 0.24 + i * 0.08, 0.12); });
      },
      reveal: function () { [659.25, 783.99, 1046.5, 1318.5].forEach(function (f, i) { tone(f, 0.55, 'sine', i * 0.075, 0.3); }); },
      tick: function () { tone(880, 0.045, 'square', 0, 0.05); }
    };
  })();
  TJ.audio = Audio2;

  /* ==========================================================
     三、开场动画
     ========================================================== */
  (function intro() {
    var el = $('#intro');
    if (!el) return;

    // 生成八卦环
    var ring = $('#trigramRing');
    if (ring) {
      var order = [1, 2, 3, 4, 5, 6, 7, 8];
      order.forEach(function (idx, i) {
        var a = (-90 + i * 45) * Math.PI / 180;
        var cx = 200 + 170 * Math.cos(a);
        var cy = 200 + 170 * Math.sin(a);
        var deg = -90 + i * 45 + 90;
        var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('transform', 'translate(' + cx.toFixed(2) + ',' + cy.toFixed(2) + ') rotate(' + deg + ')');
        var lines = TJ.TRIGRAMS[idx].lines; // 自下而上
        lines.forEach(function (v, k) {
          var y = 8.25 - k * 5.5;
          if (v === 1) {
            var r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            r.setAttribute('x', -11); r.setAttribute('y', y - 1.4);
            r.setAttribute('width', 22); r.setAttribute('height', 2.8);
            r.setAttribute('fill', '#d9b46a');
            g.appendChild(r);
          } else {
            [-11, 1.5].forEach(function (x) {
              var r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
              r.setAttribute('x', x); r.setAttribute('y', y - 1.4);
              r.setAttribute('width', 9.5); r.setAttribute('height', 2.8);
              r.setAttribute('fill', '#d9b46a');
              g.appendChild(r);
            });
          }
        });
        ring.appendChild(g);
      });
    }

    // 生成刻度环（64 刻度）
    var ticks = $('#tickRing');
    if (ticks) {
      for (var i = 0; i < 64; i++) {
        var a = i * (360 / 64) * Math.PI / 180;
        var long = i % 8 === 0;
        var r1 = long ? 130 : 135;
        var r2 = 140;
        var ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        ln.setAttribute('x1', (200 + r1 * Math.cos(a)).toFixed(2));
        ln.setAttribute('y1', (200 + r1 * Math.sin(a)).toFixed(2));
        ln.setAttribute('x2', (200 + r2 * Math.cos(a)).toFixed(2));
        ln.setAttribute('y2', (200 + r2 * Math.sin(a)).toFixed(2));
        ln.setAttribute('stroke-width', long ? 1.4 : 0.7);
        ln.setAttribute('opacity', long ? 0.95 : 0.45);
        ticks.appendChild(ln);
      }
    }

    var bar = $('#introBar'), pct = $('#introPct'), step = $('#introStep');
    var titleEl = $('#introTitle');
    var STEPS = [[0, '聚气'], [26, '演算'], [56, '定卦'], [82, '启门']];
    var GLYPHS = '乾坤震巽坎离艮兑爻卦象数天地玄机';
    var titleDone = false;

    function scramble() {
      var target = '天机阁';
      var frame = 0;
      var iv = setInterval(function () {
        frame++;
        var out = '';
        for (var i = 0; i < target.length; i++) {
          out += (frame > i * 5 + 8) ? target[i] : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        }
        titleEl.textContent = out;
        if (frame > 34) {
          clearInterval(iv);
          titleEl.textContent = target;
        }
      }, 42);
    }

    var DUR = 2900, started = 0, finished = false;

    function finish() {
      if (finished) return;
      finished = true;
      el.classList.add('is-titled');
      if (!titleDone) { titleDone = true; scramble(); }
      setTimeout(reveal, 420);
    }

    function reveal() {
      var tr = $('#transition');
      tr.style.setProperty('--tx', '50%');
      tr.style.setProperty('--ty', '50%');
      tr.classList.add('is-cover', 'is-flash');
      setTimeout(function () {
        el.classList.add('is-done');
        $('#app').classList.add('is-ready');
        document.body.classList.remove('is-intro', 'is-locked');
        TJ.audio.open();
        setTimeout(function () { TJ.initialRoute && TJ.initialRoute(); }, 320);
      }, 260);
      setTimeout(function () { tr.classList.add('is-reveal'); }, 460);
      setTimeout(function () {
        tr.classList.remove('is-cover', 'is-flash', 'is-reveal');
        el.setAttribute('aria-hidden', 'true');
      }, 1200);
    }

    function tick(now) {
      if (!started) started = now;
      var p = Math.min((now - started) / DUR, 1);
      var eased = p < 0.85 ? p : 1;
      bar.style.width = (eased * 100).toFixed(1) + '%';
      pct.textContent = Math.round(eased * 100) + '%';
      for (var i = STEPS.length - 1; i >= 0; i--) {
        if (eased * 100 >= STEPS[i][0]) {
          if (step.textContent !== STEPS[i][1]) { step.textContent = STEPS[i][1]; TJ.audio.tick(); }
          break;
        }
      }
      if (p >= 0.68 && !titleDone) { titleDone = true; el.classList.add('is-titled'); scramble(); }
      if (p < 1) requestAnimationFrame(tick);
      else finish();
    }

    function boot() {
      if (REDUCED) {
        el.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('is-intro', 'is-locked');
        $('#app').classList.add('is-ready');
        setTimeout(function () { TJ.initialRoute && TJ.initialRoute(); }, 0);
        return;
      }
      document.body.classList.add('is-locked');
      setTimeout(function () { el.classList.add('is-awake'); }, 60);
      setTimeout(function () { requestAnimationFrame(tick); }, 420);
    }

    el.addEventListener('click', function () {
      if (finished) return;
      bar.style.width = '100%'; pct.textContent = '100%'; step.textContent = '启门';
      finish();
    });
    window.addEventListener('keydown', function (e) {
      if (!finished && (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape')) finish();
    });

    boot();
  })();

  /* ==========================================================
     四、交互反馈：涟漪 / 粒子迸发 / 悬停音
     ========================================================== */
  var burstLayer = null;
  function ensureBurstLayer() {
    if (!burstLayer) {
      burstLayer = document.createElement('div');
      burstLayer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:130;';
      document.body.appendChild(burstLayer);
    }
    return burstLayer;
  }

  function burst(x, y, color) {
    if (REDUCED) return;
    var layer = ensureBurstLayer();
    var n = 12;
    for (var i = 0; i < n; i++) {
      var d = document.createElement('i');
      var size = Math.random() * 3 + 1.5;
      d.style.cssText = 'position:absolute;left:' + x + 'px;top:' + y + 'px;width:' + size +
        'px;height:' + size + 'px;border-radius:50%;background:' + (color || 'rgba(242,221,168,.95)') +
        ';box-shadow:0 0 8px ' + (color || 'rgba(217,180,106,.9)');
      layer.appendChild(d);
      var ang = Math.random() * Math.PI * 2;
      var dist = Math.random() * 62 + 22;
      var dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist;
      var dur = 480 + Math.random() * 420;
      d.animate(
        [
          { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
          { transform: 'translate(calc(-50% + ' + dx + 'px),calc(-50% + ' + dy + 'px)) scale(0)', opacity: 0 }
        ],
        { duration: dur, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' }
      ).onfinish = (function (node) { return function () { node.remove(); }; })(d);
    }
  }

  function ripple(el, ev) {
    if (REDUCED) return;
    var r = el.getBoundingClientRect();
    var size = Math.max(r.width, r.height);
    var s = document.createElement('span');
    s.className = 'ripple';
    s.style.width = s.style.height = size + 'px';
    s.style.left = (ev.clientX - r.left - size / 2) + 'px';
    s.style.top = (ev.clientY - r.top - size / 2) + 'px';
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    el.appendChild(s);
    setTimeout(function () { s.remove(); }, 720);
  }

  var CLICKABLE = '.btn,.mbti-opt,.ft-zodiac,.mh-method,.icon-btn,.gate,.chip';
  document.addEventListener('pointerdown', function (e) {
    var el = e.target.closest(CLICKABLE);
    if (!el) return;
    ripple(el, e);
    burst(e.clientX, e.clientY, el.classList.contains('gate') ? 'rgba(94,200,192,.95)' : null);
    TJ.audio.click();
  }, { passive: true });

  var hovered = null;
  document.addEventListener('pointerover', function (e) {
    var el = e.target.closest('.btn,.gate,.mbti-opt,.ft-zodiac,.icon-btn');
    if (!el || el === hovered) return;
    hovered = el;
    TJ.audio.hover();
  }, { passive: true });

  /* ==========================================================
     五、卡片 3D 倾斜
     ========================================================== */
  $$('.gate').forEach(function (gate) {
    gate.addEventListener('pointermove', function (e) {
      if (REDUCED || window.matchMedia('(pointer: coarse)').matches) return;
      var r = gate.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width;
      var py = (e.clientY - r.top) / r.height;
      gate.style.setProperty('--ry', ((px - 0.5) * 12).toFixed(2) + 'deg');
      gate.style.setProperty('--rx', ((0.5 - py) * 10).toFixed(2) + 'deg');
      gate.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
      gate.style.setProperty('--my', (py * 100).toFixed(1) + '%');
    });
    gate.addEventListener('pointerleave', function () {
      gate.style.setProperty('--ry', '0deg');
      gate.style.setProperty('--rx', '0deg');
    });
  });

  /* ==========================================================
     六、路由与过场
     ========================================================== */
  var VIEWS = ['home', 'meihua', 'bazi', 'mbti', 'fortune'];
  var current = 'home';
  var busy = false;

  function labelOf(name) {
    return { home: '归位', meihua: '梅花易数', bazi: '八字命盘', mbti: 'MBTI 人格', fortune: '今日运势' }[name] || '';
  }

  function go(name, origin) {
    if (busy || name === current || VIEWS.indexOf(name) === -1) return;
    busy = true;

    var tr = $('#transition');
    var tx = '50%', ty = '46%';
    if (origin && origin.clientX) {
      tx = origin.clientX + 'px';
      ty = origin.clientY + 'px';
    } else if (origin && origin.getBoundingClientRect) {
      var r = origin.getBoundingClientRect();
      tx = (r.left + r.width / 2) + 'px';
      ty = (r.top + r.height / 2) + 'px';
    }
    tr.style.setProperty('--tx', tx);
    tr.style.setProperty('--ty', ty);
    tr.classList.remove('is-reveal');
    tr.classList.add('is-cover', 'is-flash');

    TJ.audio.open();

    setTimeout(function () {
      VIEWS.forEach(function (v) {
        var el = document.getElementById('view-' + v);
        if (el) el.classList.toggle('is-active', v === name);
      });
      current = name;
      document.body.classList.toggle('is-panel', name !== 'home');
      try { history.replaceState(null, '', name === 'home' ? location.pathname : '#' + name); } catch (err) { /* file:// 下可能受限，忽略 */ }
      window.scrollTo({ top: 0, behavior: 'auto' });

      var host = document.getElementById('view-' + name);
      var mod = TJ.modules[name];
      if (mod && typeof mod.mount === 'function') {
        var body = host.querySelector('.panel__body');
        if (body) mod.mount(body, host);
      }
      if (name === 'home') reflowHome();

      tr.classList.add('is-reveal');
      setTimeout(function () {
        tr.classList.remove('is-cover', 'is-flash', 'is-reveal');
        busy = false;
      }, 620);
    }, 380);
  }
  TJ.go = go;

  function reflowHome() {
    var gates = $('#gates');
    if (!gates) return;
    $$('.gate', gates).forEach(function (g, i) {
      g.style.animation = 'none';
      void g.offsetWidth;
      g.style.animation = '';
    });
  }

  document.addEventListener('click', function (e) {
    var goEl = e.target.closest('[data-goto]');
    if (goEl) { go(goEl.getAttribute('data-goto'), goEl); return; }
    if (e.target.closest('[data-home]') || e.target.closest('#homeBtn')) {
      e.preventDefault();
      go('home', e.target.closest('#homeBtn') || e.target.closest('[data-home]'));
    }
  });

  window.addEventListener('hashchange', function () {
    var h = location.hash.replace('#', '') || 'home';
    if (VIEWS.indexOf(h) !== -1 && h !== current) go(h);
  });

  // 首次载入时的深链：/index.html#mbti 等
  TJ.initialRoute = function () {
    var h = location.hash.replace('#', '');
    if (VIEWS.indexOf(h) !== -1 && h !== 'home') go(h);
  };

  /* ==========================================================
     七、顶部栏 / 提示 / 日期
     ========================================================== */
  var soundBtn = $('#soundBtn');
  if (soundBtn) {
    soundBtn.addEventListener('click', function () {
      var on = TJ.audio.toggle();
      soundBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      toast(on ? '音效已开启' : '音效已关闭');
    });
  }

  var toastEl = $('#toast'), toastT = 0;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove('is-on'); }, 1900);
  }
  TJ.toast = toast;

  (function today() {
    var el = $('#todayLabel');
    if (!el) return;
    var d = new Date();
    var wk = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
    el.textContent = d.getFullYear() + '.' + (d.getMonth() + 1) + '.' + d.getDate() + ' 周' + wk;
  })();

  /* ==========================================================
     八、通用工具
     ========================================================== */
  TJ.util = {
    // 由生肖索引 + 日期生成确定性伪随机序列
    seeded: function (seed) {
      var s = seed >>> 0;
      return function () {
        s ^= s << 13; s >>>= 0;
        s ^= s >> 17;
        s ^= s << 5; s >>>= 0;
        return s / 4294967296;
      };
    },
    pick: function (arr, rnd) { return arr[Math.floor(rnd() * arr.length)]; },
    pickN: function (arr, n, rnd) {
      var copy = arr.slice(), out = [];
      for (var i = 0; i < n && copy.length; i++) {
        out.push(copy.splice(Math.floor(rnd() * copy.length), 1)[0]);
      }
      return out;
    },
    el: function (tag, cls, html) {
      var e = document.createElement(tag);
      if (cls) e.className = cls;
      if (html != null) e.innerHTML = html;
      return e;
    },
    stagger: function (nodes, base) {
      nodes.forEach(function (n, i) { n.style.setProperty('--i', i + (base || 0)); });
    },
    countUp: function (node, to, dur) {
      if (REDUCED) { node.textContent = to; return; }
      var t0 = performance.now();
      (function step(now) {
        var p = Math.min((now - t0) / (dur || 900), 1);
        var e = 1 - Math.pow(1 - p, 3);
        node.textContent = Math.round(to * e);
        if (p < 1) requestAnimationFrame(step);
      })(t0);
    }
  };
})();
