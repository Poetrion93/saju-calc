#!/usr/bin/env node
/**
 * 사주팔자 계산 CLI. 계산은 manseryeok(KASI 절기·음력)만 쓰고, LLM은 쓰지 않음.
 *
 * 예:
 *   node scripts/saju-calc.mjs --date 1992-10-24 --time 05:30 --gender male
 *   node scripts/saju-calc.mjs --date 2027-01-01 --time 12:00 --calendar lunar --fortune-year 2027
 */
import {
  calculateFourPillars,
  getSolarTerm,
  getSolarTermsOfYear,
} from 'manseryeok';
import {
  LIB_VERSIONS,
  DEFAULT_DAY_BOUNDARY,
  parseArgs,
  parseDate,
  parseTime,
  normalizeGender,
  formatYmd,
  kstFromUtcDate,
  koreanLunarFromSolar,
  koreanSolarFromLunar,
  lunarComparison,
  trueSolarOption,
  pillarPlain,
  countElements,
} from './lib.mjs';

const MONTH_TERM_INDEX = [
  { index: 2, name: '입춘', monthName: '인월' },
  { index: 4, name: '경칩', monthName: '묘월' },
  { index: 6, name: '청명', monthName: '진월' },
  { index: 8, name: '입하', monthName: '사월' },
  { index: 10, name: '망종', monthName: '오월' },
  { index: 12, name: '소서', monthName: '미월' },
  { index: 14, name: '입추', monthName: '신월' },
  { index: 16, name: '백로', monthName: '유월' },
  { index: 18, name: '한로', monthName: '술월' },
  { index: 20, name: '입동', monthName: '해월' },
  { index: 22, name: '대설', monthName: '자월' },
  { index: 0, name: '소한', monthName: '축월', yearOffset: 1 },
];

function usage() {
  return `사용법: node scripts/saju-calc.mjs --date YYYY-MM-DD --time HH:MM [옵션]
  --calendar solar|lunar   입력 달력 (기본 solar)
  --leap                   음력 윤달
  --hour-unknown           출생 시간 모름 (시주 생략, 일주는 정오 가정)
  --gender male|female
  --longitude 127.5        진태양시 경도 (기본 한반도 평균, --no-true-solar가 없으면 적용)
  --no-true-solar          진태양시 끄기 (벽시계 KST 그대로)
  --day-boundary splitJasi|jasi|midnight   기본 splitJasi (자시 분리)
  --fortune-year 2027      세운·월운 연도
`;
}

function resolveInput(args) {
  if (!args.date) throw new Error(usage());
  const calendar = String(args.calendar || 'solar').toLowerCase();
  const isLunar = calendar === 'lunar';
  const isLeapMonth = Boolean(args.leap);
  const timeUnknown = Boolean(args['hour-unknown']);
  if (!args.time && !timeUnknown) throw new Error('--time HH:MM 또는 --hour-unknown 이 필요해.\n' + usage());
  const time = timeUnknown ? { hour: 12, minute: 0 } : parseTime(args.time);
  let date = parseDate(args.date);
  const input = {
    calendar: isLunar ? 'lunar' : 'solar',
    year: date.year,
    month: date.month,
    day: date.day,
    isLeapMonth: isLunar ? isLeapMonth : false,
    time: timeUnknown ? null : `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`,
  };
  if (isLunar) {
    const solar = koreanSolarFromLunar(date.year, date.month, date.day, isLeapMonth);
    date = { year: solar.year, month: solar.month, day: solar.day };
  }
  return { input, solar: { ...date, iso: formatYmd(date.year, date.month, date.day) }, time, timeUnknown };
}

