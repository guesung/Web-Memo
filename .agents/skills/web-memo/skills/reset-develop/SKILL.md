---
name: reset-develop
description: 사용자가 /web-memo:reset-develop을 명시적으로 요청했을 때만, origin/master의 현재 커밋으로 origin/develop을 재생성한다. 버려질 커밋과 백업 ref를 확인하고 정확한 원격 SHA를 lease로 지정해 푸시한다. 릴리스 완료만으로 자동 실행하지 않는다.
---

# /web-memo:reset-develop — 원격 `develop` 재생성

이 스킬은 **명시적인 `/web-memo:reset-develop` 요청이 있을 때만** 실행한다. 릴리스, PR 머지, 문서 작성, 다른 `/web-memo` 스킬의 후속 단계에서 자동 호출하지 않는다. 대상은 `origin/master`와 `origin/develop`이다. 현재 브랜치의 커밋, 로컬 `master`, 로컬 `develop`을 원격 기준으로 사용하지 않는다.

## 실행

1. `git remote get-url --all origin`과 `git remote get-url --push --all origin`을 모두 확인한다. fetch URL과 push URL이 각각 정확히 1개이고 서로 같은 URL일 때만 진행한다. 다르거나 복수이면 fetch·백업·푸시 등 변경 명령 전에 멈춘다. 이어서 `git status --short`, `git worktree list --porcelain`로 워크트리 상태를 확인한다. `origin`이 의도한 저장소인지 확인할 수 없거나 진행 중인 Git 작업이 있으면 멈춘다. 현재 워크트리의 변경 사항은 건드리지 않는다.
2. `git fetch origin +refs/heads/master:refs/remotes/origin/master +refs/heads/develop:refs/remotes/origin/develop`을 실행한다. 두 원격 브랜치가 모두 존재해야 한다. `git rev-parse refs/remotes/origin/master`와 `git rev-parse refs/remotes/origin/develop`로 전체 SHA를 각각 `MASTER_SHA`, `OLD_DEVELOP_SHA`에 기록한다. 얕은 저장소라서 버려질 커밋을 온전히 확인할 수 없다면 이력을 더 받아 확인하거나 멈춘다.
3. `git log --oneline "$MASTER_SHA..$OLD_DEVELOP_SHA"`와 `git diff --stat "$MASTER_SHA...$OLD_DEVELOP_SHA"`로 `develop`에만 남은 커밋과 변경을 확인하고, 푸시 전에 사용자에게 대상 원격, 두 SHA, 버려질 커밋 목록을 보고한다. 테스트 머지가 아닌 보존해야 할 작업이 의심되거나 범위를 판단할 수 없다면 멈추고 사용자에게 판단을 요청한다. 두 SHA가 같으면 푸시하지 않고 이미 일치한다고 보고한다.
4. **푸시 전에** `OLD_DEVELOP_SHA`를 로컬 `refs/backup/develop/<UTC시각>-<OLD_DEVELOP_SHA>`에 백업한다. `git update-ref <백업 ref> "$OLD_DEVELOP_SHA" 0000000000000000000000000000000000000000`로 새 ref만 생성하고, `git rev-parse <백업 ref>`가 기존 SHA와 같은지 검증한다. 충돌하면 다른 이름으로 다시 만들거나 멈추며 기존 백업은 덮어쓰지 않는다.
5. 푸시 직전에 `git ls-remote origin refs/heads/master`로 원격 `master`가 여전히 `MASTER_SHA`인지 확인한다. 달라졌으면 멈추고 처음부터 다시 평가한다. 같으면 `git push --force-with-lease=refs/heads/develop:$OLD_DEVELOP_SHA origin "$MASTER_SHA:refs/heads/develop"`을 **한 번만** 실행한다. 예상 SHA를 생략한 lease, 일반 `--force`, 로컬 브랜치를 소스로 한 푸시는 금지한다. 경쟁 변경 등으로 거절되면 재시도하거나 새 SHA로 자동 갱신하지 말고 멈춘다. 필요하면 처음부터 다시 조회하고 버려질 커밋을 재평가한다.
6. 푸시 뒤 `git ls-remote origin refs/heads/develop`로 실제 원격 SHA를 다시 조회해 `MASTER_SHA`와 비교한다. 다르면 완료로 보고하지 않는다. 일치하면 `git fetch origin +refs/heads/develop:refs/remotes/origin/develop`로 추적 ref를 갱신하고 다시 확인한다.
7. 로컬 `develop`은 `git worktree list --porcelain`에서 **어느 워크트리에도 체크아웃되어 있지 않을 때만** `MASTER_SHA`로 맞춘다. 기존 로컬 브랜치 SHA가 `OLD_DEVELOP_SHA`와 다르면 그 SHA도 별도 `refs/backup/develop/` ref에 먼저 보존한다. `git update-ref refs/heads/develop "$MASTER_SHA" <기존 로컬 SHA>`를 사용하고, 브랜치가 없다면 이전 값을 40자리 0으로 지정해 생성한다. 다른 워크트리에서 체크아웃 중이면 해당 경로를 보고하고 로컬 브랜치는 그대로 둔다. 원격 푸시 뒤 로컬 정합화에 실패했다면 원격 성공과 로컬 실패를 구분해 보고하며 원격을 되돌리지 않는다.

마지막으로 원격 `develop`의 재조회 SHA, `master` SHA, 버려진 커밋 수, 백업 ref, 로컬 `develop` 처리 결과를 보고한다. 어떤 단계에서든 명령이 실패하면 그 이후의 변경 명령을 실행하지 않고 실제로 완료된 단계만 보고한다.
