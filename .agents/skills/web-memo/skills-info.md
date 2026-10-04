# web-memo 스킬 목록

개인 프로젝트 구현 OS. 기획·디자인·프론트·백엔드 에이전트와 아이디어 → 기획 → 설계 → 구현 → QA → PR 파이프라인을 제공한다.

## /web-memo:idea
- 설명: 개인 프로젝트 아이디어를 planner 에이전트로 기획서 초안(문제·타깃·핵심 기능·MVP 범위·범위 밖·성공 기준)으로 만들고, 결정 항목은 추천안으로 해소해 자동 확정한다. 개인 업무 로그 DB에 작업 페이지와 설계서 씨앗을 만든다.
- 트리거: "이런 거 만들고 싶어", "아이디어 있는데", "개인 프로젝트 시작", "기획해줘". 회사 작업은 /nudge:work-card. 끝나면 /web-memo:design을 이어서 호출한다.

## /web-memo:discuss
- 설명: 업무 로그 카드를 두고 사용자와 함께 기획·설계를 정한다. 결정 지점을 AI가 하나씩 꺼내 선택지와 추천을 내고, 합의된 것만 `## 논의`에 쌓은 뒤 기획서·디자인·설계서를 쓴다. 확정 도장 후 /web-memo:implement-loop로 이어간다.
- 트리거: "논의하자", "같이 설계하자", "이거 왜 이래?", "이렇게 하면 어때?". notion-orca 카드의 시작 단계가 `논의`면 이 스킬로 시작한다.

## /web-memo:design
- 설명: 기획서 씨앗을 받아 (UI가 있으면 designer로 디자인 명세를 만들고) 레포를 탐색해 AS-IS/TO-BE·변경 지점·동작 명세를 채운 뒤, 사람 승인 도장으로 설계서를 확정한다. AI 경로에서 사람이 개입하는 유일한 자리다.
- 트리거: "설계해줘", "설계서 써줘", "설계 확정". /web-memo:idea가 기획 확정 후 호출하며, /web-memo:implement-loop는 이 스킬(또는 discuss)의 도장이 있어야 시작한다. 회사 작업은 /nudge:design.

## /web-memo:implement
- 설명: 브랜치를 잡고 TDL을 세워 backend-dev·frontend-dev 에이전트에 BE→FE 순서로 위임해 커밋 단위로 구현한다. E2E 추가·수정, event-analyst 이벤트 로깅까지 처리하고, 단독 실행 시 develop 머지와 PR까지 수행한다.
- 트리거: "구현해줘", "이거 만들어줘", "설계서대로 짜줘", "기능 추가해줘", "QA·PR 말고 구현만". /web-memo:implement-loop가 ① 단계로 호출하고, /web-memo:issue-solve도 이어서 호출한다. cashwalk 레포에서는 시작하지 않는다.

## /web-memo:self-qa
- 설명: 설계서에서 QA 명세를 뽑아 노션 "QA 항목" DB에 쌓고, 자동 항목은 qa-verifier가 브라우저에서 판정, 불가 항목은 수동 QA용 재현 방법을 남긴다.
- 트리거: "셀프 QA", "QA 체크리스트 만들어", "QA 명세 뽑아줘", "QA 돌려". /web-memo:implement-loop의 §0-5(--checklist-only)와 ②(--run)에서 호출된다. 회사 작업은 /nudge:self-qa.

## /web-memo:implement-loop
- 설명: 확정된 설계서를 받아 구현 → 셀프 QA → develop 머지 → PR까지 돌리는 개인 프로젝트 오케스트레이터. 중간에 사람에게 묻지 않고, 끝에 AI 결정 사항과 수동 QA 항목을 보고한 뒤 /common:problem-log 승인을 묻는다.
- 트리거: "구현 루프 돌려", "설계서대로 만들어서 PR까지", "implement loop". /web-memo:design 또는 discuss의 도장이 필요하며 cashwalk 레포에서는 거부한다.

## /web-memo:pr
- 설명: 현재 커밋 작업사항으로 일반(non-draft) PR을 main base로 만든다. base와 충돌하면 묻지 않고 merge해 해결·검증·push하고, 앱/웹/패키지 변경이 있으면 PR 전에 develop 머지(md)를 한다.
- 트리거: "PR 올려줘", "PR 만들어줘". /web-memo:implement ③과 /web-memo:implement-loop ③(b)에서 호출된다. 커밋 안 된 변경이 있으면 /web-memo:commit을 먼저 제안한다.

