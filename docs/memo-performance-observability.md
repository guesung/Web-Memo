# 메모 화면 지연 관측

이 문서는 `webmemo.xyz`의 로그인 후 메모 화면을 Grafana에서 관측하는 설정과 판정 기준입니다. 대상 경로는 `/memos`, `/memos/wish`, `/memos/star`, `/memos/reading`이며 언어 접두사는 제거해 기록합니다. 브라우저의 기존 Sentry 성능 추적과 오류 보고는 유지합니다.

## 수집 구성

| 구간 | 수집 수단 | 의미 |
| --- | --- | --- |
| 브라우저 | Grafana Faro 수동 measurement | 첫 접속과 내부 이동을 나눠 화면 틀, 메모 내용, 첫 페이지 조회의 지연을 기록합니다. |
| Next 서버 | Sentry의 OpenTelemetry span processor → Grafana Cloud OTLP/Tempo | 허용한 메모 경로의 Next.js GET 요청 처리 시간을 기록합니다. |
| 기존 계측 | Sentry, GTM Web Vitals | 오류·트레이스 및 Web Vitals는 기존대로 유지합니다. |

브라우저의 `shell_ready`는 하이드레이션 후 React가 화면 틀을 커밋한 시점입니다. 서버가 HTML을 처음 그린 시각이나 정확한 최초 페인트와 같지 않습니다. `data_ready`는 첫 페이지 조회 결과가 화면에 전달된 시점이고, `content_ready`는 첫 목록 배치 또는 정상 빈 상태를 표시한 시점입니다. 오류를 빈 상태로 계산하지 않습니다. 하드 로드에는 `ttfb`와 `fcp`도 기록합니다. 내부 검색·필터·더 보기 동작은 경로 이동 지표와 분리합니다. 첫 접속에는 Navigation Timing의 시작점, 앱 내부 이동에는 라우터 이동 시작점을 사용합니다. 이동이 취소되거나 30초 안에 완료되지 않으면 `navigation_end` 단계에 각각 `cancelled` 또는 `timeout` 결과를 기록하고 성공 지연 백분위에서 제외합니다.

서버 요청 span은 브라우저 목록이 표시될 때까지의 전체 시간이나 Supabase 조회 시간만을 뜻하지 않습니다. Sentry 서버 트레이스의 기본 샘플링은 10%이므로 Grafana 서버 span 건수와 Faro 브라우저 measurement 건수를 직접 비교하지 않습니다.

## Grafana Cloud 설정

2026-09-24에 Grafana Cloud Free 스택 `guesung`(인스턴스 ID `1158410`,
리전 `prod-ap-northeast-0`)을 생성했습니다. 스택 주소는
`https://guesung.grafana.net`이고 OTLP HTTP traces endpoint는
`https://otlp-gateway-prod-ap-northeast-0.grafana.net/otlp/v1/traces`입니다.
이 주소와 인스턴스 ID는 공개 설정 정보이며, API 토큰은 저장소에 기록하지 않습니다.

Frontend Observability 앱 `web-memo-web`을 만들었습니다. Faro 허용 출처는 `https://www.webmemo.xyz`, `https://staging.webmemo.xyz`, `https://web-memo-git-grafana-gueit214s-projects.vercel.app`입니다. 마지막 주소는 이 PR 브랜치의 안정 Vercel alias입니다.

Faro 세션 샘플링은 10%로 설정했습니다. Grafana 설정 화면의 Sampling Rate 입력은 초기화 코드 예시를 생성하므로 앱 코드의 `sessionTracking.samplingRate: 0.1`에도 반영했습니다. Faro는 자체 세션 ID로 표본 결정을 세션 단위로 유지하므로, 무작위 비식별 세션 ID만 측정 메타데이터에 남깁니다. 로그인 사용자 ID와 연결하지 않습니다. 스택은 Free 플랜이며 사용량 한도에 맞게 수집량을 제한합니다.

