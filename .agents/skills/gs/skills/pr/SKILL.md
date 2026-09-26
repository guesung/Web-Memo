---
name: pr
description: 현재 커밋 작업사항을 바탕으로 PR을 생성한다. draft가 아닌 일반 PR로, base는 레포의 기본 브랜치(main). 만든 PR이 base와 충돌하면 묻지 않고 base를 merge해 해결·검증·push한다. 커밋 안 된 변경이 있으면 /gs:commit을 먼저 제안한다. "PR 올려줘", "PR 만들어줘" 같은 표현이 나오면 이 스킬을 사용한다. /gs:implement ③과 /gs:implement-loop ③(b)에서 호출된다.
argument-hint: '[PR 제목·본문 추가 지시 (선택)]'
---

# /gs:pr — 현재 작업을 PR로 올리기

## 동작

1. `git branch --show-current`로 현재 브랜치를 확인한다.
   - **기본 브랜치(main) 위라면** 먼저 `feature/<작업명>` 브랜치를 만들어 옮긴다. 인자(`$ARGUMENTS`)가 있으면 브랜치명 힌트로 쓴다.
2. **base 브랜치를 확정한다.** 사용자가 지정한 브랜치, 없으면 레포의 기본 브랜치(main). base가 **`master`**면 아래 "master 대상 PR — 작업 카드"를 먼저 통과해야 한다.
3. 커밋 안 된 변경이 있으면 **`/gs:commit`을 먼저 제안**하고, 사용자가 확인한 뒤 진행한다.
4. base 분기점 이후의 작업을 확인한다 (병렬 실행):
   - `git status` · `git log <base>..HEAD` · `git diff <base>...HEAD`
   - 원격 추적이 없으면 `git push -u origin <branch>`로, 있는데 로컬이 앞서 있으면 `git push`로 올린다. PR과 충돌 판정은 원격 브랜치를 기준으로 하므로 여기서 로컬과 원격을 맞춰 둔다.
5. **모든 커밋**을 훑어서 PR 제목·본문을 작성한다 (최신 커밋만 보지 말 것).
   - 제목: 70자 이내의 짧고 명확한 문장. 상세는 본문에. master 대상이면 `[DB-<ID>]` 접두사를 붙인다.
   - 본문은 HEREDOC으로 전달한다:
     ```
     ## Summary
     - 1–3개 불릿

     ## Test plan
     - [ ] 테스트 항목들
     ```
6. `gh pr create --base <base> --title "..." --body "$(cat <<'EOF' ... EOF)"` 로 PR을 생성한다. **`--draft`를 붙이지 않는다.** 이 브랜치로 이미 열린 PR이 있으면(`gh pr view --json url,state`로 `OPEN` 확인) 새로 만들지 않고 그 URL을 쓴 채 7단계로 간다 — 새 커밋은 4단계 push로 이미 그 PR에 붙었다.
7. 생성 성공 직후 **[orca-worktree.md](../../orca-worktree.md)의 PR 기록 절차**를 읽고 수행해 현재 Orca 워크스페이스 메모에 PR 제목과 URL을 중복 없이 추가한다. 기존 메모를 보존하고 재조회로 검증한다. 메모 기록에 실패해도 PR 생성 결과는 유지하고 실패 사유를 별도로 알린다.
8. **충돌 확인 — 있으면 바로 해결한다.** 아래 "base 충돌 해결"을 수행한다. 묻지 않는다.
9. 생성된 PR URL을 사용자에게 반환한다. 충돌을 해결했으면 한 줄 덧붙인다: `충돌 해결: <파일 n개> — merge <커밋 해시>`.
10. 생성된 PR을 사용자 PC의 기본 브라우저로 띄운다: `gh pr view <PR URL> --web`. 실패해도 PR 생성 결과는 유지하고 실패 사유만 별도로 알린다.

## base 충돌 해결

PR을 만든 직후(또는 기존 PR을 확보한 직후) base와 충돌하는지 보고, 충돌이면 **묻지 않고 바로 해결한다.** 충돌을 남긴 PR은 사람이 열어봐도 머지할 수 없어 검토 자리가 헛돈다. 전제는 워킹트리가 깨끗한 것이다 — 3단계에서 커밋을 끝냈어야 한다.

