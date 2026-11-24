#!/usr/bin/env node
/**
 * 자미두수 명반 CLI. 배반은 iztro, 한국 음력 대조는 manseryeok.
 * bySolar는 양력을 lunar-lite(중국력)로 다시 바꿔 월·일 인덱스와 주성 배치에 쓴다.
 * 한국 음력 기준 명반을 보장하지 않음. 한·중이 갈리는 날은 calendars.diverge=true.
 *
 * 예:
 *   node scripts/ziwei-calc.mjs --date 2027-02-07 --time 12:00 --gender female
 *   node scripts/ziwei-calc.mjs --date 2027-01-01 --time 12:00 --calendar lunar --gender female
 */
import { astro, util } from 'iztro';
import {
  LIB_VERSIONS,
  parseArgs,
  parseDate,
  parseTime,
  normalizeGender,
  formatYmd,
  timeToIndex,
  koreanSolarFromLunar,
  lunarComparison,
} from './lib.mjs';

function usage() {
  return `사용법: node scripts/ziwei-calc.mjs --date YYYY-MM-DD --time HH:MM --gender male|female [옵션]
  --calendar solar|lunar
  --leap
  --hour-unknown           시간 모름. 명반을 만들지 않고 분석 제한만 반환
  --assume-noon            시간 모를 때 오시(12:00) 가정 명반. 반드시 제한 문구가 붙음
  --language ko-KR
  --algorithm zhongzhou    기본 zhongzhou (중주파)
  --no-fix-leap            윤달 전후반 분할 끄기 (기본은 켬)
`;
}

function starBrief(s) {
  if (!s) return null;
  return {
    name: s.name,
    type: s.type,
    brightness: s.brightness || undefined,
    mutagen: s.mutagen || undefined,
  };
}

