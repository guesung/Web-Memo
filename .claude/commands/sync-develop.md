---
name: sync-develop
description: (폐기됨) 이 레포에서는 develop을 작업 브랜치로 머지하지 않는다. /sync-master를 사용할 것.
---

# /sync-develop — 이 레포에서는 사용하지 않습니다

> 이 파일은 전역 `~/.claude/commands/sync-develop.md`를 **의도적으로 무력화**합니다.

## 동작

**아무 git 명령도 실행하지 않는다.** 아래 내용을 사용자에게 안내하고 종료한다.

```
이 레포의 베이스 브랜치는 master입니다. develop은 테스트 서버 배포 전용
브랜치이며, 다른 작업의 검증되지 않은 머지가 섞여 있습니다. develop을 작업
브랜치에 머지하면 PR diff가 오염됩니다.

대신 아래를 사용하세요:
  - 작업 브랜치 최신화       → /sync-master
  - 테스트 서버 배포         → /push-test-server
  - develop을 master로 리셋  → /reset-develop
```

사용자가 의도를 명확히 밝히면 (예: "그냥 develop 상태 보고 싶다") 읽기 전용
명령(`git log origin/develop --oneline -20` 등)까지만 수행한다.
머지·push는 어떤 경우에도 하지 않는다.

## 참고

[docs/branch-strategy.md](../../docs/branch-strategy.md)
