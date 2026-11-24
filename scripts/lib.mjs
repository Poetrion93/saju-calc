/** Shared helpers for saju-calc / ziwei-calc. No network. */

import { solarToLunar, lunarToSolar } from 'manseryeok';
import { solar2lunar } from 'lunar-lite';
import { util } from 'iztro';

export const DEFAULT_LONGITUDE = 127.5;
export const SEOUL_LONGITUDE = 126.978;
export const DEFAULT_DAY_BOUNDARY = 'splitJasi';
export const LIB_VERSIONS = {
  manseryeok: '2.0.0',
  iztro: '2.6.5',
  'lunar-lite': '0.2.9',
};

const GENDER_MAP = {
  male: 'male',
  female: 'female',
  m: 'male',
  f: 'female',
  남: 'male',
  여: 'female',
  남자: 'male',
  여자: 'female',
  남성: 'male',
  여성: 'female',
  男: 'male',
  女: 'female',
};

export function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      out[key] = true;
    } else {
      out[key] = next;
      i += 1;
    }
  }
  return out;
}

export function parseDate(s) {
  const m = String(s || '').trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) throw new Error(`날짜는 YYYY-MM-DD 형식이어야 해: ${s}`);
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

export function parseTime(s) {
  if (s === undefined || s === null || s === '' || s === 'unknown' || s === '모름') {
    return null;
  }
  const m = String(s).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) throw new Error(`시각은 HH:MM 형식이어야 해: ${s}`);
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new Error(`시각 범위 오류: ${s}`);
  }
  return { hour, minute };
}

export function normalizeGender(g) {
  if (g === undefined || g === null || g === '') return null;
  const k = String(g).trim().toLowerCase();
  // keep CJK as-is for map lookup
  const mapped = GENDER_MAP[String(g).trim()] || GENDER_MAP[k];
  if (!mapped) throw new Error(`성별을 해석할 수 없어: ${g} (male/female, 남/여)`);
  return mapped;
}

export function timeToIndex(hour, minute = 0) {
  // iztro util.timeToIndex uses the hour only (00→0 조자, 23→12 야자, else floor((h+1)/2)).
  if (typeof util?.timeToIndex === 'function') return util.timeToIndex(hour);
  if (hour === 0) return 0;
  if (hour === 23) return 12;
  return Math.floor((hour + 1) / 2);
}

export function formatYmd(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function kstFromUtcDate(date) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    isoKst: `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute} KST`,
  };
}

export function koreanLunarFromSolar(year, month, day) {
  const l = solarToLunar(year, month, day);
  return {
    calendar: 'KASI/manseryeok',
    year: l.year,
    month: l.month,
    day: l.day,
    isLeapMonth: Boolean(l.isLeapMonth),
    iso: `${l.year}-${String(l.month).padStart(2, '0')}-${String(l.day).padStart(2, '0')}${l.isLeapMonth ? ' leap' : ''}`,
  };
}

export function koreanSolarFromLunar(year, month, day, isLeapMonth = false) {
  const s = lunarToSolar(year, month, day, isLeapMonth);
  return { year: s.year, month: s.month, day: s.day, iso: formatYmd(s.year, s.month, s.day) };
}

export function chineseLunarFromSolar(isoDate) {
  const l = solar2lunar(isoDate);
  return {
    calendar: 'lunar-lite (중국력/홍콩력 계열)',
    year: l.lunarYear,
    month: l.lunarMonth,
    day: l.lunarDay,
    isLeapMonth: Boolean(l.isLeap),
    iso: `${l.lunarYear}-${String(l.lunarMonth).padStart(2, '0')}-${String(l.lunarDay).padStart(2, '0')}${l.isLeap ? ' leap' : ''}`,
    display: typeof l.toString === 'function' ? l.toString(true) : undefined,
  };
}

export function calendarsDiverge(kr, cn) {
  return kr.year !== cn.year || kr.month !== cn.month || kr.day !== cn.day || Boolean(kr.isLeapMonth) !== Boolean(cn.isLeapMonth);
}

export function pillarPlain(p) {
  if (!p) return null;
  return {
    heavenlyStem: p.heavenlyStem,
    earthlyBranch: p.earthlyBranch,
    korean: `${p.heavenlyStem}${p.earthlyBranch}`,
  };
}

export function countElements(detail) {
  const keys = ['yearElement', 'monthElement', 'dayElement', 'hourElement'];
  const counts = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  for (const k of keys) {
    const el = detail[k];
    if (!el) continue;
    if (el.stem && counts[el.stem] !== undefined) counts[el.stem] += 1;
    if (el.branch && counts[el.branch] !== undefined) counts[el.branch] += 1;
  }
  return counts;
}

export function resolveBirthSolar(args) {
  const calendar = String(args.calendar || 'solar').toLowerCase();
  const timeUnknown = Boolean(args['hour-unknown'] || args.time === '모름' || args.time === 'unknown' || args.time === '');
  const time = timeUnknown ? null : parseTime(args.time || args['birth-time'] || '12:00');
  const assumedNoon = timeUnknown || (!args.time && !args['birth-time']);
  let date = parseDate(args.date || args.solar);
  const isLunar = calendar === 'lunar' || args.lunar === true || args.lunar === 'true';
  const isLeapMonth = Boolean(args.leap || args['leap-month']);
  let input = {
    calendar: isLunar ? 'lunar' : 'solar',
    year: date.year,
    month: date.month,
    day: date.day,
    isLeapMonth: isLunar ? isLeapMonth : false,
  };
  if (isLunar) {
    const solar = koreanSolarFromLunar(date.year, date.month, date.day, isLeapMonth);
    date = { year: solar.year, month: solar.month, day: solar.day };
  }
  const hour = time ? time.hour : 12;
  const minute = time ? time.minute : 0;
  return {
    input,
    solar: { ...date, iso: formatYmd(date.year, date.month, date.day) },
    time: { hour, minute, hhmm: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`, unknown: timeUnknown, assumedNoon: timeUnknown || assumedNoon && timeUnknown },
    timeUnknown,
  };
}

export function lunarComparison(solar) {
  const korean = koreanLunarFromSolar(solar.year, solar.month, solar.day);
  const chinese = chineseLunarFromSolar(solar.iso);
  return {
    korean,
    chinese,
    diverge: calendarsDiverge(korean, chinese),
    note: calendarsDiverge(korean, chinese)
      ? '한국 월력(KASI/manseryeok)과 iztro가 쓰는 lunar-lite 음력이 다름. 명반의 월·일 인덱스는 lunar-lite 값을 씀.'
      : '이 양력일에서는 한국 음력과 lunar-lite 음력의 연·월·일이 같음.',
  };
}

export function trueSolarOption(args) {
  const off = args['no-true-solar'] === true || args['true-solar'] === 'false' || args['true-solar'] === false;
  if (off) return null;
  const lon = args.longitude !== undefined ? Number(args.longitude) : DEFAULT_LONGITUDE;
  if (Number.isNaN(lon)) throw new Error(`경도가 숫자가 아님: ${args.longitude}`);
  return {
    longitude: lon,
    applyEquationOfTime: true,
    applyHistoricalDst: true,
  };
}
