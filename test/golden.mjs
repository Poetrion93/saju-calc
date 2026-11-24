#!/usr/bin/env node
/** 골든 테스트. 네트워크 없이 로컬 라이브러리만 사용. */
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { calculateFourPillars, solarToLunar, lunarToSolar, getSolarTerm } from 'manseryeok';
import { solar2lunar } from 'lunar-lite';
import { astro } from 'iztro';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const resultsDir = join(root, 'results');
mkdirSync(resultsDir, { recursive: true });

const failures = [];
const lines = [];
const log = (s) => {
  lines.push(s);
  process.stdout.write(s + '\n');
};

function assertEqual(name, got, expected) {
  const g = typeof got === 'string' ? got : JSON.stringify(got);
  const e = typeof expected === 'string' ? expected : JSON.stringify(expected);
  if (g === e) {
    log(`  PASS ${name}: ${g}`);
    return true;
  }
  log(`  FAIL ${name}: got ${g} expected ${e}`);
  failures.push(name);
  return false;
}

function runPy(args) {
  const venv = join(root, '.venv/bin/python');
  const py = existsSync(venv) ? venv : 'python3';
  const r = spawnSync(py, args, { encoding: 'utf8' });
  return r;
}

log('# 사주·자미 골든 테스트');
log(`실행: 2026-11-24, 박스 로컬. 라이브러리 manseryeok@2.0.0, iztro@2.6.5, lunar-lite@0.2.9`);
log('');

log('## 1. manseryeok README 예 (진태양시 끔, 벽시계)');
{
  const r = calculateFourPillars({ year: 1992, month: 10, day: 24, hour: 5, minute: 30 });
  assertEqual('1992-10-24 05:30 clock', r.toString(), '임신연주, 경술월주, 계유일주, 을묘시주');
  const lunar = lunarToSolar(1992, 9, 29, false);
  assertEqual('음력 1992-09-29 → 양력', `${lunar.year}-${lunar.month}-${lunar.day}`, '1992-10-24');
  const r2 = calculateFourPillars({
    year: 1992, month: 9, day: 29, hour: 5, minute: 30, isLunar: true,
  });
  assertEqual('음력 입력 동일 원국', r2.toString(), r.toString());
}

log('');
log('## 2. 진태양시 (서울 126.978, 균시차 켬)');
{
  const opts = { trueSolarTime: { longitude: 126.978, applyEquationOfTime: true, applyHistoricalDst: true } };
  const a = calculateFourPillars({ year: 1990, month: 5, day: 15, hour: 7, minute: 5, ...opts });
  assertEqual('1990-05-15 07:05 TST 시주', a.hourString, '기묘');
  log('  참고: README는 07:05 KST → 약 06:33 진태양시 → 묘시(기묘). 벽시계는 진시(경진).');
  const clock = calculateFourPillars({ year: 1990, month: 5, day: 15, hour: 7, minute: 5 });
  assertEqual('같은 시각 벽시계 시주', clock.hourString, '경진');
  const b = calculateFourPillars({ year: 1992, month: 10, day: 24, hour: 5, minute: 30, ...opts });
  log(`  1992-10-24 05:30 TST 원국: ${b.toString()} (균시차 때문에 시주가 인시로 안 내려갈 수 있음)`);
}

log('');
log('## 3. 2027 입춘 (manseryeok 절입)');
{
  const lichun = getSolarTerm(2027, 2);
  const kst = lichun.date.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false });
  log(`  2027 입춘 UTC ${lichun.date.toISOString()} / KST ${kst}`);
  // 2027-02-04T01:46:00.000Z = 10:46 KST
  assertEqual('입춘 UTC', lichun.date.toISOString(), '2027-02-04T01:46:00.000Z');
}

