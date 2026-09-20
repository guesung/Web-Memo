# Slack에서 배포하기

`master`에 머지하면 빌드가 돌고, 그 결과가 머지 하나당 Slack 스레드 하나에 모여 옵니다.
타깃(웹·확장·앱)별 빌드 성공 댓글에는 그 타깃의 배포 버튼이 바로 붙습니다. 스레드의
마지막 댓글에는 스토어 현황과 전체 버튼이 붙습니다. 어느 쪽 버튼이든 누르면 원하는
대상을 원하는 커밋으로 스토어에 올릴 수 있습니다.
GitHub Actions 화면을 열어 폼을 채울 필요가 없습니다.

브랜치 규칙 자체는 [branch-strategy.md](branch-strategy.md), 버전 번호가 어디서
오는지는 [versioning.md](versioning.md)를 참고하세요.

## 전체 흐름

```
master 머지
   │
   ├─ ci.yml : 린트·타입·테스트 + 영향받은 앱 빌드 검증 (스토어 제출 없음)
   │          웹은 상용 환경으로 빌드해 도메인 없이 올려 둡니다 (라이브는 그대로)
   │
   ├─ ci.yml / slack-thread : 푸시 직후 Slack에 스레드 루트를 만들고 ts를 냅니다
   │
   ├─ ci.yml / notify-web · notify-extension · notify-app
   │     └─ 자기 타깃이 끝나는 대로 스레드에 댓글
   │          ┌──────────────────────────────────────┐
   │          │ ✅ 확장 빌드 성공                      │
   │          │ [🧩 확장 배포][다른 버전…]             │
   │          │ [⬇️ 확장 다운로드][워크플로 보기]       │
   │          └──────────────────────────────────────┘
   │
   └─ ci.yml / notify : 모든 타깃이 끝난 뒤, 스레드의 마지막 댓글
        ├─ 스토어 4곳의 현재 버전 조회
        └─ Slack 댓글  ┌──────────────────────────────────────┐
                       │ ✅ master 빌드 성공                    │
                       │ 메모 목록 정렬 옵션을 추가한다          │
                       │ a1b2c3d                               │
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
                                                  │ ✅ 앱 릴리스 완료              │
                                                  │ 앱 v1.0.8 · 정렬 옵션 추가     │
                                                  │ 📱 iOS (TestFlight)  ✅ 완료   │
                                                  │ 🤖 Android           ❌ 실패   │
                                                  │ [워크플로 실행 보기]           │
                                                  └──────────────────────────────┘
                                         (웹은 성공하면 [🌐 웹 열기]가 함께 붙습니다)
```

**릴리스는 타깃별로 줄을 섭니다.** `release.yml`의 `concurrency` 그룹이
`release-app` / `release-web` / `release-extension`으로 갈려 있어, 앱 배포(약 30분)가
웹 배포(승격이면 약 30초, 새로 빌드하면 약 1.5분)를 막지 않습니다. 대기하는 것은 같은 타깃의 중복 제출뿐입니다.
워크플로 하나를 한 그룹으로 묶으면 서로 다른 타깃끼리도 무한정 줄을 서게 됩니다.
`cancel-in-progress: false`라 진행 중인 배포를 끊지는 않습니다. 다만 대기하는 제출은
하나만 유지되어, 같은 타깃에 대기 제출이 있을 때 세 번째 제출이 들어오면 앞선 대기
제출이 취소됩니다.

**Actions 그래프에서 앱 릴리스에 웹 알림이 물려 보이는 것은 렌더링 아티팩트입니다.**
`needs`상 세 알림은 각자 자기 타깃만 봅니다(`notify-web`은 `[preflight, release-web]`).
재사용 워크플로(`uses:`)의 자식 잡을 컬럼으로 펼치는 과정에서 엣지가 옆 컬럼 노드에
붙어 그려집니다. 의존 관계의 진실은 그래프가 아니라 `release.yml`입니다.

