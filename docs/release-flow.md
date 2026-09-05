# Slack에서 배포하기

`master`에 머지하면 빌드가 돌고, 그 결과가 스토어 현황과 함께 Slack으로 옵니다.
메시지의 버튼을 누르면 원하는 대상을 원하는 커밋으로 스토어에 올릴 수 있습니다.
GitHub Actions 화면을 열어 폼을 채울 필요가 없습니다.

브랜치 규칙 자체는 [branch-strategy.md](branch-strategy.md), 버전 번호가 어디서
오는지는 [versioning.md](versioning.md)를 참고하세요.

## 전체 흐름

```
master 머지
   │
   ├─ ci.yml : 린트·타입·테스트 + 영향받은 앱 빌드 검증 (스토어 제출 없음)
   │
   └─ ci.yml / notify
        ├─ 스토어 4곳의 현재 버전 조회
        └─ Slack 게시  ┌──────────────────────────────────────┐
                       │ ✅ master 빌드 성공 — a1b2c3d          │
                       │ 📱 iOS   TestFlight 1.0.8 (49) …      │
                       │ 🤖 Android internal 1.0.7 (49) …      │
                       │ 🧩 확장  게시 1.10.13 · 초안 1.10.14   │
                       │ 🌐 웹    배포 b9f0e21 → 빌드 a1b2c3d   │
                       │ [📱 앱][🌐 웹][🧩 확장][다른 버전…]     │
                       └──────────────────────────────────────┘
                                    │ 클릭
                                    ▼
        apps/web  /api/slack/interactivity   (서명 검증)
                                    │ workflow_dispatch
                                    ▼
        release.yml → cd-app / cd-web / cd-extension → 스토어 제출
                                    │
                                    └─ notify-release.yml (타깃마다 한 번씩)
                                         └─ Slack ┌──────────────────────────────┐
                                                  │ ✅ 앱 릴리스 완료 — 앱 v1.0.8  │
                                                  │ 📱 iOS (TestFlight)  ✅ 완료   │
                                                  │ 🤖 Android           ❌ 실패   │
                                                  │ [워크플로 실행 보기]           │
                                                  └──────────────────────────────┘
```

버튼을 누른 직후에는 "🚀 배포를 시작했습니다"가 곧바로 올라오고, 실제 제출이
끝나면 위와 같은 결과 메시지가 한 번 더 옵니다. 앱만 iOS/Android로 갈라 보고하는
이유는 그 둘이 별개의 matrix 잡이어서 한쪽만 깨질 수 있기 때문입니다.

**결과 알림은 웹·앱·확장이 각자 따로 옵니다.** 셋을 한 메시지로 묶으면 `needs`가
정적이라 알림이 가장 느린 타깃(앱 빌드 약 30분)을 기다립니다. 그러면 1분이면 끝나는
웹 배포 결과도 30분 뒤에야 나갑니다. 타깃마다 `notify-release.yml`을 따로 불러
각자 끝나는 대로 알립니다.

## 배포하는 방법

### 방금 빌드된 커밋을 올릴 때

Slack 메시지에서 **📱 앱 / 🌐 웹 / 🧩 확장** 버튼을 누르고 확인 창에서 *배포*를
누르면 끝입니다. 그 메시지가 가리키는 커밋이 그대로 배포됩니다.

빌드가 실패한 대상에는 버튼이 나오지 않습니다. 빌드도 안 되는 커밋을 스토어로
보내는 경로를 아예 열어두지 않기 위해서입니다.

### 과거 버전을 올릴 때

**다른 버전…** 버튼을 누르면 모달이 열립니다. 대상을 여러 개 체크할 수 있고,
최근 태그 10개와 `master` 커밋 10개 중에서 배포할 리비전을 고릅니다.

워크플로 정의는 항상 최신 `master`의 것을 쓰고, 체크아웃 대상만 과거로
돌립니다. 그래서 과거 커밋을 올려도 릴리스 파이프라인 자체는 최신입니다.

### 지금 무엇이 올라가 있는지 볼 때

Slack에서 `/배포현황`(등록한 슬래시 커맨드)을 실행하면 `versions.yml`이 돌아
현재 스토어 버전과 레포의 빌드 버전을 대조해 채널에 게시합니다. 조회에 20~30초
걸립니다. 이 메시지에도 배포 버튼이 붙어 있어, 빌드 알림을 놓쳤어도 여기서
바로 올릴 수 있습니다.

