#!/usr/bin/env python3
"""한국 음력 변환 CLI (korean-lunar-calendar, KARI 계열). 교차검증용."""
from __future__ import annotations

import argparse
import json
import sys

from korean_lunar_calendar import KoreanLunarCalendar


def main() -> int:
    p = argparse.ArgumentParser(description="한국 음력 ↔ 양력 변환")
    g = p.add_mutually_exclusive_group(required=True)
    g.add_argument("--solar", help="양력 YYYY-MM-DD")
    g.add_argument("--lunar", help="음력 YYYY-MM-DD")
    p.add_argument("--leap", action="store_true", help="음력 윤달")
    args = p.parse_args()
    cal = KoreanLunarCalendar()
    if args.solar:
        y, m, d = (int(x) for x in args.solar.split("-"))
        ok = cal.setSolarDate(y, m, d)
        if not ok:
            print(json.dumps({"ok": False, "error": f"변환 실패: {args.solar}"}, ensure_ascii=False))
            return 1
        out = {
            "ok": True,
            "library": "korean-lunar-calendar",
            "version": "0.4.0",
            "basis": "KARI/한국 음력",
            "solar": {"year": cal.solarYear, "month": cal.solarMonth, "day": cal.solarDay},
            "lunar": {
                "year": cal.lunarYear,
                "month": cal.lunarMonth,
                "day": cal.lunarDay,
                "isLeapMonth": bool(cal.isIntercalation),
                "iso": cal.LunarIsoFormat(),
            },
        }
    else:
        y, m, d = (int(x) for x in args.lunar.split("-"))
        ok = cal.setLunarDate(y, m, d, bool(args.leap))
        if not ok:
            print(json.dumps({"ok": False, "error": f"변환 실패: {args.lunar}"}, ensure_ascii=False))
            return 1
        out = {
            "ok": True,
            "library": "korean-lunar-calendar",
            "version": "0.4.0",
            "basis": "KARI/한국 음력",
            "lunar": {
                "year": cal.lunarYear,
                "month": cal.lunarMonth,
                "day": cal.lunarDay,
                "isLeapMonth": bool(cal.isIntercalation),
                "iso": cal.LunarIsoFormat(),
            },
            "solar": {
                "year": cal.solarYear,
                "month": cal.solarMonth,
                "day": cal.solarDay,
                "iso": cal.SolarIsoFormat(),
            },
        }
    print(json.dumps(out, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