버튼을 누른 직후에는 "🚀 배포를 시작했습니다"가 곧바로 올라오고, 실제 제출이
끝나면 위와 같은 결과 메시지가 한 번 더 옵니다. 앱만 iOS/Android로 갈라 보고하는
이유는 그 둘이 별개의 matrix 잡이어서 한쪽만 깨질 수 있기 때문입니다.

**결과 알림은 웹·앱·확장이 각자 따로 옵니다.** 셋을 한 메시지로 묶으면 `needs`가
정적이라 알림이 가장 느린 타깃(앱 빌드 약 30분)을 기다립니다. 그러면 1분이면 끝나는
웹 배포 결과도 30분 뒤에야 나갑니다. 타깃마다 `notify-release.yml`을 따로 불러
각자 끝나는 대로 알립니다.

## master 머지는 하나의 스레드로 모입니다

푸시 직후 `slack-thread` 잡이 채널에 루트 메시지를 하나 만들고, 그 뒤의 결과는 모두
그 스레드의 댓글로 달립니다. 채널 최상위에 새로 생기는 것은 루트 하나뿐입니다.

| 메시지 | 잡 | 언제 나가는가 |
| --- | --- | --- |
| 루트 (🔀 master 머지, PR 제목, PR 번호·브랜치·작성자·커밋) | `slack-thread` | 푸시 직후. 다른 잡을 기다리지 않습니다 |
| ✅/❌ 웹 빌드 (성공이면 배포 버튼) | `notify-web` | `cd-web`이 끝나는 대로 |
| ✅/❌ 확장 빌드 (성공이면 배포 버튼) | `notify-extension` | `cd-extension`이 끝나는 대로 |
| ✅/❌ 앱 빌드 (성공이면 배포 버튼) | `notify-app` | `cd-app`이 끝나는 대로 (약 30분) |
| 요약 (스토어 현황 + 배포 버튼) | `notify` | 모든 타깃이 끝난 뒤. 스레드의 마지막 댓글 |

웹·확장 결과는 앱 빌드를 기다리지 않습니다. 타깃별 잡이 자기 `cd-*`만 `needs`로 걸기 때문입니다.

타깃 댓글은 `changes` 출력과 잡 결과의 조합으로 정합니다(`decideTargetReply`).

| `changes` | 결과 | 댓글 |
| --- | --- | --- |
| true | success | ✅ 성공 + 배포 · 다른 버전 · 워크플로 버튼 (확장은 다운로드 버튼도) |
| true | failure | ❌ 실패 + 로그 링크 (버튼 없음) |
| true | skipped | 없음. CI 실패로 밀린 경우이며 요약 댓글이 CI 실패를 알립니다 |
| true | cancelled | 없음 |
| false | 무엇이든 | 없음. 변경이 없어 안 돈 것입니다 |

앱은 플랫폼을 나누지 않고 "앱 빌드" 하나로 알립니다. iOS 빌드는 임시로 빠져 있어
`cd-app`은 android만 돕니다.

**웹·확장·앱이 하나도 안 바뀐 머지는 "배포 대상 변경 없음" 한 줄로 스레드를 닫습니다.**
문서나 `.github`만 고친 머지가 여기 해당합니다. 루트는 푸시 직후 만들어지므로 이 댓글이 없으면
아래에 아무것도 없는 루트만 남습니다. `ci`가 통과했고 세 타깃이 전부 skipped일 때만 답니다.
`ci`가 실패하거나 취소됐으면 요약 댓글이 그 사실을 알리고, 스레드가 없으면(Secret 미등록,
루트 생성 실패) 예전처럼 아무것도 보내지 않습니다. 웹훅으로 최상위에 내려보내지 않습니다.

**`slack-thread`는 `cd-*`의 `needs`에 넣지 않습니다.** 넣으면 PR 이벤트에서 이 잡이
skipped이거나 실패했을 때 `cd-*`가 암묵적 `success()` 조건 때문에 통째로 skipped됩니다.
알림 잡들은 반대로 `slack-thread`를 `needs`로 걸되 `always()`로 돌립니다.

