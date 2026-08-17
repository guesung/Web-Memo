---
name: version-update
description: 릴리스 대상(확장/앱/릴리스 노트)을 골라 해당 버전만 올리고, 릴리스 노트를 ko/en으로 작성한다.
---

# /version-update — 트랙별 버전 올리기

> 이 레포는 **버전 트랙이 3개**이며 서로 동기화하지 않습니다.
> 전체 규칙은 [docs/versioning.md](../../docs/versioning.md)를 따릅니다.

| 트랙 | 파일 | 올리는 시점 |
| --- | --- | --- |
| 확장 | `apps/chrome-extension/package.json` → `version` | 확장을 웹스토어에 올릴 때 |
| 앱 | `apps/app/app.json` → `version` | iOS 앱을 릴리스할 때 (buildNumber는 EAS가 자동 증가) |
| 릴리스 노트 | `apps/web/src/constants/Update.ts` + ko/en `translation.json` | 사용자에게 알릴 변경이 있을 때 |

**웹에는 버전이 없습니다.** 웹 배포만 하는 경우 올릴 버전이 없습니다.

## 사용법

```
/version-update [트랙] [버전] [설명]
```

예시:
```
/version-update extension 1.10.15 "메모 그리드 스켈레톤 로딩 추가"
/version-update notes 1.10.15 "하이라이트 기능 추가"
/version-update app 1.0.8
```

인자가 없으면 어떤 트랙을 올릴지 사용자에게 먼저 묻습니다.

## 실행 절차

### 0단계: 브랜치 확인

```bash
git branch --show-current
```

`master`이면 최신화한 뒤 작업 브랜치를 분기합니다:

```bash
git checkout master
git pull origin master
git checkout -b chore/version-update
```

> ⚠️ `develop`을 `master`로 머지하지 않습니다. `develop`은 테스트 서버 전용
> 브랜치이며, 모든 변경은 작업 브랜치 → `master` PR로만 반영됩니다.
> ([docs/branch-strategy.md](../../docs/branch-strategy.md))

### 1단계: 변경 내용 분석

```bash
git log --oneline -10
git diff HEAD~5 --stat
```

무엇이 바뀌었는지 파악해 어떤 트랙을 올려야 하는지 판단합니다.
확장 코드가 안 바뀌었으면 확장 버전을 올리지 않습니다.

### 2단계: 버전 결정

- 현재 값을 읽고 patch를 올립니다 (예: `1.10.14` → `1.10.15`).
- 확장 버전은 **웹스토어가 단조 증가를 강제**하므로 절대 내리거나 재사용하지 않습니다.

### 3단계: 트랙별 파일 수정

**확장을 올리는 경우** — `apps/chrome-extension/package.json`의 `version`만 수정합니다.
다른 `package.json`에는 `version` 필드가 없으며, **다시 추가하지 않습니다.**

**앱을 올리는 경우** — `apps/app/app.json`의 `version`만 수정합니다.
`ios.buildNumber`는 EAS가 서버에서 자동 증가시키므로 건드리지 않습니다.

**릴리스 노트를 올리는 경우** — 아래 3개 파일을 함께 수정합니다.

`apps/web/src/constants/Update.ts` — 배열 **맨 앞**에 추가:
```typescript
{
    date: "YYYY.MM.DD",
    version: "vX.Y.Z",
},
```

`apps/web/src/modules/i18n/locales/ko/translation.json` — `updates.versions`에 추가:
```json
"vX.Y.Z": {
    "title": "업데이트 제목",
    "content": ["변경 내용 1", "변경 내용 2"]
},
```

`apps/web/src/modules/i18n/locales/en/translation.json` — 같은 키로 영문 추가.

- 사용자 관점의 문장으로 씁니다. 내부 구현 용어는 쓰지 않습니다.
- `Update.ts`의 `version` 문자열은 두 `translation.json`의 키와 **정확히 일치**해야 합니다.
- 여기에 항목을 추가하면 웹에서 업데이트 알림 모달이 한 번 뜹니다.
  알릴 가치가 없는 변경은 추가하지 않습니다.

### 4단계: 검증

```bash
pnpm check
pnpm exec turbo type-check --affected
```

- ko/en 양쪽에 같은 키가 있는지 확인합니다 (`/i18n-check`).
- `Update.ts`의 버전 문자열과 translation 키가 일치하는지 확인합니다.

### 5단계: PR

`/pr`로 `master` 대상 Draft PR을 올립니다.
릴리스 노트를 올린 경우, 머지 후 릴리스 커밋에 `v<버전>` 태그를 답니다
(태그 push가 GitHub Release를 생성합니다).

배포는 별개입니다 — Actions → **Release**에서 대상을 골라 실행합니다.

## 업데이트 제목 가이드

| 변경 유형 | 한국어 | English |
| --- | --- | --- |
| 버그 수정 | 안정성 개선 | Stability improvements |
| 새 기능 | [기능명] 추가 | Added [feature] |
| 성능 개선 | 성능 최적화 | Performance optimization |
| UI 개선 | 디자인 개선 | Design improvements |
| 보안 수정 | 보안 개선 | Security improvements |

## 주의사항

- **트랙을 섞지 않습니다.** 웹만 배포하는데 확장 버전을 올리지 않습니다.
- 버전은 semantic versioning을 따릅니다 (major.minor.patch).
- 날짜 형식은 반드시 `YYYY.MM.DD`.
- 새 릴리스 노트는 항상 목록의 **맨 앞**에 추가합니다.
- `apps/chrome-extension` 외의 `package.json`에 `version`을 추가하지 않습니다.

## 인자

`$ARGUMENTS` — 트랙(`extension` / `app` / `notes`), 버전, 설명 (모두 선택).