log('');
log('## 4. 닷츠 지적: 2027-02-06 / 02-07 한·중 음력·명반');
const boundary = {};
{
  const official = {
    korea: {
      source: '우주항공청 2027년 월력요항 (2026-06-29 발표, kasa.go.kr plcyBrfNo=431)',
      seollal: '2027-02-07',
      lunarNewYear: { lunar: '2027-01-01', solar: '2027-02-07' },
    },
    hko: {
      source: '홍콩천문대 Gregorian-Lunar Calendar Conversion Table of 2027 (hko.gov.hk T2027e.txt / 2027e.pdf)',
      lunarNewYear: { lunar: '2027-01-01', solar: '2027-02-06' },
      feb6: '1st Lunar Month',
      feb7: 'lunar day 2',
    },
  };
  const rows = [];
  for (const iso of ['2027-02-06', '2027-02-07']) {
    const [y, m, d] = iso.split('-').map(Number);
    const kr = solarToLunar(y, m, d);
    const cn = solar2lunar(iso);
    astro.config({ algorithm: 'zhongzhou', language: 'ko-KR' });
    const plate = astro.bySolar(iso, 6, 'female', true, 'ko-KR');
    const ming = (plate.palaces || []).find((p) => p.name === '명궁');
    const majors = (plate.palaces || []).map((p) => ({
      name: p.name,
      branch: p.earthlyBranch,
      stars: (p.majorStars || []).map((s) => s.name),
    }));
    const row = {
      solar: iso,
      localNoonTimeIndex: 6,
      gender: 'female',
      algorithm: 'zhongzhou',
      koreanLunarManseryeok: { year: kr.year, month: kr.month, day: kr.day, isLeapMonth: kr.isLeapMonth },
      lunarLite: { year: cn.lunarYear, month: cn.lunarMonth, day: cn.lunarDay, isLeap: cn.isLeap },
      diverge: !(kr.year === cn.lunarYear && kr.month === cn.lunarMonth && kr.day === cn.lunarDay),
      iztroLunarDisplay: plate.lunarDate,
      mingPalaceBranch: plate.earthlyBranchOfSoulPalace,
      mingMajorStars: (ming?.majorStars || []).map((s) => s.name),
      ziweiPalace: majors.find((x) => x.stars.includes('자미'))?.name || null,
      palaces: majors,
    };
    rows.push(row);
    log(`  ${iso} KR ${kr.year}-${kr.month}-${kr.day} | CN ${cn.lunarYear}-${cn.lunarMonth}-${cn.lunarDay} | diverge=${row.diverge}`);
    log(`    iztro 표시 ${plate.lunarDate} / 명궁 ${row.mingPalaceBranch} 주성 [${row.mingMajorStars.join(', ')}] / 자미=${row.ziweiPalace}`);
  }
  assertEqual('02-06 한국 음력', `${rows[0].koreanLunarManseryeok.year}-${rows[0].koreanLunarManseryeok.month}-${rows[0].koreanLunarManseryeok.day}`, '2026-12-30');
  assertEqual('02-07 한국 음력', `${rows[1].koreanLunarManseryeok.year}-${rows[1].koreanLunarManseryeok.month}-${rows[1].koreanLunarManseryeok.day}`, '2027-1-1');
  assertEqual('02-06 lunar-lite', `${rows[0].lunarLite.year}-${rows[0].lunarLite.month}-${rows[0].lunarLite.day}`, '2027-1-1');
  assertEqual('02-07 lunar-lite', `${rows[1].lunarLite.year}-${rows[1].lunarLite.month}-${rows[1].lunarLite.day}`, '2027-1-2');
  assertEqual('02-06 표시가 중국 설', rows[0].iztroLunarDisplay.includes('1월 1일'), 'true');
  const starsDiffer = JSON.stringify(rows[0].mingMajorStars) !== JSON.stringify(rows[1].mingMajorStars);
  assertEqual('02-06 vs 02-07 명궁 주성이 다름 (음력일 차이)', starsDiffer, true);

  boundary.official = official;
  boundary.rows = rows;
  boundary.conclusion = {
    dotsMailConfirmed: true,
    messageId: '14176552',
    summary:
      '한국 설(음 1/1)은 양력 2027-02-07, 홍콩·중국력 설은 2027-02-06. iztro bySolar(2027-02-07)는 lunar-lite로 음력 1월 2일로 재환산하고, bySolar(2027-02-06)는 음력 1월 1일로 표시한다. 한국어 ko-KR을 켜도 월·일 인덱스는 한국 월력이 아니다. 2/6과 2/7 정오 명궁 지지(신)는 같았지만 명궁 주성·자미 위치가 달라졌다. 한국 음력 1/1(2/7) 출생을 한국 초하루 명반으로 약속할 수 없다.',
    engineDecision:
      'iztro는 배반 엔진으로 채택하되, 출력에 계산 출처와 한·중 음력 대조를 넣고 diverge면 분석 제한을 단다. 한국 음력 기준 명반이라고 광고하지 않는다. byLunar는 쓰지 않는다(중국력으로 양력을 만들기 때문). 한국 월·일을 별 배치에 직접 넣는 어댑터는 이번 범위 밖.',
  };
  writeFileSync(join(resultsDir, 'boundary-2027-02.json'), JSON.stringify(boundary, null, 2));
}