**스레드를 못 만들면 요약은 그대로 나갑니다.** 봇 토큰·채널 ID 시크릿이 없거나 루트
생성이 실패하면 `thread_ts`가 빈 값이 됩니다. 그때 요약 댓글은 기존처럼 웹훅으로 채널
최상위에 나가 배포 버튼이 살아 있습니다. 타깃 댓글은 낱개 메시지로 흩어지지 않도록
`::warning::`만 남기고 건너뜁니다.

**알림 스크립트는 실패해도 잡을 실패시키지 않습니다.** Slack 전송이 깨져도 exit 0으로
끝나고, `::warning::`에 Slack이 준 `error` 값(`invalid_auth`, `channel_not_found` 등)이
남습니다. 예전에는 웹훅 실패가 예외가 되어 알림 잡이 빨갛게 됐습니다.

**버튼을 누른 뒤의 메시지는 그대로 채널 최상위입니다.** "🚀 배포를 시작했습니다"와
릴리스 결과(`notify-release.yml`)는 이번에 스레드로 옮기지 않았습니다. 스레드 댓글 안
버튼의 확인 메시지가 스레드로 갈지 최상위로 갈지는 확인하지 못했습니다
(`respondToSlack`이 `thread_ts`를 보내지 않습니다).

### 머지가 연달아 들어오면 커밋마다 따로 돕니다

