---
name: sync-master
description: 최신 master를 현재 작업 브랜치로 가져와 머지한다. 작업 브랜치 최신화용.
---

# /sync-master — master를 현재 브랜치에 동기화

> 이 레포의 베이스 브랜치는 `master`입니다. 작업 브랜치를 최신화할 때는
> `develop`이 아니라 **`master`를 머지**합니다.
> (참고: [docs/branch-strategy.md](../../docs/branch-strategy.md))
>
> ⚠️ 이 커맨드는 **master → 현재 브랜치** 방향입니다.
> 예전의 "develop을 master로 머지"하는 동작은 이 레포에서 **금지**되었습니다.

## 동작

1. 현재 상태를 확인한다:
   - `git branch --show-current`
   - `git status`
2. **현재 브랜치가 `master`이면** 그냥 `git pull origin master`만 수행하고 종료한다.
3. **현재 브랜치가 `develop`이면 중단한다.** develop 최신화는 `/reset-develop`을 쓴다.
4. 미커밋 변경사항이 있으면 사용자에게 알리고 stash 여부를 확인받는다 (자동 stash 금지).
5. 최신 master를 가져와 머지한다:
   ```bash
   git fetch origin master
   git merge origin/master
   ```
6. 충돌이 발생하면 충돌 파일 목록(`git diff --name-only --diff-filter=U`)을 보고하고,
   각 파일의 의도를 파악해 해결안을 제시한다. **임의 해결 후 커밋 금지** — 사용자 확인 필수.
7. stash 했다면 `git stash pop`으로 복원한다.
8. 결과를 보고한다 (머지된 커밋 수, 충돌 여부, 최종 `git status`).

## 충돌 해결 가이드

- 양쪽 기능을 모두 보존할 수 있으면 보존한다.
- 공통/코어 로직은 `master` 쪽을 우선한다.
- 현재 브랜치의 기능 고유 변경은 현재 브랜치 쪽을 우선한다.
- import 추가는 보통 양쪽을 합친다.
- 애매하면 반드시 사용자에게 묻는다.

## 주의

- **`develop`을 머지하지 않는다.** develop에는 다른 작업의 검증되지 않은 테스트 머지가
  섞여 있어, 작업 브랜치에 들어가면 PR diff가 오염된다.
- `--force` push 금지.
