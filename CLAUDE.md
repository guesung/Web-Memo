# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 📌 단일 진실 원천: AGENTS.md

서비스 개요, 기술 스택, 아키텍처/모노레포 구조, 개발 명령어, 코딩 컨벤션, i18n, 환경 설정,
테스트 전략, 작업 문서화(claudedocs), 커밋·PR 워크플로, AI 협업 가이드 등
**도구 중립 규칙은 모두 [AGENTS.md](AGENTS.md)에 있습니다. 작업 전 반드시 먼저 읽으세요.**

규칙을 추가/수정할 때는 이 파일이 아니라 `AGENTS.md`(또는 `docs/`)를 고칩니다.
이 파일에는 **Claude Code 고유 항목만** 둡니다.

---

## 🚨 CRITICAL: Subagent (Task Tool) Usage Policy

**MANDATORY**: 비단순(non-trivial) 작업을 시작하기 전에 반드시 서브에이전트(Task tool) 사용 여부를 먼저 평가합니다. 선택이 아닙니다.

### When to Use Subagents (REQUIRED)

| Scenario | Required Subagent Type |
|----------|----------------------|
| Codebase exploration / "where is X?" | `Explore` |
| Multi-file search or pattern finding | `Explore` |
| Understanding code architecture | `Explore` |
| Implementation planning | `Plan` |
| Complex multi-step tasks | `general-purpose` |
| Code quality improvements | `refactoring-expert` |
| Frontend code refactoring | `frontend-refactor-kr` |
| Security review | `security-engineer` |
| Performance optimization | `performance-engineer` |
| System design decisions | `system-architect` |
| Creating PRs with proper workflow | `git-pr-workflow` |

### Execution Rules

1. **항상 서브에이전트 적용 가능성을 먼저 확인**한 뒤 직접 작업
2. **Explore agent는 다음에 MANDATORY**:
   - "where is X in the codebase?" 류 질문
   - 여러 디렉토리에 걸친 검색
   - 기능 동작 이해
   - 함수/컴포넌트의 모든 사용처 찾기
3. **Plan agent는 다음에 MANDATORY**:
   - 3단계 이상의 기능 구현
   - 아키텍처 변경
   - 여러 파일에 걸친 리팩토링
4. 가능하면 서브에이전트를 **병렬 실행**
5. Explore agent가 더 빠를 때 수동 grep/glob을 하지 않음

### Anti-Patterns (NEVER DO THESE)

- 코드를 찾으려고 여러 Grep/Glob을 수동 실행 → Explore agent 사용
- 복잡한 작업을 계획 없이 시작 → Plan agent 먼저
- 병렬 가능한 서브에이전트를 순차 실행 → 한 메시지에 여러 Task tool
- 전문 에이전트(security, performance 등)를 무시 → 작업 유형에 맞는 에이전트 매칭

**Remember**: 서브에이전트를 쓰는 것이 직접 다 하는 것보다 빠르고 정확합니다. 애매하면 서브에이전트를 쓰세요.

---

## 🌳 CRITICAL: 베이스 브랜치는 `master` (전역 규칙 오버라이드)

**이 레포의 베이스 브랜치는 `develop`이 아니라 `master`입니다.**

전역 커맨드/스킬(`~/.claude/commands/**`)이나 일반적인 git-flow 관습이
`develop`을 베이스로 가정하더라도, **이 레포에서는 무조건 `master`로 대체**합니다.
아래 규칙이 모든 커맨드·스킬·에이전트 지침보다 우선합니다.

| 상황 | 사용할 브랜치 |
| --- | --- |
| 작업 브랜치 분기 | `master` |
| PR base (`gh pr create --base`) | `master` |
| diff/log 비교 기준 | `origin/master` (예: `git diff origin/master...HEAD`) |
| 작업 브랜치 최신화 | `git merge master` |
| PR 머지 방식 | **머지 커밋 생성** (`gh pr merge --merge`) — Squash 금지 |

**`develop`은 테스트 서버 배포 전용 브랜치**입니다. `/push-test-server`로만
접근하며, `develop`을 `master`나 작업 브랜치로 머지하는 것은 **금지**입니다.
릴리스 후 `develop`은 `master` 기준으로 리셋(force-push)됩니다.

전체 규칙은 [docs/branch-strategy.md](docs/branch-strategy.md) 참조.

---

## ✅ Task Completion Workflow (`/pr`)

**MANDATORY**: 모든 작업 완료 후 반드시 `/pr` 명령어로 Pull Request를 생성합니다. 예외 없음.

1. 작업 완료
2. `pnpm type-check` 및 `pnpm lint`로 검증
3. (선택) `/push-test-server`로 테스트 서버 배포 후 검증
4. `/pr` 명령어로 PR 생성

`/pr` 명령어는 다음을 수행합니다:
- master 브랜치에서 새 브랜치 생성(이미 작업 브랜치면 생략)
- 변경사항을 의미 있는 커밋 메시지로 커밋
- 원격 푸시 후 master를 대상(base)으로 **Draft PR** 생성 (머지는 Squash가 아닌 머지 커밋 방식)

**PR은 항상 Draft로 생성합니다**(`gh pr create --draft`). Ready 전환(`gh pr ready`)은
사용자가 직접 판단하며, 명시적으로 요청받지 않는 한 자동으로 전환하지 않습니다.

커밋/PR 제목·본문은 **항상 한글**, 브랜치명은 영문입니다. 자세한 규칙은 [AGENTS.md](AGENTS.md)의 "커밋 & PR 워크플로" 절을 따릅니다.

> i18n 관련 코드를 수정한 작업 후에는 `/i18n-check`로 번역 완전성을 검증합니다.

> 원인이 바로 짐작되지 않던 버그를 해결했다면 `/bug-log`로 증상·원인·검증을
> Notion에 남깁니다. 한 환경에서만 터졌거나 며칠간 방치됐던 버그는 특히 그렇습니다.
