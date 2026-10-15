/* ============================================================
   天机阁 · 八字命盘（界面层）
   四柱排盘 / 五行力量 / 日主强弱 / 喜用忌神 / 大运九步 / 一生流年曲线
   ============================================================ */
(function () {
  'use strict';
  TJ.modules = TJ.modules || {};

  var B = TJ.bazi;
  var WX = ['木', '火', '土', '金', '水'];
  var WXC = B.WX_COLOR;

  /* 十神 → 类别 */
  var SS_CAT = {
    比肩: 'same', 劫财: 'same',
    食神: 'out', 伤官: 'out',
    偏财: 'wealth', 正财: 'wealth',
    七杀: 'officer', 正官: 'officer',
    偏印: 'in', 正印: 'in'
  };
  var CAT_MEAN = {
    same: { name: '比劫', desc: '同辈、合作、竞争、自我主张' },
    out: { name: '食伤', desc: '才华、表达、创造、子女' },
    wealth: { name: '财星', desc: '财富、经营、务实' },
    officer: { name: '官杀', desc: '事业、权责、约束、压力' },
    in: { name: '印星', desc: '学识、贵人、庇荫' }
  };
  var CAT_READ = {
    same: '此十年同辈、伙伴之事为多，合作与竞争并见。宜结盟借力，忌与人争强斗气。',
    out: '此十年才华外显、表达畅达，利于创作、技艺与开拓新局。宜输出，忌空想。',
    wealth: '此十年财路与经营之事为多，务实求利、以事养身。宜量入为出，忌贪多务得。',
    officer: '此十年事业与责任加身，压力与机遇并至。宜循正而行、借势而上，忌逾矩冒进。',
    in: '此十年学业、庇荫与贵人之事为多，宜进修、宜守成、宜借长辈之力。忌依赖过甚。'
  };

  var LEVEL_DESC = {
    qiang: '日主得令得地，气势偏旺。能量充沛、主观性强，宜主动输出与承担，凭才华（食伤）、财富（财星）、责任（官杀）成就事业；忌固执自专、一味硬扛。',
    zhong: '日主与异党力量相当，命局趋于平衡。行运所至即为吉凶所系，宜顺势而为，补其不足、损其有余。',
    ruo: '日主失令或寡助，气势偏弱。宜借力而行，得贵人（印星）与同辈（比劫）之助则事半功倍；忌孤军奋战、承担过重。'
  };

  var state = { date: null, gender: '男', last: null };

  /* ---------- 小工具 ---------- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function toLocalInput(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
      'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function fmtSolar(d) {
    return d.getFullYear() + '.' + pad(d.getMonth() + 1) + '.' + pad(d.getDate()) +
      ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function wxTag(wx) { return '<b class="mh-wx mh-wx--' + wx + '">' + wx + '</b>'; }
  function ssTag(ss) {
    var cat = SS_CAT[ss];
    return '<b class="bz-ss bz-ss--' + (cat || 'same') + '">' + ss + '</b>';
  }
  function toneName(t) { return t === 'ji' ? '吉' : (t === 'ping' ? '平' : '滞'); }

  /* ---------- 表单 ---------- */
  function render(host) {
    host.innerHTML = '';
    var wrap = TJ.util.el('div', 'bz');
    wrap.innerHTML =
      '<div class="card bz-form">' +
        '<div class="card__label">生 辰 入 局</div>' +
        '<div class="bz-form__grid">' +
          '<label class="field bz-form__when"><span class="field__label">出生日期与时辰（公历）</span>' +
            '<input class="field__input" type="datetime-local" id="bzWhen" value="' +
            toLocalInput(state.date || new Date(1990, 5, 15, 8, 0)) + '"></label>' +
          '<div class="field bz-form__gender"><span class="field__label">性别（定大运顺逆）</span>' +
            '<div class="bz-form__chips">' +
              '<button type="button" class="chip' + (state.gender === '男' ? ' is-on' : '') + '" data-g="男">男</button>' +
              '<button type="button" class="chip' + (state.gender === '女' ? ' is-on' : '') + '" data-g="女">女</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="bz-form__actions">' +
          '<button type="button" class="btn btn--solid" id="bzGo">排 盘</button>' +
          '<button type="button" class="btn btn--ghost btn--sm" id="bzNow">用当前时刻</button>' +
          '<span class="field__hint">以节气定月建、立春换年、子时（23:00 后）换日</span>' +
        '</div>' +
      '</div>' +
      '<div class="bz-stage" id="bzStage"></div>';

    host.appendChild(wrap);

    if (!state.date) state.date = new Date(1990, 5, 15, 8, 0);

    var when = TJ.$('#bzWhen', host);
    when.addEventListener('input', function () {
      state.date = when.value ? new Date(when.value) : null;
    });

    TJ.$$('.chip[data-g]', host).forEach(function (c) {
      c.addEventListener('click', function () {
        state.gender = c.getAttribute('data-g');
        TJ.$$('.chip[data-g]', host).forEach(function (x) { x.classList.toggle('is-on', x === c); });
        TJ.audio.click();
      });
    });

    TJ.$('#bzNow', host).addEventListener('click', function () {
      state.date = new Date();
      when.value = toLocalInput(state.date);
      TJ.audio.click();
    });

    TJ.$('#bzGo', host).addEventListener('click', function () { cast(host); });

    if (state.last) paint(host, state.last);
  }

  /* ---------- 排盘 ---------- */
  function cast(host) {
    if (!window.solarlunar || !TJ.lunar.available) {
      TJ.toast('农历数据源未加载，无法排盘');
      return;
    }
    var d = state.date ? new Date(state.date.getTime()) : new Date();
    if (isNaN(d.getTime())) { TJ.toast('请选择有效的出生时间'); return; }

    var btn = TJ.$('#bzGo', host);
    if (btn) btn.disabled = true;
    TJ.audio.cast();

    var stage = TJ.$('#bzStage', host);
    stage.innerHTML =
      '<div class="mh-casting bz-casting">' +
        '<div class="mh-casting__hint" id="bzCastHint">立 四 柱</div>' +
        '<div class="bz-casting__cols">' +
          '<span></span><span></span><span></span><span></span>' +
        '</div>' +
        '<div class="mh-casting__sub">' + fmtSolar(d) + ' · ' + state.gender + '命</div>' +
      '</div>';

    var hint = TJ.$('#bzCastHint', stage);
    var seq = ['立 四 柱', '定 日 主', '衡 强 弱', '取 用 神', '排 大 运'];
    var i = 0;
    var iv = setInterval(function () {
      i++;
      if (i < seq.length) { hint.textContent = seq[i]; TJ.audio.tick(); }
    }, 300);

    setTimeout(function () {
      clearInterval(iv);
      var o;
      try {
        o = B.pan(d, state.gender);
      } catch (err) {
        stage.innerHTML = '<div class="field__hint">排盘失败：' + (err && err.message ? err.message : '未知错误') + '</div>';
        if (btn) btn.disabled = false;
        return;
      }
      state.last = { date: new Date(d.getTime()), gender: state.gender };
      paint(host, state.last);
      TJ.audio.reveal();
      if (btn) btn.disabled = false;
    }, 1700);
  }

  /* ---------- 渲染结果 ---------- */
  function paint(host, cfg) {
    var o = B.pan(cfg.date, cfg.gender);
    var stage = TJ.$('#bzStage', host);
    stage.innerHTML = '';

    var res = TJ.util.el('div', 'bz-result stagger');
    res.id = 'bzResult';
    res.innerHTML =
      headCard(o, cfg) +
      pillarsCard(o) +
      powerCard(o) +
      yongCard(o) +
      shenshaCard(o) +
      dayunCard(o) +
      chartCard(o) +
      liuCard(o) +
      summaryCard(o) +
      '<div class="bz-actions">' +
        '<button type="button" class="btn" id="bzAgain">重 新 排 盘</button>' +
        '<button type="button" class="btn btn--ghost" id="bzBack">返 回 首 页</button>' +
      '</div>';

    stage.appendChild(res);

    TJ.util.stagger(Array.prototype.slice.call(res.children));
    TJ.$$('.stagger', res).forEach(function (s) {
      TJ.util.stagger(Array.prototype.slice.call(s.children));
    });

    TJ.$('#bzAgain', res).addEventListener('click', function () {
      stage.innerHTML = '';
      TJ.$('#bzWhen', host).scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    TJ.$('#bzBack', res).addEventListener('click', function () { TJ.go('home'); });

    bindChart(res, o);
    bindLiu(res, o, host);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ① 命主信息 */
  function headCard(o, cfg) {
    var lunar = o.lunar;
    return '<div class="card bz-head stagger">' +
      '<div class="bz-head__main">' +
        '<div class="bz-head__gz">' + o.gz.year + ' ' + o.gz.month + ' ' + o.gz.day + ' ' + o.gz.hour + '</div>' +
        '<div class="bz-head__sub">' + (cfg.gender === '男' ? '乾造' : '坤造') + ' · 属' + lunar.animal +
          ' · ' + o.gz.year + '年 ' + lunar.monthCn + lunar.dayCn + '</div>' +
      '</div>' +
      '<div class="bz-head__meta">' +
        '<span>公历 ' + fmtSolar(cfg.date) + '</span>' +
        '<span>起运 ' + o.startAge + ' 岁 ' + o.startMonth + ' 个月（' + (o.forward ? '顺行' : '逆行') + '）</span>' +
      '</div>' +
    '</div>';
  }

  /* ② 四柱命盘 */
  function pillarsCard(o) {
    var cols = ['year', 'month', 'day', 'hour'];
    var names = { year: '年柱', month: '月柱', day: '日柱', hour: '时柱' };

    var head = '<div class="bz-tb__cell bz-tb__cell--head">四 柱</div>';
    var rowSS = '<div class="bz-tb__cell bz-tb__cell--label">主 星</div>';
    var rowGan = '<div class="bz-tb__cell bz-tb__cell--label">天 干</div>';
    var rowZhi = '<div class="bz-tb__cell bz-tb__cell--label">地 支</div>';
    var rowCang = '<div class="bz-tb__cell bz-tb__cell--label">藏 干</div>';
    var rowFSS = '<div class="bz-tb__cell bz-tb__cell--label">副 星</div>';
    var rowNY = '<div class="bz-tb__cell bz-tb__cell--label">纳 音</div>';

    cols.forEach(function (k) {
      var p = o.pillars[k];
      var kong = o.kongSet[p.zhi];
      head += '<div class="bz-tb__cell bz-tb__cell--head">' + names[k] + '</div>';
      rowSS += '<div class="bz-tb__cell">' + (k === 'day'
        ? '<b class="bz-ss bz-ss--day">日主</b>' : ssTag(p.ganSS)) + '</div>';
      rowGan += '<div class="bz-tb__cell bz-tb__cell--gan"><span style="color:' + WXC[p.ganWx] + '">' +
        p.gan + '</span></div>';
      rowZhi += '<div class="bz-tb__cell bz-tb__cell--zhi">' +
        '<span style="color:' + WXC[p.zhiWx] + '">' + p.zhi + '</span>' +
        (kong ? '<i class="bz-kong" title="' + kong + '，逢冲合可解">空</i>' : '') + '</div>';
      rowCang += '<div class="bz-tb__cell bz-tb__cell--cang">' + p.cang.map(function (c) {
        return '<span class="bz-cang" title="' + c.ss + '"><b style="color:' + WXC[c.wx] + '">' + c.gan + '</b>' +
          '<i>' + c.ss + '</i></span>';
      }).join('') + '</div>';
      rowFSS += '<div class="bz-tb__cell bz-tb__cell--fss">' + ssTag(p.zhiSS) + '</div>';
      rowNY += '<div class="bz-tb__cell bz-tb__cell--ny" title="' + o.nayin[k].wx + '">' +
        o.nayin[k].name + '</div>';
    });

    var kongLine = '旬空（空亡）：日柱 ' + o.kong.day.xun + ' 旬，空 ' + o.kong.day.kong.join('、') +
      '；年柱 ' + o.kong.year.xun + ' 旬，空 ' + o.kong.year.kong.join('、') + '。';

    return '<div class="card stagger bz-pillars-card">' +
      '<div class="card__label">四 柱 命 盘</div>' +
      '<div class="bz-tb">' + head + rowSS + rowGan + rowZhi + rowCang + rowFSS + rowNY + '</div>' +
      '<div class="bz-kongline"><span class="bz-kongline__k">空 亡</span>' + kongLine +
        '<i>命局地支落于旬空者，于表内标「空」字。空亡非尽凶，逢冲、逢合、逢填实则解，须合全局看。</i></div>' +
      '<div class="field__hint" style="margin-top:1rem">日柱天干为「日主」，即命主自身。' +
        '主星为天干十神，副星为地支本气十神，藏干为该支所含之干及其十神。' +
        '十神以日主为参照，标示各干与「我」的生克关系。纳音为六十甲子所配之五行，古法多用于合婚与择日。</div>' +
    '</div>';
  }

  /* ③ 五行力量与日主强弱 */
  function powerCard(o) {
    var max = Math.max.apply(null, WX.map(function (w) { return o.wxPower[w]; })) || 1;
    var xi = o.yong.xi, ji = o.yong.ji;

    var bars = WX.map(function (w) {
      var v = o.wxPower[w];
      var pct = (v / max) * 100;
      var cls = xi.indexOf(w) !== -1 ? ' is-xi' : (ji.indexOf(w) !== -1 ? ' is-ji' : '');
      return '<div class="bz-bar' + cls + '">' +
        '<span class="bz-bar__k" style="color:' + WXC[w] + '">' + w + '</span>' +
        '<span class="bz-bar__track"><i style="width:' + pct.toFixed(1) + '%;background:' + WXC[w] + '"></i></span>' +
        '<span class="bz-bar__v">' + v.toFixed(2) + '<i>' + o.wxCount[w] + '个</i></span>' +
      '</div>';
    }).join('');

    var s = o.strength;
    var ratio = s.ratio * 100;

    return '<div class="card stagger bz-power-card">' +
      '<div class="card__label">五 行 力 量 · 日 主 强 弱</div>' +
      '<div class="bz-bars">' + bars + '</div>' +
      '<div class="bz-strength">' +
        '<div class="bz-strength__head">' +
          '<span>日主 <b style="color:' + WXC[o.dayWx] + '">' + o.dayGan + '</b>（' + o.dayWx + '）</span>' +
          '<span class="bz-level bz-level--' + s.levelKey + '">' + s.level + '</span>' +
        '</div>' +
        '<div class="bz-gauge">' +
          '<span class="bz-gauge__track">' +
            '<i class="bz-gauge__fill" style="width:' + ratio.toFixed(1) + '%"></i>' +
            '<em class="bz-gauge__mark" style="left:45%"></em>' +
            '<em class="bz-gauge__mark" style="left:56%"></em>' +
          '</span>' +
          '<span class="bz-gauge__val">同党 ' + ratio.toFixed(1) + '%</span>' +
        '</div>' +
        '<div class="bz-strength__nums">' +
          '<span>同党（印·比劫）<b>' + s.tongDang.toFixed(2) + '</b></span>' +
          '<span>异党（食伤·财·官杀）<b>' + s.yiDang.toFixed(2) + '</b></span>' +
        '</div>' +
        '<div class="bz-trio">' +
          trio('得 令', s.deLing, '月令为全局最重') +
          trio('得 地', s.deDi, '日支及年时之根') +
          trio('得 势', s.deShi, '三干之帮衬') +
        '</div>' +
      '</div>' +
      '<div class="bz-note">' + LEVEL_DESC[s.levelKey] + '</div>' +
      '<div class="field__hint">力量计法：天干各计其位，地支按藏干本气 6 成、中气 3 成、余气 1 成折算，' +
        '月令权重最重（2.0），日支次之（1.2）。同党占比 ≥56% 判身强，45%–56% 为中和，低于 45% 判身弱。</div>' +
    '</div>';
  }

  function trio(k, v, sub) {
    var pct = Math.round(v * 100);
    return '<div class="bz-trio__item">' +
      '<span class="bz-trio__k">' + k + '</span>' +
      '<span class="bz-trio__track"><i style="width:' + pct + '%"></i></span>' +
      '<span class="bz-trio__v">' + pct + '%</span>' +
      '<span class="bz-trio__sub">' + sub + '</span>' +
    '</div>';
  }

  /* ④ 喜用忌神 */
  function yongCard(o) {
    var y = o.yong;
    return '<div class="card stagger bz-yong-card">' +
      '<div class="card__label">喜 用 忌 神</div>' +
      '<div class="bz-yong">' +
        '<div class="bz-yong__row bz-yong__row--xi"><span class="bz-yong__k">喜 神</span>' +
          '<span class="bz-yong__v">' + y.xi.map(wxTag).join('') + '</span></div>' +
        '<div class="bz-yong__row bz-yong__row--ji"><span class="bz-yong__k">忌 神</span>' +
          '<span class="bz-yong__v">' + y.ji.map(wxTag).join('') + '</span></div>' +
        '<div class="bz-yong__row"><span class="bz-yong__k">主用神</span>' +
          '<span class="bz-yong__v">' + wxTag(y.zhu) + '<i>补其最缺</i></span></div>' +
        '<div class="bz-yong__row"><span class="bz-yong__k">调 候</span>' +
          '<span class="bz-yong__v">' + (y.tiaohou
            ? wxTag(y.tiaohou) + '<i>' + (y.tiaoMerged ? '寒暖所急 · 已并入喜神' : '寒暖所急') + '</i>'
            : '<i>四时平和，无急需</i>') + '</span></div>' +
      '</div>' +
      '<div class="bz-note">' + y.note + '</div>' +
      '<div class="field__hint">取用之法古有扶抑、调候、通关、病药诸说，此处以「扶抑为主、调候为辅」，规则公开如上。' +
        '喜神所临之运年，行事较为顺遂；忌神当值，则宜守不宜攻。</div>' +
    '</div>';
  }

  /* ④·2 神煞 */
  var TONE_ORDER = { ji: 0, zhong: 1, xiong: 2 };
  var TONE_TXT = { ji: '吉', zhong: '中', xiong: '凶' };

  function shenshaCard(o) {
    var list = (o.shensha || []).slice().sort(function (a, b) {
      return TONE_ORDER[a.tone] - TONE_ORDER[b.tone];
    });
    if (!list.length) return '';

    var cnt = { ji: 0, zhong: 0, xiong: 0 };
    list.forEach(function (s) { cnt[s.tone] = (cnt[s.tone] || 0) + 1; });

    var items = list.map(function (s) {
      return '<div class="bz-ssi bz-ssi--' + s.tone + '">' +
        '<div class="bz-ssi__head">' +
          '<b class="bz-ssi__name">' + s.name + '</b>' +
          '<span class="bz-ssi__tone">' + TONE_TXT[s.tone] + '</span>' +
          '<span class="bz-ssi__hits">' + s.hits.join(' · ') + '</span>' +
        '</div>' +
        '<div class="bz-ssi__desc">' + s.desc + '</div>' +
        '<div class="bz-ssi__rule">取法：' + s.rule + '</div>' +
      '</div>';
    }).join('');

    return '<div class="card stagger bz-shensha-card">' +
      '<div class="card__label">神 煞</div>' +
      '<div class="bz-sscnt">' +
        '<span class="bz-sscnt__i bz-sscnt__i--ji">吉神 <b>' + cnt.ji + '</b></span>' +
        '<span class="bz-sscnt__i bz-sscnt__i--zhong">中性 <b>' + cnt.zhong + '</b></span>' +
        '<span class="bz-sscnt__i bz-sscnt__i--xiong">凶煞 <b>' + cnt.xiong + '</b></span>' +
        '<span class="bz-sscnt__tip">共 ' + list.length + ' 项，按吉、中、凶排序</span>' +
      '</div>' +
      '<div class="bz-sslist">' + items + '</div>' +
      '<div class="field__hint">神煞取法以年支三合局、日干、月支、日柱为主，各流派取法略有出入，此处择其通行者。' +
        '神煞为命局之「点缀」，须合四柱格局、喜忌与岁运同参，不宜单凭一神一煞断吉凶。</div>' +
    '</div>';
  }

  /* ④·3 流月流日 */
  var liuState = { year: null, day: null };

  function yearGZof(year) {
    var f = TJ.lunar.fromDate(new Date(year, 6, 1, 12, 0), { yearFirst: 'lichun', ziRollover: true });
    return f.gz.year;
  }

  function liuCard(o) {
    var now = new Date();
    if (!liuState.year) liuState.year = now.getFullYear();
    if (!liuState.day) liuState.day = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    var y = liuState.year;
    var ygz = yearGZof(y);
    var ln = null;
    for (var i = 0; i < o.liunian.length; i++) { if (o.liunian[i].year === y) { ln = o.liunian[i]; break; } }
    var ysc = B.scoreGZ(ygz, o.yong.xi, o.yong.ji);

    var months = B.liuYue(ygz, o.yong.xi, o.yong.ji);
    var mItems = months.map(function (m) {
      return '<div class="bz-ly bz-ly--' + m.tone + '">' +
        '<div class="bz-ly__m">' + m.name + '</div>' +
        '<div class="bz-ly__gz"><span style="color:' + WXC[m.ganWx] + '">' + m.gan + '</span>' +
          '<span style="color:' + WXC[m.zhiWx] + '">' + m.zhi + '</span></div>' +
        '<div class="bz-ly__ny">' + m.naYin + '</div>' +
        '<div class="bz-ly__bar"><i style="width:' + m.score + '%"></i></div>' +
        '<div class="bz-ly__s">' + m.score + '<em>' + toneName(m.tone) + '</em></div>' +
      '</div>';
    }).join('');

    var dyTxt = ln && ln.dayunN ? ('第 ' + ln.dayunN + ' 运 ' + ln.dayun) : '未起运';
    var blendTxt = ln ? '　·　综合 ' + ln.score + '（' + toneName(ln.tone) + '，含大运）' : '';

    /* 流日 */
    var dd = liuState.day;
    var dInfo = null;
    try { dInfo = B.liuRi(dd, o.yong.xi, o.yong.ji); } catch (e) { dInfo = null; }
    var dayBlock = dInfo
      ? '<div class="bz-lr">' +
          '<div class="bz-lr__head">' +
            '<span class="bz-lr__date">' + dInfo.solar.y + ' 年 ' + dInfo.solar.mo + ' 月 ' + dInfo.solar.d + ' 日</span>' +
            '<span class="bz-lr__lunar">' + dInfo.lunar.monthCn + dInfo.lunar.dayCn + '</span>' +
          '</div>' +
          '<div class="bz-lr__gz">' +
            '<span style="color:' + WXC[dInfo.ganWx] + '">' + dInfo.gan + '</span>' +
            '<span style="color:' + WXC[dInfo.zhiWx] + '">' + dInfo.zhi + '</span>' +
            '<i>' + dInfo.naYin + '</i>' +
          '</div>' +
          '<div class="bz-lr__meta">' +
            '<span>月建 ' + dInfo.monthGz + '</span>' +
            '<span>旬空 ' + dInfo.kong.join('、') + '</span>' +
            '<span class="bz-lr__score bz-lr__score--' + dInfo.tone + '">' + dInfo.score + '（' + toneName(dInfo.tone) + '）</span>' +
          '</div>' +
        '</div>'
      : '<div class="bz-lr"><div class="field__hint">该日超出历法范围</div></div>';

    return '<div class="card stagger bz-liu-card">' +
      '<div class="card__label">流 年 · 流 月 · 流 日</div>' +
      '<div class="bz-liu__bar">' +
        '<button type="button" class="bz-nav" id="bzYPrev" aria-label="上一年">‹</button>' +
        '<span class="bz-liu__year"><b>' + y + '</b> 年 · ' + ygz + ' 年' +
          '<i class="bz-liu__tag bz-liu__tag--' + ysc.tone + '">' + ysc.score + '（' + toneName(ysc.tone) + '）</i>' +
          (ln ? '<i class="bz-liu__tag bz-liu__tag--age">' + ln.age + ' 岁</i>' : '') + '</span>' +
        '<button type="button" class="bz-nav" id="bzYNext" aria-label="下一年">›</button>' +
        '<button type="button" class="btn btn--ghost btn--sm" id="bzYNow">回到今年</button>' +
      '</div>' +
      '<div class="bz-liu__sub">' + dyTxt + blendTxt + '　·　流月依节气月建，五虎遁定月干；评分口径与大运、流年一致。</div>' +
      '<div class="bz-liuyue">' + mItems + '</div>' +
      '<div class="bz-liu__split"><span>择 日 · 流 日</span>' +
        '<input class="field__input bz-liu__date" type="date" id="bzDay" value="' +
        (dd.getFullYear() + '-' + pad(dd.getMonth() + 1) + '-' + pad(dd.getDate())) + '">' +
        '<button type="button" class="btn btn--ghost btn--sm" id="bzDayToday">今日</button>' +
      '</div>' +
      '<div id="bzDayBox">' + dayBlock + '</div>' +
      '<div class="field__hint">流月以节气为界（非农历月），自寅月起、依五虎遁排十二支。' +
        '流日取当日干支，评分同依喜忌五行。此段用于观察近运之月度起伏，或为婚嫁、开业、签约等事择取相对顺遂之日，' +
        '仅供参考，不作吉凶定论。</div>' +
    '</div>';
  }

  function bindLiu(res, o, host) {
    var cfg = { date: new Date(o.input.date.getTime()), gender: o.input.gender };
    function redraw() { paint(host, cfg); }

    var prev = TJ.$('#bzYPrev', res), next = TJ.$('#bzYNext', res), now = TJ.$('#bzYNow', res);
    if (prev) prev.addEventListener('click', function () { liuState.year--; TJ.audio.click(); redraw(); });
    if (next) next.addEventListener('click', function () { liuState.year++; TJ.audio.click(); redraw(); });
    if (now) now.addEventListener('click', function () { liuState.year = new Date().getFullYear(); TJ.audio.click(); redraw(); });

    var day = TJ.$('#bzDay', res);
    if (day) day.addEventListener('change', function () {
      var v = day.value ? new Date(day.value + 'T12:00') : null;
      if (v && !isNaN(v.getTime())) { liuState.day = v; redraw(); }
    });
    var today = TJ.$('#bzDayToday', res);
    if (today) today.addEventListener('click', function () {
      var n = new Date(); liuState.day = new Date(n.getFullYear(), n.getMonth(), n.getDate());
      TJ.audio.click(); redraw();
    });
  }

  /* ⑤ 大运九步 */
  function dayunCard(o) {
    var cur = currentAge(o);
    var yangYear = B.GAN_YANG[o.gz.year.charAt(0)] === 1;
    var dirTxt = o.forward
      ? (yangYear ? '阳年男命顺行' : '阴年女命顺行')
      : (yangYear ? '阳年女命逆行' : '阴年男命逆行');

    var items = o.dayun.map(function (d) {
      var isCur = cur >= d.startAge && cur < d.endAge;
      var cat = SS_CAT[d.ganSS] || 'same';
      return '<div class="bz-dy bz-dy--' + d.tone + (isCur ? ' is-cur' : '') + '">' +
        '<div class="bz-dy__no">第 ' + d.n + ' 运' + (isCur ? '<em>当前</em>' : '') + '</div>' +
        '<div class="bz-dy__gz">' +
          '<span style="color:' + WXC[d.ganWx] + '">' + d.gan + '</span>' +
          '<span style="color:' + WXC[d.zhiWx] + '">' + d.zhi + '</span>' +
        '</div>' +
        '<div class="bz-dy__ss">' + ssTag(d.ganSS) + '<i>' + CAT_MEAN[cat].name + '</i></div>' +
        '<div class="bz-dy__age">' + d.startAge.toFixed(1).replace(/\.0$/, '') + '–' +
          d.endAge.toFixed(1).replace(/\.0$/, '') + ' 岁</div>' +
        '<div class="bz-dy__year">' + d.startYear + '–' + d.endYear + '</div>' +
        '<div class="bz-dy__bar"><i class="bz-dy__bar-fill" style="width:' + d.score + '%"></i></div>' +
        '<div class="bz-dy__score">' + d.score + '<em>' + toneName(d.tone) + '</em></div>' +
      '</div>';
    }).join('');

    return '<div class="card stagger bz-dayun-card">' +
      '<div class="card__label">大 运 九 步</div>' +
      '<div class="bz-dayun__meta">' +
        '<span>' + dirTxt + '</span>' +
        '<span>起运 ' + o.startAge + ' 岁 ' + o.startMonth + ' 个月</span>' +
        '<span>十年一运，自月柱起推</span>' +
        '<span class="bz-dayun__hint">← 左右滑动看完整九运 →</span>' +
      '</div>' +
      '<div class="bz-dayun">' + items + '</div>' +
      '<div class="bz-note">每步大运管十年吉凶，为一生起伏之主干。评分依喜忌五行而定：' +
        '干支皆为喜神者分高，皆为忌神者分低。</div>' +
    '</div>';
  }

  /* ⑥ 一生流年曲线 */
  function chartCard(o) {
    var cur = currentAge(o);
    var sorted = o.liunian.slice().sort(function (a, b) { return b.score - a.score; });
    var top = sorted.slice(0, 5);
    var low = sorted.slice(-5).reverse();

    return '<div class="card stagger bz-chart-card">' +
      '<div class="card__label">一 生 运 势 曲 线</div>' +
      '<div class="bz-chart" id="bzChart">' + chartSVG(o, cur) + '<div class="bz-tip" id="bzTip"></div></div>' +
      '<div class="bz-chart__legend">' +
        '<span><i class="bz-lg bz-lg--ji"></i>吉（≥68）</span>' +
        '<span><i class="bz-lg bz-lg--ping"></i>平（46–67）</span>' +
        '<span><i class="bz-lg bz-lg--xiong"></i>滞（≤45）</span>' +
        '<span><i class="bz-lg bz-lg--band"></i>大运区间</span>' +
        (cur >= 0 ? '<span><i class="bz-lg bz-lg--now"></i>当前 ' + cur + ' 岁</span>' : '') +
      '</div>' +
      '<div class="bz-peaks">' +
        '<div class="bz-peaks__col bz-peaks__col--up">' +
          '<div class="bz-peaks__title">运势高点</div>' +
          top.map(peakRow).join('') +
        '</div>' +
        '<div class="bz-peaks__col bz-peaks__col--down">' +
          '<div class="bz-peaks__title">运势低谷</div>' +
          low.map(peakRow).join('') +
        '</div>' +
      '</div>' +
      '<div class="field__hint">纵轴为运势评分（0–100），横轴为虚岁 0–90。曲线由「大运为体（约六成）、流年为用（约四成）」合成，' +
        '未起运之年纯以流年论。评分仅依喜忌五行推定，用于观察一生的相对起伏，非绝对吉凶。' +
        '小屏下曲线可左右滑动查看。</div>' +
    '</div>';
  }

  function peakRow(y) {
    return '<div class="bz-peak bz-peak--' + y.tone + '">' +
      '<span class="bz-peak__age">' + y.age + ' 岁</span>' +
      '<span class="bz-peak__year">' + y.year + '</span>' +
      '<span class="bz-peak__gz">' + y.gz + '</span>' +
      '<span class="bz-peak__score">' + y.score + '</span>' +
    '</div>';
  }

  var CW = 920, CH = 320, CPL = 46, CPR = 20, CPT = 30, CPB = 38;
  var CIW = CW - CPL - CPR, CIH = CH - CPT - CPB;
  var N = 91;

  function cx(i) { return CPL + CIW * (i / (N - 1)); }
  function cy(s) { return CPT + CIH * (1 - s / 100); }

  function chartSVG(o, cur) {
    var pts = o.liunian.map(function (y, i) { return [cx(i), cy(y.score)]; });
    var line = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(2) + ' ' + p[1].toFixed(2); }).join(' ');
    var base = cy(0);
    var area = line + ' L' + pts[pts.length - 1][0].toFixed(2) + ' ' + base.toFixed(2) +
      ' L' + pts[0][0].toFixed(2) + ' ' + base.toFixed(2) + ' Z';

    /* 大运区间背景 */
    var bands = o.dayun.map(function (d) {
      var a = Math.max(0, d.startAge), b = Math.min(N - 1, d.endAge);
      if (a >= N - 1) return '';
      var x1 = cx(a), x2 = cx(b);
      var fill = d.tone === 'ji' ? 'rgba(217,180,106,.075)'
        : (d.tone === 'xiong' ? 'rgba(122,168,222,.075)' : 'rgba(255,255,255,.022)');
      return '<rect x="' + x1.toFixed(2) + '" y="' + CPT + '" width="' + Math.max(0, x2 - x1).toFixed(2) +
        '" height="' + CIH + '" fill="' + fill + '"/>' +
        '<line x1="' + x1.toFixed(2) + '" y1="' + CPT + '" x2="' + x1.toFixed(2) + '" y2="' + (CPT + CIH) +
        '" stroke="rgba(217,180,106,.18)" stroke-width="1"/>' +
        '<text class="bz-c-band" x="' + ((x1 + x2) / 2).toFixed(2) + '" y="' + (CPT - 9) + '">' + d.gz + '</text>';
    }).join('');

    /* 网格 */
    var grid = [20, 40, 60, 80].map(function (s) {
      return '<line x1="' + CPL + '" y1="' + cy(s).toFixed(2) + '" x2="' + (CW - CPR) + '" y2="' + cy(s).toFixed(2) +
        '" stroke="rgba(255,255,255,.06)" stroke-width="1"/>' +
        '<text class="bz-c-axis" x="' + (CPL - 8) + '" y="' + (cy(s) + 3.5).toFixed(2) + '" text-anchor="end">' + s + '</text>';
    }).join('');
    grid += '<line x1="' + CPL + '" y1="' + cy(50).toFixed(2) + '" x2="' + (CW - CPR) + '" y2="' + cy(50).toFixed(2) +
      '" stroke="rgba(217,180,106,.28)" stroke-width="1" stroke-dasharray="4 6"/>';

    /* 横轴刻度 */
    var ticks = '';
    for (var a = 0; a <= 90; a += 10) {
      ticks += '<line x1="' + cx(a).toFixed(2) + '" y1="' + (CPT + CIH) + '" x2="' + cx(a).toFixed(2) + '" y2="' +
        (CPT + CIH + 4) + '" stroke="rgba(217,180,106,.3)" stroke-width="1"/>' +
        '<text class="bz-c-axis" x="' + cx(a).toFixed(2) + '" y="' + (CPT + CIH + 18) + '" text-anchor="middle">' + a + '</text>';
    }
    ticks += '<text class="bz-c-axis bz-c-axis--unit" x="' + (CW - CPR) + '" y="' + (CPT + CIH + 32) +
      '" text-anchor="end">虚岁</text>';

    /* 高低点标注 */
    var sorted = o.liunian.slice().sort(function (p, q) { return q.score - p.score; });
    var marks = sorted.slice(0, 3).concat(sorted.slice(-3)).map(function (y) {
      return '<circle class="bz-c-dot" cx="' + cx(y.age).toFixed(2) + '" cy="' + cy(y.score).toFixed(2) +
        '" r="3.4" fill="' + (y.tone === 'ji' ? '#f2dda8' : (y.tone === 'xiong' ? '#7aa8de' : '#9aa2ba')) + '"/>';
    }).join('');

    var nowLine = (cur >= 0 && cur < N)
      ? '<line class="bz-c-now" x1="' + cx(cur).toFixed(2) + '" y1="' + CPT + '" x2="' + cx(cur).toFixed(2) + '" y2="' +
        (CPT + CIH) + '" stroke="#5ec8c0" stroke-width="1.2" stroke-dasharray="3 4"/>' +
        '<circle cx="' + cx(cur).toFixed(2) + '" cy="' + cy(o.liunian[cur].score).toFixed(2) +
        '" r="4.6" fill="#5ec8c0" stroke="#04050c" stroke-width="1.6"/>'
      : '';

    return '<svg class="bz-svg" viewBox="0 0 ' + CW + ' ' + CH + '" preserveAspectRatio="xMidYMid meet" ' +
      'role="img" aria-label="一生运势曲线">' +
      '<defs>' +
        '<linearGradient id="bzArea" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0%" stop-color="#d9b46a" stop-opacity=".34"/>' +
          '<stop offset="100%" stop-color="#d9b46a" stop-opacity="0"/>' +
        '</linearGradient>' +
        '<linearGradient id="bzLine" x1="0" y1="0" x2="1" y2="0">' +
          '<stop offset="0%" stop-color="#5ec8c0"/>' +
          '<stop offset="45%" stop-color="#f2dda8"/>' +
          '<stop offset="100%" stop-color="#d9b46a"/>' +
        '</linearGradient>' +
      '</defs>' +
      bands + grid + ticks +
      '<path class="bz-c-area" d="' + area + '" fill="url(#bzArea)"/>' +
      '<path class="bz-c-line" d="' + line + '" pathLength="1" fill="none" stroke="url(#bzLine)" ' +
        'stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>' +
      marks + nowLine +
      '<line class="bz-c-hline" id="bzHLine" x1="0" y1="' + CPT + '" x2="0" y2="' + (CPT + CIH) +
        '" stroke="rgba(242,221,168,.6)" stroke-width="1" opacity="0"/>' +
      '<circle class="bz-c-hdot" id="bzHDot" cx="0" cy="0" r="4" fill="#f2dda8" stroke="#04050c" stroke-width="1.5" opacity="0"/>' +
      '<rect id="bzHit" x="' + CPL + '" y="' + CPT + '" width="' + CIW + '" height="' + CIH + '" fill="transparent"/>' +
    '</svg>';
  }

  function bindChart(res, o) {
    var box = TJ.$('#bzChart', res);
    if (!box) return;
    var svg = TJ.$('.bz-svg', box);
    var hit = TJ.$('#bzHit', box);
    var hl = TJ.$('#bzHLine', box);
    var hd = TJ.$('#bzHDot', box);
    var tip = TJ.$('#bzTip', box);
    if (!svg || !hit || !tip) return;

    function move(e) {
      var r = svg.getBoundingClientRect();
      if (!r.width) return;
      var vx = (e.clientX - r.left) / r.width * CW;
      var i = Math.round((vx - CPL) / CIW * (N - 1));
      i = Math.max(0, Math.min(N - 1, i));
      var y = o.liunian[i];
      var px = cx(i), py = cy(y.score);

      hl.setAttribute('x1', px); hl.setAttribute('x2', px); hl.setAttribute('opacity', '1');
      hd.setAttribute('cx', px); hd.setAttribute('cy', py); hd.setAttribute('opacity', '1');

      tip.innerHTML =
        '<b>' + y.age + ' 岁 · ' + y.year + '</b>' +
        '<span>' + y.gz + '　天干' + y.ganWx + ' · 地支' + y.zhiWx + '</span>' +
        '<span>运势 <em class="bz-tip__v bz-tip__v--' + y.tone + '">' + y.score + '</em></span>' +
        '<span class="bz-tip__sub">' + (y.dayunN ? '第 ' + y.dayunN + ' 运 ' + y.dayun : '未起运') +
        '　流年 ' + y.lnScore + '</span>';
      tip.classList.add('is-on');
      var tw = tip.offsetWidth;
      var left = (px / CW) * r.width;   // 内容坐标（容器可能横向滚动）
      tip.style.left = Math.max(4, Math.min(r.width - tw - 4, left - tw / 2)) + 'px';
      tip.style.top = '4px';
    }

    function out() {
      hl.setAttribute('opacity', '0');
      hd.setAttribute('opacity', '0');
      tip.classList.remove('is-on');
    }

    hit.addEventListener('pointermove', move);
    hit.addEventListener('pointerdown', move);
    hit.addEventListener('pointerleave', out);
    svg.addEventListener('pointerleave', out);
  }

  /* ⑦ 命局简评 */
  function summaryCard(o) {
    var s = o.strength;
    var cur = currentAge(o);
    var dy = null;
    for (var i = 0; i < o.dayun.length; i++) {
      if (cur >= o.dayun[i].startAge && cur < o.dayun[i].endAge) { dy = o.dayun[i]; break; }
    }

    var curBlock = dy
      ? '<div class="bz-now">' +
          '<div class="bz-now__k">当前大运</div>' +
          '<div class="bz-now__gz"><span style="color:' + WXC[dy.ganWx] + '">' + dy.gan + '</span>' +
          '<span style="color:' + WXC[dy.zhiWx] + '">' + dy.zhi + '</span></div>' +
          '<div class="bz-now__txt">' + dy.startAge.toFixed(1) + '–' + dy.endAge.toFixed(1) + ' 岁 · ' +
            dy.ganSS + '（' + CAT_MEAN[SS_CAT[dy.ganSS]].name + '）· 评分 ' + dy.score + '（' + toneName(dy.tone) + '）<br>' +
            dayunRead(dy, o) + '</div>' +
        '</div>'
      : '<div class="bz-now"><div class="bz-now__k">尚未起运</div><div class="bz-now__txt">' +
        '起运前之岁月以月柱与本命论，多主少年时期受家庭与长辈影响较深。</div></div>';

    return '<div class="card stagger bz-summary-card">' +
      '<div class="card__label">命 局 简 评</div>' +
      '<p class="bz-summary">' + o.summary + '</p>' +
      '<div class="bz-summary__grid">' +
        '<div class="bz-summary__item"><span>日主</span><b style="color:' + WXC[o.dayWx] + '">' +
          o.dayGan + ' · ' + o.dayWx + '</b></div>' +
        '<div class="bz-summary__item"><span>强弱</span><b>' + s.level + '（' + (s.ratio * 100).toFixed(1) + '%）</b></div>' +
        '<div class="bz-summary__item"><span>喜神</span><b>' + o.yong.xi.join('、') + '</b></div>' +
        '<div class="bz-summary__item"><span>忌神</span><b>' + o.yong.ji.join('、') + '</b></div>' +
        '<div class="bz-summary__item"><span>大运</span><b>' + (o.forward ? '顺行' : '逆行') + '</b></div>' +
        '<div class="bz-summary__item"><span>起运</span><b>' + o.startAge + ' 岁 ' + o.startMonth + ' 月</b></div>' +
      '</div>' +
      curBlock +
      '<div class="field__hint">八字为传统命理之模型，所论乃「倾向」而非「定数」。' +
        '同一命局，因所居之地、所处之时、所行之事不同，际遇亦异。此处仅作传统文化体验，不构成任何决策依据。</div>' +
    '</div>';
  }

  function dayunRead(dy, o) {
    var cat = SS_CAT[dy.ganSS] || 'same';
    var t = dy.tone === 'ji' ? '喜神当值，此运较为顺遂，宜积极进取。'
      : (dy.tone === 'xiong' ? '忌神当值，此运多有阻隔，宜守不宜攻。'
        : '吉凶相参，此运平稳之中暗藏变化，宜稳中求进。');
    return CAT_READ[cat] + t;
  }

  function currentAge(o) {
    var b = o.input.date;
    var now = new Date();
    var ms = now - b;
    if (ms < 0) return -1;
    var age = Math.floor(ms / (365.2425 * 86400000));
    return Math.max(0, Math.min(90, age));
  }

  /* ---------- 导出 ---------- */
  TJ.modules.bazi = {
    mount: function (container) {
      if (state.last) { state.date = new Date(state.last.date.getTime()); state.gender = state.last.gender; }
      render(container);
    }
  };
})();
