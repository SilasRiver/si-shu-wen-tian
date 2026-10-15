/* ============================================================
   天机阁 · 八字命理引擎（子平术）
   排盘 / 十神 / 五行力量 / 日主强弱 / 喜用神 / 大运 / 流年 / 运势评分
   注：本引擎采用「扶抑为主、调候为辅」的通行取用神法，
       用神取法古有扶抑、调候、通关、病药诸说，此处取其一并公开规则。
   ============================================================ */
window.TJ = window.TJ || {};
(function () {
  'use strict';

  var L = TJ.lunar;
  var SL = window.solarlunar;
  var GAN = L.GAN, ZHI = L.ZHI;
  var SHENG = TJ.WUXING_SHENG;
  var KE = TJ.WUXING_KE;

  var GAN_WX = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
  var GAN_YANG = { 甲: 1, 乙: 0, 丙: 1, 丁: 0, 戊: 1, 己: 0, 庚: 1, 辛: 0, 壬: 1, 癸: 0 };
  var ZHI_YANG = { 子: 1, 丑: 0, 寅: 1, 卯: 0, 辰: 1, 巳: 0, 午: 1, 未: 0, 申: 1, 酉: 0, 戌: 1, 亥: 0 };

  /* 地支藏干（本气 / 中气 / 余气） */
  var CANG = {
    子: [['癸', 1]],
    丑: [['己', .6], ['癸', .3], ['辛', .1]],
    寅: [['甲', .6], ['丙', .3], ['戊', .1]],
    卯: [['乙', 1]],
    辰: [['戊', .6], ['乙', .3], ['癸', .1]],
    巳: [['丙', .6], ['庚', .3], ['戊', .1]],
    午: [['丁', .7], ['己', .3]],
    未: [['己', .6], ['丁', .3], ['乙', .1]],
    申: [['庚', .6], ['壬', .3], ['戊', .1]],
    酉: [['辛', 1]],
    戌: [['戊', .6], ['辛', .3], ['丁', .1]],
    亥: [['壬', .7], ['甲', .3]]
  };

  /* 位置权重：月令最重，日支次之 */
  var W_GAN = { year: 1.0, month: 1.2, hour: 1.0 };
  var W_ZHI = { year: 0.8, month: 2.0, day: 1.2, hour: 1.0 };

  /* 反向五行：生我者（印）、克我者（官杀） */
  function revSheng(wx) { for (var k in SHENG) if (SHENG[k] === wx) return k; return null; }
  function revKe(wx) { for (var k in KE) if (KE[k] === wx) return k; return null; }

  /* 十神 */
  function shiShen(dayGan, targetGan) {
    var dw = GAN_WX[dayGan], tw = GAN_WX[targetGan];
    var same = GAN_YANG[dayGan] === GAN_YANG[targetGan];
    if (dw === tw) return same ? '比肩' : '劫财';
    if (SHENG[dw] === tw) return same ? '食神' : '伤官';
    if (KE[dw] === tw) return same ? '偏财' : '正财';
    if (KE[tw] === dw) return same ? '七杀' : '正官';
    if (SHENG[tw] === dw) return same ? '偏印' : '正印';
    return '—';
  }
  var SHISHEN_WX = {
    比肩: 'same', 劫财: 'same', 食神: 'out', 伤官: 'out',
    偏财: 'wealth', 正财: 'wealth', 七杀: 'officer', 正官: 'officer',
    偏印: 'in', 正印: 'in'
  };

  /* 60 甲子 */
  function gzIndex(gz) {
    var g = GAN.indexOf(gz.charAt(0)), z = ZHI.indexOf(gz.charAt(1));
    for (var i = 0; i < 60; i++) if (i % 10 === g && i % 12 === z) return i;
    return 0;
  }
  function gzFromIndex(i) { i = ((i % 60) + 60) % 60; return GAN[i % 10] + ZHI[i % 12]; }

  /* ---------- 六十甲子纳音（两干一支为一组，共三十组） ---------- */
  var NAYIN = [
    '海中金', '炉中火', '大林木', '路旁土', '剑锋金', '山头火',
    '涧下水', '城头土', '白蜡金', '杨柳木', '泉中水', '屋上土',
    '霹雳火', '松柏木', '长流水', '沙中金', '山下火', '平地木',
    '壁上土', '金箔金', '覆灯火', '天河水', '大驿土', '钗钏金',
    '桑柘木', '大溪水', '沙中土', '天上火', '石榴木', '大海水'
  ];
  /* 纳音五行：由名末字取 */
  var NAYIN_WX = {
    金: '金', 火: '火', 木: '木', 水: '水', 土: '土'
  };
  function naYin(gz) {
    var i = gzIndex(gz);
    var name = NAYIN[Math.floor(i / 2)];
    return { name: name, wx: NAYIN_WX[name.charAt(name.length - 1)] || '' };
  }

  /* ---------- 旬空（空亡） ---------- */
  var XUN_SHOU = ['甲子', '甲戌', '甲申', '甲午', '甲辰', '甲寅'];
  var XUN_KONG = [['戌', '亥'], ['申', '酉'], ['午', '未'], ['辰', '巳'], ['寅', '卯'], ['子', '丑']];
  function xunKong(gz) {
    var i = gzIndex(gz);
    var n = Math.floor(i / 10);
    return { xun: XUN_SHOU[n], kong: XUN_KONG[n].slice() };
  }

  /* ---------- 神煞 ---------- */
  /* 三合局：0 申子辰　1 寅午戌　2 巳酉丑　3 亥卯未 */
  function sanHe(zhi) {
    if ('申子辰'.indexOf(zhi) !== -1) return 0;
    if ('寅午戌'.indexOf(zhi) !== -1) return 1;
    if ('巳酉丑'.indexOf(zhi) !== -1) return 2;
    if ('亥卯未'.indexOf(zhi) !== -1) return 3;
    return -1;
  }
  var YI_MA = ['寅', '申', '亥', '巳'];        // 驿马
  var TAO_HUA = ['酉', '卯', '午', '子'];      // 桃花（咸池）
  var HUA_GAI = ['辰', '戌', '丑', '未'];      // 华盖
  var JIANG_XING = ['子', '午', '酉', '卯'];   // 将星
  var YUE_DE = ['壬', '丙', '庚', '甲'];       // 月德（依三合局序）

  /* 以日干取：贵人、文昌、禄、刃、金舆、国印 */
  var GAN_TABLE = {
    tianYi: { 甲: '丑未', 乙: '子申', 丙: '亥酉', 丁: '亥酉', 戊: '丑未', 己: '子申', 庚: '丑未', 辛: '午寅', 壬: '卯巳', 癸: '卯巳' },
    wenChang: { 甲: '巳', 乙: '午', 丙: '申', 丁: '酉', 戊: '申', 己: '酉', 庚: '亥', 辛: '子', 壬: '寅', 癸: '卯' },
    luShen: { 甲: '寅', 乙: '卯', 丙: '巳', 丁: '午', 戊: '巳', 己: '午', 庚: '申', 辛: '酉', 壬: '亥', 癸: '子' },
    yangRen: { 甲: '卯', 乙: '辰', 丙: '午', 丁: '未', 戊: '午', 己: '未', 庚: '酉', 辛: '戌', 壬: '子', 癸: '丑' },
    jinYu: { 甲: '辰', 乙: '巳', 丙: '未', 丁: '申', 戊: '未', 己: '申', 庚: '戌', 辛: '亥', 壬: '丑', 癸: '寅' },
    taiJi: { 甲: '子午', 乙: '子午', 丙: '卯酉', 丁: '卯酉', 戊: '辰戌丑未', 己: '辰戌丑未', 庚: '寅亥', 辛: '寅亥', 壬: '巳申', 癸: '巳申' },
    guoYin: { 甲: '戌', 乙: '亥', 丙: '丑', 丁: '寅', 戊: '丑', 己: '寅', 庚: '辰', 辛: '巳', 壬: '未', 癸: '申' }
  };
  /* 以月支取：天德（可为天干或地支） */
  var TIAN_DE = { 寅: '丁', 卯: '申', 辰: '壬', 巳: '辛', 午: '亥', 未: '甲', 申: '癸', 酉: '寅', 戌: '丙', 亥: '乙', 子: '巳', 丑: '庚' };
  /* 孤辰寡宿：以年支分四组 */
  var GU_GUA = {
    亥: ['寅', '戌'], 子: ['寅', '戌'], 丑: ['寅', '戌'],
    寅: ['巳', '丑'], 卯: ['巳', '丑'], 辰: ['巳', '丑'],
    巳: ['申', '辰'], 午: ['申', '辰'], 未: ['申', '辰'],
    申: ['亥', '未'], 酉: ['亥', '未'], 戌: ['亥', '未']
  };
  /* 日柱专属 */
  var YIN_CHA = '丙子 丁丑 戊寅 辛卯 壬辰 癸巳 丙午 丁未 戊申 辛酉 壬戌 癸亥'.split(' ');
  var SHI_E = '甲辰 乙巳 丙申 丁亥 戊戌 己丑 庚辰 辛巳 壬申 癸亥'.split(' ');
  var TIAN_SHE = { 春: '戊寅', 夏: '甲午', 秋: '戊申', 冬: '甲子' };

  /* 返回命局神煞清单 */
  function shenSha(o) {
    var P = o.pillars;
    var keys = ['year', 'month', 'day', 'hour'];
    var LAB = { year: '年', month: '月', day: '日', hour: '时' };
    var zhis = keys.map(function (k) { return P[k].zhi; });
    var gans = keys.map(function (k) { return P[k].gan; });
    var out = [];

    function hitZhi(targets) {
      var h = [];
      keys.forEach(function (k, i) { if (targets.indexOf(zhis[i]) !== -1) h.push(LAB[k] + '支' + zhis[i]); });
      return h;
    }
    function hitGan(targets) {
      var h = [];
      keys.forEach(function (k, i) { if (targets.indexOf(gans[i]) !== -1) h.push(LAB[k] + '干' + gans[i]); });
      return h;
    }
    function push(name, tone, hits, rule, desc) {
      if (hits && hits.length) out.push({ name: name, tone: tone, hits: hits, rule: rule, desc: desc });
    }

    var dg = o.dayGan, yz = o.yearZhi, mz = o.monthZhi, dz = P.day.zhi;
    var g = sanHe(yz), gd = sanHe(dz);

    /* 以日干取 */
    push('天乙贵人', 'ji', hitZhi(GAN_TABLE.tianYi[dg].split('')),
      '日干' + dg + '见' + GAN_TABLE.tianYi[dg], '命中第一吉神，主逢凶化吉、遇难有救，一生多得贵人提携。');
    push('文昌贵人', 'ji', hitZhi(GAN_TABLE.wenChang[dg].split('')),
      '日干' + dg + '见' + GAN_TABLE.wenChang[dg], '主聪慧好学、文思敏捷，利考试文书、著述扬名。');
    push('太极贵人', 'ji', hitZhi(GAN_TABLE.taiJi[dg].split('')),
      '日干' + dg + '见' + GAN_TABLE.taiJi[dg], '主好学深思、通达玄理，于术数、哲理、宗教有宿缘。');
    push('国印贵人', 'ji', hitZhi(GAN_TABLE.guoYin[dg].split('')),
      '日干' + dg + '见' + GAN_TABLE.guoYin[dg], '主掌印掌权，利公职、仕途与名誉。');
    push('禄神', 'ji', hitZhi(GAN_TABLE.luShen[dg].split('')),
      '日干' + dg + '禄在' + GAN_TABLE.luShen[dg], '主衣禄丰足、身体康健，自立自强，宜自食其力。');
    push('金舆', 'ji', hitZhi(GAN_TABLE.jinYu[dg].split('')),
      '日干' + dg + '见' + GAN_TABLE.jinYu[dg], '主婚姻美满、得配偶之助，出行多乘车马之利。');
    push('羊刃', 'xiong', hitZhi(GAN_TABLE.yangRen[dg].split('')),
      '日干' + dg + '刃在' + GAN_TABLE.yangRen[dg], '性刚果决、行动力强，宜武职、技术、竞技；忌冲动争斗，防血光破财。');

    /* 以年支（兼日支）取 */
    var gs = gd >= 0 && gd !== g ? [g, gd] : [g];
    function bySanHe(arr) {
      var t = [];
      gs.forEach(function (x) { var z = arr[x]; if (t.indexOf(z) === -1) t.push(z); });
      return t;
    }
    push('驿马', 'zhong', hitZhi(bySanHe(YI_MA)),
      '年支' + yz + '之三合局见' + bySanHe(YI_MA).join(''), '主奔波走动、离乡发展，宜外务、贸易、运输、差旅之职。');
    push('桃花', 'zhong', hitZhi(bySanHe(TAO_HUA)),
      '年支' + yz + '之三合局见' + bySanHe(TAO_HUA).join(''), '主人缘异性缘佳、容貌出众，利文艺交际；过则易生感情纠葛。');
    push('华盖', 'zhong', hitZhi(bySanHe(HUA_GAI)),
      '年支' + yz + '之三合局见' + bySanHe(HUA_GAI).join(''), '主孤高清雅、慧根深厚，宜艺术、学术、宗教；亦主性情孤独。');
    push('将星', 'ji', hitZhi(bySanHe(JIANG_XING)),
      '年支' + yz + '之三合局见' + bySanHe(JIANG_XING).join(''), '主统御之才、决断之力，宜掌权任事、领军带队。');

    /* 以年支取 */
    var gg = GU_GUA[yz];
    if (gg) {
      push('孤辰', 'xiong', hitZhi([gg[0]]), '年支' + yz + '见' + gg[0], '主性情孤僻、六亲缘薄，宜修身自立，忌自陷寂寥。');
      push('寡宿', 'xiong', hitZhi([gg[1]]), '年支' + yz + '见' + gg[1], '主与配偶聚少离多、晚婚为宜，宜以事业与志趣相济。');
    }
    var hl = ZHI[(3 - ZHI.indexOf(yz) + 12) % 12];
    var tx = ZHI[(ZHI.indexOf(hl) + 6) % 12];
    push('红鸾', 'ji', hitZhi([hl]), '年支' + yz + '见' + hl, '主婚喜之事，逢之易有嫁娶、添丁、情缘之庆。');
    push('天喜', 'ji', hitZhi([tx]), '年支' + yz + '见' + tx, '主喜庆盈门，逢之多有喜事临门、心情畅达。');

    /* 以月支取 */
    var td = TIAN_DE[mz];
    if (td) {
      var tdh = GAN.indexOf(td) !== -1 ? hitGan([td]) : hitZhi([td]);
      push('天德贵人', 'ji', tdh, '月支' + mz + '见' + td, '主德厚福深、逢凶化吉，一生少有大灾，宜行善积德。');
    }
    var yd = YUE_DE[sanHe(mz)];
    push('月德贵人', 'ji', hitGan([yd]), '月支' + mz + '之三合局见' + yd, '主慈祥厚道、得神明护佑，遇险有救、遇难成祥。');

    /* 日柱专属 */
    if (YIN_CHA.indexOf(o.gz.day) !== -1) {
      out.push({ name: '阴差阳错', tone: 'xiong', hits: ['日柱' + o.gz.day], rule: '日柱为' + o.gz.day, desc: '主婚姻多波折，与姻亲缘薄，宜晚婚并多沟通体谅。' });
    }
    if (SHI_E.indexOf(o.gz.day) !== -1) {
      out.push({ name: '十恶大败', tone: 'xiong', hits: ['日柱' + o.gz.day], rule: '日柱为' + o.gz.day, desc: '主钱财易散、须防破耗，宜勤俭持家、稳健理财。' });
    }
    var season = ('寅卯辰'.indexOf(mz) !== -1) ? '春' : ('巳午未'.indexOf(mz) !== -1) ? '夏'
      : ('申酉戌'.indexOf(mz) !== -1) ? '秋' : '冬';
    if (TIAN_SHE[season] === o.gz.day) {
      out.push({ name: '天赦', tone: 'ji', hits: ['日柱' + o.gz.day], rule: season + '月见' + TIAN_SHE[season], desc: '天赦之日，百灾自解，主逢凶化吉、得宽宥之福。' });
    }

    return out;
  }

  /* ---------- 流月 / 流日 ---------- */
  /* 五虎遁：由年干定正月（寅）之天干 */
  function monthGZ(yearGan, mIdx) {
    var g0 = (GAN.indexOf(yearGan) % 5) * 2 + 2;   // 正月天干序
    var gi = (g0 + mIdx) % 10;
    var zi = (2 + mIdx) % 12;                      // 寅起
    return GAN[gi] + ZHI[zi];
  }
  /* 流年（干支年）之十二个月 */
  function liuYue(yearGz, xi, ji) {
    var yg = yearGz.charAt(0);
    var out = [];
    var NAME = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'];
    for (var i = 0; i < 12; i++) {
      var gz = monthGZ(yg, i);
      var sc = scoreGZ(gz, xi, ji);
      out.push({
        i: i, name: NAME[i] + '月', gz: gz,
        gan: gz.charAt(0), zhi: gz.charAt(1),
        ganWx: GAN_WX[gz.charAt(0)], zhiWx: L.ZHI_WUXING[gz.charAt(1)],
        score: sc.score, tone: sc.tone,
        naYin: naYin(gz).name
      });
    }
    return out;
  }
  /* 某日之干支与评分 */
  function liuRi(date, xi, ji) {
    var f = L.fromDate(date, { yearFirst: 'lichun', ziRollover: true });
    var gz = f.gz.day;
    var sc = scoreGZ(gz, xi, ji);
    var mk = xunKong(gz);
    return {
      gz: gz, gan: gz.charAt(0), zhi: gz.charAt(1),
      ganWx: GAN_WX[gz.charAt(0)], zhiWx: L.ZHI_WUXING[gz.charAt(1)],
      score: sc.score, tone: sc.tone,
      naYin: naYin(gz).name, xun: mk.xun, kong: mk.kong,
      monthGz: f.gz.month, yearGz: f.gz.year,
      lunar: f.lunar, solar: f.input
    };
  }

  /* 节气：n 为 1..24，奇数 n 为「节」（月建之始） */
  function termDay(year, n) {
    var d = SL.getTerm(year, n);
    return d > 0 ? d : 0;
  }
  function termDate(year, n) {
    var d = termDay(year, n);
    if (!d) return null;
    return new Date(year, Math.floor((n - 1) / 2), d, 12, 0);
  }
  /* 取某年前后三年内的全部「节」 */
  function jieList(year) {
    var out = [];
    for (var y = year - 1; y <= year + 1; y++) {
      for (var n = 1; n <= 24; n += 2) {
        var t = termDate(y, n);
        if (t) out.push(t);
      }
    }
    out.sort(function (a, b) { return a - b; });
    return out;
  }

  /* ---------- 排盘 ---------- */
  function pan(date, gender) {
    var f = L.fromDate(date, { yearFirst: 'lichun', ziRollover: true });

    /* 四柱：年柱用立春换年，月柱用节气月，日柱用干支日，时柱用五鼠遁 */
    var gz = {
      year: f.gz.year,
      month: f.gz.month,
      day: f.gz.day,
      hour: f.gz.hour
    };
    var dayGan = gz.day.charAt(0);
    var dayWx = GAN_WX[dayGan];

    var keys = ['year', 'month', 'day', 'hour'];
    var pillars = {};
    keys.forEach(function (k) {
      var g = gz[k].charAt(0), z = gz[k].charAt(1);
      pillars[k] = {
        gz: gz[k], gan: g, zhi: z,
        ganWx: GAN_WX[g], zhiWx: L.ZHI_WUXING[z],
        ganSS: k === 'day' ? '日主' : shiShen(dayGan, g),
        zhiSS: shiShen(dayGan, CANG[z][0][0]),
        cang: CANG[z].map(function (c) {
          return { gan: c[0], wx: GAN_WX[c[0]], w: c[1], ss: shiShen(dayGan, c[0]) };
        })
      };
    });

    /* ---------- 五行力量 ---------- */
    var wxPower = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
    var wxCount = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };

    // 天干（日干为我，不计入力量）
    ['year', 'month', 'hour'].forEach(function (k) {
      wxPower[pillars[k].ganWx] += W_GAN[k];
      wxCount[pillars[k].ganWx] += 1;
    });
    wxCount[dayWx] += 1;

    // 地支及其藏干
    ['year', 'month', 'day', 'hour'].forEach(function (k) {
      var z = pillars[k].zhi, total = W_ZHI[k];
      CANG[z].forEach(function (c) {
        wxPower[GAN_WX[c[0]]] += total * c[1];
      });
      wxCount[L.ZHI_WUXING[z]] += 1;
    });

    var wxTotal = 0;
    for (var k2 in wxPower) wxTotal += wxPower[k2];

    /* ---------- 日主强弱 ---------- */
    var yinWx = revSheng(dayWx);     // 印（生我）
    var guanWx = revKe(dayWx);       // 官杀（克我）
    var shiWx = SHENG[dayWx];        // 食伤（我生）
    var caiWx = KE[dayWx];           // 财（我克）

    var tongDang = wxPower[yinWx] + wxPower[dayWx];
    var yiDang = wxPower[shiWx] + wxPower[caiWx] + wxPower[guanWx];
    var ratio = tongDang / (tongDang + yiDang || 1);

    var level, levelKey;
    if (ratio >= 0.56) { level = '身强'; levelKey = 'qiang'; }
    else if (ratio >= 0.45) { level = '中和'; levelKey = 'zhong'; }
    else { level = '身弱'; levelKey = 'ruo'; }

    // 得令 / 得地 / 得势
    function shareOf(keysArr, type) {
      var same = 0, all = 0;
      keysArr.forEach(function (k) {
        if (type === 'gan') {
          var w = W_GAN[k], wx = pillars[k].ganWx;
          all += w;
          if (wx === dayWx || wx === yinWx) same += w;
        } else {
          var t = W_ZHI[k];
          CANG[pillars[k].zhi].forEach(function (c) {
            var w2 = t * c[1], wx2 = GAN_WX[c[0]];
            all += w2;
            if (wx2 === dayWx || wx2 === yinWx) same += w2;
          });
        }
      });
      return all ? same / all : 0;
    }
    var deLing = shareOf(['month'], 'zhi');
    var deDi = shareOf(['day', 'year', 'hour'], 'zhi');
    var deShi = shareOf(['year', 'month', 'hour'], 'gan');

    /* ---------- 喜用神 ---------- */
    var allWx = ['木', '火', '土', '金', '水'];
    var xi = [], ji = [], methodNote = '';
    if (levelKey === 'ruo') {
      xi = [yinWx, dayWx];
      ji = [shiWx, caiWx, guanWx];
      methodNote = '日主偏弱，宜生扶：取印星生身、比劫帮身。';
    } else if (levelKey === 'qiang') {
      xi = [shiWx, caiWx, guanWx];
      ji = [yinWx, dayWx];
      methodNote = '日主偏强，宜克泄耗：取食伤泄秀、财星耗身、官杀制身。';
    } else {
      var sorted = allWx.slice().sort(function (a, b) { return wxPower[a] - wxPower[b]; });
      xi = sorted.slice(0, 2);
      ji = sorted.slice(-2);
      methodNote = '日主中和，宜补不足、损有余。';
    }
    // 去重（身弱时 印 与 比劫 可能同五行？不可能；但中和分支可能重复，已用 slice 避免）
    xi = xi.filter(function (v, i, a) { return v && a.indexOf(v) === i; });
    ji = ji.filter(function (v, i, a) { return v && a.indexOf(v) === i && xi.indexOf(v) === -1; });

    // 调候：冬生喜火暖局，夏生喜水润局。调候神优先于扶抑，故并入喜神并从忌神中剔除。
    var monthZhi = pillars.month.zhi;
    var tiaohou = null, tiaoMerged = false;
    if (['亥', '子', '丑'].indexOf(monthZhi) !== -1) tiaohou = '火';
    else if (['巳', '午', '未'].indexOf(monthZhi) !== -1) tiaohou = '水';
    if (tiaohou && xi.indexOf(tiaohou) === -1) {
      xi.unshift(tiaohou);
      ji = ji.filter(function (v) { return v !== tiaohou; });
      tiaoMerged = true;
      methodNote += '生月寒暑偏颇，' + tiaohou + '为调候所急，已并入喜神。';
    }

    // 主用神：喜神中当前力量最弱者（补其不足）
    var zhuYong = xi.slice().sort(function (a, b) { return wxPower[a] - wxPower[b]; })[0];

    /* ---------- 大运 ---------- */
    var yearGanYang = GAN_YANG[gz.year.charAt(0)] === 1;
    var isMale = gender === '男';
    var forward = (yearGanYang && isMale) || (!yearGanYang && !isMale);

    var jies = jieList(date.getFullYear());
    var nextJie = null, prevJie = null;
    for (var i = 0; i < jies.length; i++) {
      if (jies[i] > date && !nextJie) nextJie = jies[i];
      if (jies[i] <= date) prevJie = jies[i];
    }
    var diffDays = forward
      ? (nextJie ? (nextJie - date) / 86400000 : 0)
      : (prevJie ? (date - prevJie) / 86400000 : 0);
    var startAgeExact = diffDays / 3;                       // 3 日折 1 岁
    var startAge = Math.floor(startAgeExact);
    var startMonth = Math.round((startAgeExact - startAge) * 12);

    var monthIdx = gzIndex(gz.month);
    var dayun = [];
    for (var n2 = 1; n2 <= 9; n2++) {
      var gi = monthIdx + (forward ? n2 : -n2);
      var g = gzFromIndex(gi);
      var sAge = +(startAgeExact + (n2 - 1) * 10).toFixed(1);
      var eAge = +(startAgeExact + n2 * 10).toFixed(1);
      var sc = scoreGZ(g, xi, ji);
      dayun.push({
        n: n2, gz: g, gan: g.charAt(0), zhi: g.charAt(1),
        ganWx: GAN_WX[g.charAt(0)], zhiWx: L.ZHI_WUXING[g.charAt(1)],
        ganSS: shiShen(dayGan, g.charAt(0)),
        zhiSS: shiShen(dayGan, CANG[g.charAt(1)][0][0]),
        startAge: sAge, endAge: eAge,
        startYear: date.getFullYear() + Math.floor(sAge),
        endYear: date.getFullYear() + Math.ceil(eAge) - 1,
        score: sc.score, tone: sc.tone
      });
    }

    /* ---------- 流年（0–90 岁） ---------- */
    var birthYear = date.getFullYear();
    var liunian = [];
    for (var age = 0; age <= 90; age++) {
      var yr = birthYear + age;
      var yIdx = ((yr - 4) % 60 + 60) % 60;
      var ygz = GAN[yIdx % 10] + ZHI[yIdx % 12];
      var ysc = scoreGZ(ygz, xi, ji);
      // 归属大运
      var dy = null;
      for (var m = 0; m < dayun.length; m++) {
        if (age >= dayun[m].startAge && age < dayun[m].endAge) { dy = dayun[m]; break; }
      }
      // 运势 = 大运为体（六成二）、流年为用（三成八）；未起运时纯以流年论
      var blended = dy
        ? Math.round(dy.score * 0.62 + ysc.score * 0.38)
        : ysc.score;
      blended = Math.max(4, Math.min(96, blended));
      liunian.push({
        age: age, year: yr, gz: ygz,
        ganWx: GAN_WX[ygz.charAt(0)], zhiWx: L.ZHI_WUXING[ygz.charAt(1)],
        score: blended, lnScore: ysc.score,
        tone: blended >= 68 ? 'ji' : (blended >= 46 ? 'ping' : 'xiong'),
        dayun: dy ? dy.gz : '—',
        dayunN: dy ? dy.n : 0
      });
    }

    /* ---------- 纳音 / 空亡 / 神煞 ---------- */
    var nayin = {};
    keys.forEach(function (k) { nayin[k] = naYin(gz[k]); });

    var kong = { day: xunKong(gz.day), year: xunKong(gz.year) };
    var kongSet = {};
    kong.day.kong.forEach(function (z) { kongSet[z] = '日空'; });
    kong.year.kong.forEach(function (z) { if (!kongSet[z]) kongSet[z] = '年空'; });

    var shensha = shenSha({
      pillars: pillars, dayGan: dayGan, gz: gz,
      yearZhi: pillars.year.zhi, monthZhi: pillars.month.zhi
    });

    /* ---------- 简评 ---------- */
    var summary = buildSummary({
      dayGan: dayGan, dayWx: dayWx, monthZhi: monthZhi,
      level: level, ratio: ratio, xi: xi, ji: ji, zhuYong: zhuYong,
      tiaohou: tiaohou, wxPower: wxPower, deLing: deLing, deDi: deDi, deShi: deShi,
      tongDang: tongDang, yiDang: yiDang, gender: gender
    });

    return {
      input: { date: date, gender: gender, solar: f.input },
      lunar: f.lunar,
      gz: gz,
      pillars: pillars,
      dayGan: dayGan, dayWx: dayWx,
      wxPower: wxPower, wxCount: wxCount, wxTotal: wxTotal,
      strength: {
        tongDang: tongDang, yiDang: yiDang, ratio: ratio,
        level: level, levelKey: levelKey,
        deLing: deLing, deDi: deDi, deShi: deShi
      },
      yong: { xi: xi, ji: ji, zhu: zhuYong, tiaohou: tiaohou, tiaoMerged: tiaoMerged, note: methodNote },
      dayun: dayun, liunian: liunian,
      forward: forward, startAge: startAge, startMonth: startMonth,
      startAgeExact: startAgeExact,
      nayin: nayin, kong: kong, kongSet: kongSet, shensha: shensha,
      summary: summary,
      rel: { yin: yinWx, guan: guanWx, shi: shiWx, cai: caiWx }
    };
  }

  /* 干支运势评分：以喜忌五行为准，天干权重 0.36、地支权重 0.64 */
  function scoreGZ(gz, xi, ji) {
    var gWx = GAN_WX[gz.charAt(0)], zWx = L.ZHI_WUXING[gz.charAt(1)];
    var s = 50;
    [[gWx, 18], [zWx, 32]].forEach(function (p) {
      if (xi.indexOf(p[0]) !== -1) s += p[1];
      else if (ji.indexOf(p[0]) !== -1) s -= p[1];
    });
    s = Math.max(4, Math.min(96, Math.round(s)));
    var tone = s >= 68 ? 'ji' : (s >= 46 ? 'ping' : 'xiong');
    return { score: s, tone: tone };
  }

  function buildSummary(o) {
    var t = [];
    t.push('日主' + o.dayGan + '（' + o.dayWx + '），生于' + o.monthZhi + '月。');
    t.push('同党' + o.tongDang.toFixed(2) + '、异党' + o.yiDang.toFixed(2) +
      '，占比 ' + (o.ratio * 100).toFixed(1) + '%，判为' + o.level + '。');
    t.push('得令 ' + (o.deLing * 100).toFixed(0) + '%、得地 ' + (o.deDi * 100).toFixed(0) +
      '%、得势 ' + (o.deShi * 100).toFixed(0) + '%。');
    t.push('喜 ' + o.xi.join('、') + '，忌 ' + o.ji.join('、') + '，主用神取 ' + o.zhuYong + '。');
    if (o.tiaohou) t.push('生月寒暑偏颇，' + o.tiaohou + '为调候所急。');
    t.push(o.level === '身弱'
      ? '一生宜借力而行，得贵人（印）与同辈（比劫）之助则事半功倍；忌一味承担、独自硬扛。'
      : o.level === '身强'
        ? '一生能量充沛，宜主动输出与承担，凭才华（食伤）、财富（财）、责任（官杀）成就；忌固执自专。'
        : '命局较为平衡，行运所至即为吉凶所系，宜顺势而为。');
    return t.join('');
  }

  TJ.bazi = {
    pan: pan,
    shiShen: shiShen,
    GAN_WX: GAN_WX,
    GAN_YANG: GAN_YANG,
    ZHI_YANG: ZHI_YANG,
    CANG: CANG,
    gzIndex: gzIndex,
    gzFromIndex: gzFromIndex,
    scoreGZ: scoreGZ,
    naYin: naYin,
    xunKong: xunKong,
    shenSha: shenSha,
    monthGZ: monthGZ,
    liuYue: liuYue,
    liuRi: liuRi,
    SAN_HE: sanHe,
    WX_COLOR: { 木: '#8ec77a', 火: '#e0766a', 土: '#d3ab44', 金: '#e6d9ae', 水: '#7aa8de' }
  };
})();
