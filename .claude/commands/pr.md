---
name: pr
description: 현재 커밋 작업사항을 바탕으로 master 대상 PR을 생성한다. 현재 브랜치가 master라면 /branch-new로 새 브랜치를 먼저 만든 뒤 PR을 올린다.
---

# /pr — 현재 작업을 master 대상 PR로 올리기

> 이 파일은 전역 `~/.claude/commands/pr.md`를 **오버라이드**합니다.
> 이 레포의 PR base는 `develop`이 아니라 `master`입니다.
> (참고: [docs/branch-strategy.md](../../docs/branch-strategy.md))

## 동작

1. `git branch --show-current`로 현재 브랜치를 확인한다.
2. **현재 브랜치가 `master`이면**, 먼저 `/branch-new` 동작을 수행하여 새 브랜치로 옮긴다.
   - 인자(`$ARGUMENTS`)가 있으면 그 문구를 `/branch-new`의 브랜치명 힌트로 전달한다.
3. **현재 브랜치가 `develop`이면 중단한다.** `develop`은 테스트 전용 브랜치이므로
   PR의 head가 될 수 없다. 사용자에게 원래 작업 브랜치로 이동하라고 안내한다.
4. master 이후의 커밋과 diff를 확인한다 (병렬 실행):
   - `git status`
   - `git diff`
   - `git log master..HEAD`
   - `git diff master...HEAD`
   - 원격 추적 상태 확인 후 필요 시 `git push -u origin <branch>`로 업로드한다.
5. **모든 커밋**을 훑어서 PR 제목/본문을 작성한다 (최신 커밋만 보지 말 것).
   - 제목: 70자 이내의 짧고 명확한 한글 문장. 상세는 본문에.
   - 본문은 레포의 `PULL_REQUEST_TEMPLATE.md`를 따르며, HEREDOC으로 전달한다.
6. `gh pr create --base master --title "..." --body "$(cat <<'EOF' ... EOF)"` 로 PR을 생성한다.
7. 생성된 PR URL을 사용자에게 반환한다.

## 주의

- **base 브랜치는 항상 `master`**다. `--base develop`은 이 레포에서 금지다.
- **머지는 머지 커밋 방식**(`gh pr merge --merge`)이다. Squash & Merge와
  Rebase & Merge는 금지 — 개별 커밋 히스토리를 `master`에 보존한다.
- `develop`에 이미 머지해서 테스트 서버에서 확인했더라도, 작업은 끝난 게 아니다.
  반드시 별도로 `master` 대상 PR을 올려야 한다.
- co-author, 생성 표식, `🤖` 같은 메타 표기 추가 금지.
- `--force` 푸시 금지 (사용자가 명시 요청하지 않은 이상).
- 커밋되지 않은 변경사항이 있다면 먼저 `/commit`을 제안하고, 사용자가 확인한 후 진행한다.

## 인자

`$ARGUMENTS` — PR 제목/본문에 대한 추가 지시, 또는 master에서 파생 시 새 브랜치명 힌트 (선택).
