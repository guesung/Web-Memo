---
name: push-test-server
description: 현재 작업 브랜치를 develop(테스트 전용 브랜치)에 머지한 뒤 origin/develop으로 push 한다. 테스트 서버 배포용.
---

# /push-test-server — 현재 브랜치를 develop에 머지 후 push

> 이 파일은 전역 `~/.claude/commands/push-test-server.md`를 **오버라이드**합니다.
> 이 레포에서 `develop`은 **테스트 서버 배포 전용 일회성 브랜치**이며,
> 릴리스 후 `master` 기준으로 리셋(force-push)됩니다.
> (참고: [docs/branch-strategy.md](../../docs/branch-strategy.md))

## 동작

1. 현재 상태를 확인한다 (병렬 실행):
   - `git branch --show-current` — 현재 브랜치 이름
   - `git status` — 미커밋 변경사항 여부
   - `git log -1 --oneline` — 직전 커밋 확인
2. **현재 브랜치가 `develop`이면** 중단하고 사용자에게 알린다 (develop에서 develop으로 머지 불가).
3. **현재 브랜치가 `master`이면** 중단한다. master는 이미 프로덕션이므로 테스트 배포 대상이 아니다.
4. **미커밋 변경사항이 있으면** 사용자에게 먼저 알리고, 진행 여부를 확인받는다 (자동 stash 금지).
5. 현재 브랜치명을 `<source>` 변수로 기억해 둔다.
6. `git fetch origin develop` 후 `git checkout develop`으로 이동한다.
7. 로컬 develop을 원격에 정확히 맞춘다: `git reset --hard origin/develop`.
   - develop은 리셋(force-push)되는 브랜치이므로 로컬/원격이 갈라질 수 있다.
   - develop에는 고유하게 보존해야 할 작업이 없으므로 원격 기준으로 맞추는 것이 안전하다.
   - 로컬 develop에 원격에 없는 커밋이 있다면(`git log origin/develop..develop`)
     버려지기 전에 사용자에게 먼저 알린다.
8. `git merge <source>`로 작업 브랜치를 develop에 머지한다.
   - 머지 충돌이 발생하면 중단하고 사용자에게 보고한다 (절대 임의로 해결하지 않음).
9. `git push origin develop`로 원격에 push 한다. → 테스트 서버 배포 트리거.
10. 작업 완료 후 원래 브랜치로 돌아간다: `git checkout <source>`.
11. 결과를 한 줄로 보고한다 (예: `feat/login-fix → develop push 완료`).
12. **작업이 아직 끝나지 않았음을 명시한다**: `master` 대상 PR(`/pr`)이 별도로 필요하다.

## 주의

- **develop 머지는 배포 리허설일 뿐 작업 완료가 아니다.** 모든 변경은 반드시
  `master` 대상 PR을 따로 거쳐야 한다.
- **`develop`을 `master`나 작업 브랜치로 머지하는 것은 금지**다. 방향은 항상 단방향
  (작업 브랜치 → develop)이다.
- `--force` push, `--no-verify`, hook 우회는 금지. (단 `/reset-develop`은 예외)
- 머지 충돌은 자동 해결 금지. 반드시 사용자에게 알리고 결정을 받는다.
- 충돌이 반복적으로 지저분하다면 develop이 오래된 것이므로 `/reset-develop`을 제안한다.
- 작업이 끝나면 원래 작업 브랜치로 복귀시키는 것을 잊지 않는다.

## 인자

`$ARGUMENTS` — 추가 지시 (선택).
