#!/usr/bin/env python3
"""괄호 밖에 나온 별 이름·간지 기둥·전문 용어를 찾는다. 0건이어야 통과."""
from __future__ import annotations

import re
import sys
from pathlib import Path

STARS = [
    "화육국", "태음", "자미", "록존", "지공", "지겁", "태양", "천량", "영성",
    "천동", "거문", "무곡", "천상", "칠살", "천기", "파군", "문곡", "염정",
    "천부", "좌보", "우보", "문창", "천마", "타라", "천월", "경양", "탐랑",
    "화록", "화권", "화과", "화기", "천희", "천공", "용지", "봉각",
]

PILLARS = [
    "기묘", "계유", "갑자", "무진", "갑목", "정미", "경오", "병오", "경자",
    "신축", "임인", "계묘", "갑진", "을사", "무신", "기유", "경술", "신해",
    "임자", "계축", "을목", "병화", "정화", "무토", "기토", "경금", "신금",
    "임수", "계수",
]

TERMS = [
    "사주팔자", "삼방사정", "재백궁", "관록궁", "천이궁", "전택궁", "부처궁",
    "교우궁", "노복궁", "질액궁", "복덕궁",
    "원국", "재백", "관록", "천이", "전택", "부처", "교우", "노복", "질액",
    "복덕", "명궁", "신궁", "십신", "세운", "월운", "대운", "공망", "일간",
    "식신", "상관", "정재", "편재", "정관", "편관", "정인", "편인", "비견",
    "겁재", "유년", "유월",
]

# 한 글자 간지. '해 봐'·목적격 '을' 같은 일상 한글은 제외하고,
# 글자·자리·기둥을 가리키는 쓰임만 잡는다.
GANJI = "갑을병정무기경신임계자축인묘진사오미신유술해"
HANGUL = r"[가-힣]"


def mask_parens(text: str) -> str:
    # 중첩 없는 괄호만. 여러 번 돌리며 제거.
    prev = None
    while prev != text:
        prev = text
        text = re.sub(r"\([^()]*\)", "〈PAREN〉", text)
        text = re.sub(r"（[^（）]*）", "〈PAREN〉", text)
    return text


def line_no(text: str, idx: int) -> int:
    return text.count("\n", 0, idx) + 1


def find_phrases(masked: str, terms: list[str], label: str) -> list[tuple]:
    hits = []
    # longer first
    terms = sorted(set(terms), key=len, reverse=True)
    occupied = [False] * len(masked)
    for t in terms:
        for m in re.finditer(re.escape(t), masked):
            if any(occupied[m.start():m.end()]):
                continue
            # skip if already inside a longer match
            for i in range(m.start(), m.end()):
                occupied[i] = True
            hits.append((line_no(masked, m.start()), label, t, m.start()))
    return hits


def find_single_ganji(masked: str) -> list[tuple]:
    """간지 한 글자가 '설명 없이 용어로' 쓰인 경우만."""
    hits = []
    patterns = [
        rf"윗글자인[ ]?([{GANJI}])",
        rf"아랫글자인[ ]?([{GANJI}])",
        rf"윗글자[ ]?([{GANJI}])",
        rf"아랫글자[ ]?([{GANJI}])",
        rf"땅 쪽 글자[ ]?([{GANJI}])",
        rf"하늘 쪽 글자[ ]?([{GANJI}])",
        rf"땅 글자[ ]?([{GANJI}])",
        rf"하늘 글자[ ]?([{GANJI}])",
        rf"글자 가운데[ ]?([{GANJI}])",
        rf"(?<![가-힣])([{GANJI}])[ ]?자리",
        rf"([{GANJI}])와[ ]?([{GANJI}])는",
        rf"([{GANJI}])과[ ]?([{GANJI}])는",
    ]
    occupied = [False] * len(masked)
    for pat in patterns:
        for m in re.finditer(pat, masked):
            for gi, g in enumerate(m.groups(), 1):
                if not g:
                    continue
                start = m.start(gi)
                if any(occupied[start:start + len(g)]):
                    continue
                occupied[start] = True
                hits.append((line_no(masked, start), "ganji-char", g, start))
    return hits


def main() -> int:
    path = Path(sys.argv[1])
    raw = path.read_text(encoding="utf-8")
    masked = mask_parens(raw)
    # 체계 이름 '자미두수'는 별 이름 '자미'가 아니다.
    masked = masked.replace('자미두수', '〈체계〉')
    hits = []
    hits += find_phrases(masked, STARS, "star")
    hits += find_phrases(masked, PILLARS, "pillar")
    hits += find_phrases(masked, TERMS, "term")
    hits += find_single_ganji(masked)
    hits.sort(key=lambda x: (x[0], x[3]))
    lines = raw.splitlines()
    print(f"file: {path}")
    print(f"chars: {len(raw)}")
    print(f"hits: {len(hits)}")
    for line, kind, tok, _ in hits:
        src = lines[line - 1] if 0 < line <= len(lines) else ""
        print(f"L{line} [{kind}:{tok}] {src}")
    return 1 if hits else 0


if __name__ == "__main__":
    raise SystemExit(main())