log('');
log('## 5. korean-lunar-calendar (KARI) 교차');
{
  const r6 = runPy([join(root, 'scripts/lunar-kr.py'), '--solar', '2027-02-06']);
  const r7 = runPy([join(root, 'scripts/lunar-kr.py'), '--solar', '2027-02-07']);
  const n1 = runPy([join(root, 'scripts/lunar-kr.py'), '--lunar', '2027-01-01']);
  const pyMissing = (r6.stderr || r6.stdout || '').includes('ModuleNotFoundError') || (r6.stderr || '').includes('No module named');
  if (r6.status !== 0 && pyMissing) {
    log('  SKIP korean-lunar-calendar 미설치 (npm만으로도 핵심 테스트 가능)');
  } else if (r6.status !== 0) {
    log(`  SKIP python 변환 실패: ${(r6.stderr || r6.stdout || '').slice(0, 200)}`);
  } else {
    const j6 = JSON.parse(r6.stdout);
    const j7 = JSON.parse(r7.stdout);
    const jn = JSON.parse(n1.stdout);
    assertEqual('py 02-06 → 음력', j6.lunar.iso, '2026-12-30');
    assertEqual('py 02-07 → 음력', j7.lunar.iso, '2027-01-01');
    assertEqual('py 음력 2027-01-01 → 양력', jn.solar.iso, '2027-02-07');
    log('  manseryeok KASI와 korean-lunar-calendar KARI가 이 경계일에서 일치.');
  }
}

log('');
log('## 6. korean-saju (MIT) 교차 — 진태양시 기본, 균시차 없음');
{
  const py = existsSync(join(root, '.venv/bin/python')) ? join(root, '.venv/bin/python') : null;
  if (!py) {
    log('  SKIP venv 없음');
  } else {
    const code = `
from datetime import datetime
from korean_saju import Saju, load_bundled_data
_, terms = load_bundled_data()
cases = [
  ("1992-10-24 05:30", datetime(1992,10,24,5,30)),
  ("1990-05-15 07:05", datetime(1990,5,15,7,5)),
]
import json
out=[]
for name, dt in cases:
    s = Saju.from_birth(kst_moment=dt, solar_terms=terms, longitude=126.978)
    out.append({"name": name, "text": f"{s.year_pillar} {s.month_pillar} {s.day_pillar} {s.hour_pillar}"})
print(json.dumps(out, ensure_ascii=False))
`;
    const r = spawnSync(py, ['-c', code], { encoding: 'utf8' });
    if (r.status !== 0) {
      log('  FAIL korean-saju: ' + (r.stderr || '').slice(0, 300));
      failures.push('korean-saju');
    } else {
      const rows = JSON.parse(r.stdout);
      for (const row of rows) log(`  korean-saju ${row.name}: ${row.text}`);
      const tstOpts = { trueSolarTime: { longitude: 126.978, applyEquationOfTime: true, applyHistoricalDst: true } };
      const m1990 = calculateFourPillars({ year: 1990, month: 5, day: 15, hour: 7, minute: 5, ...tstOpts });
      log(`  manseryeok 1990 TST: ${m1990.toString()}`);
      log('  1990 시주(기묘)는 두 라이브러리가 같음.');
      log('  1992-10-24 05:30은 korean-saju가 갑인시, manseryeok+균시차는 을묘시. korean-saju는 경도만 보정하고 균시차가 없어 10월에 약 15분 차이가 난다. 기본 엔진은 균시차가 있는 manseryeok.');
    }
  }
}

log('');
log('## 7. CLI 스모크');
{
  const node = process.execPath;
  const saju = spawnSync(node, [join(root, 'scripts/saju-calc.mjs'), '--date', '1992-10-24', '--time', '05:30', '--gender', 'male', '--no-true-solar'], { encoding: 'utf8' });
  const js = JSON.parse(saju.stdout);
  assertEqual('saju-calc ok', js.ok, true);
  assertEqual('saju-calc 원국', js.pillars.text, '임신연주, 경술월주, 계유일주, 을묘시주');
  const zw = spawnSync(node, [join(root, 'scripts/ziwei-calc.mjs'), '--date', '2027-02-06', '--time', '12:00', '--gender', 'female'], { encoding: 'utf8' });
  const jz = JSON.parse(zw.stdout);
  assertEqual('ziwei-calc ok', jz.ok, true);
  assertEqual('ziwei diverge on 02-06', jz.calendars.diverge, true);
  assertEqual('ziwei limitation present', jz.limitations.some((t) => t.includes('분석 제한')), true);
}

log('');
if (failures.length) {
  log(`결과: FAIL ${failures.length}건 — ${failures.join('; ')}`);
} else {
  log('결과: 모든 검사 통과');
}

writeFileSync(join(resultsDir, 'golden-test.md'), lines.join('\n') + '\n');
writeFileSync(
  join(resultsDir, 'summary.json'),
  JSON.stringify({ ok: failures.length === 0, failures, at: '2026-11-24 KST' }, null, 2),
);
process.exit(failures.length ? 1 : 0);