1. Grafana Cloud 스택에서 **Frontend Observability** 앱을 만들고 Faro collector URL을 확인합니다. 해당 URL을 Vercel 프로젝트의 `NEXT_PUBLIC_FARO_URL`에 등록합니다. 이 주소는 공개 값이며 Next 빌드 때 번들에 들어가므로 변경 후 재배포합니다.
2. Grafana Cloud의 OTLP HTTP traces endpoint와 Access Policy의 쓰기 권한 토큰을 준비합니다. Vercel 프로젝트에 `GRAFANA_OTLP_ENDPOINT`와 `GRAFANA_OTLP_AUTHORIZATION`을 등록합니다. 인증 값에는 `Basic <base64(instance_id:token)>` 전체를 넣습니다. **인증 값은 서버에서만 읽고 로그에 출력하지 않습니다.**
3. Grafana 설정 값은 Vercel의 production·preview에 등록하고 재배포합니다. Grafana 정책 토큰은 90일 만료로 발급했으므로 2026-12-23 전에 교체합니다. Vercel은 Development 환경에서 Sensitive 변수를 지원하지 않아 `GRAFANA_OTLP_AUTHORIZATION`은 production·preview에만 등록했습니다. 로컬 개발에서는 토큰을 저장소나 `.env` 파일에 두지 않고, 필요할 때 셸 환경 변수로만 전달합니다. endpoint와 Faro collector URL은 비밀이 아니므로 세 환경에 등록했습니다. 각 변수가 빠지면 해당 Grafana 전송만 비활성화됩니다.
4. Grafana Frontend Observability에서 `web-memo-web` 앱의 measurement를 열어 메모 경로와 단계별 소요 시간을 확인합니다. Explore의 Tempo에서는 `app.memo.server_request` span을 찾습니다. 첫 HTML 응답의 서버 trace와 브라우저 trace가 항상 연결되는 것은 아니므로 동일 trace ID가 확인되지 않으면 별도 관측값으로 다룹니다.

토큰 발급, Vercel 환경변수 등록과 실제 운영 데이터 수신은 계정 접근 권한이 있는 환경에서 확인해야 합니다. 설정 후에는 `hard`/`navigation`, `shell`/`content`/`query`, 경로별로 p50·p75·p95와 성공·오류·취소 건수를 확인하고, 배포 전후를 같은 조건으로 비교합니다.

## 수집 제한과 점검

Grafana에 보낼 값은 정규화된 메모 경로, 탐색 종류, 고정된 단계와 결과, 지연시간, Faro가 만든 비식별 세션 ID로 제한합니다. 세션 ID는 무작위 값이며 로그인 사용자 ID와 연결하지 않습니다. 메모 본문·ID·제목, 검색어, 원문 URL과 쿼리 문자열, 사용자 식별자, 쿠키, 인증 헤더와 요청 본문을 보내지 않습니다. 세션 ID를 Loki 라벨로 사용하지 않습니다. Faro는 세션 샘플링을 위해서만 `SessionInstrumentation`을 사용하며, `beforeSend`에서 session lifecycle 이벤트를 차단합니다. 자동 로그·오류·리플레이·리소스·웹 트레이싱은 사용하지 않습니다. 서버는 `app.memo.server_request` span만 정제해 OTLP로 전송합니다.

검증할 때는 DevTools의 Faro 수집 요청과 Grafana에 저장된 measurement를 함께 확인합니다. 검색어와 임의의 민감한 문자열을 입력한 뒤 전송 payload에 그 문자열이 없는지 확인합니다. 목록·정상 빈 상태·오류·캐시 적중·뒤로/앞으로 이동·빠른 연속 이동을 각각 확인하고, 성공 지연 백분위에는 오류·취소·타임아웃을 포함하지 않습니다. 서버리스 환경에서는 배포 직후 첫 요청의 span도 도착하는지 확인합니다.

관련 공식 문서: [Grafana Frontend Observability](https://grafana.com/docs/grafana-cloud/observe-and-act/monitor-applications/frontend-observability/get-started/instrument-nextjs/), [Grafana Faro 세션 추적과 샘플링](https://grafana.com/docs/grafana-cloud/observe-and-act/monitor-applications/frontend-observability/instrument/session-tracking/), [Grafana OTLP 수집](https://grafana.com/docs/opentelemetry/grafana-cloud/), [Sentry OpenTelemetry 확장](https://docs.sentry.io/platforms/javascript/guides/nextjs/opentelemetry/using-opentelemetry-apis__v10.x/), [Vercel `waitUntil`](https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package#waituntil).
