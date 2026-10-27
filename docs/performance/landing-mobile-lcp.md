# 랜딩 모바일 LCP 측정 — DB-1244

2026-10-27, 기준 커밋 `4924f1eed`와 구현 커밋 `0b75f777b`를 비교했다.
화면 배치·문구는 유지하고 이미지 응답 크기와 외부 스크립트 다운로드 시점만 변경했다.

## 결과

| 빌드 | 회차 | 성능 점수 | LCP (초) | TBT (ms) | CLS | 전체 전송 (KiB) | 이미지 전송 (KiB) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 변경 전 | 1 | 57 | 10.20 | 360 | 0.000 | 1987 | 622 |
| 변경 전 | 2 | 72 | 6.86 | 230 | 0.045 | 1986 | 622 |
| 변경 전 | 3 | 84 | 4.08 | 171 | 0.045 | 1986 | 622 |
| **변경 전 중앙값** | — | **72** | **6.86** | **230** | **0.045** | **1986** | **622** |
| 변경 후 | 1 | 63 | 7.24 | 386 | 0.000 | 1449 | 83 |
| 변경 후 | 2 | 70 | 6.49 | 304 | 0.045 | 1449 | 83 |
| 변경 후 | 3 | 71 | 6.34 | 284 | 0.045 | 1256 | 83 |
| **변경 후 중앙값** | — | **70** | **6.49** | **304** | **0.045** | **1449** | **83** |

이미지 전송량은 약 622 → 83KiB로 87% 감소했다. LCP 중앙값은 6.86 → 6.49초로
약 5% 줄었지만 성능 점수는 72 → 70점이다. 실행 편차가 크므로 LCP 개선의 확실한
증거로 해석하지 않는다. 운영 CDN 환경에서 재측정해야 한다. 기존 운영 감사의
64점·LCP 9.6초와 이 로컬 결과를 직접 비교하지 않는다.

## 측정 조건과 재현

- Node.js 24.14.0, Next.js 16.3.5 Turbopack 프로덕션 빌드, `BUILD_ENV=staging`.
- Lighthouse 12.2.1, Google Chrome Headless 156.0.0.0, Mac 로컬.
- Lighthouse 기본 모바일 설정: viewport 412×823, DPR 1.75, simulated throttling,
  RTT 150ms, 처리량 1638.4Kbps, CPU slowdown 4배. 별도 사용자 상호작용 없음.
- 두 리비전을 별도 디렉터리에서 빌드했다. 변경 전 `http://localhost:3000/en/introduce`,
  변경 후 `http://localhost:3001/en/introduce`. 3000번은 다른 작업이 사용해 포트만 바꿨다.
- 각 회차는 새 Chrome 프로필/기본 storage reset을 사용한다. 서버 이미지 캐시는
  회차 사이에 지우지 않았다. 변경 후 첫 실행에는 이미지 최적화의 최초 생성 비용도 포함된다.
- 외부 GA/GTM 요청을 막지 않은 상태로 3회씩 순서대로 측정했다. 원격 서비스와
  같은 머신의 부하를 통제하지 못하므로 네트워크·CPU 편차가 있다.

```bash
BUILD_ENV=staging pnpm build:web
pnpm --filter @web-memo/web exec next start --port 3001
CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
  pnpm dlx lighthouse@12.2.1 http://localhost:3001/en/introduce \
  --only-categories=performance --chrome-flags='--headless --no-sandbox' \
  --output=json --output=html --output-path=/tmp/webmemo-lcp-after-1 --quiet
```

원본 HTML·JSON은 측정 머신의 `/tmp/webmemo-lcp-{before,after}-{1,2,3}.report.{html,json}`에
남겼다. Lighthouse 12.2.1과 Chrome 156 조합에서 `TraceElements/RootCauses`의
`frame_sequence` 오류가 발생해 LCP 요소·일부 세부 진단은 제공되지 않는다.
위 성능 점수·LCP·TBT·CLS·전송량은 각 보고서에서 정상 반환된 값이다.