읽는 법:

| 줄 | 스토어 쪽 값 | 의미 |
| --- | --- | --- |
| 📱 iOS | `TestFlight 1.0.8 (49)` | 마케팅 버전 1.0.8, EAS가 매긴 빌드 번호 49 |
| 📱 iOS | `App Store 1.0.7` | 실제로 판매 중인(심사를 통과한) 버전 |
| 🤖 Android | `internal 1.0.7 (49)` | 트랙명 + 릴리스명 + versionCode |
| 🧩 확장 | `게시 1.10.13 · 초안 1.10.14` | 업로드는 됐지만 **게시 버튼을 아직 안 누른** 상태 |
| 🌐 웹 | `배포 b9f0e21` | 지금 응답하는 인스턴스의 커밋 |

확장은 `cd-extension.yml`이 `publish: false`로 올리므로 게시본과 초안이 거의
항상 다릅니다. 게시는 크롬 웹 스토어 대시보드에서 직접 눌러야 합니다.

## master 푸시는 스토어에 올리지 않습니다 (빌드는 재사용합니다)

`ci.yml`의 `cd-app`·`cd-extension`은 `deploy_target: "none"`으로 고정되어
있습니다. 빌드만 하고 스토어에는 아무것도 올리지 않습니다. 제출은 Slack 버튼
→ `release.yml` 한 경로뿐이라, "언제 무엇이 올라갔는가"의 답이 Release 워크플로
실행 기록 하나로 모입니다.

**대신 그 빌드 산출물은 릴리스에서 그대로 재사용합니다.** 버튼을 눌렀을 때
`release.yml`은 배포할 커밋에서 CI가 올려둔 아티팩트를 먼저 찾고
(`.github/scripts/find-reusable-artifact.sh`), 있으면 내려받아 제출만 합니다.
앱은 플랫폼당 약 30분, 확장은 약 3분을 아낍니다.

- **앱 아티팩트에는 프로파일이 이름에 붙습니다** (`ios-build-ci` /
  `ios-build-verify`). PR 검증 빌드는 버려지는 산출물이라 `verify`(빌드 번호
  고정)로 굽고, master 머지분만 `ci`(빌드 번호 자동 증가)로 구워 제출 가능한
  상태로 남깁니다. 릴리스는 `-ci`로 끝나는 것만 찾습니다.
  `/reset-develop`으로 develop을 master로 리셋하면 두 브랜치가 같은 커밋을
  갖게 되는데, 그때 develop CI가 만드는 `verify` 산출물을 제출하면 스토어가
  중복 빌드 번호로 거절합니다. 이름을 가르는 이유가 이것입니다.
- **확장은 CI에서도 `BUILD_ENV=production`으로 굽습니다.** `staging`이 아니면
  production이라 릴리스가 구울 것과 같은 산출물입니다.
- **못 찾으면 기존대로 새로 빌드합니다.** 아티팩트는 7일 뒤 만료되고, 변경이
  없어 CI가 그 앱을 아예 안 빌드했을 수도 있습니다. 태그·과거 커밋을 `ref`로
  넘겨 배포할 때도 마찬가지입니다.

## develop 머지는 테스트 서버로 나갑니다

`develop`에 푸시하면 `cd-web.yml`이 `deploy_target: staging`으로 돌아 Vercel에
배포하고 스테이징 별칭을 새 배포로 옮깁니다. 그 결과를 **같은 잡의 마지막 스텝**이
같은 Slack 채널에 알립니다.

```
develop 푸시
   │
   ├─ ci.yml : 린트·타입·테스트 + 영향받은 앱 빌드 검증
   │
   └─ cd-web (deploy_target: staging)
        ├─ Vercel 배포 + 별칭 이동
        └─ Notify staging deploy
             └─ Slack 게시  ┌────────────────────────────────────────┐
                            │ 🚀 테스트 서버 배포 완료 — a1b2c3d       │
                            │ feat: 메모 정렬 추가 · guesung          │
                            │ [🌐 테스트 서버 열기][실행 로그 보기]     │
                            └────────────────────────────────────────┘
```

master 알림과 달리 스토어를 조회하지 않고 배포 버튼도 달지 않습니다. 여기서
나가는 것은 웹 하나뿐이고 그 배포는 이미 끝난 뒤라 누를 것이 없습니다.

