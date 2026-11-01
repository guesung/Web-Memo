# 개인 Notion 접근 규칙

개인 업무 로그·QA 항목·개발 위키·프로젝트 문서를 읽거나 쓸 때 적용한다. 이 파이프라인에서 도구를 선택할 때는 이 문서를 따르고, DB 식별자·속성·본문 골격·AI 작성 경계는 [notion-databases.md](~/.agents/docs/notion-databases.md)를 따른다.

- **Codex에서는 연결된 Notion 커넥터를 우선 사용한다.** 현재 세션에 노출된 Notion 검색·조회·생성·수정 도구를 찾아 사용한다. `notion-home` MCP 설치 여부를 시작 조건으로 삼지 않는다.
- **Claude Code에서는 `notion-home` MCP를 사용한다.**
- 연결 이름으로 개인·팀 워크스페이스 접근 여부를 단정하지 않는다. 대상 개인 DB나 페이지를 실제로 조회해 확인하고, 회사 계정으로 임의 대체하지 않는다.
- 본문의 `API-retrieve-page-markdown`·`API-query-data-source`·`API-post-page`·`API-patch-page`·`API-patch-block-children` 등은 `notion-home`의 작업 예시다. Codex에서는 같은 목적의 커넥터 도구로 본문 조회·DB 조회·페이지 생성·속성 수정·본문 수정을 수행한다.
- 커넥터에서 필요한 작업이 지원되지 않거나 대상 접근이 실패하면, 사용 가능한 다른 개인 Notion 연결을 확인한다. 접근 가능한 연결이 없으면 실패한 작업과 오류를 보고하고, 읽기·쓰기 성공을 주장하지 않는다.
- `notion-home`이 `401 token_invalid`를 반환해도 개인 커넥터의 같은 대상 조회가 성공하면 해당 커넥터로 계속한다. 이 경우 토큰 재인증은 작업의 선행 조건이 아니다.
- 쓰기 전에는 대상 DB 스키마와 기존 본문을 확인하고, 쓴 뒤에는 조회로 반영 결과를 검증한다.
