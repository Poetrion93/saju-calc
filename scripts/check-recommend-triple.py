#!/usr/bin/env python3
"""추천 단위(영역 4 + 월 12)마다 사주·자미두수·성격 유형 근거가 모두 있는지 검사한다."""
from __future__ import annotations

import re
import sys
from pathlib import Path

SAJU = re.compile(
    r"사주|그해의 기둥|달의 기둥|달 기둥|세운|월운|오행|일간|입춘|대운|"
    r"공망|빈칸 글자|정재|상관|정관|편재|정인|편인|비견|겁재|식신|편관|"
    r"나무 기운|불 기운|흙 기운|쇠 기운|물 기운|"
    r"목\)|화\)|토\)|금\)|수\)|정미|병오|신축|임인|계묘|갑진|을사|무신|기유|경술|신해|임자|경오"
)
ZIWEI = re.compile(
    r"자미|명반|명궁|신궁|관록|재백|전택|질액|복덕|부처|천이|노복|"
    r"궁\)|별\(|별\b|"
    r"태음|태양|천량|록존|지공|염정|천부|좌보|천기|문창|천마|타라|"
    r"문곡|천동|거문|영성|파군|천월|경양|화육"
)
TYPE_ = re.compile(
    r"성격 유형|내 유형|네 성격 유형|성향상|"
    r"ESTJ|ISTJ|ENTJ|INTJ|ESFJ|ISFJ|ENFJ|INFJ|ESTP|ISTP|ENTP|INTP|ESFP|ISFP|ENFP|INFP|"
    r"계획을 세우고|논리와 기준|바깥일과 부딪|눈앞의 사실"
)

HEAD_DOMAIN = re.compile(r"^#{2,4} +(?:\d+[.-]\d+\.\s*)?(일|돈|관계|건강)(?:\s|$|\(|:)", re.M)
HEAD_MONTH = re.compile(r"^#{2,4} +(\d{1,2}월)(?:\s|:|$)", re.M)


def split_units(text: str) -> list[tuple[str, str]]:
    units: list[tuple[str, str]] = []
    # domain blocks: from ### 일/돈/관계/건강 to next same-level or ##
    for m in HEAD_DOMAIN.finditer(text):
        title = m.group(1)
        start = m.start()
        nxt = re.search(r"^#{2,3} ", text[m.end():], re.M)
        end = m.end() + nxt.start() if nxt else len(text)
        chunk = text[start:end]
        # prefer '그래서' to end as the recommendation core, but keep whole domain
        units.append((f"영역:{title}", chunk))
    for m in HEAD_MONTH.finditer(text):
        title = m.group(1)
        start = m.start()
        nxt = re.search(r"^#{2,3} ", text[m.end():], re.M)
        end = m.end() + nxt.start() if nxt else len(text)
        units.append((f"월:{title}", text[start:end]))
    return units


def check_unit(chunk: str) -> dict:
    return {
        "saju": bool(SAJU.search(chunk)),
        "ziwei": bool(ZIWEI.search(chunk)),
        "type": bool(TYPE_.search(chunk)),
    }


def main(path: Path) -> int:
    text = path.read_text(encoding="utf-8")
    units = split_units(text)
    rows = []
    ok = 0
    for name, chunk in units:
        flags = check_unit(chunk)
        all3 = all(flags.values())
        if all3:
            ok += 1
        rows.append((name, flags, all3))
    n = len(rows)
    ratio = (ok / n) if n else 0.0
    print(f"file: {path}")
    print(f"units: {n}  all3: {ok}  ratio: {ok}/{n} ({ratio:.0%})")
    missing = [r for r in rows if not r[2]]
    if missing:
        print("missing:")
        for name, flags, _ in missing:
            lack = [k for k, v in flags.items() if not v]
            print(f"  - {name}: 없음={','.join(lack)}")
    else:
        print("missing: 0")
    # also count MBTI outside trademark
    mbti = []
    for i, line in enumerate(text.splitlines(), 1):
        if "MBTI" in line and "상표" not in line:
            mbti.append((i, line.strip()[:80]))
    if mbti:
        print("MBTI outside 상표 고지:")
        for i, l in enumerate(mbti, 1):
            print(f"  L{l[0]}: {l[1]}")
    return 0 if n and ok == n else 1


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("usage: check-recommend-triple.py <report.md>", file=sys.stderr)
        sys.exit(2)
    sys.exit(main(Path(sys.argv[1])))