| 상태 | 언제 |
| --- | --- |
| 🚀 테스트 서버 배포 완료 | 배포 스텝 성공 |
| ❌ 테스트 서버 배포 실패 | Vercel 배포 또는 별칭 이동에서 실패 |
| ❌ 테스트 서버 빌드 실패 | 설치·Vercel 빌드에서 멈춰 배포까지 못 감 |

배포 스텝의 `outcome`이 `skipped`라는 것은 그 앞에서 멈췄다는 뜻이라, 뒤의 두 경우를
그것으로 갈라 읽습니다.

**웹 변경이 없어 `cd-web`이 아예 안 돌면 알림도 없습니다.** 올라간 것이 없으면 알릴
것도 없습니다.

**취소된 run도 알리지 않습니다.** `develop`은 `cancel-in-progress`라 푸시가 연달아
들어오면 앞선 run이 매번 취소되는데, 뒤이은 run이 어차피 배포하고 그 결과를 다시
알리므로 취소 알림은 소음만 됩니다. 그래서 스텝 조건이 `always()`가 아니라
`!cancelled()`입니다 — 실패는 통과시키고 취소만 뺍니다.

### 왜 별도 잡이 아니라 스텝인가

별도 잡으로 빼면 `needs`가 정적이라 브랜치별로 다르게 줄 수 없습니다. master 알림과
같은 모양(`needs: [ci, changes, cd-app, cd-extension, cd-web]`)을 쓰면 테스트 서버
알림이 앱 빌드(약 30분)를 기다리게 됩니다. `apps/app`과 `apps/web`이 둘 다
`@web-memo/shared`에 의존해 shared를 한 줄만 고쳐도 앱 빌드가 딸려 오므로, 그 대기는
드물지 않습니다.

배포한 잡 안에서 보내면 배포 직후 곧바로 나가고, 체크아웃·node 셋업도 이미 그 잡에
있는 것을 그대로 씁니다.

### 배포된 커밋을 확인하지 않는 이유

스테이징은 `--prod` 없이 빌드해 **Preview 배포**로 나갑니다. Vercel Deployment
Protection이 Preview에 걸려 있어, 자격 증명 없는 요청은 `/api/version` 대신
`vercel.com/login` 리다이렉트를 받습니다. 그래서 master 알림이 웹에 대해 하는
"배포 커밋 대조"를 여기서는 할 수 없습니다. 넣어두면 항상 실패로 찍혀 경고가
무의미해지므로 아예 넣지 않았습니다.

확인까지 하고 싶다면 Vercel의 Protection Bypass for Automation 시크릿을 만들어
`x-vercel-protection-bypass` 헤더로 요청해야 합니다. 시크릿이 하나 늘어납니다.

## 설정

코드만으로는 동작하지 않습니다. Slack App과 환경변수를 한 번 만들어야 합니다.

### 1. Slack App 설정

> **⚠️ 웹훅을 보내는 앱과 Interactivity를 켜는 앱이 반드시 같아야 합니다.**
> 버튼 클릭은 그 메시지를 보낸 앱에 등록된 Request URL로만 갑니다. 다른 앱에
> 켜두면 버튼을 눌러도 **아무 일도 일어나지 않고 에러도 뜨지 않습니다** —
> 요청 자체가 서버에 도달하지 않기 때문입니다. 실제로 이걸로 한 번 헤맸습니다.

**기존 `Web Memo CI` 앱에 그대로 추가합니다.** 새 앱을 만들면 알림을 보내는 앱과
버튼을 받는 앱이 갈라지고 Signing Secret도 둘이 되므로, `SLACK_WEBHOOK_URL`을
소유한 앱 하나로 유지합니다.

<https://api.slack.com/apps> → **Web Memo CI**

- **Interactivity & Shortcuts** → 켜고 Request URL에
  `https://www.webmemo.xyz/api/slack/interactivity`
- **Slash Commands** → **Create New Command**
  - Command: `/배포현황` (원하는 이름으로)
  - Request URL: `https://www.webmemo.xyz/api/slack/commands`
- **OAuth & Permissions** → Bot Token Scopes에 `commands` 추가 → 워크스페이스에
  재설치 → `xoxb-`로 시작하는 **Bot User OAuth Token** 복사
- **Basic Information** → **Signing Secret** 복사 (이미 있는 값 그대로)

