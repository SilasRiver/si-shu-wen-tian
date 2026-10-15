/* ============================================================
   天机阁 · 梅花易数
   起卦：年月日时起例（农历正法） / 数字起卦（先天数）
   断卦：本卦·互卦·变卦 三段体用 + 月建旺衰
   ============================================================ */
(function () {
  'use strict';
  TJ.modules = TJ.modules || {};

  var T = TJ.TRIGRAMS;
  var L = TJ.lunar;
  var SHENG = TJ.WUXING_SHENG;
  var KE = TJ.WUXING_KE;

  var TRI_BY_LINES = {};
  Object.keys(T).forEach(function (k) { TRI_BY_LINES[T[k].lines.join('')] = +k; });

  var state = {
    method: 'time',
    n1: '', n2: '',
    text: '',              // 字占所书文字
    splitA: '', splitB: '',// 一字占：左（上）画数 / 右（下）画数
    when: null,            // 时间起卦所用时刻；null 表示「此刻」
    natal: null,           // 本命卦所用出生时刻；null 表示「此刻」
    yearFirst: 'lichun',   // 岁首：立春换年 / 正月初一换年
    ziRollover: true       // 子时换日
  };

  /* 当前方法所依据的时刻 */
  function activeWhen() { return state.method === 'natal' ? state.natal : state.when; }

  /* ---------- 取数 ---------- */
  function mod8(v) { var r = v % 8; return r === 0 ? 8 : r; }
  function mod6(v) { var r = v % 6; return r === 0 ? 6 : r; }

  function timeCast(when) {
    var isNatal = state.method === 'natal';
    var d = when ? new Date(when.getTime()) : new Date();
    var f = L.fromDate(d, { yearFirst: state.yearFirst, ziRollover: state.ziRollover });
    var y = f.nums.year, m = f.nums.month, dd = f.nums.day, h = f.nums.hour;
    var upSum = y + m + dd;
    var lowSum = upSum + h;
    return {
      up: mod8(upSum), low: mod8(lowSum), dong: mod6(lowSum),
      cal: f,
      natal: isNatal,
      detail: [
        ['年支数', f.gz.year.charAt(1) + '年 → ' + y],
        ['月　数', f.lunar.monthCn + ' → ' + m],
        ['日　数', f.lunar.dayCn + ' → ' + dd],
        ['时辰数', f.nums.shichenCn + '时 → ' + h]
      ],
      calc: [
        ['上卦', '(' + y + ' + ' + m + ' + ' + dd + ') = ' + upSum +
          '，' + upSum + ' ÷ 8 余 ' + (upSum % 8) + (upSum % 8 === 0 ? '（余 0 作 8）' : '') +
          ' → ' + T[mod8(upSum)].name],
        ['下卦', '(' + y + ' + ' + m + ' + ' + dd + ' + ' + h + ') = ' + lowSum +
          '，' + lowSum + ' ÷ 8 余 ' + (lowSum % 8) + (lowSum % 8 === 0 ? '（余 0 作 8）' : '') +
          ' → ' + T[mod8(lowSum)].name],
        ['动爻', lowSum + ' ÷ 6 余 ' + (lowSum % 6) + (lowSum % 6 === 0 ? '（余 0 作 6）' : '') +
          ' → 第 ' + mod6(lowSum) + ' 爻']
      ],
      rule: isNatal
        ? '《梅花易数·年月日时起例》原法，以出生之年月日时取数，成终身之象，谓之本命卦。'
        : '《梅花易数·年月日时起例》：年月日为上卦，年月日加时总数为下卦，又以年月日时总数取爻。'
    };
  }

  function numberCast(a, b) {
    a = Math.abs(parseInt(a, 10) || 0);
    b = Math.abs(parseInt(b, 10) || 0);
    var sum = a + b;
    return {
      up: mod8(a), low: mod8(b), dong: mod6(sum),
      cal: L.fromDate(new Date(), { yearFirst: state.yearFirst, ziRollover: state.ziRollover }),
      detail: [
        ['上数', String(a)],
        ['下数', String(b)]
      ],
      calc: [
        ['上卦', a + ' ÷ 8 余 ' + (a % 8) + (a % 8 === 0 ? '（余 0 作 8）' : '') + ' → ' + T[mod8(a)].name],
        ['下卦', b + ' ÷ 8 余 ' + (b % 8) + (b % 8 === 0 ? '（余 0 作 8）' : '') + ' → ' + T[mod8(b)].name],
        ['动爻', '(' + a + ' + ' + b + ') = ' + sum + '，' + sum + ' ÷ 6 余 ' + (sum % 6) +
          (sum % 6 === 0 ? '（余 0 作 6）' : '') + ' → 第 ' + mod6(sum) + ' 爻']
      ],
      rule: '《梅花易数·物数占》：以数取卦，先数除八为上卦，后数除八为下卦，合二数除六取动爻。'
    };
  }

  /* 字占：清洗输入，仅取汉字 */
  var HAN_RE = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/;
  function hanChars(text) {
    var out = [];
    String(text || '').split('').forEach(function (c) { if (HAN_RE.test(c)) out.push(c); });
    return out;
  }

  function wordCast(text, sa, sb) {
    var chars = hanChars(text);
    if (!chars.length) return null;

    var strokes = chars.map(function (c) { return TJ.strokeOf(c); });
    var missing = [];
    chars.forEach(function (c, i) { if (!strokes[i] && missing.indexOf(c) === -1) missing.push(c); });

    var n = chars.length;
    var now = new Date();
    var f = L.fromDate(now, { yearFirst: state.yearFirst, ziRollover: state.ziRollover });

    var upSum, lowSum, total, upPart, lowPart, upPartStrokes, lowPartStrokes, single;

    if (n === 1) {
      single = true;
      var S = strokes[0] || 0;
      var defA = S ? (TJ.splitOf(chars[0], S) || Math.ceil(S / 2)) : 0;
      var a = parseInt(sa, 10), b = parseInt(sb, 10);
      if (isNaN(a)) a = defA;
      if (isNaN(b)) b = S - a;
      a = Math.max(0, a); b = Math.max(0, b);
      upSum = a; lowSum = b; total = S;
      upPart = [chars[0]]; lowPart = [];
      upPartStrokes = a; lowPartStrokes = b;
    } else {
      single = false;
      var cut = Math.floor(n / 2);
      upPart = chars.slice(0, cut);
      lowPart = chars.slice(cut);
      upPartStrokes = strokes.slice(0, cut).reduce(function (s, v) { return s + v; }, 0);
      lowPartStrokes = strokes.slice(cut).reduce(function (s, v) { return s + v; }, 0);
      upSum = upPartStrokes; lowSum = lowPartStrokes;
      total = upPartStrokes + lowPartStrokes;
    }

    var detail = [
      ['字数', n + ' 字' + (single ? '（太极未判，须分左右阴阳）' : '（平分前后，少者居上、多者居下）')],
      ['字　画', chars.map(function (c, i) {
        return c + (strokes[i] ? strokes[i] : '?');
      }).join('　')]
    ];
    if (single) {
      detail.push(['阳画（左·上）', String(upPartStrokes)]);
      detail.push(['阴画（右·下）', String(lowPartStrokes)]);
    } else {
      detail.push(['上卦取字', upPart.join('') + '（共 ' + upPartStrokes + ' 画）']);
      detail.push(['下卦取字', lowPart.join('') + '（共 ' + lowPartStrokes + ' 画）']);
    }
    detail.push(['总画数', String(total)]);

    var calc = [];
    if (single) {
      calc.push(['上卦', '阳画 ' + upPartStrokes + ' ÷ 8 余 ' + (upSum % 8) +
        (upSum % 8 === 0 ? '（余 0 作 8）' : '') + ' → ' + T[mod8(upSum)].name]);
      calc.push(['下卦', '阴画 ' + lowPartStrokes + ' ÷ 8 余 ' + (lowSum % 8) +
        (lowSum % 8 === 0 ? '（余 0 作 8）' : '') + ' → ' + T[mod8(lowSum)].name]);
      calc.push(['动爻', '全画 ' + total + ' ÷ 6 余 ' + (total % 6) +
        (total % 6 === 0 ? '（余 0 作 6）' : '') + ' → 第 ' + mod6(total) + ' 爻']);
    } else {
      calc.push(['上卦', '前 ' + upPart.length + ' 字画数和 = ' + upPartStrokes + ' ÷ 8 余 ' + (upSum % 8) +
        (upSum % 8 === 0 ? '（余 0 作 8）' : '') + ' → ' + T[mod8(upSum)].name]);
      calc.push(['下卦', '后 ' + lowPart.length + ' 字画数和 = ' + lowPartStrokes + ' ÷ 8 余 ' + (lowSum % 8) +
        (lowSum % 8 === 0 ? '（余 0 作 8）' : '') + ' → ' + T[mod8(lowSum)].name]);
      calc.push(['动爻', '通篇 ' + total + ' 画 ÷ 6 余 ' + (total % 6) +
        (total % 6 === 0 ? '（余 0 作 6）' : '') + ' → 第 ' + mod6(total) + ' 爻']);
    }

    return {
      up: mod8(upSum), low: mod8(lowSum), dong: mod6(total),
      cal: f,
      natal: false,
      words: {
        chars: chars, strokes: strokes, missing: missing,
        single: single, upPart: upPart, lowPart: lowPart,
        upStrokes: upPartStrokes, lowStrokes: lowPartStrokes, total: total
      },
      detail: detail,
      calc: calc,
      rule: single
        ? '《梅花易数·字占》：一字为太极未判，取其字画，以左为阳画、右为阴画；居左者看几数，取为上卦，居右者看几数，取为下卦；又以一字之全画取爻。'
        : '《梅花易数·字占》：凡见字数如停匀，即平分一半为上卦、一半为下卦；如字数不匀，即少一字为上卦，取「天轻清」之义，以多一字为下卦，取「地重浊」之义。各以画数除八取卦，通篇画数除六取爻。'
    };
  }

  /* ---------- 断卦 ---------- */
  var REL = {
    bihe: { grade: '吉', tag: '体用比和', score: 4, tone: 'ji' },
    yongshengti: { grade: '吉', tag: '用生体', score: 4, tone: 'ji' },
    tikeyong: { grade: '吉', tag: '体克用', score: 3, tone: 'ji' },
    tishengyong: { grade: '平', tag: '体生用', score: 2, tone: 'ping' },
    yongketi: { grade: '凶', tag: '用克体', score: 0, tone: 'xiong' }
  };

  function relation(bw, yw) {
    var key;
    if (bw === yw) key = 'bihe';
    else if (SHENG[yw] === bw) key = 'yongshengti';
    else if (KE[bw] === yw) key = 'tikeyong';
    else if (SHENG[bw] === yw) key = 'tishengyong';
    else key = 'yongketi';

    var r = REL[key];
    var text = {
      bihe: '体用同属' + bw + '，比和之象。主客同心、内外相应，谋事顺遂，不必借助外力即可成事。',
      yongshengti: '用卦（' + yw + '）生体卦（' + bw + '），得外力相助之象。事有贵人相扶，所谋多应，宜积极而为。',
      tikeyong: '体卦（' + bw + '）克用卦（' + yw + '），我强彼弱之象。事虽可成，然须亲自用力，不可假手于人。',
      tishengyong: '体卦（' + bw + '）生用卦（' + yw + '），泄气之象。主耗损精力、破费钱财，事成而所得有限，宜量力而行。',
      yongketi: '用卦（' + yw + '）克体卦（' + bw + '），受制之象。主外事相逼、阻力较大，宜退守待时，不宜强求。'
    }[key];

    return { key: key, grade: r.grade, tag: r.tag, score: r.score, tone: r.tone, text: text, bw: bw, yw: yw };
  }

  function build(raw) {
    var lines = T[raw.low].lines.concat(T[raw.up].lines);   // 自下而上 6 爻
    var dIdx = raw.dong - 1;

    var ben = TJ.HEXAGRAMS[raw.up + '_' + raw.low];

    /* 互卦：2-3-4 爻为下卦，3-4-5 爻为上卦 */
    var huLow = TRI_BY_LINES[[lines[1], lines[2], lines[3]].join('')];
    var huUp = TRI_BY_LINES[[lines[2], lines[3], lines[4]].join('')];
    var hu = TJ.HEXAGRAMS[huUp + '_' + huLow];

    /* 变卦：动爻翻转 */
    var bl = lines.slice();
    bl[dIdx] = bl[dIdx] === 1 ? 0 : 1;
    var bianLow = TRI_BY_LINES[bl.slice(0, 3).join('')];
    var bianUp = TRI_BY_LINES[bl.slice(3, 6).join('')];
    var bian = TJ.HEXAGRAMS[bianUp + '_' + bianLow];

    /* 体用：动爻所在之卦为用，另一卦为体 */
    var tiIsLower = dIdx >= 3;                 // 动爻在上卦 → 体卦为下卦
    var tiIdx = tiIsLower ? raw.low : raw.up;
    var yongIdx = tiIsLower ? raw.up : raw.low;
    var ti = T[tiIdx], yong = T[yongIdx];

    /* 三段：本卦断始、互卦断中、变卦断终 */
    var huTiIdx = tiIsLower ? huLow : huUp;
    var huYongIdx = tiIsLower ? huUp : huLow;
    var bianYongIdx = tiIsLower ? bianUp : bianLow;

    var stage1 = relation(ti.wuxing, yong.wuxing);
    var stage2 = relation(T[huTiIdx].wuxing, T[huYongIdx].wuxing);
    var stage3 = relation(ti.wuxing, T[bianYongIdx].wuxing);

    /* 月建旺衰 */
    var mz = raw.cal ? raw.cal.monthZhiWuxing : null;
    var tiWS = mz ? L.wangShuai(mz, ti.wuxing) : null;
    var yongWS = mz ? L.wangShuai(mz, yong.wuxing) : null;

    /* 综合：本卦权重 2、变卦权重 2、互卦权重 1，再以体卦旺衰增减 */
    var total = stage1.score * 2 + stage3.score * 2 + stage2.score * 1;
    if (tiWS) total += L.WS_SCORE[tiWS];
    var verdict = verdictOf(total);

    return {
      raw: raw, lines: lines, dIdx: dIdx,
      ben: ben, hu: hu, bian: bian,
      huLines: T[huLow].lines.concat(T[huUp].lines),
      bianLines: bl,
      huLow: huLow, huUp: huUp, bianLow: bianLow, bianUp: bianUp,
      ti: ti, tiIdx: tiIdx, yong: yong, yongIdx: yongIdx,
      huTi: T[huTiIdx], huYong: T[huYongIdx],
      bianYong: T[bianYongIdx],
      tiIsLower: tiIsLower,
      stage1: stage1, stage2: stage2, stage3: stage3,
      monthZhiWuxing: mz, tiWS: tiWS, yongWS: yongWS,
      total: total, verdict: verdict
    };
  }

  function verdictOf(total) {
    if (total >= 18) return { word: '大 吉', tone: 'ji', tip: '体用得宜、始终相扶，所谋之事可成，宜果断进取。' };
    if (total >= 14) return { word: '吉', tone: 'ji', tip: '体用相生、过程顺遂，事有可为，循正而行必有收获。' };
    if (total >= 10) return { word: '小 吉', tone: 'ji', tip: '大体得利，然中间略有波折，宜稳中求进，不可贪快。' };
    if (total >= 6) return { word: '中 平', tone: 'ping', tip: '吉凶相参、得失相当，宜守常待时，不宜妄动。' };
    if (total >= 2) return { word: '小 凶', tone: 'xiong', tip: '体卦受制、过程多阻，宜退守收敛，暂缓决断。' };
    return { word: '凶', tone: 'xiong', tip: '体弱用强、始终受克，此卦不宜行事，宜静养待机。' };
  }

  /* ---------- 渲染片段 ---------- */
  function hexHTML(lines, moving, mini) {
    var html = '<div class="hexagram' + (mini ? ' hexagram--mini' : '') + '">';
    lines.forEach(function (v, i) {
      var yin = v === 0;
      var isMoving = (moving != null && i === moving);
      html += '<div class="yao yao--' + (yin ? 'yin' : 'yang') + (isMoving ? ' yao--moving' : '') +
        '" style="--y:' + i + '">' + (yin ? '<i></i><i></i>' : '<i></i>') + '</div>';
    });
    return html + '</div>';
  }

  function symOf(lines) {
    return T[TRI_BY_LINES[lines.slice(3, 6).join('')]].sym + T[TRI_BY_LINES[lines.slice(0, 3).join('')]].sym;
  }

  function kv(k, v) {
    return '<div class="mh-kv"><span class="mh-kv__k">' + k + '</span><span class="mh-kv__v">' + v + '</span></div>';
  }

  function wxTag(wx) {
    return '<b class="mh-wx mh-wx--' + wx + '">' + wx + '</b>';
  }

  /* ---------- 视图 ---------- */
  function render(host) {
    host.innerHTML = '';
    var wrap = TJ.util.el('div', 'mh');
    wrap.innerHTML =
      '<div class="mh-methods">' +
        '<button type="button" class="mh-method' + (state.method === 'time' ? ' is-on' : '') + '" data-m="time">' +
          '<span class="mh-method__name">年月日时起卦</span>' +
          '<span class="mh-method__desc">以农历年支、月、日、时取数，梅花正法</span>' +
        '</button>' +
        '<button type="button" class="mh-method' + (state.method === 'natal' ? ' is-on' : '') + '" data-m="natal">' +
          '<span class="mh-method__name">本命卦 · 终身</span>' +
          '<span class="mh-method__desc">以出生时刻起卦，观一生格局（梅花体系）</span>' +
        '</button>' +
        '<button type="button" class="mh-method' + (state.method === 'number' ? ' is-on' : '') + '" data-m="number">' +
          '<span class="mh-method__name">数字起卦</span>' +
          '<span class="mh-method__desc">心中默念所问，报出两个数字，先天数成卦</span>' +
        '</button>' +
        '<button type="button" class="mh-method' + (state.method === 'word' ? ' is-on' : '') + '" data-m="word">' +
          '<span class="mh-method__name">字占 · 拆字</span>' +
          '<span class="mh-method__desc">以所书文字之笔画分半成卦，一字至多字皆可</span>' +
        '</button>' +
      '</div>' +
      '<div class="mh-form" id="mhForm"></div>' +
      '<div class="mh-stage" id="mhStage"></div>';
    host.appendChild(wrap);

    renderForm(host);
    TJ.$$('.mh-method', host).forEach(function (b) {
      b.addEventListener('click', function () {
        if (state.method === b.getAttribute('data-m')) return;
        state.method = b.getAttribute('data-m');
        TJ.$$('.mh-method', host).forEach(function (x) { x.classList.toggle('is-on', x === b); });
        renderForm(host);
        TJ.audio.click();
      });
    });
  }

  function toLocalInput(d) {
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
      'T' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function renderForm(host) {
    var form = TJ.$('#mhForm', host);
    if (!form) return;
    form.innerHTML = '';
    var isTime = state.method === 'time' || state.method === 'natal';
    var isNatal = state.method === 'natal';
    var isWord = state.method === 'word';

    if (isTime) {
      var base = activeWhen() || new Date();
      var card = TJ.util.el('div', 'card mh-cal');
      card.innerHTML =
        '<div class="card__label">取 数 依 据 · 农 历</div>' +
        '<div id="mhCalBody"></div>' +
        '<div class="mh-cal__ctrl">' +
          '<label class="field mh-cal__when"><span class="field__label">' +
            (isNatal ? '出生日期与时辰' : '择时（默认为此刻）') + '</span>' +
            '<input class="field__input" type="datetime-local" id="mhWhen" value="' + toLocalInput(base) + '"></label>' +
          '<div class="mh-cal__opts">' +
            '<div class="mh-optgroup"><span class="mh-optgroup__label">岁首</span>' +
              '<button type="button" class="chip' + (state.yearFirst === 'lichun' ? ' is-on' : '') + '" data-yf="lichun">立春</button>' +
              '<button type="button" class="chip' + (state.yearFirst === 'zhengyue' ? ' is-on' : '') + '" data-yf="zhengyue">正月</button>' +
            '</div>' +
            '<div class="mh-optgroup"><span class="mh-optgroup__label">子时</span>' +
              '<button type="button" class="chip' + (state.ziRollover ? ' is-on' : '') + '" data-zr="1">换日</button>' +
              '<button type="button" class="chip' + (!state.ziRollover ? ' is-on' : '') + '" data-zr="0">不换</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
        (isNatal ? '<div class="field__hint" style="margin-top:.9rem">本命卦属梅花易数体系，' +
          '以出生时刻之农历年月日时成象，主看一生格局；与「八字命盘」是两套独立体系，取法与断法均不相同，不宜混参。</div>' : '');
      form.appendChild(card);

      var when = TJ.$('#mhWhen', host);
      when.addEventListener('input', function () {
        var v = when.value;
        var val = v ? new Date(v) : null;
        if (isNatal) state.natal = val; else state.when = val;
        paintCal(host);
      });

      TJ.$$('.chip[data-yf]', card).forEach(function (c) {
        c.addEventListener('click', function () {
          state.yearFirst = c.getAttribute('data-yf');
          TJ.$$('.chip[data-yf]', card).forEach(function (x) { x.classList.toggle('is-on', x === c); });
          paintCal(host); TJ.audio.click();
        });
      });
      TJ.$$('.chip[data-zr]', card).forEach(function (c) {
        c.addEventListener('click', function () {
          state.ziRollover = c.getAttribute('data-zr') === '1';
          TJ.$$('.chip[data-zr]', card).forEach(function (x) { x.classList.toggle('is-on', x === c); });
          paintCal(host); TJ.audio.click();
        });
      });

      paintCal(host);
    } else if (isWord) {
      var wcard = TJ.util.el('div', 'card mh-word');
      wcard.innerHTML =
        '<div class="card__label">字 占 · 拆 字 取 数</div>' +
        '<label class="field"><span class="field__label">所书文字（一字至多字，标点自动忽略）</span>' +
        '<input class="field__input" id="mhText" type="text" maxlength="40" ' +
        'placeholder="如「问前程」或「天」" value="' + String(state.text).replace(/"/g, '&quot;') + '"></label>' +
        '<div class="mh-word__preview" id="mhWordPreview"></div>' +
        '<div class="mh-word__split" id="mhWordSplit"></div>' +
        '<div class="field__hint">笔画取<b>现代规范笔画</b>（如「河」8 画），与《康熙字典》笔画（古法字占所用，如「河」9 画）' +
        '于个别字形或有出入，仅供参考。<br>' +
        '多字占依原法「平分一半为上卦、一半为下卦；字数不匀，则少一字为上卦，取天轻清之义，多一字为下卦，取地重浊之义」。<br>' +
        '一字占依原法「以左为阳画、右为阴画」，本工具按该字<b>部首位置</b>自动推定初值，' +
        '独体、包围、品字等无法二分者取中分，<b>均可手动修正</b>。</div>';
      form.appendChild(wcard);

      var tin = TJ.$('#mhText', host);
      if (tin) tin.addEventListener('input', function () {
        state.text = tin.value;
        state.splitA = ''; state.splitB = '';
        paintWord(host);
      });
      paintWord(host);
    } else {
      var row = TJ.util.el('div', 'mh-form__row');
      row.innerHTML =
        '<label class="field"><span class="field__label">第一个数（定上卦）</span>' +
        '<input class="field__input" id="mhN1" type="number" inputmode="numeric" min="1" placeholder="如 37" value="' + state.n1 + '"></label>' +
        '<label class="field"><span class="field__label">第二个数（定下卦）</span>' +
        '<input class="field__input" id="mhN2" type="number" inputmode="numeric" min="1" placeholder="如 58" value="' + state.n2 + '"></label>';
      form.appendChild(row);
      ['mhN1', 'mhN2'].forEach(function (id) {
        var inp = TJ.$('#' + id, host);
        if (inp) inp.addEventListener('input', function () {
          if (id === 'mhN1') state.n1 = inp.value; else state.n2 = inp.value;
        });
      });
    }

    var actions = TJ.util.el('div', 'mh-form__actions');
    actions.innerHTML = '<button type="button" class="btn btn--solid" id="mhCast">' +
      (isNatal ? '立 命 卦' : '起 卦') + '</button>' +
      '<span class="field__hint" id="mhHint">' +
      (isNatal ? '以出生时刻之农历年月日时取数，成终身之象'
        : (isWord ? '以所书文字之笔画取数'
          : (isTime ? '以所选时刻之农历年月日时取数' : '请填入两个正整数'))) + '</span>';
    form.appendChild(actions);
    TJ.$('#mhCast', host).addEventListener('click', function () { cast(host); });
  }

  /* 字占：实时预览画数与分半 */
  function paintWord(host) {
    var box = TJ.$('#mhWordPreview', host);
    var splitBox = TJ.$('#mhWordSplit', host);
    if (!box) return;

    var chars = hanChars(state.text);
    if (!chars.length) {
      box.innerHTML = '<span class="field__hint">尚未输入文字。</span>';
      if (splitBox) splitBox.innerHTML = '';
      return;
    }

    var strokes = chars.map(function (c) { return TJ.strokeOf(c); });
    var total = strokes.reduce(function (s, v) { return s + v; }, 0);
    var missing = [];
    chars.forEach(function (c, i) { if (!strokes[i] && missing.indexOf(c) === -1) missing.push(c); });

    box.innerHTML =
      '<div class="mh-word__chips">' +
        chars.map(function (c, i) {
          return '<span class="mh-word__chip' + (strokes[i] ? '' : ' is-unknown') + '">' +
            '<b>' + c + '</b><i>' + (strokes[i] ? strokes[i] + '画' : '未收录') + '</i></span>';
        }).join('') +
      '</div>' +
      '<div class="mh-word__sum">共 <b>' + chars.length + '</b> 字，合计 <b>' + total + '</b> 画' +
        (missing.length ? '　<span class="mh-word__warn">「' + missing.join('、') + '」未收录，请改用他字或另择起卦法</span>' : '') +
      '</div>';

    if (!splitBox) return;
    if (chars.length === 1) {
      var S = strokes[0] || 0;
      var autoA = S ? (TJ.splitOf(chars[0], S) || Math.ceil(S / 2)) : 0;
      var a = state.splitA === '' ? autoA : parseInt(state.splitA, 10);
      var b = state.splitB === '' ? S - autoA : parseInt(state.splitB, 10);
      if (isNaN(a)) a = autoA;
      if (isNaN(b)) b = S - autoA;
      splitBox.innerHTML =
        '<div class="mh-word__splitbox">' +
          '<span class="mh-word__splitk">一字占 · 分阴阳画</span>' +
          '<label class="mh-word__f"><span>阳画（左/上）</span>' +
            '<input class="field__input" id="mhSA" type="number" inputmode="numeric" min="0" value="' + a + '"></label>' +
          '<label class="mh-word__f"><span>阴画（右/下）</span>' +
            '<input class="field__input" id="mhSB" type="number" inputmode="numeric" min="0" value="' + b + '"></label>' +
          '<span class="mh-word__splitn" id="mhSplitNote"></span>' +
        '</div>' +
        '<div class="field__hint">初值' + (TJ.splitOf(chars[0], S)
          ? '按该字部首位置自动推定（' + (autoA === S - autoA ? '左右/上下各半' : '偏旁居左或居上，取其画数') + '）'
          : '因该字属独体、包围或品字结构，无法二分，暂取中分') +
          '，请按实际字形核对。</div>';
      var sa = TJ.$('#mhSA', host), sb = TJ.$('#mhSB', host);
      var sync = function () {
        state.splitA = sa.value; state.splitB = sb.value;
        var note = TJ.$('#mhSplitNote', host);
        if (note) {
          var x = parseInt(sa.value, 10) || 0, y = parseInt(sb.value, 10) || 0;
          note.innerHTML = (x + y === S)
            ? '阳 ' + x + ' ＋ 阴 ' + y + ' ＝ 全字 ' + S + ' 画　<span class="ok">✓ 相符</span>'
            : '<span class="mh-word__warn">阳 ' + x + ' ＋ 阴 ' + y + ' ＝ ' + (x + y) +
              ' 画，与全字 ' + S + ' 画不符，请核对</span>';
        }
      };
      if (sa) sa.addEventListener('input', sync);
      if (sb) sb.addEventListener('input', sync);
      sync();
    } else {
      var cut = Math.floor(chars.length / 2);
      splitBox.innerHTML =
        '<div class="mh-word__splitbox mh-word__splitbox--multi">' +
          '<span class="mh-word__splitk">分半</span>' +
          '<span class="mh-word__half"><b>上卦</b>' + chars.slice(0, cut).join('') +
            '（' + strokes.slice(0, cut).reduce(function (s, v) { return s + v; }, 0) + ' 画）</span>' +
          '<span class="mh-word__half"><b>下卦</b>' + chars.slice(cut).join('') +
            '（' + strokes.slice(cut).reduce(function (s, v) { return s + v; }, 0) + ' 画）</span>' +
        '</div>';
    }
  }

  function paintCal(host) {
    var box = TJ.$('#mhCalBody', host);
    if (!box) return;
    if (!L.available) {
      box.innerHTML = '<div class="field__hint">农历数据源未加载，暂以公历取数。</div>';
      return;
    }
    var d = activeWhen() ? new Date(activeWhen().getTime()) : new Date();
    if (isNaN(d.getTime())) d = new Date();
    var f = L.fromDate(d, { yearFirst: state.yearFirst, ziRollover: state.ziRollover });
    var n = f.nums;
    var upSum = n.year + n.month + n.day;
    var lowSum = upSum + n.hour;

    box.innerHTML =
      '<div class="mh-cal__line">' +
        '<span class="mh-cal__lunar">' + f.gz.year + '年 <b>' + f.lunar.monthCn + f.lunar.dayCn + '</b> ' +
        f.nums.shichenCn + '时</span>' +
        '<span class="mh-cal__solar">公历 ' + f.input.y + '.' + f.input.mo + '.' + f.input.d +
        ' ' + (f.input.h < 10 ? '0' : '') + f.input.h + ':' + (f.input.mi < 10 ? '0' : '') + f.input.mi + '</span>' +
      '</div>' +
      '<div class="mh-pillars">' +
        pillar('年柱', f.gz.year) + pillar('月柱', f.gz.month) +
        pillar('日柱', f.gz.day) + pillar('时柱', f.gz.hour) +
      '</div>' +
      '<div class="mh-cal__nums">' +
        '<span>年支 <b>' + n.year + '</b></span>' +
        '<span>月 <b>' + n.month + '</b></span>' +
        '<span>日 <b>' + n.day + '</b></span>' +
        '<span>时 <b>' + n.hour + '</b></span>' +
        '<span class="mh-cal__res">上卦数 <b>' + upSum + '</b> → ' + T[mod8(upSum)].name +
        '　下卦数 <b>' + lowSum + '</b> → ' + T[mod8(lowSum)].name +
        '　动爻 <b>' + mod6(lowSum) + '</b></span>' +
      '</div>' +
      '<div class="field__hint">' + (state.yearFirst === 'lichun'
        ? '岁首取立春（干支正统）：' + f.gz.year + '。'
        : '岁首取正月初一（农历年）：' + f.gz.year + '。') +
        (state.ziRollover ? '子时（23:00 后）作次日计。' : '子时不换日，以 00:00 为日界。') +
        (f.isLeap ? '所值月份为闰月，按本月序取数。' : '') + '</div>';
  }

  function pillar(label, gz) {
    return '<div class="mh-pillar"><span class="mh-pillar__k">' + label + '</span>' +
      '<span class="mh-pillar__v">' + gz.charAt(0) + '<br>' + gz.charAt(1) + '</span></div>';
  }

  /* ---------- 起卦 ---------- */
  function cast(host) {
    var raw;
    if (state.method === 'number') {
      var a = parseInt(state.n1, 10), b = parseInt(state.n2, 10);
      if (!a || !b || a <= 0 || b <= 0) { TJ.toast('请填入两个正整数'); return; }
      raw = numberCast(a, b);
    } else if (state.method === 'word') {
      var chars = hanChars(state.text);
      if (!chars.length) { TJ.toast('请先输入所书文字'); return; }
      var strokes = chars.map(function (c) { return TJ.strokeOf(c); });
      if (strokes.indexOf(0) !== -1) {
        var miss = [];
        chars.forEach(function (c, i) { if (!strokes[i] && miss.indexOf(c) === -1) miss.push(c); });
        TJ.toast('「' + miss.join('、') + '」未收录于笔画库，请改用他字');
        return;
      }
      raw = wordCast(state.text, state.splitA, state.splitB);
      if (!raw) { TJ.toast('请先输入所书文字'); return; }
    } else {
      raw = timeCast(activeWhen());
    }

    var data = build(raw);
    var stage = TJ.$('#mhStage', host);
    var btn = TJ.$('#mhCast', host);
    if (btn) btn.disabled = true;

    TJ.audio.cast();

    stage.innerHTML =
      '<div class="mh-casting">' +
        '<div class="mh-casting__hint" id="mhCastHint">聚 数 成 象</div>' +
        hexHTML(data.lines, data.dIdx) +
        '<div class="mh-casting__sub" id="mhCastSub">' +
          (raw.words
            ? raw.words.chars.join('') + ' · 共 ' + raw.words.total + ' 画'
            : raw.cal.lunar.monthCn + raw.cal.lunar.dayCn + ' · ' + raw.cal.nums.shichenCn + '时') +
        '</div>' +
      '</div>';

    var hex = TJ.$('.hexagram', stage);
    var hint = TJ.$('#mhCastHint', stage);
    var seq = ['聚 数 成 象', '分 阴 阳 爻', '定 上 下 卦', '动 爻 已 现'];
    var i = 0;
    var iv = setInterval(function () {
      i++;
      if (i < seq.length) { hint.textContent = seq[i]; TJ.audio.tick(); }
    }, 320);
    setTimeout(function () { hex.classList.add('is-drawn'); }, 240);

    setTimeout(function () {
      clearInterval(iv);
      renderResult(host, data);
      TJ.audio.reveal();
      if (btn) btn.disabled = false;
      var r = TJ.$('#mhResult', host);
      if (r) {
        TJ.$$('.stagger', r).forEach(function (s) {
          TJ.util.stagger(Array.prototype.slice.call(s.children));
        });
      }
    }, 2100);
  }

  /* ---------- 结果 ---------- */
  function renderResult(host, d) {
    var stage = TJ.$('#mhStage', host);
    stage.innerHTML = '';

    var benSym = T[d.raw.up].sym + T[d.raw.low].sym;
    var huSym = symOf(d.huLines);
    var bianSym = symOf(d.bianLines);
    var f = d.raw.cal;

    var res = TJ.util.el('div', 'mh-result');
    res.id = 'mhResult';

    res.innerHTML =
      /* 三卦 */
      '<div class="mh-triple stagger">' +
        '<div class="mh-gua mh-gua--main">' +
          '<div class="mh-gua__role">' + (d.raw.natal ? '本 命 卦 · 先 天' : '本 卦 · 事之初') + '</div>' +
          '<div class="mh-gua__sym">' + benSym + '</div>' +
          '<div class="mh-gua__name">' + d.ben[0] + '</div>' +
          '<div class="mh-gua__no">第 ' + d.ben[1] + ' 卦 · ' + T[d.raw.up].name + '上' + T[d.raw.low].name + '下</div>' +
          hexHTML(d.lines, d.dIdx, true) +
        '</div>' +
        '<div class="mh-gua">' +
          '<div class="mh-gua__role">互 卦 · 事之中</div>' +
          '<div class="mh-gua__sym">' + huSym + '</div>' +
          '<div class="mh-gua__name">' + d.hu[0] + '</div>' +
          '<div class="mh-gua__no">第 ' + d.hu[1] + ' 卦 · ' + T[d.huUp].name + '上' + T[d.huLow].name + '下</div>' +
          hexHTML(d.huLines, null, true) +
        '</div>' +
        '<div class="mh-gua">' +
          '<div class="mh-gua__role">变 卦 · 事之终</div>' +
          '<div class="mh-gua__sym">' + bianSym + '</div>' +
          '<div class="mh-gua__name">' + d.bian[0] + '</div>' +
          '<div class="mh-gua__no">第 ' + d.bian[1] + ' 卦 · ' + T[d.bianUp].name + '上' + T[d.bianLow].name + '下</div>' +
          hexHTML(d.bianLines, null, true) +
        '</div>' +
      '</div>' +

      /* 综合断语 */
      '<div class="card stagger mh-verdict-card">' +
        '<div class="card__label">综 合 断 语</div>' +
        '<div class="mh-verdict mh-verdict--' + d.verdict.tone + '">' +
          '<div class="mh-verdict__grade">' + d.verdict.word + '</div>' +
          '<div class="mh-verdict__text">' + d.verdict.tip + '</div>' +
        '</div>' +
        '<div class="mh-stage-chain">' +
          chainItem('始', d.ben[0], d.stage1) +
          chainItem('中', d.hu[0], d.stage2) +
          chainItem('终', d.bian[0], d.stage3) +
        '</div>' +
        '<div class="field__hint" style="margin-top:1rem">断法：以本卦定事之基调，互卦观其中段，变卦定其结局；' +
        '三段各以体用生克论吉凶，再参体卦于月建之旺衰增减轻重。' +
        (state.method === 'word' && d.raw.words
          ? '<br>字占之象由所书文字而来：' + (d.raw.words.single
            ? '一字为太极，' + d.raw.words.chars[0] + '字阳画 ' + d.raw.words.upStrokes +
              '、阴画 ' + d.raw.words.lowStrokes + '，全画取爻。'
            : '「' + d.raw.words.chars.join('') + '」共 ' + d.raw.words.chars.length + ' 字 ' +
              d.raw.words.total + ' 画，前 ' + d.raw.words.upPart.length + ' 字为上卦、后 ' +
              d.raw.words.lowPart.length + ' 字为下卦。') +
            '书字之时心念所系，即卦之所应。' : '') +
        (d.raw.natal ? '<br>本命卦以出生时刻成象，为梅花体系之终身卦——体卦为「本命」，用卦为「行运」，' +
          '本卦示先天格局、互卦示中段际遇、变卦示晚境归趋。此与「八字命盘」分属两套体系，取法与断法皆异，不可混参。' : '') +
        '</div>' +
      '</div>' +

      /* 历法取数 */
      (f ? calCard(d) : '') +

      /* 卦象详解 */
      '<div class="card stagger">' +
        '<div class="card__label">卦 象 详 解</div>' +
        '<div class="mh-info">' +
          kv('起卦方式', state.method === 'natal' ? '本命卦（出生时刻起例）'
            : state.method === 'word' ? '字占（所书文字笔画取数）'
            : (state.method === 'time' ? '年月日时起例（农历）' : '数字起卦（先天数）')) +
          kv('上　卦', T[d.raw.up].name + ' ' + T[d.raw.up].sym + '（' + T[d.raw.up].nature + ' · ' + wxTag(T[d.raw.up].wuxing) + '）') +
          kv('下　卦', T[d.raw.low].name + ' ' + T[d.raw.low].sym + '（' + T[d.raw.low].nature + ' · ' + wxTag(T[d.raw.low].wuxing) + '）') +
          kv('动　爻', '第 ' + d.raw.dong + ' 爻（' + (d.tiIsLower ? '上卦' : '下卦') + '动）') +
          kv('体　卦', T[d.tiIdx].name + ' ' + T[d.tiIdx].sym + '（' + d.ti.nature + ' · ' + wxTag(d.ti.wuxing) + '）' +
            (d.tiWS ? '　<span class="mh-ws mh-ws--' + d.tiWS + '">' + d.tiWS + '</span>' : '')) +
          kv('用　卦', T[d.yongIdx].name + ' ' + T[d.yongIdx].sym + '（' + d.yong.nature + ' · ' + wxTag(d.yong.wuxing) + '）' +
            (d.yongWS ? '　<span class="mh-ws mh-ws--' + d.yongWS + '">' + d.yongWS + '</span>' : '')) +
        '</div>' +
        '<div class="mh-ws-note">' + wsNote(d) + '</div>' +
      '</div>' +

      /* 卦辞爻辞原文 */
      guaciCard(d) +

      '<div class="mh-form__actions">' +
        '<button type="button" class="btn" id="mhAgain">再 起 一 卦</button>' +
        '<button type="button" class="btn btn--ghost" id="mhBack">返 回 首 页</button>' +
      '</div>';

    stage.appendChild(res);

    TJ.$('#mhAgain', res).addEventListener('click', function () {
      render(host);
      TJ.$('#mhForm', host).scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    TJ.$('#mhBack', res).addEventListener('click', function () { TJ.go('home'); });

    TJ.$$('.hexagram', res).forEach(function (h, i) {
      setTimeout(function () { h.classList.add('is-drawn'); }, 260 + i * 160);
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function chainItem(stage, guaName, rel) {
    return '<div class="mh-chain mh-chain--' + rel.tone + '">' +
      '<span class="mh-chain__stage">' + stage + '</span>' +
      '<span class="mh-chain__gua">' + guaName + '</span>' +
      '<span class="mh-chain__rel">' + rel.tag + '</span>' +
      '<span class="mh-chain__grade">' + rel.grade + '</span>' +
      '</div>';
  }

  /* ---------- 卦辞爻辞（《周易》原文） ---------- */
  function guaciOf(up, low) {
    var G = TJ.GUACI || {};
    return G[up + '_' + low] || null;
  }

  function gcBlock(role, hex, gc, opts) {
    opts = opts || {};
    if (!gc) return '';
    var h = '<div class="mh-gc__block' + (opts.main ? ' mh-gc__block--main' : '') + '">' +
      '<div class="mh-gc__head">' +
        '<span class="mh-gc__role">' + role + '</span>' +
        '<span class="mh-gc__name">' + hex[0] + '</span>' +
        '<span class="mh-gc__no">第 ' + hex[1] + ' 卦</span>' +
      '</div>' +
      '<div class="mh-gc__row">' +
        '<span class="mh-gc__k">卦 辞</span>' +
        '<p class="mh-gc__v">' + gc.g + '</p>' +
      '</div>';

    if (opts.yao) {
      h += '<div class="mh-gc__row mh-gc__row--yao">' +
        '<span class="mh-gc__k">动 爻</span>' +
        '<p class="mh-gc__v"><b class="mh-gc__yao">' + opts.yao[0] + '</b>' + opts.yao[1] + '</p>' +
        '</div>';
    }

    if (opts.all && gc.y && gc.y.length) {
      h += '<details class="mh-gc__more"><summary>展 开 六 爻 全 文</summary>' +
        '<div class="mh-gc__list">' +
        gc.y.map(function (y, i) {
          return '<div class="mh-gc__item' + (opts.dIdx === i ? ' is-on' : '') + '">' +
            '<span class="mh-gc__item-k">' + y[0] + '</span>' +
            '<p class="mh-gc__item-v">' + y[1] + '</p></div>';
        }).join('') +
        '</div></details>';
    }
    return h + '</div>';
  }

  function guaciCard(d) {
    var benGC = guaciOf(d.raw.up, d.raw.low);
    var huGC = guaciOf(d.huUp, d.huLow);
    var bianGC = guaciOf(d.bianUp, d.bianLow);
    if (!benGC && !huGC && !bianGC) return '';

    var yao = (benGC && benGC.y) ? benGC.y[d.dIdx] : null;

    return '<div class="card stagger mh-guaci-card">' +
      '<div class="card__label">卦 辞 爻 辞 · 周 易 原 文</div>' +
      '<div class="mh-gc">' +
        gcBlock('本卦 · 事之初', d.ben, benGC, { main: true, yao: yao, all: true, dIdx: d.dIdx }) +
        gcBlock('互卦 · 事之中', d.hu, huGC, {}) +
        gcBlock('变卦 · 事之终', d.bian, bianGC, {}) +
      '</div>' +
      '<div class="mh-gc__tip">' +
        '<div class="mh-gc__tip-row"><b>本卦今解</b>' + d.ben[2] + '</div>' +
        '<div class="mh-gc__tip-row"><b>互卦今解</b>' + d.hu[2] + '</div>' +
        '<div class="mh-gc__tip-row"><b>变卦今解</b>' + d.bian[2] + '</div>' +
      '</div>' +
      '<div class="field__hint">断卦以本卦动爻为主——' +
        (yao ? '「' + yao[0] + '」为所动之爻，其辞即事之当下；' : '') +
        '变卦之卦辞示其事之终局，互卦之卦辞示其中段。' +
        '原文取自《周易》古经，为存古字用繁体，未作繁简转换。' +
      '</div>' +
    '</div>';
  }

  function calCard(d) {
    var f = d.raw.cal;
    var isWord = !!d.raw.words;

    /* 断卦以月建论体用旺衰，故字占亦须记时 */
    var whenBlock =
      '<div class="mh-cal__line">' +
        '<span class="mh-cal__lunar">' + f.gz.year + '年 <b>' + f.lunar.monthCn + f.lunar.dayCn + '</b> ' +
        f.nums.shichenCn + '时</span>' +
        '<span class="mh-cal__solar">公历 ' + f.input.y + '.' + f.input.mo + '.' + f.input.d +
        ' ' + (f.input.h < 10 ? '0' : '') + f.input.h + ':' + (f.input.mi < 10 ? '0' : '') + f.input.mi + '</span>' +
      '</div>' +
      '<div class="mh-pillars">' +
        pillar('年柱', f.gz.year) + pillar('月柱', f.gz.month) +
        pillar('日柱', f.gz.day) + pillar('时柱', f.gz.hour) +
      '</div>';

    var wordBlock = '';
    if (isWord) {
      var w = d.raw.words;
      wordBlock =
        '<div class="mh-word__chips">' +
          w.chars.map(function (c, i) {
            return '<span class="mh-word__chip"><b>' + c + '</b><i>' + w.strokes[i] + '画</i></span>';
          }).join('') +
        '</div>' +
        '<div class="mh-word__sum">共 <b>' + w.chars.length + '</b> 字，合计 <b>' + w.total + '</b> 画</div>';
    }

    return '<div class="card stagger">' +
      '<div class="card__label">' + (isWord ? '起 卦 依 例 · 字 占' : '起 卦 依 例 · 历 法') + '</div>' +
      wordBlock +
      '<div class="mh-numtable">' +
        d.raw.detail.map(function (r) {
          return '<div class="mh-numrow"><span>' + r[0] + '</span><b>' + r[1] + '</b></div>';
        }).join('') +
      '</div>' +
      '<div class="mh-calc">' +
        d.raw.calc.map(function (r) {
          return '<div class="mh-calc__row"><span class="mh-calc__k">' + r[0] + '</span>' +
            '<span class="mh-calc__v">' + r[1] + '</span></div>';
        }).join('') +
      '</div>' +
      '<div class="field__hint" style="margin-top:1rem">' + d.raw.rule + '</div>' +
      (isWord ? '<div class="mh-cal__sep">断 卦 之 时 · 月 建</div>' : '') +
      whenBlock +
      '<div class="field__hint">' +
        (isWord
          ? '字占以笔画取数，断卦仍以所值月建论体用旺衰，故记起卦之时。'
          : (f.yearFirst === 'lichun' ? '年支以立春为岁首（干支正统）。' : '年支以正月初一为岁首（农历年）。') +
            (f.ziRollover ? '子时自 23:00 起算次日。' : '子时不换日，以 00:00 为日界。') +
            '月、日取农历，闰月按本月序计。') +
      '</div>' +
    '</div>';
  }

  function wsNote(d) {
    if (!d.monthZhiWuxing) return '';
    var mz = TJ.lunar.MONTH_ZHI;
    return '月建为 <b>' + d.raw.cal.gz.month + '</b>，月令属 <b>' + d.monthZhiWuxing + '</b>：' +
      '体卦属 ' + d.ti.wuxing + '，于月建为 <span class="mh-ws mh-ws--' + d.tiWS + '">' + d.tiWS + '</span>（' +
      TJ.lunar.WS_DESC[d.tiWS] + '）；用卦属 ' + d.yong.wuxing +
      '，为 <span class="mh-ws mh-ws--' + d.yongWS + '">' + d.yongWS + '</span>。' +
      '体卦旺相则吉力倍增，休囚死则吉力大减。';
  }

  TJ.modules.meihua = {
    mount: function (container) {
      state.n1 = ''; state.n2 = '';
      state.text = ''; state.splitA = ''; state.splitB = '';
      state.when = null; state.natal = null;
      render(container);
    }
  };
})();