function fortuneForYear(year, commonOpts) {
  const lichun = getSolarTerm(year, 2);
  const after = new Date(lichun.date.getTime() + 60 * 1000);
  const kst = kstFromUtcDate(after);
  const pillars = calculateFourPillars({
    year: kst.year,
    month: kst.month,
    day: kst.day,
    hour: kst.hour,
    minute: kst.minute,
    ...commonOpts,
  });
  const months = [];
  for (const term of MONTH_TERM_INDEX) {
    const termYear = year + (term.yearOffset || 0);
    const st = getSolarTerm(termYear, term.index);
    const tAfter = new Date(st.date.getTime() + 60 * 1000);
    const tk = kstFromUtcDate(tAfter);
    const p = calculateFourPillars({
      year: tk.year,
      month: tk.month,
      day: tk.day,
      hour: tk.hour,
      minute: tk.minute,
      ...commonOpts,
    });
    months.push({
      term: term.name,
      monthName: term.monthName,
      startKst: kstFromUtcDate(st.date).isoKst,
      pillar: pillarPlain(p.month),
    });
  }
  return {
    year,
    lichunKst: kstFromUtcDate(lichun.date).isoKst,
    yearPillar: pillarPlain(pillars.year),
    months,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) {
    process.stdout.write(usage());
    return;
  }
  const { input, solar, time, timeUnknown } = resolveInput(args);
  const gender = args.gender ? normalizeGender(args.gender) : undefined;
  const dayBoundary = args['day-boundary'] || DEFAULT_DAY_BOUNDARY;
  const trueSolarTime = trueSolarOption(args);
  const commonOpts = { dayBoundary };
  if (trueSolarTime) commonOpts.trueSolarTime = trueSolarTime;
  if (gender) commonOpts.gender = gender;

  const detail = calculateFourPillars({
    year: solar.year,
    month: solar.month,
    day: solar.day,
    hour: time.hour,
    minute: time.minute,
    ...commonOpts,
  });

  const limitations = [];
  if (timeUnknown) {
    limitations.push('출생 시간 미입력. 시주를 생략했고, 일주·연월주는 정오 가정이다. 자시 전후 출생이면 일주가 달라질 수 있다.');
  }

  const fortuneYear = args['fortune-year'] ? Number(args['fortune-year']) : 2027;
  const fortune = Number.isFinite(fortuneYear)
    ? fortuneForYear(fortuneYear, { dayBoundary, trueSolarTime: trueSolarTime || undefined })
    : null;

  const luck = detail.luckPillars
    ? {
        forward: detail.luckPillars.forward,
        startAge: detail.luckPillars.startAge,
        startYears: detail.luckPillars.startYears,
        startMonths: detail.luckPillars.startMonths,
        startDays: detail.luckPillars.startDays,
        pillars: (detail.luckPillars.pillars || []).map((lp) => ({
          age: lp.age,
          korean: lp.korean,
          pillar: pillarPlain(lp.pillar),
        })),
      }
    : null;

  const out = {
    ok: true,
    engine: {
      library: 'manseryeok',
      version: LIB_VERSIONS.manseryeok,
      license: 'MIT',
      basis: 'KASI 절기·음력. 연주는 입춘, 월주는 절(節) 경계.',
    },
    options: {
      trueSolarTime: trueSolarTime,
      dayBoundary,
      gender: gender || null,
    },
    input,
    solar,
    koreanLunar: koreanLunarFromSolar(solar.year, solar.month, solar.day),
    calendars: lunarComparison(solar),
    pillars: {
      year: pillarPlain(detail.year),
      month: pillarPlain(detail.month),
      day: pillarPlain(detail.day),
      hour: timeUnknown ? null : pillarPlain(detail.hour),
      text: timeUnknown
        ? `${detail.yearString}연주, ${detail.monthString}월주, ${detail.dayString}일주, 시주 생략`
        : detail.toString(),
      hanja: timeUnknown ? null : detail.toHanjaString(),
    },
    elements: {
      year: detail.yearElement,
      month: detail.monthElement,
      day: detail.dayElement,
      hour: timeUnknown ? null : detail.hourElement,
      counts: countElements(timeUnknown ? { ...detail, hourElement: null } : detail),
    },
    yinYang: {
      year: detail.yearYinYang,
      month: detail.monthYinYang,
      day: detail.dayYinYang,
      hour: timeUnknown ? null : detail.hourYinYang,
    },
    tenGods: timeUnknown
      ? { year: detail.tenGods.year, month: detail.tenGods.month, day: detail.tenGods.day, hour: null }
      : detail.tenGods,
    voidBranches: detail.voidBranches,
    luckPillars: gender ? luck : null,
    yearFortune: fortune,
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
