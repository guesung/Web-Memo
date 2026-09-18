---
name: reset-develop
description: develop 브랜치를 최신 master 기준으로 리셋(force-push)한다. 릴리스 후 테스트 브랜치를 비울 때 사용.
---

# /reset-develop — develop을 master 기준으로 리셋

> `develop`은 테스트 서버 배포 전용 일회성 브랜치입니다. 쌓인 테스트 머지를
> 버리고 최신 `master` 기준으로 다시 만듭니다.
> (참고: [docs/branch-strategy.md](../../docs/branch-strategy.md))
>
> ⚠️ **force-push를 수행하는 유일한 커맨드입니다. 반드시 사용자 확인을 받습니다.**

## 사용 시점

- `master`에 릴리스가 머지된 직후
- `develop`이 오래되어 `/push-test-server` 머지 충돌이 반복될 때
- 테스트 브랜치 상태가 꼬여서 깨끗하게 다시 시작하고 싶을 때

## 동작

1. 현재 상태를 확인한다:
   - `git branch --show-current`
   - `git status` — 미커밋 변경사항이 있으면 알리고 진행 여부 확인
2. 최신 정보를 가져온다: `git fetch origin`
3. **버려질 내용을 먼저 보여주고 확인받는다.**
   ```bash
   git log origin/master..origin/develop --oneline
   ```
   - 이 커밋들이 전부 사라진다는 점을 명시한다.
   - 이 중 `master`에 아직 PR로 올라가지 않은 작업이 있는지 사용자에게 확인시킨다.
   - **사용자가 명시적으로 확인하기 전에는 절대 다음 단계로 넘어가지 않는다.**
4. master를 최신화한다:
   ```bash
   git checkout master
   git pull origin master
   ```
5. develop을 master 기준으로 재생성한다:
   ```bash
   git branch -f develop master
   ```
6. 원격에 force-push 한다 (안전 옵션 사용):
   ```bash
   git push --force-with-lease origin develop
   ```
   - `--force-with-lease`가 거부되면 원격이 예상과 다른 것이므로 **중단하고 보고**한다.
     맹목적인 `--force`로 재시도하지 않는다.
7. 원래 브랜치로 복귀한다.
8. 결과를 보고한다 (버려진 커밋 수, develop의 새 HEAD).

## 주의

- develop에만 존재하는 작업은 이 커맨드로 **영구히 사라진다**. 실행 전 확인이 전부다.
- `master`에는 절대 force-push 하지 않는다.
- push 직후 테스트 서버가 master 상태로 재배포된다는 점을 사용자에게 알린다.
