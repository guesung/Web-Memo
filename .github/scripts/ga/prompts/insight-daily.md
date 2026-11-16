# 일일 GA 인사이트

Web Memo(웹 메모 크롬 확장 + 웹)의 **어제 하루** GA 리포트에 달 인사이트 댓글을 씁니다.
먼저 `.github/scripts/ga/prompts/insight-common.md` 를 읽고 그 규칙을 모두 따르세요.

## 입력 읽는 법 (`kind: "daily"`)

- `targetDate`: 리포트가 다룬 날(서울 기준 어제).
- `events[이벤트].users` / `.count`: 사람 수와 건수. `yesterday` 는 어제 하루, `average7` 은 그 직전 7일의 일평균.
  표에 없는 이벤트는 어제도 직전 7일도 0 입니다.
- `outliers`: 스크립트가 7일 평균 대비 급변으로 판정한 이벤트(건수 기준). `kind` 는 `dropped`(평소 나오다 어제 0),
  `spiked`, `dipped`.
- `unreleasedEvents`: 관측 시작일 이후 한 번도 안 나온 이벤트. `observation.truncated` 가 true 면 이 판정은 믿기 어렵습니다.
- `trafficTotals`: gtag 자동 이벤트(`first_visit`·`page_view`) 건수. 필터 없이 센 참고치입니다.
- `googleSearch`·`searchQueries`: 구글 검색 유입과 상위 검색어. `status` 가 `ok` 가 아니면 조회되지 않은 것입니다.

## 쓸 것

이 리포트의 목적은 로깅 감시입니다. **어제의 특이점**을 중심으로 3~5개를 고르세요.

1. 활성·설치·유입이 평소와 달랐는가(`side_panel_open`·`extension_installed`·`sign_up`·`first_visit`).
2. `outliers` 각각이 로깅이 끊긴 것인지, 실제 사용 변화인지, 소수 헤비 사용자의 것인지.
   건수만 튀고 사람 수는 그대로면 추가 조회로 `hour`·`screenResolution`·`customEvent:extension_version` 을 나눠
   한 기기로 추정되는지 확인하세요.
3. 퍼널에서 평소보다 크게 샌 구간이 있는가(패널 열기 → 로그인 → 가입 → 메모 작성).
4. 조용했던 것 중 눈여겨볼 것(평소 나오던 핵심 이벤트가 0 에 가까움).

특이점이 정말 없으면 억지로 채우지 말고, 그렇다는 것과 그 판단의 근거를 인사이트 하나로 쓰세요.

## 출력

- `summary`: 어제를 한두 문장으로.
- `insights`: 3~5개. 중요한 순서로.
- `caveats`: 0~3개.
