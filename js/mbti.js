/* ============================================================
   天机阁 · MBTI 人格测试
   28 题 / 四维计分 / 十六型结果
   ============================================================ */
(function () {
  'use strict';
  TJ.modules = TJ.modules || {};

  var Q = TJ.MBTI_QUESTIONS;
  var DIMS = TJ.MBTI_DIMS;
  var TOTAL = Q.length;

  var state = { i: 0, ans: [] };

  /* ---------- 计分 ---------- */
  function score() {
    var counts = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
    state.ans.forEach(function (pole, idx) {
      if (pole) counts[pole] = (counts[pole] || 0) + 1;
    });
    var code = '', dims = [];
    DIMS.forEach(function (d) {
      var l = counts[d.left], r = counts[d.right];
      var lt = l + r || 1;
      var lp = Math.round((l / lt) * 100);
      var rp = 100 - lp;
      var dominant = l > r ? d.left : d.right;
      code += dominant;
      dims.push({
        key: d.key, label: d.label,
        left: d.left, right: d.right,
        leftName: d.leftName, rightName: d.rightName,
        lp: lp, rp: rp, dominant: dominant,
        leftCount: l, rightCount: r
      });
    });
    return { code: code, dims: dims };
  }

  /* ---------- 渲染 ---------- */
  function render(host) {
    state.i = 0;
    state.ans = new Array(TOTAL).fill(null);
    host.innerHTML = '';
    var wrap = TJ.util.el('div', 'mbti');
    wrap.innerHTML =
      '<div class="mbti-progress">' +
        '<div class="mbti-progress__meta">' +
          '<span id="mbtiCount">第 1 / ' + TOTAL + ' 题</span>' +
          '<span id="mbtiPct">0%</span>' +
        '</div>' +
        '<div class="mbti-progress__track"><div class="mbti-progress__fill" id="mbtiFill"></div></div>' +
      '</div>' +
      '<div class="mbti-q" id="mbtiQ"></div>' +
      '<div class="mbti-nav">' +
        '<button type="button" class="btn btn--ghost btn--sm" id="mbtiPrev">← 上一题</button>' +
        '<span class="field__hint">按 1 / 2 键亦可作答</span>' +
      '</div>';
    host.appendChild(wrap);

    TJ.$('#mbtiPrev', host).addEventListener('click', function () {
      if (state.i === 0) { TJ.toast('已在第一题'); return; }
      state.i--;
      paint(host, true);
    });

    paint(host, false);
  }

  function paint(host, back) {
    var q = TJ.$('#mbtiQ', host);
    var dim = DIMS.filter(function (d) { return d.key === Q[state.i].dim; })[0];

    q.classList.remove('is-in');
    q.classList.add('is-out');

    var build = function () {
      var item = Q[state.i];
      q.innerHTML =
        '<div class="mbti-q__axis">' +
          '<span>' + dim.label + '</span>' +
          '<span>' + dim.left + ' / ' + dim.right + '</span>' +
          '<span>第 ' + (state.i + 1) + ' 题</span>' +
        '</div>' +
        '<h3 class="mbti-q__title">面对以下情境，更接近你的是——</h3>' +
        '<div class="mbti-opts">' +
          '<button type="button" class="mbti-opt" data-v="a">' +
            '<span class="mbti-opt__key">1</span>' +
            '<span class="mbti-opt__text">' + item.a[1] + '</span>' +
          '</button>' +
          '<button type="button" class="mbti-opt" data-v="b">' +
            '<span class="mbti-opt__key">2</span>' +
            '<span class="mbti-opt__text">' + item.b[1] + '</span>' +
          '</button>' +
        '</div>';

      TJ.$$('.mbti-opt', q).forEach(function (btn) {
        btn.addEventListener('click', function () { answer(host, btn.getAttribute('data-v')); });
      });

      q.classList.remove('is-out');
      q.classList.add('is-in');
      updateProgress(host);
    };

    if (back) setTimeout(build, 240); else build();
  }

  function updateProgress(host) {
    var done = state.ans.filter(function (x) { return x; }).length;
    var pct = Math.round((done / TOTAL) * 100);
    var fill = TJ.$('#mbtiFill', host);
    var c = TJ.$('#mbtiCount', host);
    var p = TJ.$('#mbtiPct', host);
    if (fill) fill.style.width = pct + '%';
    if (c) c.textContent = '第 ' + (state.i + 1) + ' / ' + TOTAL + ' 题';
    if (p) p.textContent = pct + '%';
  }

  function answer(host, v) {
    var item = Q[state.i];
    state.ans[state.i] = v === 'a' ? item.a[0] : item.b[0];
    TJ.audio.tick();

    if (state.i >= TOTAL - 1) {
      updateProgress(host);
      finish(host);
      return;
    }
    state.i++;
    paint(host, false);
  }

  /* ---------- 结果 ---------- */
  function finish(host) {
    var r = score();
    var type = TJ.MBTI_TYPES[r.code] || {};
    var wrap = TJ.$('.mbti', host);
    if (!wrap) return;

    TJ.audio.reveal();

    var dimsHTML = r.dims.map(function (d) {
      var leftDominant = d.dominant === d.left;
      return '<div class="mbti-dim">' +
        '<div class="mbti-dim__head">' +
          '<span>' + d.leftName + ' <b>' + d.left + ' ' + d.lp + '%</b></span>' +
          '<span>' + d.right + ' ' + d.rp + '% <b>' + d.rightName + '</b></span>' +
        '</div>' +
        '<div class="mbti-dim__track">' +
          '<i class="mbti-dim__seg mbti-dim__seg--l' + (leftDominant ? ' is-dominant' : '') + '" data-w="' + d.lp + '"></i>' +
          '<i class="mbti-dim__seg mbti-dim__seg--r' + (!leftDominant ? ' is-dominant' : '') + '" data-w="' + d.rp + '"></i>' +
        '</div>' +
        '<div class="field__hint" style="margin-top:.4rem">' + d.label + '：偏「' +
          (leftDominant ? d.leftName : d.rightName) + '」</div>' +
        '</div>';
    }).join('');

    wrap.innerHTML =
      '<div class="mbti-result">' +
        '<div class="mbti-type stagger">' +
          '<div class="mbti-type__code">' + r.code + '</div>' +
          '<div class="mbti-type__nick">' + (type.nick || '') + '</div>' +
          '<div class="mbti-type__slogan">' + (type.slogan || '') + '</div>' +
          '<div class="mbti-type__tags">' +
            (type.tags || []).map(function (t) { return '<span>' + t + '</span>'; }).join('') +
          '</div>' +
        '</div>' +

        '<div class="card stagger">' +
          '<div class="card__label">人 格 概 述</div>' +
          '<p style="font-size:.9rem;line-height:1.95;color:var(--dim)">' + (type.desc || '') + '</p>' +
        '</div>' +

        '<div class="card stagger">' +
          '<div class="card__label">四 维 倾 向</div>' +
          '<div class="mbti-dims">' + dimsHTML + '</div>' +
        '</div>' +

        '<div class="mbti-cols stagger">' +
          '<div class="card">' +
            '<div class="card__label">天 赋 优 势</div>' +
            '<ul class="mbti-list">' + (type.strengths || []).map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ul>' +
          '</div>' +
          '<div class="card">' +
            '<div class="card__label">值 得 留 意</div>' +
            '<ul class="mbti-list">' + (type.cautions || []).map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ul>' +
          '</div>' +
        '</div>' +

        '<div class="mbti-nav">' +
          '<button type="button" class="btn" id="mbtiAgain">重 新 测 试</button>' +
          '<button type="button" class="btn btn--ghost" id="mbtiBack">返 回 首 页</button>' +
        '</div>' +
      '</div>';

    // 条形图动画
    setTimeout(function () {
      TJ.$$('.mbti-dim__seg', wrap).forEach(function (seg, i) {
        var w = parseFloat(seg.getAttribute('data-w')) || 0;
        setTimeout(function () { seg.style.width = w + '%'; }, i * 90);
      });
    }, 120);

    TJ.$$('.stagger', wrap).forEach(function (s) {
      TJ.util.stagger(Array.prototype.slice.call(s.children));
    });

    TJ.$('#mbtiAgain', wrap).addEventListener('click', function () { render(host); });
    TJ.$('#mbtiBack', wrap).addEventListener('click', function () { TJ.go('home'); });

    // 进入结果页时的进度条收尾
    var fill = TJ.$('#mbtiFill', host);
    if (fill) fill.style.width = '100%';
    var c = TJ.$('#mbtiCount', host);
    if (c) c.textContent = '已完成 ' + TOTAL + ' / ' + TOTAL + ' 题';
    var p = TJ.$('#mbtiPct', host);
    if (p) p.textContent = '100%';

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---------- 键盘 ---------- */
  document.addEventListener('keydown', function (e) {
    if (!document.body.classList.contains('is-panel')) return;
    if (!document.getElementById('view-mbti').classList.contains('is-active')) return;
    var q = TJ.$('#mbtiQ');
    if (!q || !q.children.length) return;
    if (e.key === '1' || e.key === 'a' || e.key === 'A') {
      var b1 = q.querySelector('[data-v="a"]'); if (b1) b1.click();
    } else if (e.key === '2' || e.key === 'b' || e.key === 'B') {
      var b2 = q.querySelector('[data-v="b"]'); if (b2) b2.click();
    }
  });

  TJ.modules.mbti = {
    mount: function (container) { render(container); }
  };
})();
