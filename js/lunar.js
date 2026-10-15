/* ============================================================
   天机阁 · 历法层
   农历换算 / 干支四柱 / 十二时辰 / 月建旺衰
   农历数据源：solarlunar (MIT, https://github.com/yizeze/solarlunar)
   ============================================================ */
window.TJ = window.TJ || {};
(function () {
  'use strict';

  var SL = window.solarlunar;
  var GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  var ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  var ZHI_WUXING = {
    子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火',
    午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水'
  };
  /* 地支与月份：正月建寅、二月建卯……十一月建子、十二月建丑 */
  var MONTH_ZHI = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];

  var SHENG = TJ.WUXING_SHENG;
  var KE = TJ.WUXING_KE;

  /* 地支序数：子1 丑2 …… 亥12 */
  function zhiNum(zhi) { return ZHI.indexOf(zhi) + 1; }

  /* 时辰索引：子=0 …… 亥=11（子时含 23:00–00:59） */
  function shichenIndex(hour) { return Math.floor((hour + 1) / 2) % 12; }

  /* 时柱干支（五鼠遁：甲己还加甲，乙庚丙作初，丙辛从戊起，丁壬庚子居，戊癸壬子头） */
  function hourGanZhi(dayGan, scIdx) {
    var g = ((GAN.indexOf(dayGan) % 5) * 2 + scIdx) % 10;
    return GAN[g] + ZHI[scIdx];
  }

  /* 农历年干支（以正月初一为岁首） */
  function gzByLunarYear(y) {
    return GAN[((y - 4) % 10 + 10) % 10] + ZHI[((y - 4) % 12 + 12) % 12];
  }

  /* 旺相休囚死：以月建五行为纲
     当令者旺 · 令生者相 · 生令者休 · 克令者囚 · 令克者死 */
  function wangShuai(monthWx, target) {
    if (target === monthWx) return '旺';
    if (SHENG[monthWx] === target) return '相';
    if (SHENG[target] === monthWx) return '休';
    if (KE[target] === monthWx) return '囚';
    if (KE[monthWx] === target) return '死';
    return '平';
  }

  var WS_SCORE = { 旺: 2, 相: 1, 休: 0, 囚: -1, 死: -2 };
  var WS_DESC = {
    旺: '当令得时，气势最盛',
    相: '为月建所生，次旺有力',
    休: '生月建而自泄，力已退',
    囚: '克月建而受制，力弱',
    死: '为月建所克，力最衰'
  };

  /**
   * 由公历时刻求得起卦所需的全部历法要素
   * @param {Date} date 公历时刻
   * @param {Object} [opts] { yearFirst: 'lichun'|'zhengyue', ziRollover: boolean }
   */
  function fromDate(date, opts) {
    opts = opts || {};
    var yearFirst = opts.yearFirst || 'lichun';     // 岁首：立春换年（术数正统）
    var ziRollover = opts.ziRollover !== false;      // 子时换日：23:00 起算次日

    var y = date.getFullYear(), mo = date.getMonth() + 1, d = date.getDate();
    var h = date.getHours(), mi = date.getMinutes();
    var sc = shichenIndex(h);

    var solar = new Date(y, mo - 1, d, h, mi);
    if (ziRollover && h >= 23) solar.setDate(solar.getDate() + 1);

    var l = SL.solar2lunar(solar.getFullYear(), solar.getMonth() + 1, solar.getDate());

    var gzYear = yearFirst === 'zhengyue' ? gzByLunarYear(l.lYear) : l.gzYear;
    var yearZhi = gzYear.charAt(1);
    var monthZhi = l.gzMonth.charAt(1);
    var dayGan = l.gzDay.charAt(0);

    return {
      input: { y: y, mo: mo, d: d, h: h, mi: mi },
      lunar: {
        year: l.lYear, month: l.lMonth, day: l.lDay, isLeap: l.isLeap,
        monthCn: l.monthCn,          // 数据源已含「闰」字，如「闰二月」
        dayCn: l.dayCn,
        animal: l.animal, yearCn: l.yearCn
      },
      gz: {
        year: gzYear,
        month: l.gzMonth,
        day: l.gzDay,
        hour: hourGanZhi(dayGan, sc)
      },
      monthZhi: monthZhi,
      monthZhiWuxing: ZHI_WUXING[monthZhi],
      /* 梅花易数「年月日时起例」所取之数 */
      nums: {
        year: zhiNum(yearZhi),
        month: l.lMonth,          // 正月一数……十二月十二数（闰月按本月序）
        day: l.lDay,              // 初一……三十
        hour: sc + 1,             // 子时一数……亥时十二数
        shichen: sc,
        shichenCn: ZHI[sc]
      },
      yearFirst: yearFirst,
      ziRollover: ziRollover,
      term: l.term || '',
      isLeap: l.isLeap
    };
  }

  /* 农历月序 → 月支（用于显示月建，与节气月区分） */
  function lunarMonthZhi(lMonth) { return MONTH_ZHI[(lMonth - 1) % 12]; }

  TJ.lunar = {
    GAN: GAN,
    ZHI: ZHI,
    ZHI_WUXING: ZHI_WUXING,
    MONTH_ZHI: MONTH_ZHI,
    WS_SCORE: WS_SCORE,
    WS_DESC: WS_DESC,
    zhiNum: zhiNum,
    shichenIndex: shichenIndex,
    hourGanZhi: hourGanZhi,
    gzByLunarYear: gzByLunarYear,
    wangShuai: wangShuai,
    lunarMonthZhi: lunarMonthZhi,
    fromDate: fromDate,
    available: !!SL
  };
})();