## /web-memo:commit
- 설명: 현재 작업 사항을 작업 단위별로 쪼개 여러 커밋으로 만든다. co-author는 추가하지 않는다.
- 트리거: "커밋해줘", "커밋 쪼개서 올려줘". /web-memo:pr이 미커밋 변경을 발견하면 제안한다.

## /web-memo:interview
- 설명: 작업 맥락에서 사람만 답할 수 있는 결정 지점을 비용 순으로 정렬하고, 고른 만큼만 AskUserQuestion으로 묻는다. 조사로 알 수 있는 것은 묻지 않고 확정된 결정 목록을 반환한다.
- 트리거: "애매한 거 물어봐", "결정할 거 있어?", "뭘 정해야 해?", "인터뷰해줘". /web-memo:idea ②와 /web-memo:design ⑤가 --auto로 호출하면 묻지 않고 추천안으로 확정한다.

## /web-memo:issue-solve
- 설명: notion-orca가 `이슈 해결` 단계로 만든 카드의 버그·에러 원문과 레포 코드를 읽어 원인 가설과 해결책을 확신도·근거와 함께 `## 설계서`에 채우고, 묻지 않고 /web-memo:implement로 이어간다. --diagnose-only면 진단까지만 한다.
- 트리거: "이 카드 이슈 해결해줘", "이 에러 원인 찾아서 고쳐줘", "issue solve", 시작 단계가 `이슈 해결`인 카드. 슬랙 스레드 입력·승인 게이트가 있는 회사판은 /nudge:issue-solve.

## /web-memo:blog-material
- 설명: 끝난 작업에서 실제로 일어난 일만 근거로 글감을 한 줄씩 뽑아 노션 업무 로그의 `블로그 소재` 속성에 잇는다. 승인은 묻지 않는다.
- 트리거: "블로그 소재 뽑아줘", "글로 쓸 거 있나", "소재 남겨줘", "blog material". /web-memo:implement-loop 마무리가 호출한다.

## /web-memo:study
- 설명: 학습 키워드로 노션 업무 로그·개발 위키에서 내가 남긴 기록을 찾아 후보로 보여주고, 고른 기록과 레포 코드를 근거로 신경 쓴 점 → 고민 → 트러블슈팅 → 확장 방향 순으로 대화창에서 설명한다. 노션·레포에는 쓰지 않는다.
- 트리거: "내가 세팅한 GA 학습하려고", "내가 한 거 설명해줘", "예전에 한 ~ 공부하자", "study".

## /web-memo:reset-develop
- 설명: origin/master의 현재 커밋으로 origin/develop을 재생성한다. 버려질 커밋과 백업 ref를 확인하고 원격 SHA를 lease로 지정해 푸시한다.
- 트리거: 사용자가 /web-memo:reset-develop을 명시적으로 요청했을 때만. 릴리스 완료만으로 자동 실행하지 않는다.

## 에이전트
- web-memo:planner — 아이디어 한 줄을 기획서 초안과 "결정 필요" 목록으로 만든다 (/web-memo:idea ①).
- web-memo:designer — 확정된 기획서로 화면 목록·플로우·와이어프레임 등 디자인 명세 초안을 만든다 (/web-memo:design ①-D).
- web-memo:backend-dev — 설계서·TDL의 [BE] 항목(API·DB·서버 로직)을 구현하고 E2E를 같은 커밋에 맞춘다.
- web-memo:frontend-dev — 설계서·디자인 명세의 [FE] 항목(화면·컴포넌트·클라이언트 로직)을 구현하고 E2E를 같은 커밋에 맞춘다.
- web-memo:event-analyst — 이번 구현 diff를 보고 추가·수정·제거할 이벤트 로깅 명세를 만든다. 코드는 쓰지 않는다.
- web-memo:qa-checklist — 확정된 설계서에서 항목별 QA 체크리스트 초안(관측 문장·판정 기준·자동/수동)을 만든다.
- web-memo:qa-verifier — 체크리스트의 자동 항목을 Playwright로 브라우저에서 구동해 PASS/FAIL을 판정하고 수동 항목은 재현 방법을 쓴다.