봇 토큰을 쓰는 곳은 모달을 여는 `views.open` 한 곳뿐입니다. 메시지 응답은 전부
`response_url`로 가므로 토큰이 필요 없어, 최소 스코프는 슬래시 커맨드용
`commands` 하나입니다. 다만 `views.open`의 스코프 요구가 바뀐 적이 있어
`chat:write`를 같이 넣어두면 재설치를 두 번 하지 않아도 됩니다.

스코프를 추가하면 재설치가 필요합니다. 기존 Incoming Webhook URL은 재설치해도
유지되지만, 재설치 직후 빌드 알림이 한 번 정상적으로 오는지 확인하세요.

#### 버튼이 아무 반응 없을 때

증상이 "에러도 안 뜨고 그냥 아무 일도 안 일어남"이면 요청이 서버에 도달조차
못 한 것입니다. 서버 문제가 아니므로 코드를 보지 말고 아래를 순서대로 봅니다.

1. **슬래시 커맨드는 되는가?** 된다면 도메인·서명 시크릿·라우트는 모두 정상입니다.
   두 경로는 같은 앱, 같은 도메인, 같은 서명 검증 코드를 씁니다. 그러면 남는 차이는
   Interactivity 설정 하나뿐입니다.
2. **Interactivity를 켠 앱이 웹훅을 보내는 그 앱인가?** (위 경고 참고)
3. **Request URL에 오타는 없는가?** 흔한 것들:
   `web-memo`(s 빠짐) / `interactive`(끝 3글자 빠짐) / 끝에 붙은 슬래시.
4. **Save Changes를 눌렀는가?** 버튼이 화면 오른쪽 맨 아래에 있어 스크롤하지 않으면
   보이지 않습니다.

요청이 도달하기만 하면 실패는 반드시 Slack 메시지로 사유가 뜹니다
(`views.open 실패: …`). 그러니 **아무 메시지도 없다 = 도달 안 함**으로 읽으면 됩니다.

Vercel 런타임 로그에서 `POST /api/slack/interactivity` 유무로도 확인할 수 있습니다.

```bash
vercel logs https://www.webmemo.xyz --scope gueit214s-projects
```

다만 이 로그는 `console.error` 출력이 누락되는 경우가 있어, **로그가 없다는 것이
에러가 없다는 증거는 아닙니다.** 요청 도달 여부 판단에만 쓰세요.

### 2. GitHub PAT 만들기

<https://github.com/settings/personal-access-tokens> 에서 fine-grained 토큰을
만들고, `guesung/Web-Memo` 레포에 **Actions: Read and write** 권한만 줍니다.
버튼 클릭이 `release.yml` / `versions.yml`을 실행하는 데 쓰입니다.

### 3. Vercel 환경변수 (Production)

| 이름 | 값 |
| --- | --- |
| `SLACK_SIGNING_SECRET` | Slack App의 Signing Secret |
| `SLACK_BOT_TOKEN` | `xoxb-`로 시작하는 봇 토큰 |
| `GITHUB_DISPATCH_TOKEN` | 위에서 만든 PAT |
| `GITHUB_DISPATCH_REPOSITORY` | (선택) 기본값 `guesung/Web-Memo` |

`--sensitive`로 등록하면 런타임에는 정상적으로 주입되지만 `vercel env pull`이 실제 값
대신 `[SENSITIVE]` 문자열을 돌려줍니다. 그 값을 그대로 API에 보내면 `invalid_auth`가
나므로, **토큰이 틀렸다고 오진하기 쉽습니다.** 값 검증은 `vercel env pull`이 아니라
발급처(Slack App 페이지, GitHub 토큰 설정)에서 하세요.

이 값들은 **의도적으로 `@web-memo/env`의 `CONFIG`에 넣지 않았습니다.** `CONFIG`는
`packages/env/.env`에서 오고 그 파일은 확장 프로그램 빌드도 함께 읽으므로,
PAT나 Slack 시크릿을 거기 두면 확장 번들에 섞여 들어갈 수 있습니다.

### 4. GitHub 시크릿

스토어 조회는 GitHub Actions에서만 돕니다. Vercel에 자격 증명을 복제하지 않기
위한 선택입니다. 아래는 대부분 배포에 이미 쓰이던 것들입니다.

