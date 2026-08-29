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
                                    └─ release.yml / notify
                                         └─ Slack ┌──────────────────────────────┐
                                                  │ ✅ 릴리스 완료 — 앱 v1.0.8     │
                                                  │ 📱 iOS (TestFlight)  ✅ 완료   │
                                                  │ 🤖 Android           ❌ 실패   │
                                                  │ [워크플로 실행 보기]           │
                                                  └──────────────────────────────┘
```

버튼을 누른 직후에는 "🚀 배포를 시작했습니다"가 곧바로 올라오고, 실제 제출이
끝나면 위와 같은 결과 메시지가 한 번 더 옵니다. 앱만 iOS/Android로 갈라 보고하는
이유는 그 둘이 별개의 matrix 잡이어서 한쪽만 깨질 수 있기 때문입니다.

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

## master 푸시는 스토어에 올리지 않습니다

`ci.yml`의 `cd-app`은 `deploy_target: "none"`으로 고정되어 있습니다. 빌드가
되는지만 확인하고 산출물은 버립니다(EAS `verify` 프로필이라 빌드 번호도
올라가지 않습니다).

그래서 버튼을 눌렀을 때 앱은 처음부터 다시 빌드합니다(약 30분). 검증 빌드를
재사용하지 않는 이유는 그 빌드에 스토어가 요구하는 단조 증가 빌드 번호가 붙어
있지 않기 때문입니다. "언제 무엇이 올라갔는가"의 답이 항상 Release 워크플로
실행 기록 하나로 모입니다.

## 설정

코드만으로는 동작하지 않습니다. Slack App과 환경변수를 한 번 만들어야 합니다.

### 1. Slack App 설정

**기존 `Web Memo CI` 앱에 그대로 추가합니다.** 새 앱을 만들면 알림을 보내는 앱과
버튼을 받는 앱이 갈라지고 Signing Secret도 둘이 되므로, `SLACK_WEBHOOK_URL`을
소유한 앱 하나로 유지합니다.

<https://api.slack.com/apps> → **Web Memo CI**

- **Interactivity & Shortcuts** → 켜고 Request URL에
  `https://web-memos.vercel.app/api/slack/interactivity`
- **Slash Commands** → **Create New Command**
  - Command: `/배포현황` (원하는 이름으로)
  - Request URL: `https://web-memos.vercel.app/api/slack/commands`
- **OAuth & Permissions** → Bot Token Scopes에 `commands` 추가 → 워크스페이스에
  재설치 → `xoxb-`로 시작하는 **Bot User OAuth Token** 복사
- **Basic Information** → **Signing Secret** 복사 (이미 있는 값 그대로)

봇 토큰을 쓰는 곳은 모달을 여는 `views.open` 한 곳뿐입니다. 메시지 응답은 전부
`response_url`로 가므로 토큰이 필요 없어, 최소 스코프는 슬래시 커맨드용
`commands` 하나입니다. 다만 `views.open`의 스코프 요구가 바뀐 적이 있어
`chat:write`를 같이 넣어두면 재설치를 두 번 하지 않아도 됩니다.

스코프를 추가하면 재설치가 필요합니다. 기존 Incoming Webhook URL은 재설치해도
유지되지만, 재설치 직후 빌드 알림이 한 번 정상적으로 오는지 확인하세요.

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
| `.github/workflows/ci.yml` (`notify`) | 빌드 결과 + 스토어 현황을 Slack에 게시 |
| `.github/workflows/versions.yml` | 배포 현황만 조회해 게시 |
| `.github/workflows/release.yml` | 실제 스토어 제출 (버튼이 이걸 실행) + 결과 알림 |
| `.github/scripts/notify-release-result.mjs` | 릴리스 성패를 타깃별로 Slack에 보고 |
| `.github/scripts/lib/store-versions.mjs` | 스토어 4곳 버전 조회 |
| `.github/scripts/lib/repo-versions.mjs` | 레포에 커밋된 빌드 버전 읽기 |
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
```

버튼이 만드는 `workflow_dispatch`가 제대로 도는지는 `gh`로 먼저 확인할 수 있습니다.

```bash
gh workflow run release.yml --ref master -f app=true -f ref=$(git rev-parse HEAD)
```
