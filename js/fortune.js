/* ============================================================
   天机阁 · 今日运势
   十二生肖 / 确定性日运推演 / 四维评分 · 宜忌 · 幸运物
   ============================================================ */
(function () {
  'use strict';
  TJ.modules = TJ.modules || {};

  var C = 2 * Math.PI * 42;   // 环周长
  var state = { z: -1 };

  var DIRECTIONS = ['东方', '东南', '南方', '西南', '西方', '西北', '北方', '东北'];
  var LUCKY_DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  function todayKey() {
    var d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  }

  function todayText() {
    var d = new Date();
    var wk = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
    return d.getFullYear() + ' 年 ' + (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日 · 周' + wk;
  }

  function compute(zIdx) {
    var seed = (todayKey() * 2654435761 + (zIdx + 1) * 40503) >>> 0;
    var rnd = TJ.util.seeded(seed);

    var career = 44 + Math.floor(rnd() * 54);
    var wealth = 44 + Math.floor(rnd() * 54);
    var love = 44 + Math.floor(rnd() * 54);
    var overall = Math.round((career + wealth + love) / 3 + (rnd() - 0.5) * 16);
    overall = Math.max(38, Math.min(99, overall));

    var color = TJ.FT_COLORS[Math.floor(rnd() * TJ.FT_COLORS.length)];
    var digits = TJ.util.pickN(LUCKY_DIGITS, 2, rnd).sort(function (a, b) { return a - b; });
    var dir = DIRECTIONS[Math.floor(rnd() * DIRECTIONS.length)];
    var helperIdx = (zIdx + 4 + Math.floor(rnd() * 8)) % 12;
    var yi = TJ.util.pickN(TJ.FT_YI, 4, rnd);
    var ji = TJ.util.pickN(TJ.FT_JI, 3, rnd);
    var quote = TJ.FT_QUOTES[Math.floor(rnd() * TJ.FT_QUOTES.length)];

    return {
      overall: overall, career: career, wealth: wealth, love: love,
      color: color, digits: digits, dir: dir,
      helper: TJ.ZODIACS[helperIdx].name,
      yi: yi, ji: ji, quote: quote,
      verdict: verdictOf(overall)
    };
  }

  function verdictOf(v) {
    if (v >= 88) return { word: '上 吉', cls: 'ji', tip: '诸事顺遂，宜乘势而为，勿失良机。' };
    if (v >= 75) return { word: '中 吉', cls: 'ji', tip: '运势稳中有进，按既定节奏推进即可。' };
    if (v >= 62) return { word: '小 吉', cls: 'ji', tip: '小有斩获，宜守正待时，不宜冒进。' };
    if (v >= 50) return { word: '平 和', cls: 'ji', tip: '运程平顺，宜处理常规事务，静待转机。' };
    return { word: '宜 守', cls: 'xiong', tip: '运势偏弱，宜收敛锋芒、减少决断，以待来日。' };
  }

  /* ---------- 渲染 ---------- */
  function render(host) {
    host.innerHTML = '';
    var wrap = TJ.util.el('div', 'ft');
    wrap.innerHTML =
      '<div class="ft-zodiacs" id="ftGrid">' +
        TJ.ZODIACS.map(function (z, i) {
          return '<button type="button" class="ft-zodiac" data-z="' + i + '">' +
            '<span class="ft-zodiac__char">' + z.emoji + '</span>' +
            '<span class="ft-zodiac__name">' + z.name + '</span>' +
            '</button>';
        }).join('') +
      '</div>' +
      '<div class="ft-out" id="ftOut"></div>';

    host.appendChild(wrap);

    TJ.$$('.ft-zodiac', wrap).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var i = +btn.getAttribute('data-z');
        state.z = i;
        TJ.$$('.ft-zodiac', wrap).forEach(function (x) { x.classList.toggle('is-on', x === btn); });
        show(host, i);
      });
    });

    if (state.z >= 0) {
      var pre = TJ.$('.ft-zodiac[data-z="' + state.z + '"]', wrap);
      if (pre) pre.classList.add('is-on');
      show(host, state.z);
    } else {
      TJ.$('#ftOut', wrap).innerHTML =
        '<div class="card" style="text-align:center;padding:2.2rem 1.2rem">' +
        '<div class="card__label" style="color:var(--gold)">' + todayText() + '</div>' +
        '<p style="color:var(--dim);font-size:.86rem;letter-spacing:.08em">' +
        '请先选择你的生肖，以观今日之势。<br>' +
        '<span class="field__hint">同一日、同一生肖，推演结果唯一。</span></p>' +
        '</div>';
    }
  }

  function ring(label, value, delay) {
    return '<div class="ft-score">' +
      '<div class="ft-ring">' +
        '<svg viewBox="0 0 100 100">' +
          '<circle class="ft-ring__bg" cx="50" cy="50" r="42"></circle>' +
          '<circle class="ft-ring__fg" cx="50" cy="50" r="42" ' +
            'stroke-dasharray="' + C.toFixed(2) + '" stroke-dashoffset="' + C.toFixed(2) + '" ' +
            'data-v="' + value + '" data-delay="' + delay + '"></circle>' +
        '</svg>' +
        '<div class="ft-ring__val" data-n="' + value + '">0</div>' +
      '</div>' +
      '<div class="ft-score__label">' + label + '</div>' +
    '</div>';
  }

  function show(host, zIdx) {
    var z = TJ.ZODIACS[zIdx];
    var d = compute(zIdx);
    var out = TJ.$('#ftOut', host);
    if (!out) return;

    TJ.audio.reveal();

    out.innerHTML =
      '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>' +
        '<linearGradient id="ftGrad" x1="0" y1="0" x2="1" y2="1">' +
          '<stop offset="0%" stop-color="#8a6b2f"/>' +
          '<stop offset="50%" stop-color="#f2dda8"/>' +
          '<stop offset="100%" stop-color="#5ec8c0"/>' +
        '</linearGradient>' +
      '</defs></svg>' +

      '<div class="ft-head stagger">' +
        '<div class="ft-head__zodiac">' +
          '<b>' + z.emoji + '　' + z.name + '</b>' +
          '<span>' + z.trait + '</span>' +
        '</div>' +
        '<div class="ft-head__date">' + todayText() + '</div>' +
      '</div>' +

      '<div class="ft-scores stagger">' +
        ring('综 合', d.overall, 0) +
        ring('事 业', d.career, 1) +
        ring('财 运', d.wealth, 2) +
        ring('情 感', d.love, 3) +
      '</div>' +

      '<div class="card stagger" style="margin-bottom:1.4rem">' +
        '<div class="mh-verdict mh-verdict--' + d.verdict.cls + '">' +
          '<div class="mh-verdict__grade">' + d.verdict.word + '</div>' +
          '<div class="mh-verdict__text">' + d.verdict.tip + '</div>' +
        '</div>' +
      '</div>' +

      '<div class="ft-luck stagger">' +
        '<div class="card ft-luck__item">' +
          '<span class="ft-swatch" style="background:' + d.color.hex + ';color:' + d.color.hex + '"></span>' +
          '<span class="mh-kv"><span class="mh-kv__k">幸运色</span><span class="mh-kv__v"><b>' + d.color.name + '</b> ' + d.color.hex + '</span></span>' +
        '</div>' +
        '<div class="card ft-luck__item">' +
          '<span class="ft-swatch" style="background:linear-gradient(135deg,var(--gold-3),var(--gold-2));color:var(--gold)"></span>' +
          '<span class="mh-kv"><span class="mh-kv__k">幸运数</span><span class="mh-kv__v"><b>' + d.digits.join(' · ') + '</b></span></span>' +
        '</div>' +
        '<div class="card ft-luck__item">' +
          '<span class="ft-swatch" style="background:radial-gradient(circle,rgba(94,200,192,.5),transparent 70%);color:var(--jade)"></span>' +
          '<span class="mh-kv"><span class="mh-kv__k">贵人生肖</span><span class="mh-kv__v"><b>' + d.helper + '</b></span></span>' +
        '</div>' +
        '<div class="card ft-luck__item">' +
          '<span class="ft-swatch" style="background:radial-gradient(circle,rgba(217,180,106,.45),transparent 70%);color:var(--gold)"></span>' +
          '<span class="mh-kv"><span class="mh-kv__k">吉 方</span><span class="mh-kv__v"><b>' + d.dir + '</b></span></span>' +
        '</div>' +
      '</div>' +

      '<div class="ft-yiji stagger">' +
        '<div class="ft-yiji__col ft-yiji__col--yi">' +
          '<div class="ft-yiji__title">宜</div>' +
          '<ul>' + d.yi.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul>' +
        '</div>' +
        '<div class="ft-yiji__col ft-yiji__col--ji">' +
          '<div class="ft-yiji__title">忌</div>' +
          '<ul>' + d.ji.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul>' +
        '</div>' +
      '</div>' +

      '<div class="ft-quote stagger">' +
        '<p>' + d.quote + '</p>' +
        '<span>今 日 箴 言</span>' +
      '</div>' +

      '<div class="mh-form__actions" style="margin-top:1.6rem">' +
        '<button type="button" class="btn" id="ftAgain">再 看 一 次</button>' +
        '<button type="button" class="btn btn--ghost" id="ftBack">返 回 首 页</button>' +
      '</div>';

    TJ.$$('.stagger', out).forEach(function (s) {
      TJ.util.stagger(Array.prototype.slice.call(s.children));
    });

    // 环形评分与数字动画
    TJ.$$('.ft-ring__fg', out).forEach(function (c) {
      var v = parseFloat(c.getAttribute('data-v')) || 0;
      var delay = (+c.getAttribute('data-delay') || 0) * 140;
      setTimeout(function () {
        c.style.strokeDashoffset = (C * (1 - v / 100)).toFixed(2);
      }, 260 + delay);
    });
    TJ.$$('.ft-ring__val', out).forEach(function (n) {
      var v = parseFloat(n.getAttribute('data-n')) || 0;
      setTimeout(function () { TJ.util.countUp(n, v, 1100); }, 260);
    });

    TJ.$('#ftAgain', out).addEventListener('click', function () {
      TJ.audio.cast();
      show(host, state.z);
      out.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    TJ.$('#ftBack', out).addEventListener('click', function () { TJ.go('home'); });
  }

  TJ.modules.fortune = {
    mount: function (container) { render(container); }
  };
})();
