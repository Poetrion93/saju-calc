# saju-calc

한국 만세력 사주팔자와 자미두수 명반을 **로컬 라이브러리로만** 계산하는 CLI입니다. LLM이 간지·절기·별 배치를 추측하지 않습니다.

- 사주: [`manseryeok`](https://www.npmjs.com/package/manseryeok) (MIT, KASI 절기·음력)
- 자미두수: [`iztro`](https://www.npmjs.com/package/iztro) (MIT)
- 라이선스: MIT

그록봇 템플릿을 받은 사람은 스킬이 첫 실행 때 이 저장소를 `~/saju-calc`에 받고 `npm install`을 합니다. a1이나 작성자 컴퓨터에 접속하지 않습니다.

## 설치

Node 18+ 필요.

```bash
git clone https://github.com/Poetrion93/saju-calc.git ~/saju-calc
cd ~/saju-calc
npm install
```

또는:

```bash
curl -fsSL https://raw.githubusercontent.com/Poetrion93/saju-calc/main/scripts/bootstrap.sh | bash
```

## 사용

```bash
node scripts/saju-calc.mjs --date 1992-10-24 --time 05:30 --gender male
node scripts/ziwei-calc.mjs --date 2027-02-07 --time 12:00 --gender female
npm test
```

`--date`의 1992-10-24는 [manseryeok README](https://github.com/yhj1024/manseryeok)에 공개된 예제입니다. 개인 생년월일을 저장소에 넣지 마세요.

## 자미두수 음력 기준

`iztro`의 `bySolar`는 양력을 넣은 뒤 월·일 인덱스를 `lunar-lite`(중국력/홍콩력 계열)로 다시 계산합니다. 한국어 표시를 켜도 한국 음력 명반이 아닙니다.

예: 2027년 설날, 한국 월력은 양력 2월 7일, 홍콩력은 2월 6일입니다. 같은 정오 명반을 넣으면 주성 배치가 달라집니다. CLI는 한국 음력과 lunar-lite 음력을 같이 출력하고, 다르면 `limitations`에 `분석 제한`을 넣습니다. 한국 음력 입력은 KASI 변환으로 양력을 구한 뒤 `bySolar`만 호출하세요. `byLunar`는 쓰지 마세요.

이 결과는 오락·참고용입니다. 의료·법률·투자 조언이 아닙니다.