| 이름 | 쓰이는 곳 | 이미 있는지 |
| --- | --- | --- |
| `SLACK_WEBHOOK_URL` | 알림 게시 | ✅ |
| `EXPO_ASC_API_KEY_P8` | iOS 스토어 버전 조회 | ✅ |
| `EXPO_ANDROID_SERVICE_ACCOUNT_JSON` | Android 스토어 버전 조회 | ✅ |
| `CLIENT_ID` / `CLIENT_SECRET` / `REFRESH_TOKEN` | 확장 초안 버전 조회 | ✅ |

웹 주소는 시크릿이 아니라 레포에 추적된 `packages/env/.env.production`의 `WEB_URL`에서
읽습니다([environment-variables.md](environment-variables.md) 참고).

App Store Connect의 키 ID·발급자 ID·앱 ID는 시크릿이 아니라
`apps/app/eas.json`의 `submit.production.ios`에서 읽습니다. 값을 두 곳에 두면
갈라지기 때문입니다.

## 관련 파일

| 파일 | 역할 |
| --- | --- |
| `.github/workflows/ci.yml` (`notify`) | master 빌드 결과 + 스토어 현황을 Slack에 게시 |
| `.github/workflows/cd-web.yml` (`Notify staging deploy`) | develop 테스트 서버 배포 결과를 Slack에 게시 |
| `.github/workflows/versions.yml` | 배포 현황만 조회해 게시 |
| `.github/workflows/release.yml` | 실제 스토어 제출 (버튼이 이걸 실행) |
| `.github/workflows/notify-release.yml` | 릴리스 타깃 하나의 결과를 Slack에 게시 (release.yml이 타깃별로 호출) |
| `.github/scripts/notify-release-result.mjs` | 릴리스 성패를 타깃별로 Slack에 보고 |
| `.github/scripts/notify-staging-deploy.mjs` | 테스트 서버 배포 성패를 Slack에 보고 |
| `.github/scripts/lib/store-versions.mjs` | 스토어 4곳 버전 조회 |
| `.github/scripts/lib/repo-versions.mjs` | 레포에 커밋된 빌드 버전 읽기 |
| `.github/scripts/lib/run-context.mjs` | 워크플로 실행 맥락(환경변수·커밋 제목) 읽기 |
| `.github/scripts/lib/slack-blocks.mjs` | Slack 메시지·버튼 조립 |
| `apps/web/src/modules/slack/` | 서명 검증, workflow_dispatch, 모달 |
| `apps/web/src/app/api/slack/interactivity/` | 버튼·모달 제출 수신 |
| `apps/web/src/app/api/slack/commands/` | 슬래시 커맨드 수신 |
| `apps/web/src/app/api/version/` | 배포된 웹이 자기 커밋을 알려주는 엔드포인트 |

## 로컬에서 확인하기

두 스크립트 모두 `SLACK_WEBHOOK_URL` 없이 돌리면 실제로 보내지 않고 결과만
찍습니다.

```bash
# 스토어 현황만 조회 (자격 증명 없는 채널은 "자격 증명 없음"으로 표시됩니다)
GITHUB_SHA=$(git rev-parse HEAD) node .github/scripts/report-store-versions.mjs

# 빌드 알림에 실제로 나갈 Slack 페이로드 확인
GITHUB_REPOSITORY=guesung/Web-Memo GITHUB_RUN_ID=1 GITHUB_SHA=$(git rev-parse HEAD) \
  BUILD_RESULTS='{"ci":"success","app":"success","web":"skipped","extension":"success"}' \
  node .github/scripts/notify-build-ready.mjs

# 릴리스 결과 알림에 나갈 Slack 페이로드 확인 (TARGET: app / extension / web)
GITHUB_REPOSITORY=guesung/Web-Memo GITHUB_RUN_ID=1 \
  TARGET=extension RESULT=success \
  node .github/scripts/notify-release-result.mjs

# 테스트 서버 배포 알림에 나갈 Slack 페이로드 확인
GITHUB_REPOSITORY=guesung/Web-Memo GITHUB_RUN_ID=1 GITHUB_SHA=$(git rev-parse HEAD) \
  DEPLOY_OUTCOME=success \
  node .github/scripts/notify-staging-deploy.mjs
```

버튼이 만드는 `workflow_dispatch`가 제대로 도는지는 `gh`로 먼저 확인할 수 있습니다.

```bash
gh workflow run release.yml --ref master -f app=true -f ref=$(git rev-parse HEAD)
```