function palaceBrief(p) {
  return {
    index: p.index,
    name: p.name,
    heavenlyStem: p.heavenlyStem,
    earthlyBranch: p.earthlyBranch,
    isMing: p.name === '명궁',
    isShen: Boolean(p.isBodyPalace),
    majorStars: (p.majorStars || []).map(starBrief),
    minorStars: (p.minorStars || []).map(starBrief),
    decadal: p.decadal || null,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) {
    process.stdout.write(usage());
    return;
  }
  if (!args.date) throw new Error(usage());
  const gender = args.gender ? normalizeGender(args.gender) : null;
  const timeUnknown = Boolean(args['hour-unknown']);
  const assumeNoon = Boolean(args['assume-noon']);
  if (timeUnknown && !assumeNoon) {
    const solarTry = parseDate(args.date);
    const out = {
      ok: true,
      engine: {
        library: 'iztro',
        version: LIB_VERSIONS.iztro,
        license: 'MIT',
        language: args.language || 'ko-KR',
      },
      limitations: [
        '출생 시간이 없어 명궁·주성 배치를 계산하지 않았다. 시진이 명반을 가른다. --assume-noon 은 참고용 가정일 뿐이고 단정에 쓰면 안 된다.',
      ],
      input: { date: args.date, time: null, gender },
    };
    process.stdout.write(JSON.stringify(out, null, 2) + '\n');
    return;
  }
  if (!args.time && !assumeNoon) throw new Error('--time HH:MM 또는 --hour-unknown/--assume-noon 이 필요해.\n' + usage());
  if (!gender) throw new Error('--gender male|female 이 필요해. 대운 방향에 쓰인다.');

  const calendar = String(args.calendar || 'solar').toLowerCase();
  const isLunar = calendar === 'lunar';
  let date = parseDate(args.date);
  const inputLunar = isLunar
    ? { year: date.year, month: date.month, day: date.day, isLeapMonth: Boolean(args.leap) }
    : null;
  if (isLunar) {
    const solar = koreanSolarFromLunar(date.year, date.month, date.day, Boolean(args.leap));
    date = { year: solar.year, month: solar.month, day: solar.day };
  }
  const time = args.time ? parseTime(args.time) : { hour: 12, minute: 0 };
  const solarIso = formatYmd(date.year, date.month, date.day);
  const tIndex = timeToIndex(time.hour, time.minute);
  const language = args.language || 'ko-KR';
  const algorithm = args.algorithm || 'zhongzhou';
  const fixLeap = !args['no-fix-leap'];

  if (typeof astro.config === 'function') {
    astro.config({ algorithm, language });
  } else if (typeof astro.setLanguage === 'function') {
    astro.setLanguage(language);
  }

  // 중요: byLunar는 lunar-lite로 양력을 만들기 때문에 한국 음력 입력에 쓰면 안 된다.
  // 한국 음력은 위에서 manseryeok lunarToSolar로 양력을 구한 뒤 bySolar만 부른다.
  const plate = astro.bySolar(solarIso, tIndex, gender, fixLeap, language);
  const calendars = lunarComparison({ year: date.year, month: date.month, day: date.day, iso: solarIso });

  const palaces = (plate.palaces || []).map(palaceBrief);
  const ming = palaces.find((p) => p.isMing) || null;
  const shen = palaces.find((p) => p.isShen) || null;

  let yearStem = null;
  const cd = plate.chineseDate;
  if (typeof cd === 'string') yearStem = cd.trim().slice(0, 1);
  const sihua = yearStem && typeof util.getMutagensByHeavenlyStem === 'function'
    ? util.getMutagensByHeavenlyStem(yearStem)
    : null;

  let horoscope = null;
  const target = args['horoscope-date'];
  if (target && typeof plate.horoscope === 'function') {
    try {
      const h = plate.horoscope(target);
      horoscope = {
        solarDate: h.solarDate,
        lunarDate: h.lunarDate,
        decadal: h.decadal ? { name: h.decadal.name, heavenlyStem: h.decadal.heavenlyStem, earthlyBranch: h.decadal.earthlyBranch, mutagen: h.decadal.mutagen } : null,
        yearly: h.yearly ? { heavenlyStem: h.yearly.heavenlyStem, earthlyBranch: h.yearly.earthlyBranch, mutagen: h.yearly.mutagen } : null,
        monthly: h.monthly ? { heavenlyStem: h.monthly.heavenlyStem, earthlyBranch: h.monthly.earthlyBranch } : null,
        note: '유년·유월은 확장 관점이다. 시기 본선은 사주 세운·월운. 별 하나로 사건을 단정하지 말 것.',
      };
    } catch (e) {
      horoscope = { error: e.message };
    }
  }

  const limitations = [];
  if (assumeNoon && (!args.time || timeUnknown)) {
    limitations.push('오시(12:00) 가정 명반이다. 실제 시진이 다르면 명궁·주성이 바뀐다. 단정에 쓰지 말 것.');
  }
  if (calendars.diverge) {
    limitations.push('분석 제한: 이 양력일의 한국 음력과 iztro(lunar-lite) 음력이 다르다. 명반 월·일·주성 배치는 한국 월력이 아니라 lunar-lite 기준이다. 한국 음력 기준 명반이라고 쓰지 말 것.');
  } else {
    limitations.push('명반 월·일 인덱스는 iztro가 양력을 lunar-lite로 다시 환산한 값이다. 한국어 표시만으로 한국 음력 명반이 되는 것은 아니다.');
  }

  const out = {
    ok: true,
    engine: {
      library: 'iztro',
      version: LIB_VERSIONS.iztro,
      license: 'MIT',
      language,
      algorithm,
      fixLeap,
      by: 'bySolar',
      calendarBasis:
        '양력(한국 음력 입력이면 manseryeok KASI로 변환한 양력)을 bySolar에 넣음. 이후 월·일 인덱스는 lunar-lite(중국력)로 재환산됨.',
    },
    input: {
      calendar: isLunar ? 'lunar' : 'solar',
      date: args.date,
      lunar: inputLunar,
      time: `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`,
      timeIndex: tIndex,
      gender,
    },
    solar: { year: date.year, month: date.month, day: date.day, iso: solarIso },
    calendars,
    iztroLunarDateDisplay: plate.lunarDate,
    chineseDate: plate.chineseDate,
    soul: plate.soul,
    body: plate.body,
    earthlyBranchOfSoulPalace: plate.earthlyBranchOfSoulPalace,
    earthlyBranchOfBodyPalace: plate.earthlyBranchOfBodyPalace,
    fiveElementsClass: plate.fiveElementsClass,
    mingPalace: ming,
    shenPalace: shen,
    palaces,
    sihuaByYearStem: sihua,
    horoscope,
    limitations,
  };
  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
}

try {
  main();
} catch (err) {
  process.stderr.write(JSON.stringify({ ok: false, error: err.message }) + '\n');
  process.exit(1);
}