## 구현과 검증

- Hero와 데모 및 공용 랜딩 이미지의 `unoptimized`를 제거하고 CSS 표시 폭에 맞는
  `sizes`를 지정했다. Hero의 LCP 우선 로드와 주석을 유지하고 데모 preload를 제거했다.
- GA/GTM은 `beforeInteractive`에서 기존 dataLayer를 보존하며 `gtag`·초기 `config`·
  `gtm.js` 시작 이벤트를 큐에 넣는다. 최초 URL·제목을 캡처하고 제외 사용자·확장
  client ID 처리를 먼저 실행한다. 외부 파일은 window load 이후 idle 또는 첫
  pointerdown/keydown에 받는다. idle 미지원 환경은 load 이후 2초를 사용한다.
- Channel SDK import·loadScript·boot도 같은 시점으로 늦추고 기존 연결 중 버튼 상태,
  boot 후 상담 열기, 경로 이탈 시 예약 취소·shutdown을 유지했다.
- Sentry ingest·Channel CDN은 LCP 필수 리소스가 아니므로 선제 연결을 추가하지 않았다.
- 새 사용자 행동이 없어 커스텀 이벤트 추가·수정·제거는 없다.
- 전체 타입 검사 15개 작업, `pnpm check`, `pnpm lint`, 웹 프로덕션 빌드 통과.
  코드 검사에는 기존 경고 10개가 남아 있다. bootstrap·분석 지연·채널 lifecycle 단위테스트
  3개 통과. 브라우저 smoke에서 최초 config 1개·제외 플래그·분석 preload 0개·
  상호작용 전 분석 요청 0개·상호작용 후 2개를 확인했다.
- 변경된 `introduceDemo.test.ts`만 실행해 한·영 Hero 단일 preload·반응형 이미지·
  데모 탭 전환·포커스 유지 E2E 7개가 통과했다. Hero 검증의 초기 선택자가 실제 DOM과
  달라 실패한 뒤 alt 기반 접근성 선택자로 수정했다. 포트 충돌을 피하려고 임시 설정과
  `PLAYWRIGHT_BASE_URL=http://localhost:3001`을 사용했으며 로그인 setup은 필요 없어 생략했다.

## 남은 한계

- 로컬 Channel plugin key가 없어 실제 CDN·상담 연결은 측정하지 않았다. 채널 SDK는
  mock 단위테스트로 지연 boot·버튼 활성화·상담 열기·경로 이탈 shutdown을 확인했다.
- GA/GTM 파일을 받기 전에 이탈한 방문의 대기열은 전송되지 않을 수 있다.
  외부 GA 서버의 실제 수집 수량은 이번 검증 범위에 포함하지 않았다.
- GTM의 원격 컨테이너 설정은 바꾸지 않았다. 원본 waterfall에는 직접 gtag 외에
  GTM이 시작한 같은 GA 측정 ID의 gtag 요청도 있었다. 설정 근거 없이 어느 한쪽을
  제거하면 수집이 끊길 수 있어 두 진입점을 유지했다. 다운로드 전체 크기는
  지연 로드만으로 줄어들지 않는다.

## 참고

- [Next.js Image](https://nextjs.org/docs/app/api-reference/components/image): 반응형 sizes와 LCP 우선 로드.
- [Next.js Script](https://nextjs.org/docs/app/api-reference/components/script#lazyonload): idle 로딩 정책.
- [Google data layer](https://developers.google.com/tag-platform/devguides/datalayer): 초기 큐 보존.
- [GA4 page views](https://developers.google.com/analytics/devguides/collection/ga4/views): config의 자동 page_view.
- [Channel.io Quickstart](https://developers.channel.io/en/articles/Quickstart-d27c51d1): loadScript 뒤 boot.
