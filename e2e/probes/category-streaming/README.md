# Category streaming regression

Node 24와 production 웹 빌드, 기존 테스트 계정의 `e2e/.auth/user.json`이 필요하다.
일반 로그인 준비는 `docs/architecture.md`의 QA 절차를 따른다. 개인 계정의 인증값을 복사하지 않는다.

저장소 루트에서 `pnpm -F @web-memo/web build`를 마친 뒤 서버를 별도 터미널에서 실행한다.
다른 작업이 쓰는 서버와 포트를 재사용하지 않는다.

```sh
cd apps/web
WM_DIAG_DELAY_CATEGORY_MS=5000 WM_DIAG_CATEGORY_FIXTURE=success \
node --import ../../e2e/probes/category-streaming/serverFetch.mjs \
  node_modules/next/dist/bin/next start --port 3116
```

저장소 루트의 다른 터미널에서 같은 고정 조건을 전달한다.

```sh
WM_DIAG_DELAY_CATEGORY_MS=5000 WM_DIAG_CATEGORY_FIXTURE=success \
PLAYWRIGHT_BASE_URL=http://localhost:3116 \
pnpm -F e2e exec playwright test -c playwright.category-streaming.config.ts
```

서버와 probe 양쪽의 fixture를 `empty`로 바꾸면 정상 빈 카테고리를 검증한다.
고정 지연은 3000/5000ms를 지원한다. 서버 bootstrap은 `--import`로 명시적으로 불러온
진단 프로세스에서만 동작하며, category GET만 합성 응답으로 바꾼다. 일반 앱 실행과 운영 배포에는 포함되지 않는다.
로그는 합성 조건·요청 시작/종료 시각만 출력한다. 서버 인증은 기존 경로를 사용하며,
브라우저 REST는 mock store와 guard로 차단한다. 실제 메모·카테고리를 생성하거나 삭제하지 않는다.

현재 probe는 대기 중 shell/목록 GET 시작, category 부분 Skeleton, 정상/빈 결과,
브라우저 category 중복 0회, 모바일 Sheet와 다크 모드, 대기 중 내부 이동을 검증한다.
서버 요청 1회 판정은 `CATEGORY_STREAMING_SERVER` 숫자 로그를 탐색 구간과 함께 확인한다.
처음 도착하는 `responseStart`와 최종 HTML 응답의 `finalResponseHeadersStart`를 혼동하지 않는다.

trace/screenshot/video와 Playwright의 실패 DOM snapshot을 비활성화하고 안전 reporter를 쓴다.
실패를 재시도로 초록불로 만들지 않는다. 실행 후 직접 시작한 진단 서버만 종료한다.