master에 머지가 몇 분 안에 연달아 들어오면 커밋마다 CI가 병렬로 끝까지 돌고, 스레드도
커밋마다 하나씩 생깁니다. `ci.yml`의 동시성 그룹이 master에서는 커밋 sha 단위라 서로
기다리지도 취소하지도 않습니다. PR과 develop은 같은 ref의 앞선 run을 취소합니다
(develop의 취소는 [테스트 서버 알림](#develop-머지는-테스트-서버로-나갑니다)에서 다룹니다).

- **스레드 도착 순서가 커밋 순서와 다를 수 있습니다.** 루트 메시지는 푸시 직후에 만들어지지만
  빌드 댓글은 그 커밋의 빌드가 끝나는 대로 달립니다. 앞 커밋의 앱 빌드(약 30분)가 뒤 커밋의
  웹 빌드보다 늦게 끝나면 댓글이 섞여 도착합니다.
- **앱 변경이 있는 머지가 겹치면 앱 빌드도 병렬로 돕니다.** 플랫폼당 약 30분의 러너 시간이
  겹친 만큼 늘어납니다.
- **각 run이 자기 커밋의 변경만 판정합니다.** `changes` 잡이 push 직전 커밋
  (`github.event.before`)과 비교하므로, 앞선 run이 취소되지 않으면 어느 커밋의 변경도
  판정에서 빠지지 않습니다.

예전에는 그룹이 ref 단위(`ci-refs/heads/master`)라 GitHub이 대기 run을 하나만 남기고 앞선
대기 run을 취소했습니다. 취소된 run은 잡이 하나도 뜨지 않아 그 커밋에는 CI 검증도, 스레드도,
빌드 알림도 없었습니다. PR #517이 슬랙 알림에 없던 이유입니다. #509의 CI가 도는 동안 #517,
#513, #514가 연달아 머지되어 #517과 #513의 run이 잡 하나 없이 취소됐습니다.

## 배포하는 방법

### 방금 빌드된 커밋을 올릴 때

스레드의 **✅ 웹 / 확장 / 앱 빌드 성공** 댓글에서 그 타깃의 배포 버튼을 누르고 확인 창에서
*배포*를 누르면 끝입니다. 웹·확장은 앱 빌드(약 30분)를 기다리지 않고 자기 빌드가 끝나는
대로 버튼이 나옵니다. 스레드 마지막의 요약 댓글에도 같은 버튼이 모여 있습니다. 그 댓글이
가리키는 커밋이 그대로 배포됩니다.

빌드가 실패한 대상에는 버튼이 나오지 않습니다. 빌드도 안 되는 커밋을 스토어로
보내는 경로를 아예 열어두지 않기 위해서입니다.

### 상용 웹을 바로 열어볼 때

웹 릴리스가 성공하면 결과 메시지("✅ 웹 릴리스 완료")에 **🌐 웹 열기** 버튼이 붙어
상용 주소(`packages/env/.env.production`의 `WEB_URL`)로 이동합니다. 실패하거나 취소되면
붙이지 않습니다. 그 주소는 아직 이전 커밋을 서빙하기 때문입니다. 테스트 서버는 develop
배포 알림의 **🌐 테스트 서버 열기**가 같은 역할을 합니다(스테이징 `WEB_URL`).

웹 **빌드 성공** 댓글에는 열기 버튼을 달지 않습니다. 그 시점에는 상용에 아직 새 커밋이
올라가지 않았습니다.

### 빌드된 확장을 바로 받아 설치할 때

확장 **빌드 성공** 댓글의 **⬇️ 확장 다운로드**를 누르면 그 빌드의 결과물
(`extension-production-vX.Y.Z` 아티팩트)이 내려받아집니다. 압축을 푼 빌드라 받아서
풀고 `chrome://extensions`에서 *압축해제된 확장 프로그램을 로드합니다*로 바로 설치할 수
있습니다. 스토어에는 올리지 않는 경로라 게시 전 확인용입니다.

- GitHub에 로그인해 이 레포를 볼 수 있는 사람만 받을 수 있습니다.
- 아티팩트는 보관 기간(현재 약 7일)이 지나면 링크가 죽습니다. 그 뒤에는 버튼이 없는
  채로 알림이 나갑니다.
- 아티팩트 목록 조회가 실패해도 알림은 그대로 나가고 이 버튼만 빠집니다.
  `notify-extension` 잡이 이를 위해 `actions: read` 권한을 가집니다.

### 과거 버전을 올릴 때

**다른 버전…** 버튼을 누르면 모달이 열립니다. 배포할 리비전은 `master`의 최근 커밋
10개 중에서 고릅니다. 태그로는 고르지 않습니다.

- **타깃별 댓글에서 누르면 그 대상으로 고정된 모달이 열립니다.** "배포 대상" 체크박스가
  없고 제목이 `🌐 웹 배포`처럼 대상을 알려줍니다. 그 서비스의 버튼을 따로 누르는 자리라
  대상을 다시 고르게 할 이유가 없기 때문입니다. 버전 입력 칸도 그 대상의 것만 나옵니다
  (앱은 `앱 버전`, 확장은 `확장 버전`, 웹은 버전이 없어 커밋 선택만 남습니다).
- **스레드 마지막 요약 댓글에서 누르면** 대상을 여러 개 체크할 수 있는 모달이 열립니다.

워크플로 정의는 항상 최신 `master`의 것을 쓰고, 체크아웃 대상만 과거로
돌립니다. 그래서 과거 커밋을 올려도 릴리스 파이프라인 자체는 최신입니다.

### 버전을 올려서 배포할 때

**다른 버전…** 모달의 `앱 버전` / `확장 버전` 칸에 새 버전을 적으면, 배포를 누르는
순간 파이프라인이 `apps/app/app.json`·`apps/chrome-extension/package.json`을 고쳐
**`master`에 직접 커밋**하고 그 커밋을 배포합니다. 로컬 `/version-update` → PR →
머지를 거치지 않습니다.

- 비워두면 버전은 그대로고, 고른 커밋이 그대로 올라갑니다.
- **과거 커밋을 고른 상태에서는 버전을 못 바꿉니다.** 버전 커밋은 `master`
  끝에 쌓이는데 배포할 내용은 과거라, 둘이 다른 트리가 되어 무엇을 올렸는지
  나중에 설명할 수 없기 때문입니다.
- 그 커밋은 `ci`·`tests_e2e`를 거치지 않습니다 — `master` 보호가
  `enforce_admins: false`라 관리자 토큰이 우회합니다. 버전 한 줄만 바뀌므로
  감수한 선택입니다.
- **버전을 바꾸면 재사용할 CI 아티팩트가 없어 새로 빌드합니다.** 앱은 플랫폼당
  약 30분, 확장은 약 3분. 버전이 산출물에 들어가므로 피할 수 없습니다.

릴리스 노트(`Update.ts`·`translation.json`)는 여기서 받지 않습니다. 사람이 쓰는
문장이라 `/version-update`나 손으로 따로 넣습니다.

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

## master 푸시는 웹을 상용에 올리지 않습니다 (미승격 배포를 승격합니다)

**Vercel의 Git 자동 배포는 `master`와 `develop`에서 꺼 두었습니다.** `vercel.json`의
`git.deploymentEnabled`가 `master: false`, `develop: false`입니다. 예전에는 Vercel Git 연동이 `master` 푸시마다
웹을 상용(`www.webmemo.xyz`)에 바로 배포했고(배포 출처 `git`, 생성자 `vercel[bot]`), 그래서
Slack의 웹 배포 버튼과 무관하게 머지만 하면 라이브가 바뀌었습니다. 버튼이 만든 배포는 같은
커밋을 한 번 더 빌드한 것이었습니다. `develop`도 같은 이유입니다. 테스트 서버는 GitHub Actions가
직접 배포하고 별칭을 옮기므로(아래 "develop 머지는 테스트 서버로 나갑니다") Vercel Git 연동이
같은 푸시를 한 번 더 빌드할 이유가 없습니다. 기능 브랜치의 프리뷰 배포는 그대로 남습니다.

이제 상용 웹이 바뀌는 길은 **Slack 웹 배포 버튼 → `release.yml` 하나**입니다.

```
master 머지 (웹 변경 있음)
   └─ ci.yml / cd-web (deploy_target: staged)
        └─ 상용 환경으로 빌드 → vercel deploy --prebuilt --prod --skip-domain
           -m releaseSha=<커밋>          ← 상용 대상이지만 도메인이 안 붙습니다
Slack [🌐 웹 배포] 클릭
   └─ release.yml / cd-web (deploy_target: production)
        ├─ 이 커밋의 미승격 배포를 찾으면 → vercel promote (재빌드 없음, 약 30초)
        └─ 못 찾으면 → 새로 빌드해서 배포 (기존 경로, 약 1.5분)
```

- **미승격 배포는 메타 `releaseSha`로 찾습니다.** READY이고 상용 대상이며 그 커밋의 것 중 가장
  나중에 만든 하나입니다(`.github/scripts/lib/staged-deployment.mjs`). 자동으로 붙는
  `githubCommitSha`·`githubCommitRef`는 체크아웃 방식에 따라 값이 달라져(`HEAD`로 찍히는
  배포가 있습니다) 쓰지 않습니다.
- **못 찾는 경우는 기존처럼 빌드합니다.** 웹 변경이 없어 CI가 웹을 안 돌린 커밋, 최근 100건 밖의
  과거 커밋, 이 방식을 도입하기 전 커밋이 그렇습니다. 조회가 실패해도 배포를 막지 않고 재빌드로
  내려갑니다.
- **웹의 `다른 버전…`으로 과거 커밋을 고르면** 그 커밋의 미승격 배포가 있는 한 즉시 롤백처럼
  승격됩니다.
- **환경변수는 미승격 배포를 만든 시점의 값입니다.** 버튼을 늦게 누르면 그사이 Vercel에서 바꾼
  값은 반영되지 않습니다. 반영하려면 새로 빌드가 필요합니다(값을 바꾼 뒤 `master`에 다시 머지하거나
  `cd-web`을 staged로 다시 실행).
- **미승격 배포는 웹이 바뀐 머지마다 하나씩 쌓입니다.** 라이브가 아니고 도메인도 없습니다.
- **미승격 배포의 URL은 로그인 없이 열리지 않습니다.** 프로젝트의 SSO 보호가
  `prod_deployment_urls_and_all_previews`라서, `curl`로 응답을 확인할 수 없습니다. 도메인이
  안 붙었는지는 Vercel 대시보드나 API에서 그 배포의 `alias`가 비어 있는지로 봅니다.
- 프로젝트의 "도메인 자동 연결"(`autoAssignCustomDomains`)이 켜져 있어도 `--skip-domain`이
  우선해야 합니다. 이 방식의 안전은 그 한 가지에 달려 있으므로 `cd-web.yml`의 staged 경로를
  고칠 때는 새 배포의 `alias`가 비어 있는지 다시 확인하세요.

## develop 머지는 테스트 서버로 나갑니다

`develop`에 푸시하면(Vercel의 Git 자동 배포는 꺼져 있어 이 경로만 배포합니다) `cd-web.yml`이
`deploy_target: staging`으로 돌아 Vercel에
배포하고 스테이징 별칭을 새 배포로 옮깁니다. 그 결과를 `ci.yml`의 `notify-staging` 잡이
머지 스레드에 댓글로 알립니다. 스레드의 루트는 master와 같이 `slack-thread` 잡이 푸시
직후에 만듭니다(`develop`에서도 돕니다).

```
develop 푸시
   │
   ├─ ci.yml : 린트·타입·테스트 + 영향받은 앱 빌드 검증
   │
   ├─ ci.yml / slack-thread : 스레드 루트 (🔀 develop 머지)
   │
   ├─ cd-web (deploy_target: staging)
   │    └─ Vercel 배포 + 별칭 이동. 결과는 staging_outcome output으로 내보냅니다
   │
   └─ ci.yml / notify-staging : cd-web만 기다렸다가 스레드에 댓글을 답니다
             └─ Slack 댓글  ┌────────────────────────────────────────┐
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

**취소된 run도 알리지 않습니다.** `develop`만 `cancel-in-progress`라 푸시가 연달아
들어오면 앞선 run이 매번 취소되는데, 뒤이은 run이 어차피 배포하고 그 결과를 다시
알리므로 취소 알림은 소음만 됩니다. master는 커밋마다 병렬로 돌아 취소되지 않습니다
([머지가 연달아 들어오면 커밋마다 따로 돕니다](#머지가-연달아-들어오면-커밋마다-따로-돕니다)). 그래서 `notify-staging`은 `cd-web` 결과가 `success`
또는 `failure`일 때만 돕니다. `cancelled`와 `skipped`(CI 실패로 밀림)는 알리지 않습니다.

### 왜 스텝이 아니라 별도 잡인가

예전에는 배포한 잡의 마지막 스텝이 알렸습니다. 별도 잡으로 빼면 master 알림과 같은
모양(`needs: [ci, changes, cd-app, cd-extension, cd-web]`)이 되어 테스트 서버 알림이
앱 빌드(약 30분)를 기다린다는 이유였습니다. `apps/app`과 `apps/web`이 둘 다
`@web-memo/shared`에 의존해 shared를 한 줄만 고쳐도 앱 빌드가 딸려 오므로 그 대기는
드물지 않습니다.

지금은 `notify-staging`이 `cd-web`만 `needs`로 걸어서 그 대기가 없습니다. `cd-web`이
배포 스텝의 `outcome`을 `staging_outcome` output으로 내보내므로 "배포하다 실패"와
"빌드에서 멈춤"의 구분도 그대로입니다.

스텝으로 두려면 스레드 ts(`slack-thread`의 output)를 받으려고 `cd-web`이 `slack-thread`를
`needs`로 걸어야 하는데, 그러면 PR 이벤트에서 `cd-web`이 통째로 skipped될 수 있습니다.
잡으로 나누면 `cd-*`의 실행 조건을 전혀 건드리지 않습니다. Slack이 깨져도 `build-web`
잡의 결론이 바뀌지 않는 것은 덤입니다.

`cd-web.yml`의 `Notify staging deploy` 스텝은 남아 있지만 `workflow_dispatch`로 직접
실행한 경우에만 돕니다. 그 경로는 `ci.yml`을 거치지 않아 스레드도 `notify-staging`도
없으므로 여기서 웹훅으로 최상위에 알립니다. `workflow_call`로 불렸을 때의
`github.event_name`은 호출한 쪽의 이벤트(push)라 이 스텝은 돌지 않습니다. 직접 실행에는
봇 토큰이 없어 "웹훅으로 보냅니다" 경고가 남지만 알림은 정상입니다.

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
- **OAuth & Permissions** → Bot Token Scopes에 `commands`와 `chat:write` 추가 → 워크스페이스에
  재설치 → `xoxb-`로 시작하는 **Bot User OAuth Token** 복사
- **Basic Information** → **Signing Secret** 복사 (이미 있는 값 그대로)

봇 토큰을 쓰는 곳은 두 군데입니다. 하나는 모달을 여는 `views.open`(Vercel 런타임)이고,
다른 하나는 머지 스레드를 만들고 댓글을 다는 `chat.postMessage`(GitHub Actions)입니다.
버튼을 누른 뒤의 메시지 응답은 여전히 전부 `response_url`로 가므로 토큰이 필요 없습니다.
스레드 알림에는 **`chat:write`가 필수**입니다. 봇이 채널 멤버가 아니면 `not_in_channel`로
거절되므로 알림 채널에 봇을 초대해야 합니다(`/invite @Web Memo CI`).

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

`SLACK_BOT_TOKEN`은 GitHub 시크릿에도 같은 값으로 따로 등록합니다(아래 4번).
Vercel과 GitHub Actions는 서로의 값을 읽지 못합니다.

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
| `SLACK_WEBHOOK_URL` | 알림 게시 (스레드를 못 만들 때의 폴백 포함) | ✅ |
| `SLACK_BOT_TOKEN` | 머지 스레드 생성·댓글(`chat.postMessage`). Vercel의 같은 이름과 같은 값 | 사람이 등록 |
| `SLACK_CHANNEL_ID` | 스레드를 만들 채널 ID. 웹훅 URL에서는 얻을 수 없습니다 | 사람이 등록 |
| `EXPO_ASC_API_KEY_P8` | iOS 스토어 버전 조회 | ✅ |
| `EXPO_ANDROID_SERVICE_ACCOUNT_JSON` | Android 스토어 버전 조회 | ✅ |
| `CLIENT_ID` / `CLIENT_SECRET` / `REFRESH_TOKEN` | 확장 초안 버전 조회 | ✅ |

위 두 스레드용 시크릿을 등록하기 전에는 스레드가 생기지 않고 기존처럼 웹훅 최상위
메시지로 나갑니다. 등록했는데도 스레드가 안 생기면 Actions 실행의 `::warning::`을
보세요. Slack이 준 `error` 값이 적혀 있습니다.

웹 주소는 시크릿이 아니라 레포에 추적된 `packages/env/.env.production`의 `WEB_URL`에서
읽습니다([environment-variables.md](environment-variables.md) 참고).

App Store Connect의 키 ID·발급자 ID·앱 ID는 시크릿이 아니라
`apps/app/eas.json`의 `submit.production.ios`에서 읽습니다. 값을 두 곳에 두면
갈라지기 때문입니다.

## 관련 파일

| 파일 | 역할 |
| --- | --- |
| `.github/workflows/ci.yml` (`slack-thread`) | master·develop 푸시마다 머지 스레드의 루트 메시지를 만들고 ts를 냄 |
| `.github/workflows/ci.yml` (`notify-web` · `notify-extension` · `notify-app`) | master 타깃 하나의 빌드 결과를 스레드에 댓글로 게시 |
| `.github/workflows/ci.yml` (`notify`) | master 스토어 현황 + 배포 버튼을 스레드의 마지막 댓글로 게시 |
| `.github/workflows/ci.yml` (`notify-staging`) | develop 테스트 서버 배포 결과를 스레드에 댓글로 게시 |
| `.github/workflows/cd-web.yml` (`Notify staging deploy`) | `workflow_dispatch`로 직접 실행한 경우의 테스트 서버 알림(웹훅) |
| `.github/workflows/versions.yml` | 배포 현황만 조회해 게시 |
| `.github/workflows/release.yml` | 실제 스토어 제출 (버튼이 이걸 실행) |
| `.github/workflows/notify-release.yml` | 릴리스 타깃 하나의 결과를 Slack에 게시 (release.yml이 타깃별로 호출) |
| `.github/scripts/notify-release-result.mjs` | 릴리스 성패를 타깃별로 Slack에 보고 |
| `.github/scripts/notify-staging-deploy.mjs` | 테스트 서버 배포 성패를 Slack에 보고 |
| `.github/scripts/notify-thread-root.mjs` | 머지 스레드의 루트 메시지를 만들고 `thread_ts`를 잡 output으로 냄 |
| `.github/scripts/notify-thread-reply.mjs` | 타깃 하나(웹·확장·앱)의 빌드 결과를 스레드 댓글로 보고 |
| `.github/scripts/lib/slack-api.mjs` | `chat.postMessage` 호출, 스레드 우선·웹훅 폴백 전송 |
| `.github/scripts/lib/thread-messages.mjs` | 루트·타깃 댓글의 페이로드 조립과 댓글 여부 판정 |
| `.github/scripts/lib/store-versions.mjs` | 스토어 4곳 버전 조회 |
| `.github/scripts/lib/repo-versions.mjs` | 레포에 커밋된 빌드 버전 읽기 |
| `.github/scripts/lib/run-context.mjs` | 워크플로 실행 맥락(환경변수·커밋 제목·머지 원본 PR) 읽기 |
| `.github/scripts/lib/slack-blocks.mjs` | Slack 메시지·버튼 조립 |
| `.github/scripts/lib/run-artifacts.mjs` | 실행의 아티팩트 조회, 확장 다운로드 링크 판정 |
| `apps/web/src/modules/slack/` | 서명 검증, workflow_dispatch, 모달 |
| `apps/web/src/app/api/slack/interactivity/` | 버튼·모달 제출 수신 |
| `apps/web/src/app/api/slack/commands/` | 슬래시 커맨드 수신 |
| `apps/web/src/app/api/version/` | 배포된 웹이 자기 커밋을 알려주는 엔드포인트 |

## 로컬에서 확인하기

스크립트는 모두 웹훅(스레드 스크립트는 봇 토큰과 채널 ID)이 없으면 실제로 보내지 않고
결과만 찍습니다.

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

# 스레드 루트에 나갈 Slack 페이로드 확인 (PR 머지 커밋이면 PR 번호·브랜치가 붙습니다)
GITHUB_REPOSITORY=guesung/Web-Memo GITHUB_SHA=$(git rev-parse HEAD) \
  GITHUB_REF_NAME=master GITHUB_ACTOR=guesung \
  node .github/scripts/notify-thread-root.mjs

# 타깃 댓글에 나갈 Slack 페이로드 확인 (TARGET: web / extension / app, CHANGED·RESULT는 needs 값)
GITHUB_REPOSITORY=guesung/Web-Memo GITHUB_RUN_ID=1 \
  TARGET=web CHANGED=true RESULT=success SLACK_THREAD_TS=1.1 \
  node .github/scripts/notify-thread-reply.mjs
```

버튼이 만드는 `workflow_dispatch`가 제대로 도는지는 `gh`로 먼저 확인할 수 있습니다.

```bash
gh workflow run release.yml --ref master -f app=true -f ref=$(git rev-parse HEAD)
```
