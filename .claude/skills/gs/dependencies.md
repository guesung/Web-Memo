# 의존 목록

이 플러그인은 **전역 스킬에 의존하지 않는다.** 파이프라인 부품(스킬·에이전트)이 전부 이 폴더 안에 있다 — 다른 PC에서 이 레포 하나만 받아도 파이프라인이 돈다.

## 에이전트 (플러그인 내장)

| 에이전트          | 쓰이는 곳              | 역할                                     |
| ----------------- | ---------------------- | ---------------------------------------- |
| `gs:planner`      | `/gs:idea` ①           | 아이디어 → 기획서 초안 + 결정 필요       |
| `gs:designer`     | `/gs:design` ①-D       | 기획 → 디자인 명세 초안 (UI 있는 작업만) |
| `gs:backend-dev`  | `/gs:implement-loop` ① | TDL `[BE]` 구현. API 계약을 먼저 고정    |
| `gs:frontend-dev` | `/gs:implement-loop` ① | TDL `[FE]` 구현. BE의 계약 위에 쌓는다   |
| `gs:qa-checklist` | `/gs:self-qa` ①        | 설계서 → QA 체크리스트 초안. 코드를 안 본다 |
| `gs:qa-verifier`  | `/gs:self-qa` ②        | 자동 항목 브라우저 판정 + 수동 재현 방법. 고치지 않는다 |

## 스킬이 부르는 스킬

파이프라인 순서(`idea → design → implement-loop`)가 아니라, **한 스킬이 다른 스킬을 부품으로 쓰는** 관계다.

| 부르는 곳 | 불리는 스킬 | 넘기는 것 | 받는 것 |
| --- | --- | --- | --- |
| `/gs:idea` ② | `/gs:interview` | 기획서 초안 + `--items` (planner의 `결정 필요`) | 확정 결정 4표 → 기획서에 반영 |
| `/gs:design` ⑤ | `/gs:interview` | 기획서·설계서 초안 + `--items` (`## 논의 필요`) | 확정 결정 4표 → 설계서·디자인에 반영 |
| `/gs:implement-loop` §0-5 · ② | `/gs:self-qa` | 설계서 (`--checklist-only` / `--run`) | QA 항목 생성·판정 결과 |

`/gs:interview`와 `/gs:self-qa`는 **아무것도 고치지 않고 반환만 한다.** 문서에 쓰는 것은 부른 쪽 책임이다 — 같은 섹션을 둘이 쓰면 어느 쪽이 마지막인지 알 수 없다.

## 참조 문서 (플러그인 내장)

| 문서                                   | 읽는 에이전트     | 내용                                                     |
| -------------------------------------- | ----------------- | -------------------------------------------------------- |
| `references/frontend-fundamentals.md`  | `gs:frontend-dev` | 클린 코드 4가지 기준(가독성·예측 가능성·응집도·결합도)과 항목별 처방 |
| `references/backend-fundamentals.md`   | `gs:backend-dev`  | 판단 4가지 기준(경계 명확성·실패 다루기·데이터 정합성·변경 안전성)과 항목별 체크 |

## 대상 레포 안의 문서

플러그인이 아니라 **작업 대상 레포**에 사는 문서다. 골격·인터뷰 질문은 [project-docs.md](./project-docs.md)가 SSOT다.

| 문서 | 읽는 에이전트 | 없으면 채우는 곳 |
| --- | --- | --- |
| `<레포>/docs/project-identity.md` | `gs:planner` | `/gs:idea` §0-4 (아이디어·레포에서 채움 → 검토 권장으로 노출) |
| `<레포>/docs/design-system.md` | `gs:designer` | `/gs:design` §0-5 (코드에서 읽고 채움 → 검토 권장으로 노출) |
| `<레포>/docs/architecture.md` | `gs:frontend-dev` · `gs:backend-dev` | `/gs:implement` §0-8 (레포에서 읽고 채움 → 검토 권장으로 노출) |
| └ `## QA 실행` 섹션만 | `gs:qa-verifier` | 위와 같음 |

에이전트는 **읽기만** 한다. 문서를 쓰는 건 위 스킬 몫이고, 승인 없이 쓰는 대신 자동 작성 사실을 항상 노출한다(`/gs:discuss`는 사람과 합의해 쓴다).

## MCP 의존

| MCP           | 쓰이는 곳                                                                        | 용도                                                      |
| ------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `notion-home` | `/gs:idea`, `/gs:design`, `/gs:implement-loop`, `/gs:self-qa`, `/gs:problem-log`, `/gs:blog-material` | 개인 업무 로그·QA 항목·개발 위키 DB(문제 해결 기록) 읽기·쓰기 (guesung) |
| `playwright`  | `/gs:self-qa` ② — `gs:qa-verifier`가 사용                                        | 브라우저 구동·DOM/스크린샷/콘솔/네트워크 관측             |

회사판이 쓰던 `claude.ai Notion`(팀 DB)·`slack` 플러그인은 쓰지 않는다.

DB 식별자·속성·접근 규칙은 [notion-databases.md](./notion-databases.md)가 SSOT다. 스킬 본문에는 ID를 두지 않는다.