1. **확인.**
   - `git fetch origin <base>`를 먼저 한다. 오래된 `origin/<base>`로 판정하면 충돌을 놓친다.
   - `gh pr view <PR> --json mergeable`의 값은 셋이다. `MERGEABLE` → 끝, `CONFLICTING` → ②, `UNKNOWN`(생성 직후 GitHub가 계산 중) → 5초 간격으로 최대 6번 다시 본다.
   - 끝까지 `UNKNOWN`이면 로컬로 판정한다: `git merge-tree --write-tree origin/<base> HEAD`. exit 0 → 충돌 없음(끝), exit 1 → 충돌(②), 그 밖 → 오류로 멈춘다.
   - `mergeStateStatus`의 `BEHIND`·`BLOCKED` 같은 값은 충돌이 아니다. 이 절의 대상이 아니므로 건드리지 않는다.
2. **base를 합친다.**
   - `PRE_MERGE=$(git rev-parse HEAD)`를 먼저 저장한다. **이 절에서 한 번만 저장한다** — 되돌릴 기준은 이것 하나고, `ORIG_HEAD`는 다른 git 명령에 덮이므로 쓰지 않는다.
   - `git merge --no-edit origin/<base>`. **rebase는 쓰지 않는다** — 이미 push한 브랜치를 rebase하면 force push가 필요하고, 이 스킬은 force push를 하지 않는다.
3. **충돌 파일을 해결한다.** 대상은 `git diff --name-only --diff-filter=U`.
   - 파일마다 양쪽 변경을 읽고(`git log --oneline origin/<base> -- <파일>`로 base 쪽 의도를 확인) **둘 다 살리는 쪽**으로 합친다.
   - 한쪽만 고를 수밖에 없으면 base 쪽 동작을 지키고 이번 작업의 변경을 그 위에 다시 얹는다. 삭제/수정 충돌 · 이름 변경 충돌 · 바이너리 충돌처럼 "둘 다 살리기"가 성립하지 않는 것도 base 쪽을 기본으로 하고 `[AI 자동 결정]`으로 남긴다.
   - lockfile은 손으로 합치지 않는다. `package.json` 충돌을 먼저 푼 뒤, lockfile은 `git checkout --theirs <lockfile>`(merge에서 `theirs` = base 쪽)로 받고 패키지 매니저 일반 install(frozen 아님)로 재생성해 `git add`한다.
   - 해결한 파일은 `git add`한다. `git diff --name-only --diff-filter=U`가 비었고, 해결한 파일에 충돌 마커가 없어야(`git grep -nE '^(<<<<<<<|>>>>>>>)( |$)' -- <해결한 파일…>`이 아무것도 못 찾음) 다음으로 간다. `git diff --check`는 base에서 온 줄 끝 공백까지 실패로 잡으므로 쓰지 않는다.
4. **검증.** 레포에 있는 타입체크·빌드 스크립트(`package.json`의 `typecheck`·`build` 등, 있는 것만)를 돌린다. 실패하면 고쳐서 `git add`하고 한 번 더 돌린다.
5. **커밋하고 올린다.**
   - merge가 진행 중이면(`git rev-parse -q --verify MERGE_HEAD`) `git commit --no-edit`로 merge 커밋을 만든다.
   - merge가 충돌 없이 이미 커밋됐는데(GitHub는 `CONFLICTING`이었지만 로컬 병합은 자동으로 풀린 경우) ④에서 고친 게 있으면 `git commit -m "fix: <base> 병합 후 타입체크·빌드 수정"`으로 따로 커밋한다.
   - `git push`한다(force 아님). **거절되면 재시도하지 않고 멈춘다** — 거절은 원격의 PR 브랜치가 그새 움직였다는 뜻이고, base를 다시 합쳐서는 풀리지 않는다.
   - push 뒤 ①의 확인을 **한 번** 더 한다. `MERGEABLE`이면 ⑥으로, 아니면 멈춘다.
