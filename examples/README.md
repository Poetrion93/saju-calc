# 그록봇 해석 품질 예시

계산 CLI는 저장소 루트의 `scripts/`를 쓴다. 여기 파일은 해석 리포트의 분량·말투·구성 기준이다.

- `saju-action-guide.SKILL.md`: 리포트 구성과 추천 3단(사주 근거 → 자미 근거와 행동 → 성격 유형 맞춤) 규칙.
- `grokbot-instructions-v4.md`: 그록봇 지침 초안. 봇 안 결과는 12달 전체 긴 리포트까지 무료. 가격은 적지 않는다.
- `sample-hong-2027-long-v4.md`: 가상 인물 홍길동 샘플(양력 1999-09-09 09:00, 서울, 남성, 자가 입력 ESTJ). 실존 인물 사주가 아니다.
- 검수: `../scripts/check-bare-terms-v2.py`(괄호 없는 용어 0건), `../scripts/check-recommend-triple.py`(영역 4·달 12 모두 사주·자미·성격 유형 3요소).

숫자는 이 예가 아니라 이번 계산 JSON만 쓴다. 생년월일을 저장소에 추가로 넣지 마세요.
