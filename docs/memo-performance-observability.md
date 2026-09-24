# 메모 화면 지연 관측

이 문서는 `webmemo.xyz`의 로그인 후 메모 화면을 Grafana에서 관측하는 설정과 판정 기준입니다. 대상 경로는 `/memos`, `/memos/wish`, `/memos/star`, `/memos/reading`이며 언어 접두사는 제거해 기록합니다. 브라우저의 기존 Sentry 성능 추적과 오류 보고는 유지합니다.

## 수집 구성

| 구간 | 수집 수단 | 의미 |
| --- | --- | --- |
| 브라우저 | Grafana Faro 수동 measurement | 첫 접속과 내부 이동을 나눠 화면 틀, 메모 내용, 첫 페이지 조회의 지연을 기록합니다. |
| Next 서버 | Sentry의 OpenTelemetry span processor → Grafana Cloud OTLP/Tempo | 서버가 메모 데이터를 프리패치하는 시간을 기록합니다. |
| 기존 계측 | Sentry, GTM Web Vitals | 오류·트레이스 및 Web Vitals는 기존대로 유지합니다. |

브라우저의 `shell_ready`는 하이드레이션 후 React가 화면 틀을 커밋한 시점입니다. 서버가 HTML을 처음 그린 시각이나 정확한 최초 페인트와 같지 않습니다. `data_ready`는 첫 페이지 조회 결과가 화면에 전달된 시점이고, `content_ready`는 첫 목록 배치 또는 정상 빈 상태를 표시한 시점입니다. 오류를 빈 상태로 계산하지 않습니다. 하드 로드에는 `ttfb`와 `fcp`도 기록합니다. 내부 검색·필터·더 보기 동작은 경로 이동 지표와 분리합니다. 첫 접속에는 Navigation Timing의 시작점, 앱 내부 이동에는 라우터 이동 시작점을 사용합니다. 이동이 취소되거나 30초 안에 완료되지 않으면 `navigation_end` 단계에 각각 `cancelled` 또는 `timeout` 결과를 기록하고 성공 지연 백분위에서 제외합니다.

서버 프리패치와 브라우저 첫 페이지 조회는 다른 쿼리 키를 사용하므로 별개 구간입니다. 서버 span은 브라우저 목록이 표시될 때까지의 전체 시간을 뜻하지 않습니다. Sentry 서버 트레이스의 기본 샘플링은 10%이므로 Grafana 서버 span 건수와 Faro 브라우저 measurement 건수를 직접 비교하지 않습니다.

## Grafana Cloud 설정

1. Grafana Cloud 스택에서 **Frontend Observability** 앱을 만들고 Faro collector URL을 확인합니다. 해당 URL을 Vercel 프로젝트의 `NEXT_PUBLIC_FARO_URL`에 등록합니다. 이 주소는 공개 값이며 Next 빌드 때 번들에 들어가므로 변경 후 재배포합니다.
2. Grafana Cloud의 OTLP HTTP traces endpoint와 Access Policy의 쓰기 권한 토큰을 준비합니다. Vercel 프로젝트에 `GRAFANA_OTLP_ENDPOINT`와 `GRAFANA_OTLP_AUTHORIZATION`을 등록합니다. 인증 값에는 `Basic <base64(instance_id:token)>` 전체를 넣습니다. **인증 값은 서버에서만 읽고 로그에 출력하지 않습니다.**
3. Vercel의 production·preview·development에 필요한 값을 등록하고 재배포합니다. 로컬에서는 `pnpm env:pull`로 development 값을 받습니다. 세 값 모두 선택 사항이며 빠지면 해당 Grafana 전송만 비활성화됩니다.
4. Grafana Frontend Observability에서 `web-memo-web` 앱의 measurement를 열어 메모 경로와 단계별 소요 시간을 확인합니다. Explore의 Tempo에서는 `app.memo.prefetch` span을 찾습니다. 첫 HTML 응답의 서버 trace와 브라우저 trace가 항상 연결되는 것은 아니므로 동일 trace ID가 확인되지 않으면 별도 관측값으로 다룹니다.

Grafana 계정 생성, 토큰 발급, Vercel 환경변수 등록과 실제 운영 데이터 수신은 계정 접근 권한이 있는 환경에서 확인해야 합니다. 설정 후에는 `hard`/`navigation`, `shell`/`content`/`query`, 경로별로 p50·p75·p95와 성공·오류·취소 건수를 확인하고, 배포 전후를 같은 조건으로 비교합니다.

## 수집 제한과 점검

Grafana에 보낼 값은 정규화된 메모 경로, 탐색 종류, 고정된 단계와 결과, 지연시간, 연결용 비식별 ID로 제한합니다. 메모 본문·ID·제목, 검색어, 원문 URL과 쿼리 문자열, 사용자 식별자, 쿠키, 인증 헤더와 요청 본문을 보내지 않습니다. 연결용 ID를 Loki 라벨로 사용하지 않습니다. Faro 자동 로그·오류·리플레이·리소스·트레이싱은 사용하지 않습니다. 서버는 `app.memo.*` span만 정제해 OTLP로 전송합니다.

검증할 때는 DevTools의 Faro 수집 요청과 Grafana에 저장된 measurement를 함께 확인합니다. 검색어와 임의의 민감한 문자열을 입력한 뒤 전송 payload에 그 문자열이 없는지 확인합니다. 목록·정상 빈 상태·오류·캐시 적중·뒤로/앞으로 이동·빠른 연속 이동을 각각 확인하고, 성공 지연 백분위에는 오류·취소·타임아웃을 포함하지 않습니다. 서버리스 환경에서는 배포 직후 첫 요청의 span도 도착하는지 확인합니다.

관련 공식 문서: [Grafana Frontend Observability](https://grafana.com/docs/grafana-cloud/observe-and-act/monitor-applications/frontend-observability/get-started/instrument-nextjs/), [Grafana OTLP 수집](https://grafana.com/docs/opentelemetry/grafana-cloud/), [Sentry OpenTelemetry 확장](https://docs.sentry.io/platforms/javascript/guides/nextjs/opentelemetry/using-opentelemetry-apis__v10.x/), [Next.js `after`](https://nextjs.org/docs/app/api-reference/functions/after).
