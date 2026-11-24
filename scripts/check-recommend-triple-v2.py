#!/usr/bin/env python3
"""추천 본문의 16칸과 근거 문장 구조를 확인한다."""
import argparse
import re
from pathlib import Path

DOMAINS = ('일', '돈', '관계', '건강')
KEYS = (*DOMAINS, *(f'{i}월' for i in range(1, 13)))
CODE = re.compile(r'(?<![A-Za-z])[EI][NS][TF][JP](?![A-Za-z])', re.I)
HEADING = re.compile(r'^\s{0,3}(?:#{1,6}\s*|(?=\d+(?:-\d+)+[.)]\s*))(.+?)\s*#*\s*$')
PREFIX = re.compile(r'^(?:\d+(?:-\d+)*[.)]\s*)?')
MONTH = re.compile(r'^(1[0-2]|[1-9])월(?!\d)')
SENTENCES = re.compile(r'(?<=[.!?。！？])\s+|\n+')


def title_key(line):
    match = HEADING.match(line)
    if not match:
        return None
    title = PREFIX.sub('', match.group(1)).strip()
    month = MONTH.match(title)
    if month:
        return month.group(1) + '월'
    for name in DOMAINS:
        if re.match(re.escape(name) + r'(?=$|[\s·:：—–-])', title):
            # A combined section title is not an individual domain.
            if re.match(re.escape(name) + r'\s*[·/]\s*(?:일|돈|관계|건강)(?=$|[\s·:：])', title):
                return None
            return name
    return None


def split_units(text):
    units = []
    name = None
    lines = []
    for line in text.splitlines():
        key = title_key(line)
        if key:
            if name is not None:
                units.append((name, '\n'.join(lines)))
            name, lines = key, []
        elif name is not None:
            lines.append(line)
    if name is not None:
        units.append((name, '\n'.join(lines)))
    return units


def pairs(body):
    sentences = [s.strip() for s in SENTENCES.split(body) if s.strip()]
    return [(s, s + ' ' + (sentences[i + 1] if i + 1 < len(sentences) else ''))
            for i, s in enumerate(sentences)]


def has_saju(body):
    for sentence, context in pairs(body):
        if re.search(r'사주\s*근거|①\s*\**\s*사주', sentence):
            return True
        if (re.search(r'사주로는|사주로\s*보면|사주를\s*보면|그해의\s*기둥|달의\s*기둥|태어난\s*네\s*기둥|세운|월운', sentence)
                and re.search(r'\([^()\n]+\)|[갑을병정무기경신임계][자축인묘진사오미신유술해](?:년|연|월|일|시)?주', context)):
            return True
    return False


def has_ziwei(body):
    for sentence, context in pairs(body):
        if re.search(r'자미두수\s*근거|②\s*\**\s*자미', sentence):
            return True
        if (re.search(r'명반|자미두수로|자미두수를\s*보면', sentence)
                and re.search(r'명궁|관록|재백|전택|질액|복덕|부처|천이|노복|형제궁|부모궁|자녀궁|교우궁|재물궁|관록궁|(?:일|돈|건강|짝)\s*자리|별\s*\([^()]+\)', context)):
            return True
    return False


def has_type(body):
    return any(re.search(r'내\s*유형이라면\s*이렇게|네\s*성격\s*유형|③\s*\**\s*(?:네\s*)?(?:성격|유형)', s)
               or (re.search(r'성향상', s) and re.search(r'더\s*잘\s*맞아|이\s*부분을?\s*조심|이렇게\s*하면', s))
               for s, _ in pairs(body))


def has_inference(text):
    for s, _ in pairs(text):
        if re.search(r'사주로|명반으로|자미(?:두수)?(?:로|에서)?', s) and re.search(r'유형', s) and re.search(r'추정|맞춰|맞혀|보인다|맞다', s):
            # Explicit denials describe a prohibition, not an inference.
            if not re.search(r'아니|않|못\s*한|없', s):
                return True
        if re.search(r'이\s*사주니', s) and CODE.search(s):
            return True
        if re.search(r'성격\s*유형은', s) and CODE.search(s) and re.search(r'로\s*보|가\s*맞|로\s*추정', s):
            return True
    return False


def has_placement(body):
    palace = r'(?:명궁|신궁|관록궁|재백궁|전택궁|질액궁|복덕궁|부처궁|천이궁|노복궁|형제궁|부모궁|자녀궁|교우궁|주성)'
    for s, _ in pairs(body):
        if re.search(palace + r'\s*(?:은|는|이|가|에는|에)\s*[^.!?\n]{0,35}(?:있|자리|위치|배치|앉|들어|겹|태양|태음|천량|천동|묘)', s):
            if not re.search(r'못|없|불가|생략|제한|알\s*수\s*없', s):
                return True
        if re.search(palace + r'\s*(?:은|는)\s*(?:묘|자|축|인|진|사|오|미|신|유|술|해|태양|태음|천량|천동)(?:\b|[이가은는이다])', s):
            return True
    return False


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--no-type', action='store_true')
    parser.add_argument('--hour-unknown', action='store_true')
    parser.add_argument('--min-chars', type=int, default=120)
    parser.add_argument('report')
    args = parser.parse_args()
    text = Path(args.report).read_text(encoding='utf-8')
    seen = {key: [] for key in KEYS}
    for name, body in split_units(text):
        seen[name].append(body)
    errors = []
    passed = 0
    for key in KEYS:
        bodies = seen[key]
        if not bodies:
            errors.append(f'{key}: 없음')
            continue
        if len(bodies) > 1:
            errors.append(f'{key}: 중복')
            continue
        body = bodies[0]
        reasons = []
        if len(re.sub(r'\s', '', body)) < args.min_chars:
            reasons.append('추천 본문 너무 짧음')
        if not has_saju(body):
            reasons.append('추천 본문에 사주 근거 문장 없음')
        if not args.hour_unknown and not has_ziwei(body):
            reasons.append('추천 본문에 자미두수 근거 문장 없음')
        if not args.no_type and not has_type(body):
            reasons.append('추천 본문에 성격 유형 맞춤 문장 없음')
        if args.hour_unknown and has_placement(body):
            reasons.append('자미두수 명반 배치를 단정함')
        if reasons:
            errors.extend(f'{key}: {reason}' for reason in reasons)
        else:
            passed += 1
    if args.hour_unknown and '분석 제한' not in text:
        errors.append('분석 제한 문구 없음')
    if args.no_type and CODE.search(text):
        errors.append('성격 유형을 지어냄')
    if has_inference(text):
        errors.append('성격 유형을 사주·명반에서 추정함')
    modes = []
    if args.no_type:
        modes.append('성격 유형 생략')
    if args.hour_unknown:
        modes.append('출생 시각 모름')
    print(args.report)
    print(' / '.join(modes) if modes else '전체 입력')
    print(f'구조 확인: {passed}/16 {"실패" if errors else "통과"}')
    if errors:
        print('빠진 영역·월:')
        for error in errors:
            print('  - ' + error)
    else:
        print('빠진 영역·월: 없음')
    return int(bool(errors))


if __name__ == '__main__':
    raise SystemExit(main())
