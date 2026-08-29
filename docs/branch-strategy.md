# 브랜치 전략

이 문서는 Git 브랜치 전략과 머지 규칙을 설명합니다.

`master`가 유일한 베이스 브랜치입니다. `develop`을 포함한 **모든 브랜치는
`master`에서 분기**하며, 영구적인 히스토리가 쌓이는 브랜치도 `master` 하나뿐입니다.
`develop`은 오직 테스트 서버 배포를 위해 존재하는 일회성 브랜치입니다.

## 브랜치

### `master`

- 프로덕션 배포 가능한 상태를 유지하는 단일 진실 원천(single source of truth)
- `develop`을 포함한 모든 브랜치의 베이스 브랜치
- 히스토리가 영구적으로 누적되는 유일한 브랜치
- 작업 브랜치의 Pull Request를 통해서만 갱신
- `master`에 푸시하면 빌드와 검증만 수행하며 **배포는 하지 않습니다**
  (`.github/workflows/ci.yml` 참고). 프로덕션 배포는 수동으로 트리거합니다
  ([릴리스](#릴리스) 참고)

### `develop`

- 스테이징/테스트 서버 배포에만 사용하는 **테스트 전용 브랜치**
- `master`에서 분기(리셋)하며, **절대 `master`로 다시 머지하지 않습니다**
- 작업 브랜치를 테스트 서버에서 확인해 보기 위해서만 이곳에 머지합니다
- 릴리스 후에는 `master` 기준으로 다시 만들며, 그동안 쌓인 테스트 머지는 모두
  버립니다

### 작업 브랜치

- `master`에서 분기
- `master`를 대상(base)으로 하는 Pull Request를 통해 `master`로 머지
- 필요하다면 테스트 서버 검증을 위해 `develop`에 먼저 머지 가능

네이밍은 두 형태를 씁니다. 어느 쪽이든 `/` 앞에 범주가 오고 뒤에 하이픈으로 이은
설명이 옵니다.

| 형태 | 예 | 쓰는 때 |
| --- | --- | --- |
| `<타입>/<kebab-case>` | `feat/memo-search`, `fix/login-error`, `chore/turbo-cache-config` | 변경 종류가 뚜렷할 때 |
| `<작성자>/<설명>` | `guesung/환경변수-관리-방식-개선` | 여러 종류가 섞이거나 작업 단위로 묶을 때 |

설명 부분은 **한글도 괜찮습니다.** 브랜치명은 사람이 읽는 이름이고, 이 레포에서는
한글 브랜치가 이미 널리 쓰입니다.

## Pull Request & 머지 규칙

- **베이스 브랜치(대상)**: 항상 `master`
- **머지 방식**: **머지 커밋 생성** — Squash & Merge, Rebase & Merge 모두 금지
  - `master`에 개별 커밋 히스토리를 그대로 보존하기 위함입니다
  - 커밋 히스토리에서 기능 추가 내역을 추적하기 쉬워집니다

```bash
# master에서 작업 브랜치 생성
git checkout master
git pull
git checkout -b feat/memo-search

# ...작업, 커밋...

# master를 대상으로 PR을 연 뒤 머지 커밋 방식으로 머지
gh pr create --base master
gh pr merge --merge
```

## 워크플로

### 테스트 서버 배포

```bash
git checkout develop
git pull origin develop
git merge feat/memo-search
git push origin develop
git checkout feat/memo-search   # 작업 브랜치로 복귀
```

`develop`에 머지했다고 해서 작업이 끝난 것은 **아닙니다**. 작업 브랜치는 별도로
`master`를 향한 Pull Request를 올려야 합니다.

### 릴리스

`master`에 머지해도 아무것도 배포되지 않습니다. 릴리스는 명시적으로 수행하는
별개의 작업입니다.

1. **작업 브랜치에서 버전을 올립니다.** 로컬에서 `/version-update`를 실행하면
   릴리스 노트(`Update.ts`, `ko`/`en` `translation.json`)를 작성하고 모든
   `package.json`의 버전을 올린 뒤, 커밋하고 `v*` 태그를 푸시합니다. 이어서
   `master`로 PR을 열어 머지합니다.
   - `v*` 태그 푸시는 GitHub Release를 생성합니다
     (`.github/workflows/github-release.yml`).
2. **Slack에서 배포합니다.** `master` 빌드가 끝나면 스토어 현황과 배포 버튼이
   담긴 메시지가 Slack에 옵니다. 원하는 대상 버튼을 누르면 그 커밋이 배포되고,
   **다른 버전…**을 누르면 대상과 리비전을 골라 배포합니다. 전체 흐름과 설정은
   [release-flow.md](release-flow.md)를 참고하세요.
   - `app` — iOS 빌드 + TestFlight 제출
   - `extension` — 빌드 + Chrome 웹 스토어 업로드(게시는 수동)
   - `web` — Vercel 프로덕션 배포

   Slack이 막혔다면 Actions → **Release** → *Run workflow*로 같은 일을 할 수
   있습니다. 버튼은 이 워크플로를 대신 실행해 줄 뿐입니다.
3. **`develop`을 리셋합니다** (아래 참고).

| 트리거                 | 실행되는 작업                                       |
| ---------------------- | -------------------------------------------------- |
| PR (모든 브랜치)       | 린트, 타입 체크, 테스트, 빌드 검증                  |
| `develop`에 푸시       | 위 작업 + 스테이징/테스트 서버로 web 배포           |
| `master`에 푸시        | 위 작업 + Slack에 빌드 결과·스토어 현황 게시 — 배포 없음 |
| Slack 배포 버튼        | 체크한 대상의 프로덕션 배포 (Release 워크플로 실행) |
| Actions → **Release**  | 체크한 대상의 프로덕션 배포                         |
| `v*` 태그 푸시         | GitHub Release 생성                                 |

### `develop` 리셋 (릴리스 후)

```bash
git checkout master
git pull origin master
git branch -f develop master
git push --force-with-lease origin develop
```

`develop`에 쌓인 모든 테스트 머지가 버려집니다. 의도된 동작입니다 — `develop`에만
존재하는 작업은 결코 있어서는 안 됩니다.

### 작업 브랜치 최신화

```bash
git checkout feat/memo-search
git merge master        # develop이 아니라 master를 머지
```

## 규칙 정리

| 규칙                                 | 값                                      |
| ------------------------------------ | --------------------------------------- |
| 작업 브랜치의 베이스 브랜치          | `master`                                |
| PR 베이스 브랜치                     | `master`                                |
| PR 머지 방식                         | 머지 커밋 (squash/rebase 금지)          |
| `develop` → `master` 머지            | **금지**                                |
| `develop` → 작업 브랜치 머지         | **금지**                                |
| `develop` force-push                 | 허용, 리셋 시에는 필수                  |
| `develop`에만 존재하는 작업          | **금지** — 반드시 `master`로 PR         |

## 특수 케이스

### 핫픽스

다른 작업과 동일하게 처리합니다. `master`에서 분기해 `master`로 PR을 올립니다.
테스트 서버 검증이 먼저 필요하다면 평소처럼 `develop`에 머지하면 됩니다.

### 오래 유지되는 작업 브랜치

브랜치가 오래되어 뒤처졌다면 `master`를 해당 브랜치로 머지하세요. `develop`을
작업 브랜치로 머지하는 것은 절대 금지입니다 — `develop`에는 다른 사람의 리뷰되지
않은 테스트 머지가 섞여 있습니다.