6. **기록.** 충돌을 해결했으면 반드시 한다(①에서 `MERGEABLE`로 끝났어도 이번에 해결한 이력이 있으면 여기로 온다).
   - 어떤 파일을 어떻게 합쳤는지 `gh pr comment`로 파일당 한 줄 남긴다. 한쪽을 고른 해결은 `[AI 자동 결정]`으로 표시한다.
   - 같은 내용을 PR 본문 끝 `## 충돌 해결` 섹션에도 붙인다. `gh pr edit --body`는 본문 전체를 바꾸므로 `gh pr view --json body`로 기존 본문을 읽어 그 끝에 이어 붙인 전체를 넘긴다 — [autonomy.md](../../autonomy.md)는 AI가 정한 것을 PR 본문에 남기라고 하고, 코멘트는 묻히기 쉽다.
   - 호출자가 `/gs:implement`·`/gs:implement-loop`면 `[AI 자동 결정]` 줄을 그 스킬의 `논의 필요`에 넘기고, 충돌 해결한 파일 목록을 넘긴다. loop는 그 파일들을 마지막 출력의 수동 QA에 올린다 — 충돌 해결 코드는 셀프 QA를 다시 거치지 않고 타입체크·빌드만 통과해 올라간다.

**멈추는 경우** — 되돌리는 범위는 push 여부로 갈린다.

- **① 판정 오류로 멈춤**: 아직 merge 전이라 되돌릴 것이 없다.
- **merge 뒤 push 전에 멈춤**(④ 타입체크·빌드 2회 연속 실패 · ⑤ push 거절): 로컬 변경을 모두 되돌린다. 원격은 건드리지 않았으므로 PR은 이 절에 들어오기 전 그대로다.

```
git rev-parse -q --verify MERGE_HEAD && git merge --abort   # merge가 진행 중이면
git reset --hard $PRE_MERGE
git status --porcelain                                     # 비어 있어야 한다
```

- **push 뒤에 멈춤**(push했는데도 `MERGEABLE`이 아님): **되돌리지 않는다.** merge 커밋은 이미 원격에 있어 로컬만 reset하면 둘이 어긋난다. 현재 상태 그대로 두고 `mergeable` 값과 남은 충돌을 보고한다.

무엇이 실패했는지와 충돌 파일 목록을 보고한다. 호출자에게 상태 파일이 있으면(`/gs:implement`의 `.omc/state/gs-implement.json`) `pr`에 `stopped: conflict — <사유>`를 적는다. 기준은 [autonomy.md](../../autonomy.md)의 "타입체크·빌드 2회 연속 실패"와 같다.

## master 대상 PR — 작업 카드

base가 `master`인 PR은 **항상 작업 카드를 제목 접두사 `[DB-<ID>]`로 기입한다.** 본문에는 따로 적지 않는다.

- 카드는 `$ARGUMENTS`의 `[DB-123]`, 브랜치명, 커밋 메시지 순으로 찾는다. `ID` 값 자체가 `DB-123` 형태이므로 `DB-`를 두 번 붙이지 않는다.
- **찾지 못하면 추측하지 말고 `AskUserQuestion`으로 사용자에게 카드를 묻는다.** 답을 받기 전에는 `gh pr create`를 실행하지 않는다.
- `/gs:implement-loop`·`/gs:implement`가 불러도, 로컬 설계서로 시작했어도 똑같이 적용한다. 이때 묻는 것은 [autonomy.md](../../autonomy.md)의 예외다.
- base가 `main`이면 이 절은 적용하지 않는다.

## 하지 않는 것

- **draft PR을 만들지 않는다.** 이 플러그인의 PR은 곧 사람 최종 검토 대상이고, draft 상태 전환은 손만 늘린다.
- base 브랜치는 사용자가 달리 지정하지 않는 한 **기본 브랜치(main) 고정.** 개인 프로젝트에는 develop·테섭이 없다.
- **master 대상 PR을 작업 카드 없이 만들지 않는다.** 카드를 모르면 만들지 말고 묻는다.
- co-author, 생성 표식, `🤖` 같은 메타 표기 추가 금지.
- `--force` 푸시 금지 (사용자가 명시 요청하지 않은 이상). 충돌 해결도 rebase가 아니라 merge로 한다.
- **충돌을 남긴 채 끝내지 않는다.** 해결하거나, 멈춤 조건에 걸려 되돌리고 보고하거나 둘 중 하나다.
- main에 직접 push하지 않는다. PR까지다 — 머지(=배포 트리거)는 사람이 한다.

## 인자

`$ARGUMENTS` — PR 제목·본문에 대한 추가 지시(예: `[DB-123]` 접두사. master 대상이면 필수), 또는 main에서 파생 시 새 브랜치명 힌트 (선택).
