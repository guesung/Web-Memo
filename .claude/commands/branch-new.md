---
name: branch-new
description: master 브랜치로 이동(필요 시)한 뒤, 현재 커밋들을 바탕으로 새 브랜치를 생성한다. 인자가 주어지면 그 문구를 바탕으로 브랜치명을 만든다.
---

# /branch-new — master 기준 새 브랜치 생성

> 이 파일은 전역 `~/.claude/commands/branch-new.md`를 **오버라이드**합니다.
> 이 레포의 베이스 브랜치는 `develop`이 아니라 `master`입니다.
> (참고: [docs/branch-strategy.md](../../docs/branch-strategy.md))

## 동작

1. 현재 브랜치를 확인한다 (`git branch --show-current`).
2. 현재 브랜치가 `master`가 **아니라면** `git checkout master`로 이동한다.
   - 작업 중인 변경사항이 있다면 사용자에게 stash/commit 여부를 먼저 확인한다.
   - `git pull` 여부는 사용자에게 확인 후 진행한다 (자동 pull 금지).
3. 새 브랜치 이름을 결정한다.
   - **인자(`$ARGUMENTS`)가 있으면** 그 문구를 바탕으로 케밥케이스 브랜치명을 생성한다.
     - 예: `/branch-new 로그인 버그 수정` → `fix/login-bug` 류
     - 한글 문구는 의미를 살려 영문 케밥케이스로 변환한다.
     - 타입 prefix(`feat/`, `fix/`, `chore/`, `refactor/` 등)는 문구의 성격에 맞게 추론하여 붙인다.
   - **인자가 없으면** `git log master..HEAD` 또는 직전 커밋 메시지를 바탕으로 브랜치명을 추론하여 사용자에게 제안 후 확인받는다.
4. `git checkout -b <branch-name>`으로 새 브랜치를 생성한다.
5. 결과를 한 줄로 보고한다 (이전 브랜치 → 새 브랜치).

## 주의

- **베이스 브랜치는 항상 `master`**다. 사용자가 다른 베이스를 명시하지 않은 한 예외 없다.
- **`develop`에서 분기하지 않는다.** `develop`은 테스트 서버 전용 브랜치이며,
  다른 작업의 검증되지 않은 머지가 섞여 있다.
- 현재 브랜치가 `develop`이면 그대로 분기하지 말고, `master`로 이동한 뒤 분기한다.
  이때 develop에만 있는 커밋이 유실될 수 있으므로 사용자에게 먼저 알린다.
- 강제 이동(`-f`)이나 미커밋 변경사항 덮어쓰기는 절대 하지 않는다.
- 브랜치명에 사용자 이름/날짜 같은 메타데이터는 기본적으로 넣지 않는다.

## 인자

`$ARGUMENTS` — 사용자가 `/branch-new` 뒤에 입력한 문구 (선택)
