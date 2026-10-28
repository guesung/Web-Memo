# 이벤트 명세

이벤트가 **무엇을 의미하고 언제 발생하는지**를 관리하는 레포 원본입니다.
`/web-memo` 파이프라인의 event-analyst와 분석·구현·QA가 함께 사용합니다.
노션에는 작업의 가설·분석 결과·결정과 이 문서 링크만 남기며 명세를 복제하지 않습니다.

- **코드 계약:** [type.ts](../packages/shared/src/modules/analytics/type.ts)의 `TAnalyticsEvent`와 `EVENT_CATEGORY`.
- **발생 동작:** 아래 호출부 코드가 원천입니다. 타입에 이름이 있어도 실행 경로가 없을 수 있습니다.
- **문서 검토 기준:** 2026-10-28, master `445ea702`의 81종 명세에 PR #788의 신규 3종을 통합해 총 84개 이름을 기술했습니다. 소개 데모 수동 조작 1종을 더해 현재 85개입니다.
  기존 81종 문서화는 제품 동작을 바꾸지 않았으며, 신규 3종은 PR #788의 구현을 기준으로 기술했습니다.
  아래 한계는 AS-IS 기록이며, 오류 판정·개인정보 공백을 바람직한 동작으로 승인하는 것은 아닙니다.
- **운영 확인과 구분:** 코드·테스트를 읽은 사실은 테스트 실행·배포·운영 수신의 증거가 아닙니다.
  `도입 버전·일자 미확인`은 추측하지 않았다는 뜻이며 현재 미배포라는 뜻이 아닙니다.
- **분석 방법·등록 현황:** [analytics.md](analytics.md). 필터·퍼널·코호트·관찰 기간은 그곳에서 관리합니다.
- **별도 성능 계측:** Faro/Sentry의 `memo_page_latency` 등은 GA 이벤트가 아니며
  [메모 화면 지연 관측](memo-performance-observability.md)을 따릅니다.

## 읽는 방법

각 이름의 `질문` → `발생·제외` → `속성` → `단위·중복` → `근거·테스트` → `한계·이력`을 함께 읽습니다.
속성의 `?`는 선택 필드/선택 params입니다. 열거값을 이 문서에서 바꿔도 코드 계약은 바뀌지 않습니다.
`string`·`number` 타입만으로 값의 정제·범위·성공 판정까지 검증된다고 해석하지 않습니다.
대리 지표와 실제 사용자 성과, 클릭·요청·서버 성공·렌더·읽음을 구분합니다.

### 공통 전송 계약

근거: [Analytics.ts](../packages/shared/src/modules/analytics/Analytics.ts),
[analyticsTransport.ts](../packages/shared/src/modules/analytics/analyticsTransport.ts),
[Analytics.test.ts](../packages/shared/src/modules/analytics/Analytics.test.ts).

| 항목 | 현재 동작과 한계 |
| --- | --- |
| 호출 | `analytics.trackEvent({ name, params })`. helper가 여러 이벤트를 만들기도 함. `install_guide_load`·`extension_uninstall` 서버 전송과 웹 자동 수집은 개별 명세의 예외 |
| 분류 | `EVENT_CATEGORY`의 `core_action` / `engagement`. 비즈니스 성공이나 트랜잭션 보장은 아님 |
| 게이트 | 공통 계층은 development·운영자 계정을 제외, staging은 전송. 자동 gtag·서버 경로는 별도 게이트를 확인 |
| `event_category` | 분류 문자열. 공통 계층이 덧붙임 |
| `engagement_time_msec` | core_action=500, engagement=100의 고정값. 실제 체류·읽기·입력 시간으로 사용 금지 |
| `build_env` | development/staging/production 빌드 환경. 운영 커스텀 이벤트 분석은 호스트 허용 목록과 production을 함께 적용 |
| `debug_mode?` | staging에서만 true |
| `extension_version?` | 확장에서만 manifest 버전. 웹에는 없으며 코드 버전이 실제 전 사용자 보급을 증명하지 않음 |
| `user_id?` | 로그인 식별을 전송 계층에서 해석. 호출 후 비동기 storage 조회·계정 변경 경계가 있어 모든 시도를 시작 사용자에게 확정 귀속한다고 보장하지 않음 |
| `client_id` | 확장은 local storage UUID, 실패 시 임시 fallback. 웹은 gtag 쿠키 기반. 호출부의 이벤트 속성이 아니라 전송 식별자. 교차 웹/확장·다기기 연결 한계는 analytics.md 참조 |
| `session_id` | 확장 session storage의 30분 비활동 기준 재사용값. 웹은 gtag 관리. 모든 경로에 같은 세션 계약이 적용되는 것은 아님 |
| 전달 보장 | 웹 gtag 미준비·차단·종료·확장 fetch 실패로 누락 가능. 전송 계층 전체에 exactly-once·자동 재시도·멱등 dedupe 없음. Promise 종료나 HTTP 2xx는 보고서 수신 확인과 다름 |
| 개인정보 | 새 속성에 메모/인용/검색어/피드백 원문·이메일·개인 URL·메모 ID를 추가하지 않음. 기존 page_view의 위치/제목과 error reason은 별도 검토 필요하며 전역 sanitizer가 있다고 가정하지 않음 |
| 앱 | apps/app에는 이 analytics 전송 계층이 없어 웹·확장 지표가 앱 사용까지 대표하지 않음 |

### 속성 전송과 GA 등록

**전송 가능 ≠ 보고서에서 차원/측정항목으로 조회 가능 ≠ 실제 수신 확인**입니다.
이벤트별 속성은 아래 코드 계약, 등록 여부는 [등록 스냅샷](analytics.md#커스텀-차원측정항목)으로 대조합니다.
등록되지 않은 필드를 0이나 false로 채워 분석하지 않습니다. `source`·`action`·`reason` 같은 공용 차원은
여러 이벤트가 쓰므로 반드시 eventName과 함께 필터링합니다. 등록 스냅샷은 조회일 기준이며 설정을 변경하지 않았습니다.

### 확인·변경 절차

1. `type.ts`의 이름·params·분류와 실제 호출부/간접 helper/서버 경로를 확인합니다.
2. 성공·실패·취소·재시도·리렌더·계정/페이지 전환을 구분하고 현재 중복 제거 범위를 적습니다.
3. 해당 테스트를 연결하되 테스트 코드 존재, 이번 실행 결과, 운영 수신 검증을 따로 기록합니다.
4. 이름·속성·의미 변경 PR에서 이 문서도 갱신하고, 도입/의미 변경의 날짜·커밋·릴리스 버전을
   확인한 범위만 적습니다. 코드 병합일과 스토어/웹 배포일을 섞지 않습니다.
5. GA 등록은 별도 운영 작업입니다. 등록/실제 수신을 확인하지 않았다면 그 상태로 남깁니다.
6. 의미가 달라진 전후를 같은 시계열로 직접 비교하지 않습니다. 제거된 이름의 본문은 제거하되
   변경 이유·이전 의미는 Git 이력으로 보존합니다.

## 이벤트 찾아보기

- [메모·검색·재열람·오프라인](#메모검색재열람오프라인)
- [하이라이트·AI·카테고리·설정](#하이라이트ai카테고리설정)
- [진입·인증·가이드·공지·블로그](#진입인증가이드공지블로그)

## 메모·검색·재열람·오프라인

### `memo_write`

- **질문:** 메모를 작성·수정한 사용자는 얼마나 되는가?
- **발생·제외:** 일반 신규 저장(upsert·post)에서 title/memo/impression/actionItem 중 truthy 문자열이 있으면 발생. 수정은 patch 요청의 해당 키, upsert는 이전 값과 달라진 해당 키를 센다. 하이라이트 연결 메모는 created=true만; 오프라인은 신규/충돌 insert만 세고 update·동일내용 no-op은 제외.
- **속성:** 필수 `fields: string`(필드명을 정렬해 쉼표 연결), `is_new: boolean`; 선택 `source: "highlight"`. 일반 경로에는 source 없음.
- **단위·중복:** 저장/변경 해석 호출당 1회. 자동저장마다 다시 발생할 수 있고 전역 멱등성은 없다. 하이라이트 재시도는 created=false이면 제외.
- **근거·테스트:** [memoUpdateEvents.ts](../packages/shared/src/modules/analytics/memoUpdateEvents.ts) · [useMemoUpsertMutation.ts](../packages/shared/src/hooks/supabase/mutations/useMemoUpsertMutation.ts) · [useMemoPostMutation.ts](../packages/shared/src/hooks/supabase/mutations/useMemoPostMutation.ts) · [offlineMemoQueue.ts](../pages/side-panel/src/utils/offlineMemoQueue.ts) · [useHighlightMemos.ts](../packages/shared/src/hooks/supabase/useHighlightMemos.ts); 테스트: [memoUpdateEvents.test.ts](../packages/shared/src/modules/analytics/memoUpdateEvents.test.ts) · [useMemoUpsertMutation.test.ts](../packages/shared/src/hooks/supabase/mutations/useMemoUpsertMutation.test.ts).
- **한계·이력:** 현재 신규 조건은 trim 검사 없이 truthy 문자열이라 공백·자동 제목도 포함 가능. 실제 유효 본문/생애 첫 기록이 아니다. 2026-10 경로 통일 이전과 직접 비교하지 않는다. 운영 반영 버전·일자는 별도 배포 확인 필요.

### `memo_first_write`

- **질문:** 새 메모 생성 경로를 사용한 사용자는 얼마나 되는가?
- **발생·제외:** 일반 upsert에서 기존 행이 없어 insert한 뒤 result.error가 없을 때 발생. 하이라이트 연결 생성은 created=true일 때만 source와 함께 발생. 오프라인 큐 직접 insert와 공용 post 훅에는 이 이벤트 호출이 없다.
- **속성:** params 자체 선택; 있을 때 필수 `source: "highlight"`.
- **단위·중복:** 신규 생성 처리당 1회. 사용자 생애 1회 제한 없음. 하이라이트 재시도로 기존 연결을 받은 경우 제외.
- **근거·테스트:** [useMemoUpsertMutation.ts](../packages/shared/src/hooks/supabase/mutations/useMemoUpsertMutation.ts) · [highlightMemo.ts](../apps/chrome-extension/lib/background/highlightMemo.ts) · [useHighlightMemos.ts](../packages/shared/src/hooks/supabase/useHighlightMemos.ts); 테스트: [useMemoUpsertMutation.test.ts](../packages/shared/src/hooks/supabase/mutations/useMemoUpsertMutation.test.ts) · [highlightMemo.test.ts](../apps/chrome-extension/lib/background/highlightMemo.test.ts).
- **한계·이력:** 이름과 달리 생애 첫 작성이 아니며 비공백 본문 조건도 없다. 오프라인 생성까지 포괄하는 완전한 insert 집계가 아니다. 도입 버전·일자 미확인.

### `memo_editor_ready`

- **질문:** 패널을 연 설치 식별자가 실제 작성 가능한 화면까지 도달하는가?
- **발생·제외:** 인증·유효 탭·페이지 키와 메모/동일 경로 후보 조회 성공 후, 본문 textarea가 연결·표시되고 편집 가능할 때. 로그인·로딩·조회 오류·잠금·비활성 문서는 제외.
- **속성:** 필수 `source: "side_panel"`.
- **단위·중복:** 훅 인스턴스의 사용자·탭·페이지 범위마다 최초 1회 전송 시도. 리마운트 후 전역 중복 제거는 보장하지 않는다.
- **근거·테스트:** [useMemoEditorReady.ts](../pages/side-panel/src/components/MemoSection/components/MemoForm/hooks/useMemoEditorReady.ts) · [단위 테스트](../pages/side-panel/src/components/MemoSection/components/MemoForm/hooks/useMemoEditorReady.test.ts) · [확장 E2E](../e2e/tests/extension/firstMemoTracking.test.ts).
- **한계·이력:** 입력·서버 저장 완료가 아니다. DB-1250, [PR #788](https://github.com/guesung/Web-Memo/pull/788), 확장 버전 1.11.4에 포함 예정. 운영 보급·수신은 별도 확인한다.

### `memo_content_saved`

- **질문:** 설치 후 7일 안에 유효 본문 저장이 관측되는가?
- **발생·제외:** 출처가 지정된 실제 서버 insert/update 성공 후 유효한 숫자 ID의 반환 행에서 memo/impression/actionItem 중 이전 값과 trim 비교해 달라진 비어 있지 않은 본문이 있을 때. 제목·토글·본문 삭제·공백만 변경·로컬 큐 적재·no-op은 제외.
- **속성:** 필수 `source: "side_panel" | "offline_sync"`.
- **단위·중복:** write 결과 해석당 최대 1회. UI에서 중복 집계하지 않으며 재시도 write는 별도다. 계정 불일치 시 전송을 제외하고 전송 완료를 저장이 기다리지 않는다.
- **근거·테스트:** [memoSaveEvents.ts](../packages/shared/src/modules/analytics/memoSaveEvents.ts) · [단위 테스트](../packages/shared/src/modules/analytics/memoSaveEvents.test.ts) · [useMemoUpsertMutation.ts](../packages/shared/src/hooks/supabase/mutations/useMemoUpsertMutation.ts) · [offlineMemoQueue.ts](../pages/side-panel/src/utils/offlineMemoQueue.ts) · [Analytics.ts](../packages/shared/src/modules/analytics/Analytics.ts).
- **한계·이력:** 사용자 생애 첫 작성·전체 플랫폼 저장을 뜻하지 않는다. DB-1250, PR #788, 확장 1.11.4에 포함 예정. 실제 배포·운영 수신과 성숙 코호트는 별도 확인한다.

### `memo_save_result`

- **질문:** 수집된 클라우드 write 결과의 실패 비율이 출처별로 다른가?
- **발생·제외:** 출처가 지정된 확장 클라우드 write가 응답하거나 reject할 때. 사전 조회 실패·로컬 큐 적재·서버 no-op·큐 삭제는 제외. 성공 응답에 반환 행이 없어도 결과 이벤트와 유효 본문 판정은 구분한다.
- **속성:** 필수 `is_success: boolean`, `source: "side_panel" | "offline_sync"`, `reason: "none" | "network" | "server" | "unknown"`. 성공은 none, 실패는 네트워크 판별 후 Error/message 객체이면 server, 나머지는 unknown.
- **단위·중복:** 실제 write 시도당 1회 해석. 재시도는 별도 기록하며 UI·뮤테이션·큐에서 동일 write를 중복 집계하지 않는다. 계정 불일치 시 전송 제외.
- **근거·테스트:** [memoSaveEvents.ts](../packages/shared/src/modules/analytics/memoSaveEvents.ts) · [단위 테스트](../packages/shared/src/modules/analytics/memoSaveEvents.test.ts) · [upsert 테스트](../packages/shared/src/hooks/supabase/mutations/useMemoUpsertMutation.test.ts) · [큐 테스트](../pages/side-panel/src/utils/offlineMemoQueue.test.ts) · [전송 테스트](../packages/shared/src/modules/analytics/Analytics.test.ts).
- **한계·이력:** 미수집·무응답이 있어 실제 전체 저장 실패율이 아니며 원문 오류 메시지는 속성으로 보내지 않는다. DB-1250, PR #788, 확장 1.11.4에 포함 예정. 운영 보급·수신 미확인.

### `memo_delete`

- **질문:** 휴지통 이동 요청은 얼마나 발생하는가?
- **발생·제외:** 해당 mutation의 onSuccess에서 발생. mutationFn은 Supabase 응답을 그대로 반환하며 result.error를 throw하지 않으므로 오류 객체가 있는 응답에도 onSuccess가 실행될 수 있다. reject는 제외.
- **속성:** 필수 `memo_count: number`(요청 idList.length).
- **단위·중복:** mutation 처리당 1회. 여러 메모를 요청해도 이벤트 1건이며 memo_count가 요청 수를 나타낸다. 동일 요청 재실행 중복 제거 없음.
- **근거·테스트:** [useDeleteMemosMutation.ts](../packages/shared/src/hooks/supabase/mutations/useDeleteMemosMutation.ts) · [memoService.ts](../packages/shared/src/utils/supabase/memoService.ts); 테스트: 이벤트 전용 단위 검증 미확인.
- **한계·이력:** 서버 성공률·실제 변경/삭제 행수로 해석하지 않는다. memo_count는 응답 행수가 아니며 Supabase 오류 검사 공백을 명세에 드러낸다. 도입 버전·일자 미확인.

### `memo_restore`

- **질문:** 휴지통 복원 요청은 얼마나 발생하는가?
- **발생·제외:** 해당 mutation의 onSuccess에서 발생. mutationFn은 Supabase 응답을 그대로 반환하며 result.error를 throw하지 않으므로 오류 객체가 있는 응답에도 onSuccess가 실행될 수 있다. reject는 제외.
- **속성:** 필수 `memo_count: number`(요청 idList.length).
- **단위·중복:** mutation 처리당 1회. 여러 메모를 요청해도 이벤트 1건이며 memo_count가 요청 수를 나타낸다. 동일 요청 재실행 중복 제거 없음.
- **근거·테스트:** [useRestoreMemosMutation.ts](../packages/shared/src/hooks/supabase/mutations/useRestoreMemosMutation.ts) · [memoService.ts](../packages/shared/src/utils/supabase/memoService.ts); 테스트: 이벤트 전용 단위 검증 미확인.
- **한계·이력:** 서버 성공률·실제 변경/삭제 행수로 해석하지 않는다. memo_count는 응답 행수가 아니며 Supabase 오류 검사 공백을 명세에 드러낸다. 도입 버전·일자 미확인.

### `memo_delete_permanently`

- **질문:** 영구 삭제 요청은 얼마나 발생하는가?
- **발생·제외:** 해당 mutation의 onSuccess에서 발생. mutationFn은 Supabase 응답을 그대로 반환하며 result.error를 throw하지 않으므로 오류 객체가 있는 응답에도 onSuccess가 실행될 수 있다. reject는 제외.
- **속성:** 필수 `memo_count: number`(요청 idList.length).
- **단위·중복:** mutation 처리당 1회. 여러 메모를 요청해도 이벤트 1건이며 memo_count가 요청 수를 나타낸다. 동일 요청 재실행 중복 제거 없음.
- **근거·테스트:** [useDeleteMemosPermanentlyMutation.ts](../packages/shared/src/hooks/supabase/mutations/useDeleteMemosPermanentlyMutation.ts) · [memoService.ts](../packages/shared/src/utils/supabase/memoService.ts); 테스트: 이벤트 전용 단위 검증 미확인.
- **한계·이력:** 서버 성공률·실제 변경/삭제 행수로 해석하지 않는다. memo_count는 응답 행수가 아니며 Supabase 오류 검사 공백을 명세에 드러낸다. 도입 버전·일자 미확인.

### `memo_open`

- **질문:** 어떤 메모 열기 접점이 사용되는가?
- **발생·제외:** 웹 카드 비선택 모드 클릭에서 URL id 변경 전 발생. 하이라이트 연결 링크는 살아 있는 메모 링크 클릭, 백그라운드 연결 생성 경로는 웹 탭 생성 성공 후 발생. 휴지통 연결은 제외. 상세 화면 렌더 완료는 기다리지 않는다.
- **속성:** 필수 `has_search_query: boolean`; 선택 `source: "highlight"`. 일반 카드 값은 검색 폼 상태, 하이라이트는 false.
- **단위·중복:** 카드/링크 클릭 또는 탭 생성 호출당 1회. 사용자·메모 단위 전역 중복 제거 없음. 원문 이동과 별개.
- **근거·테스트:** [MemoItem.tsx](../apps/web/src/app/%5Blng%5D/%28auth%29/%28sidebar%29/memos/_components/MemoView/MemoItem.tsx) · [HighlightMemoAction.tsx](../pages/content-ui/src/ui/highlight/HighlightMemoAction.tsx) · [highlightMemo.ts](../apps/chrome-extension/lib/background/highlightMemo.ts); 테스트: [highlightMemo.test.ts](../apps/chrome-extension/lib/background/highlightMemo.test.ts) · [HighlightEditToolbar.test.ts](../pages/content-ui/src/ui/highlight/HighlightEditToolbar.test.ts).
- **한계·이력:** 상세 읽음·실제 표시·기존 메모 재열람을 증명하지 않는다. 직접 URL 진입 등 모든 열람을 포괄하지도 않는다. 도입 버전·일자 미확인.

### `memo_source_open`

- **질문:** 웹 메모의 출처 링크가 눌리는가?
- **발생·제외:** 웹 MemoCardHeader의 원문 앵커 onClick에서 발생. 브라우저 이동·탭 생성 성공은 기다리지 않으며 버블링을 중단한다.
- **속성:** 이벤트별 속성 없음.
- **단위·중복:** 핸들러 호출당 1회. 같은 원문 반복 클릭 중복 제거 없음.
- **근거·테스트:** [index.tsx](../apps/web/src/app/%5Blng%5D/%28auth%29/%28sidebar%29/memos/_components/MemoCardHeader/index.tsx); 테스트: 이벤트 전용 단위 검증 미확인.
- **한계·이력:** 원문 도착·읽음·도움의 증거가 아니라 링크 클릭이다. 사이드 패널의 모든 원문 이동을 포함하지 않는다. 도입 버전·일자 미확인.

### `memo_search`

- **질문:** 검색 입력이 얼마나 사용되는가?
- **발생·제외:** 웹 검색어가 비어 있지 않은 상태로 800ms 유지되면 발생. 입력 변경/unmount 시 타이머 취소, 빈 문자열은 제외. 공백 문자열은 제외하지 않는다.
- **속성:** 필수 `query_length: number`(JavaScript 문자열 length). 검색어 원문 없음.
- **단위·중복:** 검색어 변경 후 타이머 완료당 1회. 같은 문자열 재입력·재마운트에 대한 전역 중복 제거 없음.
- **근거·테스트:** [index.tsx](../apps/web/src/app/%5Blng%5D/%28auth%29/%28sidebar%29/memos/_components/MemoSearchForm/index.tsx); 테스트: 이벤트 전용 단위 검증 미확인.
- **한계·이력:** 800ms는 이벤트 debounce이지 실제 조회 debounce가 아니다. 응답 성공·검색 의도·고유 검색 횟수를 보장하지 않는다. 도입 버전·일자 미확인.

### `memo_filter`

- **질문:** 검색 대상 선택 컨트롤이 사용되는가?
- **발생·제외:** 웹 검색 대상 Select onValueChange에서 폼 값을 바꾼 뒤 발생. 목록 조회 성공이나 결과 변경을 기다리지 않는다. 일반 상태·카테고리·도메인 필터 전체가 대상은 아니다.
- **속성:** 필수 `search_target: string`; 현재 UI 값 `all|title|memo`.
- **단위·중복:** Select 콜백당 1회. 별도 분석 중복 제거 없음.
- **근거·테스트:** [index.tsx](../apps/web/src/app/%5Blng%5D/%28auth%29/%28sidebar%29/memos/_components/MemoSearchForm/index.tsx); 테스트: 이벤트 전용 단위 검증 미확인.
- **한계·이력:** 선택 UI 사용을 나타낼 뿐 해당 대상으로 실제 DB 검색이 적용됐다는 증거가 아니다. 도입 버전·일자 미확인.

### `search_no_result`

- **질문:** 검색어 변경 때 빈 목록이 관찰되는가?
- **발생·제외:** MemoGrid에서 searchQuery가 변경될 때 현재 memos.length=0이고 검색어가 truthy이면 발생. effect 의존성은 searchQuery뿐이며 쿼리 완료·오류 여부를 검사하지 않는다.
- **속성:** 필수 `has_domain_filter: boolean`(domain !== undefined).
- **단위·중복:** effect 실행당 최대 1회. 같은 검색어에서 목록만 갱신되면 다시 기록하지 않지만 재마운트 중복은 가능.
- **근거·테스트:** [MemoGrid.tsx](../apps/web/src/app/%5Blng%5D/%28auth%29/%28sidebar%29/memos/_components/MemoView/MemoGrid.tsx); 테스트: 이벤트 전용 단위 검증 미확인.
- **한계·이력:** 확정된 검색 0건·실패율이 아니다. 이전/로딩 상태로 발화하거나 늦게 도착한 0건을 놓칠 수 있고 모든 보기 모드의 동일 계측을 보장하지 않는다. 도입 버전·일자 미확인.

### `memo_domain_filter_change`

- **질문:** 도메인 조건을 고르거나 해제하는가?
- **발생·제외:** 필터 컨트롤은 URL pushState 뒤 nextDomain이 기존 domain과 다르면 발생. 같은 값 재선택은 제외. 도메인 빈 상태의 해제 버튼도 URL에서 조건 제거 후 발생.
- **속성:** 필수 `action: "select"|"clear"`, `source: "popover"|"clear_button"|"empty_state"`; 선택 `domain_option_count: number`(컨트롤의 옵션 수, empty_state는 생략). 도메인 원문 없음.
- **단위·중복:** 조건 변경 핸들러당 1회. URL 조건의 과거/미래 전체 변경을 추적하는 전역 감시 아님.
- **근거·테스트:** [MemoDomainFilter.tsx](../apps/web/src/app/%5Blng%5D/%28auth%29/%28sidebar%29/memos/_components/MemoView/MemoDomainFilter.tsx) · [MemoDomainEmptyState.tsx](../apps/web/src/app/%5Blng%5D/%28auth%29/%28sidebar%29/memos/_components/MemoView/MemoDomainEmptyState.tsx); 테스트: [memo-domain-filter.test.ts](../e2e/tests/web/memo-domain-filter.test.ts).
- **한계·이력:** 조회 완료·필터 만족·사용자 의도 성공을 의미하지 않는다. DB-1081. 운영 도입 버전·일자 미확인.

### `memo_status_toggle`

- **질문:** 위시·중요·읽는 중 상태를 어떻게 바꾸는가?
- **발생·제외:** 공용 patch 성공 후 요청에 isWish/isStar/isReading 키가 있으면 각각 발생. upsert 수정은 이전 값과 다른 필드만 전달. 오류 throw는 제외. 낙관적 화면 변경 자체는 발생 시점 아님.
- **속성:** 필수 `status: "wish"|"star"|"reading"`, `enabled: boolean`.
- **단위·중복:** 요청에 든 상태 키당 1회. patch는 이전 값 동등성 검사 없이 키 존재로 기록하므로 같은 값 재설정도 가능.
- **근거·테스트:** [memoUpdateEvents.ts](../packages/shared/src/modules/analytics/memoUpdateEvents.ts) · [useMemoPatchMutation.ts](../packages/shared/src/hooks/supabase/mutations/useMemoPatchMutation.ts) · [useMemoUpsertMutation.ts](../packages/shared/src/hooks/supabase/mutations/useMemoUpsertMutation.ts); 테스트: [memoUpdateEvents.test.ts](../packages/shared/src/modules/analytics/memoUpdateEvents.test.ts) · [useMemoPatchMutation.test.ts](../packages/shared/src/hooks/supabase/mutations/useMemoPatchMutation.test.ts).
- **한계·이력:** 토글 클릭 횟수·고유 상태 변경 수와 동일하지 않다. DB-1158에서 upsert 변경값 분리. 운영 도입 버전·일자 미확인.

### `memo_plan_change`

- **질문:** 읽을 계획 날짜를 배정·해제하는가?
- **발생·제외:** patch 성공 후 plannedDate !== undefined이면 발생. upsert는 변경된 날짜 또는 신규 저장 시 첫 날짜 배정도 기록. null은 해제, 그 외는 배정.
- **속성:** 필수 `action: "set"|"clear"`; 선택 `days_ahead: number`(set 경로에서 로컬 오늘→계획 날짜 일수, 오늘0).
- **단위·중복:** 해당 날짜 변경 해석당 1회. patch 동일 값 재요청에 대한 별도 중복 제거 없음.
- **근거·테스트:** [memoUpdateEvents.ts](../packages/shared/src/modules/analytics/memoUpdateEvents.ts) · [useMemoPatchMutation.ts](../packages/shared/src/hooks/supabase/mutations/useMemoPatchMutation.ts) · [useMemoUpsertMutation.ts](../packages/shared/src/hooks/supabase/mutations/useMemoUpsertMutation.ts); 테스트: [memoUpdateEvents.test.ts](../packages/shared/src/modules/analytics/memoUpdateEvents.test.ts) · [useMemoPatchMutation.test.ts](../packages/shared/src/hooks/supabase/mutations/useMemoPatchMutation.test.ts).
- **한계·이력:** 계획 수행·실제 읽음이 아니다. 로컬 날짜 기준이며 음수도 타입상 허용된다. DB-1195. 운영 도입 버전·일자 미확인.

### `memo_category_change`

- **질문:** 카테고리 변경과 입력 경로가 사용되는가?
- **발생·제외:** 공용 patch 성공 뒤 category_id 키가 있으면 발생(source 전달 가능). upsert 수정은 변경값만 전달. 웹 일괄 MemoOption은 mutation 호출 전에 params 없이 별도 기록한다.
- **속성:** params 자체 선택; 존재하면 필수 `action: "set"|"clear"`, 선택 `source: "button"|"hash"|"ai"`(TCategoryChangeSource). 공용 해석은 category_id=null일 때 clear.
- **단위·중복:** 공용 변경 해석당 1회 또는 웹 일괄 조작당 1회. 일괄 경로는 메모 수만큼 발화하지 않음.
- **근거·테스트:** [memoUpdateEvents.ts](../packages/shared/src/modules/analytics/memoUpdateEvents.ts) · [useMemoPatchMutation.ts](../packages/shared/src/hooks/supabase/mutations/useMemoPatchMutation.ts) · [useMemoUpsertMutation.ts](../packages/shared/src/hooks/supabase/mutations/useMemoUpsertMutation.ts) · [MemoOption.tsx](../apps/web/src/app/%5Blng%5D/%28auth%29/%28sidebar%29/memos/_components/MemoCardFooter/MemoOption.tsx); 테스트: [memoUpdateEvents.test.ts](../packages/shared/src/modules/analytics/memoUpdateEvents.test.ts).
- **한계·이력:** params 없는 행을 경로/성공으로 추정하지 않는다. 모든 행이 서버 성공 뒤 발생하는 이벤트가 아니다. DB-1158. 운영 도입 버전·일자 미확인.

### `memo_undo`

- **질문:** 되돌리기 버튼을 누르는가?
- **발생·제외:** 웹 삭제·위시·읽는 중 토스트의 Undo onClick에서 복구 mutation 전에 발생. 서버 복구 성공을 기다리지 않는다.
- **속성:** 필수 `action: "wish"|"reading"|"delete"`.
- **단위·중복:** Undo 콜백당 1회. 같은 대상의 재시도/중복 클릭에 별도 분석 중복 제거 없음.
- **근거·테스트:** [MemoOption.tsx](../apps/web/src/app/%5Blng%5D/%28auth%29/%28sidebar%29/memos/_components/MemoCardFooter/MemoOption.tsx) · [MemoStatusToggles.tsx](../apps/web/src/app/%5Blng%5D/%28auth%29/%28sidebar%29/memos/_components/MemoCardFooter/MemoStatusToggles.tsx); 테스트: 이벤트 전용 단위 검증 미확인.
- **한계·이력:** 실제 복구 성공률이 아니며 모든 편집 되돌리기를 포함하지 않는다. 도입 버전·일자 미확인.

### `memo_offline_queued`

- **질문:** 어떤 계기로 오프라인 대기 저장이 발생하는가?
- **발생·제외:** 로그인 사용자의 폼 변경을 enqueueOfflineMemo에 await한 뒤 발생. 사전 오프라인·같은 대상 대기 중·온라인 시도 후 네트워크 오류 경로가 있다. 사용자 없으면 failed로 끝나며 발화하지 않는다.
- **속성:** 필수 `trigger: "offline"|"network_error"|"already_queued"`; 선택 `queue_contract_version: 2`.
- **단위·중복:** enqueue 성공 호출당 1회. 같은 대상의 최신 입력이 큐 항목을 덮어써도 다시 발생하므로 이벤트 수≠고유 큐 항목 수.
- **근거·테스트:** [useMemoForm.ts](../pages/side-panel/src/components/MemoSection/components/MemoForm/hooks/useMemoForm.ts) · [offlineMemoQueue.ts](../pages/side-panel/src/utils/offlineMemoQueue.ts); 테스트: [useMemoForm.test.ts](../pages/side-panel/src/components/MemoSection/components/MemoForm/hooks/useMemoForm.test.ts) · [offlineMemoQueue.test.ts](../pages/side-panel/src/utils/offlineMemoQueue.test.ts).
- **한계·이력:** 클라우드 영속 저장 성공을 의미하지 않는다. 사용자/메모/논리 저장 식별자는 없고 입력 유실률 분모로 바로 사용 불가. 도입 버전·일자 미확인.

### `memo_offline_sync_result`

- **질문:** 대기열 flush에서 몇 항목이 처리·충돌했는가?
- **발생·제외:** v2는 flush에 서버 시도·ACK 완료·네트워크/저장소/잠금 오류가 있으면 종료 시 발생. 사용자 없음·동일 훅 중첩 호출·정상 빈 큐는 제외한다. 네트워크 실패만 난 시도와 서버 호출 전 오류도 포함한다. 이전 버전은 순수 네트워크 실패·throw의 결과가 누락될 수 있다.
- **속성:** 필수 `trigger: "mount"|"online"|"retry_click"|"enqueue"`, `synced_count: number`, `conflict_count: number`, `has_other_error: boolean`; 선택 `queue_contract_version: 2`, `attempted_count`, `network_error_count`, `other_error_count`, `remaining_count`, `ack_latency_sum_ms`, `ack_latency_count`, `no_op_count`. 잔여량을 읽지 못하면 remaining_count는 생략한다.
- **단위·중복:** 관측된 flush 결과당 1회. synced_count는 서버 확인과 로컬 ACK 저장을 모두 마쳐 제거한 revision 수다. conflict_count/no_op_count는 그 부분집합이다. 실제 충돌 복사 알림과 ACK 완료 수는 다를 수 있다. 같은 사용자 flush는 확장 origin의 Web Lock으로 직렬화하지만 서버·GA 전역 exactly-once는 보장하지 않는다.
- **근거·테스트:** [useOfflineMemoSync.ts](../pages/side-panel/src/hooks/useOfflineMemoSync.ts) · [offlineMemoQueue.ts](../pages/side-panel/src/utils/offlineMemoQueue.ts); 테스트: [useOfflineMemoSync.test.ts](../pages/side-panel/src/hooks/useOfflineMemoSync.test.ts) · [offlineMemoQueue.test.ts](../pages/side-panel/src/utils/offlineMemoQueue.test.ts).
- **한계·이력:** DB-1255의 v2 필터로 관측 전송 시도와 ACK 지연을 분석한다. queue 이벤트와 단위가 달라 단순 나눗셈으로 24시간 복구 성공률을 만들 수 없다. 전체 운영 유실률·p95·입력부터 클라우드 완료 지연을 뜻하지 않는다. 분모·중복 제거·시각 기준은 [오프라인 큐 계약](analytics.md#오프라인-큐-계약-db-1255) 참조. 실제 보급 버전·수신은 별도 관찰 대상이다.

### `past_memo_show`

- **질문:** 중복/관련 기록 안내가 렌더되는가?
- **발생·제외:** PastMemoNotice effect에서 normalizedUrl이 있고 duplicate 또는 relatedMemos가 존재하면 해당 종류별로 발생. 실제 viewport 가시성·패널 전경 여부는 검사하지 않는다.
- **속성:** 필수 `kind: "duplicate"|"related"`, `source: "rule"|"jev"`; related는 jev 고정.
- **단위·중복:** 컴포넌트 ref의 normalizedUrl+kind당 1회. source·개별 추천 ID는 중복 키가 아니며 리마운트하면 기억이 사라진다.
- **근거·테스트:** [PastMemoNotice.tsx](../pages/side-panel/src/components/MemoSection/components/MemoForm/components/PastMemoNotice.tsx); 테스트: [PastMemoNotice.test.ts](../pages/side-panel/src/components/MemoSection/components/MemoForm/components/PastMemoNotice.test.ts).
- **한계·이력:** 실제 읽은 노출이 아니며 관련 목록의 각 항목 노출 수가 아니다. 도입 버전·일자 미확인.

### `past_memo_open`

- **질문:** 과거 메모 안내에서 열기를 누르는가?
- **발생·제외:** duplicate 메모 버튼과 related 항목 클릭에서 동작 전에 발생. duplicate는 onDuplicateOpen으로 패널 열람, 콜백 없으면 원문 새 탭 fallback. related는 원문 새 탭 이동이다. duplicate의 별도 원문 버튼에는 이 이벤트 없음.
- **속성:** 필수 `kind: "duplicate"|"related"`, `source: "rule"|"jev"`; related는 jev 고정.
- **단위·중복:** 컴포넌트 ref의 normalizedUrl+kind당 첫 클릭 1회. 뒤로 다시 열기는 view_start와 달리 open이 다시 안 나갈 수 있다.
- **근거·테스트:** [PastMemoNotice.tsx](../pages/side-panel/src/components/MemoSection/components/MemoForm/components/PastMemoNotice.tsx); 테스트: [PastMemoNotice.test.ts](../pages/side-panel/src/components/MemoSection/components/MemoForm/components/PastMemoNotice.test.ts).
- **한계·이력:** 메모 열기와 원문 열기가 섞인 클릭 이벤트다. 실제 렌더·탭 생성·읽음 성공률로 해석하지 않는다. 과거 설명의 “원문 열기”만으로는 불완전. 도입 버전·일자 미확인.

### `past_memo_expand`

- **질문:** 관련 기록의 접힌 목록을 펼치는가?
- **발생·제외:** 관련 목록 Collapsible가 열린 상태로 바뀔 때 handleRelatedExpand에서 발생. 닫는 전환은 제외.
- **속성:** 필수 `kind: "related"`, `source: "jev"`.
- **단위·중복:** 펼칠 때마다 1회. 다시 접었다 펼치면 다시 발생하며 URL당 1회 제한 없음.
- **근거·테스트:** [PastMemoNotice.tsx](../pages/side-panel/src/components/MemoSection/components/MemoForm/components/PastMemoNotice.tsx); 테스트: [PastMemoNotice.test.ts](../pages/side-panel/src/components/MemoSection/components/MemoForm/components/PastMemoNotice.test.ts).
- **한계·이력:** 추가 항목의 개별 가시성·읽음·원문 방문을 뜻하지 않는다. 도입 버전·일자 미확인.

### `past_memo_dismiss`

- **질문:** 과거 기록 안내를 명시적으로 닫는가?
- **발생·제외:** 안내 X 클릭에서 현재 존재하는 duplicate/related 종류마다 발생한 뒤 dismissCurrentUrl을 호출한다. 자동 숨김이나 닫기 저장 성공은 기다리지 않는다.
- **속성:** 필수 `kind: "duplicate"|"related"`, `source: "rule"|"jev"`; related는 jev 고정.
- **단위·중복:** 한 X 클릭에 두 종류가 있으면 2건. 별도 영속 중복 제거 없음.
- **근거·테스트:** [PastMemoNotice.tsx](../pages/side-panel/src/components/MemoSection/components/MemoForm/components/PastMemoNotice.tsx); 테스트: [PastMemoNotice.test.ts](../pages/side-panel/src/components/MemoSection/components/MemoForm/components/PastMemoNotice.test.ts).
- **한계·이력:** 한 건=한 사용자 클릭이 아니며 영구 설정 끄기·불만족 이유를 증명하지 않는다. 도입 버전·일자 미확인.

### `past_memo_view_start`

- **질문:** 중복 안내에서 패널 기록 열람을 얼마나 시도하는가?
- **발생·제외:** 인증된 사용자가 중복 메모 버튼으로 패널 열람을 시작할 때 발생. 기존 시도가 있으면 먼저 cancelled로 마감. 원문 새 탭 fallback·관련 원문 열기는 제외.
- **속성:** 필수 `source: "rule"|"jev"`.
- **단위·중복:** 클릭으로 만든 로컬 시도당 1회. 기존 past_memo_open의 URL/종류 중복 제거와 독립; 뒤로 갔다 다시 열면 새 시도.
- **근거·테스트:** [pastMemoTracking.ts](../pages/side-panel/src/components/MemoSection/utils/pastMemoTracking.ts) · [index.tsx](../pages/side-panel/src/components/MemoSection/index.tsx); 테스트: [pastMemoTracking.test.ts](../pages/side-panel/src/components/MemoSection/utils/pastMemoTracking.test.ts) · [pastMemoDiscovery.test.ts](../e2e/tests/hybrid/pastMemoDiscovery.test.ts).
- **한계·이력:** 시도 토큰·메모/사용자 ID·원문은 신규 속성으로 전송하지 않는다. 결과 누락 가능하므로 성공 수÷시작 수는 관측 완료 비율이지 완전한 실패율이 아니다. DB-1251; 운영 도입 버전·일자는 별도 확인.

### `past_memo_view_result`

- **질문:** 열기 시도가 실제 기록 표시나 명시적 실패/취소로 끝나는가?
- **발생·제외:** 현재 계정/시도의 비공백 표시 본문이 전경 패널 DOM에 반영되면 displayed. 빈 내용·조회 오류·없음·실제 scope 이탈도 결과. 계정 전환/로그아웃은 이전 시도를 전송 없이 무효화한다. 제목만은 표시 성공 본문이 아님.
- **속성:** 필수 `source: "rule"|"jev"`, `is_success: boolean`, `reason: "displayed"|"empty_content"|"query_error"|"not_found"|"cancelled"`, `action: "existing"|"recent"|"unknown"`. existing은 시도 시작보다 24시간 이상 전 생성, 미래/무효 시각은 unknown.
- **단위·중복:** 로컬 시도당 terminal 결과 최대 1회. 성공·실패·취소 경쟁은 첫 마감만 허용. 프로세스 종료·계정 전환의 결과 누락은 가능.
- **근거·테스트:** [pastMemoTracking.ts](../pages/side-panel/src/components/MemoSection/utils/pastMemoTracking.ts) · [PastMemoView.tsx](../pages/side-panel/src/components/MemoSection/components/PastMemoView.tsx); 테스트: [pastMemoTracking.test.ts](../pages/side-panel/src/components/MemoSection/utils/pastMemoTracking.test.ts) · [PastMemoView.test.ts](../pages/side-panel/src/components/MemoSection/components/PastMemoView.test.ts).
- **한계·이력:** 실제 읽음·효용은 증명하지 않는다. existing 사용자÷전체 기존 기록 보유자라는 재열람률 분모는 없다. DB-1251; 운영 도입 버전·일자는 별도 확인.

### `past_memo_reuse`

- **질문:** 표시한 기존 기록에서 원문으로 다시 이동하는가?
- **발생·제외:** 동일 시도에서 existing 표시 성공 후 기존 원문 버튼을 누르고 Tab.create가 resolve된 경우 발생. 결과 전·recent/unknown·탭 생성 실패·계정 변경은 제외. 탭 생성이 일으킨 scope 변경은 허용한다.
- **속성:** 필수 `source: "rule"|"jev"`, `action: "source_open"`.
- **단위·중복:** 적격 로컬 열람 시도당 첫 탭 생성 완료 1회(reused 플래그). 다른 새 시도에서는 다시 발생 가능.
- **근거·테스트:** [pastMemoTracking.ts](../pages/side-panel/src/components/MemoSection/utils/pastMemoTracking.ts) · [PastMemoView.tsx](../pages/side-panel/src/components/MemoSection/components/PastMemoView.tsx); 테스트: [pastMemoTracking.test.ts](../pages/side-panel/src/components/MemoSection/utils/pastMemoTracking.test.ts) · [PastMemoView.test.ts](../pages/side-panel/src/components/MemoSection/components/PastMemoView.test.ts).
- **한계·이력:** 원문 로드 완료·읽음·문제 해결을 뜻하지 않는 재사용 행동 대리지표다. 개별 시도 토큰을 GA로 보내지 않아 사후 정확한 attempt join은 불가. DB-1251; 운영 도입 버전·일자는 별도 확인.

## 하이라이트·AI·카테고리·설정

### `highlight_source_jump`

- **질문:** 패널 인용에서 원문 위치로 이동하는가?
- **발생·제외:** 패널 인용 클릭 후 `FOCUS_HIGHLIGHT` 응답 `success=true`일 때. 탭/페이지 키 없음, 앵커 검증·스크롤 실패, 예외는 제외한다.
- **속성:** 이벤트 전용 속성 없음.
- **단위·중복:** 성공한 클릭마다 1회. 사용자·하이라이트당 중복 제거는 없다.
- **근거·테스트:** [PageHighlights](../pages/side-panel/src/components/MemoSection/components/PageHighlights.tsx), [원문 포커스 핸들러](../pages/content-ui/src/ui/highlight/useHighlightSelection.ts). 전용 이벤트 테스트 미확인.
- **한계·이력:** `scrollIntoView` 호출 성공이며 실제 읽음·메모 활용을 뜻하지 않는다. DB-1180; 도입 버전·일자 미확인.

### `highlight_panel_open_result`

- **질문:** 웹 하이라이트 카드에서 패널 열기 요청이 성공하는가?
- **발생·제외:** 카드 상단 원문 링크의 수정키 없는 좌클릭 후 `OPEN_SIDE_PANEL_FROM_WEB` 응답·예외에서 발생. 중간/우클릭과 Ctrl/Meta/Shift/Alt 조합은 제외한다.
- **속성:** 필수 `is_success:boolean`; 응답의 `success===true`만 true, 요청 reject는 false.
- **단위·중복:** 대상 클릭마다 결과 1회. 반복 클릭을 묶지 않는다.
- **근거·테스트:** [HighlightGroupCard](../apps/web/src/app/%5Blng%5D/%28auth%29/%28sidebar%29/highlights/_components/HighlightGroupCard.tsx), [테스트](../apps/web/src/app/%5Blng%5D/%28auth%29/%28sidebar%29/highlights/_components/HighlightGroupCard.test.ts).
- **한계·이력:** API 결과일 뿐 패널 콘텐츠 표시·작성·열람 성공이 아니다. DB-1180; 도입 버전·일자 미확인.

### `highlight_create`

- **질문:** 원문 선택에서 어떤 색으로 하이라이트를 생성하는가?
- **발생·제외:** content UI 생성 controller가 성공 응답을 처리한 뒤 발생. 중복 앵커·저장 중 재호출·실패·페이지 세대가 바뀐 늦은 응답은 제외한다.
- **속성:** 필수 `color:HighlightColor` = `yellow|green|blue|pink|purple`, `has_note:boolean`. 현재 호출은 항상 `has_note=false`. 색상 원본은 [Highlight.ts](../packages/shared/src/constants/Highlight.ts).
- **단위·중복:** controller의 앵커 중복 방지와 진행 중 가드가 적용된 생성 성공 1회. 재마운트·서버 차원의 정확히 한 번은 보장하지 않는다.
- **근거·테스트:** [useHighlightSelection](../pages/content-ui/src/ui/highlight/useHighlightSelection.ts), [controller](../pages/content-ui/src/ui/highlight/createHighlightController.ts), [메뉴 테스트](../pages/content-ui/src/ui/highlight/useHighlightSelectionMenu.test.ts), [controller 테스트](../pages/content-ui/src/ui/highlight/createHighlightController.test.ts).
- **한계·이력:** 말풍선 실제 노출 분모가 없어 노출 대비 생성률은 계산 불가. 나중에 붙인 메모는 `has_note`에 소급 반영되지 않는다. 도입 버전·일자 미확인.

### `highlight_note_update`

- **질문:** 하이라이트 코멘트를 저장하는가?
- **발생·제외:** content UI는 `editor.edit(note)`가 true일 때, 웹은 `updateHighlight` 오류 검사 후 mutation 성공 때 발생. 색 변경·삭제는 content UI 이벤트에서 제외한다.
- **속성:** 이벤트 전용 속성 없음. 메모 내용·길이·하이라이트 ID를 보내지 않는다.
- **단위·중복:** 저장 완료 호출마다 1회. content UI는 저장 중 가드와 페이지 세대 검증이 있으나 웹의 동일 값 재저장까지 제거하는 계약은 없다.
- **근거·테스트:** [useHighlightSelection](../pages/content-ui/src/ui/highlight/useHighlightSelection.ts), [useHighlightNoteMutation](../apps/web/src/app/%5Blng%5D/%28auth%29/%28sidebar%29/highlights/_hooks/useHighlightNoteMutation.ts), [메뉴 테스트](../pages/content-ui/src/ui/highlight/useHighlightSelectionMenu.test.ts).
- **한계·이력:** 순수한 새 메모 추가와 기존 메모 수정/비우기를 구분하지 못한다. 도입 버전·일자 미확인.

### `highlight_bubble_disable`

- **질문:** 말풍선을 어디까지, 어떤 선택 맥락에서 끄는가?
- **발생·제외:** 선택 말풍선 메뉴의 사이트/전체 끄기 저장 성공 뒤 발생. 선택 없음과 storage 오류는 제외. 옵션 화면에서 설정을 끄는 행동은 이 이벤트가 아니다.
- **속성:** 모두 필수: `scope:"site"|"all"`, `intro_pending:boolean`, `selection_length:number`(끄기 전 현재 선택 문자열 길이, 선택 없으면 0). 원문·도메인은 전송하지 않는다.
- **단위·중복:** 성공한 메뉴 동작마다 1회. 사용자별 영구 중복 제거는 없다.
- **근거·테스트:** [useHighlightSelection](../pages/content-ui/src/ui/highlight/useHighlightSelection.ts), [메뉴 테스트](../pages/content-ui/src/ui/highlight/useHighlightSelectionMenu.test.ts).
- **한계·이력:** 껐다는 사실만으로 방해 이유를 알 수 없다. 노출 대비 비활성화율의 분모가 없다. 맥락 속성 DB-1230; 도입 버전·일자 미확인.

### `highlight_bubble_dismiss`

- **질문:** 이번 선택만 닫는 X를 얼마나 사용하는가?
- **발생·제외:** 말풍선 X 핸들러에서 선택을 닫고 발생. Esc·바깥 클릭·선택 해제·메뉴만 닫기·기능 끄기는 제외한다.
- **속성:** 이벤트 전용 속성 없음.
- **단위·중복:** 실행된 X 핸들러마다 1회. URL·사용자당 중복 제거는 없다.
- **근거·테스트:** [useHighlightSelection](../pages/content-ui/src/ui/highlight/useHighlightSelection.ts), [메뉴 테스트](../pages/content-ui/src/ui/highlight/useHighlightSelectionMenu.test.ts).
- **한계·이력:** 실제 노출 이벤트가 없어 닫기율·반복 닫기의 원인은 알 수 없다. DB-1225; PR #789에서 첫 안내가 실제 보일 때 X도 안내 완료 저장하도록 변경했지만 이벤트 속성·이름은 유지했다. 스토어 보급 일자는 별도 확인.

### `summary_run`

- **질문:** 어느 진입점에서 실제 요약 요청을 시작하는가?
- **발생·제외:** 로그인·pageKey·유효 콘텐츠와 로딩/진행 중 가드를 통과해 요청 상태를 만들고 프롬프트/HTTP 처리 전에 발생. 입력 콘텐츠 오류·공백·중복 진행은 제외한다.
- **속성:** 필수 `source:TSummaryRunSource` = `disclosure|empty_state|tab_trigger`. `tab_trigger`는 과거 탭 진입 호환값; 타입 원본 [type.ts](../packages/shared/src/modules/analytics/type.ts).
- **단위·중복:** 시작한 요청 1회. 실행 중 요청은 차단하나 실패 후 명시 재시도는 별도 실행이다. 같은 요청을 재사용하는 재열기는 새 run이 아니다.
- **근거·테스트:** [useSummary](../pages/side-panel/src/hooks/useSummary/index.ts), [테스트](../pages/side-panel/src/hooks/useSummary/index.test.ts), [요약 E2E](../e2e/tests/hybrid/summary.test.ts).
- **한계·이력:** HTTP 전송·완료·읽음을 보증하지 않는다. `tab_trigger`를 현재 진입 UI로 해석하지 않는다. 도입 버전·일자 미확인.

### `summary_panel_toggle`

- **질문:** 사용자가 요약 행을 직접 열거나 접는가?
- **발생·제외:** `showSummary=true`에서 요약 토글 핸들러 실행 시 상태 변경 전에 발생. 초기 렌더·페이지 이동·설정에 의한 자동 닫힘은 제외한다.
- **속성:** 필수 `action:"open"|"close"`; 클릭 직전 펼침 상태의 반대 동작.
- **단위·중복:** 직접 토글마다 1회. 같은 페이지에서 여러 번 열고 접으면 각각 센다.
- **근거·테스트:** [SidePanelContent](../pages/side-panel/src/components/SidePanelContent.tsx), [요약 E2E](../e2e/tests/hybrid/summary.test.ts), [전송 테스트](../packages/shared/src/modules/analytics/Analytics.test.ts).
- **한계·이력:** open은 콘텐츠 준비·요약 요청 실행과 다르며 같은 요청 재사용도 가능하다. 도입 버전·일자 미확인.

### `summary_complete`

- **질문:** 시작한 요약 스트림이 오류 없이 종료되는가, 얼마나 걸리는가?
- **발생·제외:** 스트리밍 처리 반환 후 stream 오류가 없고 현재 요청/페이지이며 abort되지 않은 경우 발생. HTTP 실패·stream 오류·취소·페이지 변경은 제외한다.
- **속성:** 필수 `duration_msec:number`; run 직후부터 프롬프트 준비·fetch·스트림 처리 종료까지의 `Date.now()` 차이(ms).
- **단위·중복:** 해당 현재 요청 종료 때 1회. 요청 식별자는 전송하지 않는다.
- **근거·테스트:** [useSummary](../pages/side-panel/src/hooks/useSummary/index.ts), [useSummary 테스트](../pages/side-panel/src/hooks/useSummary/index.test.ts).
- **한계·이력:** 첫 토큰 지연·서버 처리시간·실제 읽음이 아니다. 취소는 fail에도 없으므로 단순 complete/run은 관측된 완료 비중이지 전체 요청의 확정 성공률이 아니다. 도입 버전·일자 미확인.

### `summary_fail`

- **질문:** 관측된 요약 실패 유형은 무엇인가?
- **발생·제외:** 현재 요청의 HTTP non-2xx, 스트리밍 오류 콜백, non-Abort 예외에서 발생. 콘텐츠 사전 검증 실패·페이지 변경·abort는 제외한다.
- **속성:** 필수 `reason:string`; HTTP는 `http_<status>`, 스트림은 error 문자열, catch는 `Error.message` 또는 `unknown`. 닫힌 enum/런타임 allowlist가 아니다.
- **단위·중복:** 실패 분기 실행 단위. 스트림 오류 콜백·후속 예외 사이 요청별 terminal 중복 제거 계약은 없다.
- **근거·테스트:** [useSummary](../pages/side-panel/src/hooks/useSummary/index.ts), [useSummary 테스트](../pages/side-panel/src/hooks/useSummary/index.test.ts).
- **한계·이력:** 모든 미완료 요청을 대표하지 않는다. raw 오류 문자열을 보내므로 개인정보·고카디널리티 정제 여부는 별도 검토 필요하며 현재 정책 준수의 증거로 취급하지 않는다. 도입 버전·일자 미확인.

### `chat_message_send`

- **질문:** 사용자가 채팅 요청을 시작하는가?
- **발생·제외:** 공백 입력·진행 중 가드를 통과해 사용자/assistant placeholder 메시지를 넣고 HTTP 요청 전에 발생.
- **속성:** 이벤트 전용 속성 없음. 메시지 원문·길이는 이 이벤트로 보내지 않는다.
- **단위·중복:** `sendMessage` 시작마다 1회. 진행 중 일반 재입력은 가드하지만 서버 요청 ID 기반 중복 제거는 없다.
- **근거·테스트:** [useChat](../pages/side-panel/src/hooks/useChat/index.ts). 이벤트 전용 테스트 미확인.
- **한계·이력:** 전송 성공·응답 완료를 뜻하지 않으며 대응하는 chat_complete 이벤트가 없다. 도입 버전·일자 미확인.

### `chat_fail`

- **질문:** 채팅 경로에서 잡힌 예외가 무엇인가?
- **발생·제외:** `sendMessage` catch의 non-Abort 예외만 발생. non-2xx 응답과 스트림 오류 콜백은 Sentry/UI 처리만 하며 이 이벤트를 보내지 않는다.
- **속성:** 필수 `reason:string` = 예외의 `Error.message` 또는 `unknown`; 닫힌 enum/런타임 allowlist 없음.
- **단위·중복:** catch 실행마다 1회. 요청/사용자당 영구 중복 제거는 없다.
- **근거·테스트:** [useChat](../pages/side-panel/src/hooks/useChat/index.ts). 이벤트 전용 테스트 미확인.
- **한계·이력:** 모든 채팅 실패를 세지 않아 send 대비 전체 실패율로 사용할 수 없다. 오류 원문 정제는 별도 검토 필요. 도입 버전·일자 미확인.

### `youtube_transcript_extract`

- **질문:** 요청받은 YouTube 자막 추출이 resolve/reject되는가?
- **발생·제외:** content script의 `YOUTUBE_TRANSCRIPT` bridge 핸들러에서 추출 Promise 성공/예외 뒤 발생. YouTube 영상 페이지가 아니면 응답만 하고 이벤트를 보내지 않는다.
- **속성:** 필수 `is_success:boolean`; 추출 resolve는 true, catch는 false. 자막 내용은 전송하지 않는다.
- **단위·중복:** 처리한 bridge 요청마다 결과 1회. 영상별 중복 제거는 없다.
- **근거·테스트:** [content script](../pages/content-ui/src/index.tsx), [자막 추출 구현](../pages/content-ui/src/ui/youtubeTranscript/index.ts). 이벤트 전용 테스트 미확인.
- **한계·이력:** 성공은 자막 내용의 정확성·완전성 검증이 아니다. 요청 호출이 없는 경로를 실패 0%로 해석하지 않는다. 도입 버전·일자 미확인.

### `tab_change`

- **질문:** 사용자가 AI 탭을 직접 전환하는가?
- **발생·제외:** `Tabs.onValueChange`에서 부모 선택 상태 변경을 요청한 후 발생. activeTab 계산·요약 행 토글의 자동 선택은 제외한다.
- **속성:** 필수 `tab_name:string`; 현재 탭 타입은 `summary|chat`이나 analytics 타입은 일반 문자열이다.
- **단위·중복:** 탭 value change 콜백마다 1회. URL·사용자당 중복 제거 없음.
- **근거·테스트:** [TabSection](../pages/side-panel/src/components/TabSection/index.tsx), [탭 정의](../pages/side-panel/src/components/TabSection/resolveActiveTab.ts). 이벤트 전용 테스트 미확인.
- **한계·이력:** 탭 표시·실제 체류·기능 실행을 뜻하지 않는다. 현재 단일 채팅 트리거에서 같은 탭 재클릭은 value change가 아닐 수 있다. 도입 버전·일자 미확인.

### `setting_change`

- **질문:** 어떤 서버 설정 필드를 저장하는가?
- **발생·제외:** SettingService가 인증·upsert 오류를 throw하지 않고 성공한 뒤 mutation onSuccess에서 발생. 인증 없음·서버 오류·렌더만으로는 발생하지 않는다.
- **속성:** 필수 `setting_keys:string`; 요청 객체 키를 정렬해 쉼표로 연결. 값은 보내지 않는다. 예: `show_summary`, `show_ai_chat`.
- **단위·중복:** 성공 mutation마다 1회. 기존 저장값과 동일한 요청을 별도로 제거하지 않으며 한 이벤트에 여러 키가 들어갈 수 있다.
- **근거·테스트:** [useSettingUpsertMutation](../packages/shared/src/hooks/supabase/mutations/useSettingUpsertMutation.ts), [SettingService](../packages/shared/src/utils/supabase/settingService.ts), [옵션 E2E](../e2e/tests/extension/extension-options.test.ts).
- **한계·이력:** 켜기/끄기 값과 변화 전후를 구분하지 못한다. 변경 키 수가 이벤트 수와 같지 않다. 도입 버전·일자 미확인.

### `extension_setting_change`

- **질문:** 어떤 확장 로컬 설정을 저장하는가?
- **발생·제외:** 옵션의 언어·하이라이트 설정 또는 선택 말풍선 위치를 ChromeSyncStorage에 성공 저장한 뒤 발생. 단순 조회·storage 구독 반영·저장 실패는 제외한다.
- **속성:** 필수 `keys:string`; 현재 단일 키 `language`, `highlightBubbleEnabled`, `highlightBubblePosition`, `highlightDisabledSites`. 설정 값·사이트 목록 원문은 보내지 않는다.
- **단위·중복:** 성공한 저장 호출마다 1회. 언어 autosave는 동일 값 변경을 건너뛰지만 모든 호출부의 영구 중복 제거는 없다.
- **근거·테스트:** [Option](../pages/options/src/components/Option.tsx), [HighlightOption](../pages/options/src/components/HighlightOption.tsx), [useHighlightSelection](../pages/content-ui/src/ui/highlight/useHighlightSelection.ts), [HighlightOption 테스트](../pages/options/src/components/HighlightOption.test.ts).
- **한계·이력:** 실제 값·설정 사용 효과는 알 수 없다. 말풍선 끄기 메뉴는 별도 `highlight_bubble_disable`이며 이 이벤트 전체와 같지 않다. 도입 버전·일자 미확인.

### `shortcut_change_click`

- **질문:** 단축키 설정 페이지를 열 수 있는가?
- **발생·제외:** 옵션의 변경 버튼에서 `chrome://extensions/shortcuts` 탭 생성 resolve/reject 뒤 발생. 단축키 조회만으로는 발생하지 않는다.
- **속성:** 필수 `is_success:boolean`; 탭 생성 resolve=true, catch=false.
- **단위·중복:** 변경 버튼 처리마다 결과 1회. 반복 클릭 중복 제거 없음.
- **근거·테스트:** [ShortcutOption](../pages/options/src/components/ShortcutOption.tsx), [테스트](../pages/options/src/components/ShortcutOption.test.ts).
- **한계·이력:** 설정 페이지 열기 결과이며 실제 단축키 변경 성공이 아니다. 도입 버전·일자 미확인.

### `category_create`

- **질문:** 카테고리 생성 mutation이 성공하는가?
- **발생·제외:** insert 응답의 error를 검사해 오류를 throw한 뒤 성공한 mutation에서 발생. 실패는 제외한다. 별도 `upsertCategories` 호출 전체를 대표하지 않는다.
- **속성:** 이벤트 전용 속성 없음. 카테고리 ID·이름 전송 없음.
- **단위·중복:** 성공 mutation마다 1회. 카테고리 수·사용자별 dedupe 없음.
- **근거·테스트:** [useCategoryPostMutation](../packages/shared/src/hooks/supabase/mutations/useCategoryPostMutation.ts), [CategoryService](../packages/shared/src/utils/supabase/categoryService.ts). 이벤트 전용 테스트 미확인.
- **한계·이력:** 생성 후 실제 사용을 뜻하지 않는다. 도입 버전·일자 미확인.

### `category_update`

- **질문:** 카테고리 수정 경로가 호출되는가?
- **발생·제외:** raw `CategoryService.updateCategory` Promise의 mutation onSuccess에서 발생. throw/reject는 제외하지만 PostgREST `result.error`를 검사하지 않아 오류 응답도 이벤트가 발생할 수 있다.
- **속성:** 이벤트 전용 속성 없음. 수정 필드·이름·ID 전송 없음.
- **단위·중복:** resolve된 mutation마다 1회. 동일 값 재저장·같은 카테고리 반복 수정 제거 없음.
- **근거·테스트:** [useCategoryUpdateMutation](../packages/shared/src/hooks/supabase/mutations/useCategoryUpdateMutation.ts), [CategoryService](../packages/shared/src/utils/supabase/categoryService.ts). 이벤트 전용 테스트 미확인.
- **한계·이력:** 서버 수정 성공률·실제 변경 횟수로 단정하지 않는다. 오류 검사 보완은 별도 코드 작업. 도입 버전·일자 미확인.

### `category_delete`

- **질문:** 카테고리 삭제 경로가 호출되는가?
- **발생·제외:** raw `CategoryService.deleteCategory` Promise의 mutation onSuccess에서 발생. throw/reject는 제외하지만 `result.error`를 검사하지 않아 오류 응답도 포함될 수 있다.
- **속성:** 이벤트 전용 속성 없음. 삭제한 카테고리 ID·이름 전송 없음.
- **단위·중복:** resolve된 mutation마다 1회. 실제 삭제 행수·카테고리별 dedupe 없음.
- **근거·테스트:** [useCategoryDeleteMutation](../packages/shared/src/hooks/supabase/mutations/useCategoryDeleteMutation.ts), [CategoryService](../packages/shared/src/utils/supabase/categoryService.ts). 이벤트 전용 테스트 미확인.
- **한계·이력:** 영속 삭제 성공을 보증하지 않으며 0행 응답도 구분하지 않는다. 도입 버전·일자 미확인.

### `category_suggestion_show`

- **질문:** 사용자에게 제시할 기존 카테고리 추천이 준비되는가?
- **발생·제외:** 요청 결과가 현재 페이지/메모·미배정 상태에 유효하고 기존 카테고리의 Jev 추천으로 검증된 뒤, suggestion state 설정 직전에 발생. 실패·없음·LLM/신규 추천·오래된 응답은 제외한다.
- **속성:** 필수 `is_new_category:boolean`, `source:"jev"|"llm"`. 현재 호출값은 각각 false, `jev`만 사용한다.
- **단위·중복:** 유효 추천을 state에 넣는 흐름당 1회. hook ref로 진행/현재 추천·동일 메모 재요청·닫은 URL을 제한하나 세션 전체 사용자당 1회는 아니다.
- **근거·테스트:** [useCategorySuggestion](../pages/side-panel/src/components/MemoSection/components/MemoForm/hooks/useCategorySuggestion.ts), [테스트](../pages/side-panel/src/components/MemoSection/components/MemoForm/hooks/useCategorySuggestion.test.ts).
- **한계·이력:** DOM·viewport 실제 노출 확인 이벤트가 아니다. 2026-09-27 의미 변경 전 자동 적용(LLM·신규 포함) 기록과 같은 집단으로 비교하지 않는다. 보급 버전·일자 별도 확인.

### `category_suggestion_apply`

- **질문:** 추천을 명시적으로 수락하는가, 어떤 입력 방식인가?
- **발생·제외:** 활성 추천·미배정·현재 URL/메모 검증 후 `onCategorySelect(id,"ai")`를 호출하고 발생. 진행 중·이미 배정·페이지/메모 변경·검증 예외는 제외한다.
- **속성:** 필수 `is_new_category:boolean`, `source:"jev"|"llm"`, `trigger:"click"|"shortcut"`([타입](../packages/shared/src/modules/analytics/type.ts)). 현재는 false/`jev`, shortcut은 Cmd/Ctrl+Enter.
- **단위·중복:** 수락 ref 가드와 추천 해제로 같은 활성 추천의 중복 처리를 억제한다. 영속적 추천 ID 기반 dedupe는 없다.
- **근거·테스트:** [hook](../pages/side-panel/src/components/MemoSection/components/MemoForm/hooks/useCategorySuggestion.ts), [칩](../pages/side-panel/src/components/MemoSection/components/MemoForm/components/CategorySuggestion.tsx), [테스트](../pages/side-panel/src/components/MemoSection/components/MemoForm/hooks/useCategorySuggestion.test.ts).
- **한계·이력:** 콜백 반환 뒤지만 비동기 서버 저장 완료를 기다리지 않아 영속 배정 성공이 아니다. 2026-09-27 이후 명시 수락이며 이전 자동 적용 집계와 단절해서 해석한다.

### `category_suggestion_dismiss`

- **질문:** 추천 칩을 명시적으로 거절하는가?
- **발생·제외:** 활성 추천의 X 또는 칩의 Esc 처리에서 발생. 타임아웃·메모/탭 전환·추천 없음은 제외한다.
- **속성:** 필수 `is_new_category:boolean`, `source:"jev"|"llm"`; 현재 호출은 false/`jev`만 사용.
- **단위·중복:** 호출 시 추천 ref를 비우고 해당 URL을 닫은 집합에 추가해 같은 활성 추천을 재처리하지 않는다. remount 이후까지 보장하는 사용자별 dedupe는 아니다.
- **근거·테스트:** [hook](../pages/side-panel/src/components/MemoSection/components/MemoForm/hooks/useCategorySuggestion.ts), [칩](../pages/side-panel/src/components/MemoSection/components/MemoForm/components/CategorySuggestion.tsx), [테스트](../pages/side-panel/src/components/MemoSection/components/MemoForm/hooks/useCategorySuggestion.test.ts).
- **한계·이력:** 추천을 못 보거나 무시한 경우와 구분해야 한다. 2026-09-27 의미 변경 기준; 보급 버전·일자 별도 확인.

### `export_run`

- **질문:** 메모 파일 생성을 어떤 형식으로 실행하는가?
- **발생·제외:** 웹 설정에서 메모 조회가 비어 있지 않고 `exportMemos`가 정상 반환한 뒤 발생. 빈 목록·조회 data 없음·생성 예외는 제외한다.
- **속성:** 필수 `format:ExportFormat` = `json|csv|markdown`; [타입/변환기](../packages/shared/src/utils/Export.ts).
- **단위·중복:** 파일 생성 함수를 호출한 작업마다 1회. 메모 개수와 무관하며 사용자/형식별 dedupe 없음.
- **근거·테스트:** [SettingExport](../apps/web/src/app/%5Blng%5D/%28auth%29/%28sidebar%29/memos/setting/_components/Setting/SettingExport.tsx), [Export](../packages/shared/src/utils/Export.ts). 이벤트 전용 테스트 미확인.
- **한계·이력:** 브라우저 다운로드 완료·디스크 저장·파일 정상 열기를 확인하지 않는다. 도입 버전·일자 미확인.

## 진입·인증·가이드·공지·블로그

### `introduce_demo_control`

- **질문:** 소개 페이지 방문자가 데모를 직접 제어하는가? 어느 단계로 이동하는가?
- **발생·제외:** 사용자가 단계 버튼을 누르거나 재생·정지 버튼으로 상태를 바꿀 때 호출한다. 동일 단계 재선택도 포함한다. 일반 모션 설정에서는 단계 선택이 해당 장면의 시작부터 재생하며, 이때 별도 `play` 이벤트는 추가하지 않고 `select_step`만 기록한다. 명시적 단계 선택·재생은 남아 있는 포커스 정지보다 우선하지만 동작 축소 설정은 존중한다. 자동 재생 시작·자동 단계 전환·focus·화면 이탈·문서 숨김·동작 축소에 따른 일시정지는 기록하지 않는다. 마우스를 올리는 동작은 재생을 멈추지 않으며 계측하지 않는다. 동작 축소로 비활성화된 재생 버튼도 기록하지 않는다.
- **속성:** `action: "select_step" | "play" | "pause"`, `stage: "read" | "shortcut" | "panel" | "write" | "saved"`. 재생·정지는 클릭 당시 화면 단계를 기록한다. 분류는 `engagement`다.
- **단위·중복:** 수동 클릭당 1회. 자동 동작은 분모에 포함하지 않는다.
- **근거·테스트:** [소개 데모](../apps/web/src/app/%5Blng%5D/%28no-auth%29/introduce/_components/InteractiveDemo/index.tsx); [브라우저 회귀 검증](../e2e/tests/web/introduceDemo.test.ts).
- **한계·이력:** 가상 제품 화면의 조작이며 실제 메모 작성·저장·패널 실행이나 전체 영상 시청을 의미하지 않는다. 기존 메모·확장 이벤트와 합산하지 않는다. 2026-10-28 추가. 운영 수신은 별도 확인 대상이다.

### `side_panel_open`

- **질문:** 패널 문서가 얼마나 열리는가?
- **발생·제외:** SidePanel mount 시 useDidMount 콜백. 로그인·목록/본문 로딩 성공은 기다리지 않는다.
- **속성:** 추가 속성 없음.
- **단위·중복:** 컴포넌트 인스턴스당 1회(ref 가드). 패널 재생성은 다시 기록.
- **근거·테스트:** [호출 코드](../pages/side-panel/src/SidePanel.tsx); [관련 테스트](../pages/side-panel/src/SidePanel.test.ts).
- **한계·이력:** 실제 메모 사용·툴바 클릭 횟수 아님. 재방문 사용자는 GA 식별 기준으로 별도 집계. 도입 버전·일자 미확인.

### `side_panel_open_click`

- **질문:** 주입된 패널 열기 버튼이 눌리는가?
- **발생·제외:** content-ui의 OpenSidePanelButton 클릭 시 브리지 요청 전에 호출. 요청 성공/실패는 속성으로 남기지 않는다.
- **속성:** 추가 속성 없음.
- **단위·중복:** 클릭당 1회; 별도 중복 제거 없음.
- **근거·테스트:** [호출 코드](../pages/content-ui/src/ui/openSidePanel/components/OpenSidePanelButton.tsx); 이벤트 전용 테스트 미확인.
- **한계·이력:** 버튼 핸들러가 존재해도 모든 사이트의 실제 노출/사용 가능성을 보장하지 않는다. 패널 열기 성공률 산출 불가. 도입 버전·일자 미확인.

### `page_view`

- **질문:** 수동으로 계측한 패널 문서가 조회되는가?
- **발생·제외:** SidePanel mount 시 trackPageView("Side Panel", window.location.href). 웹 gtag 자동 page_view는 이 수동 호출과 별도 경로다.
- **속성:** 필수 `page_title: string`, `page_location: string`. 현재 수동 호출은 확장 패널 제목·패널 문서 URL.
- **단위·중복:** 패널 인스턴스당 1회; 웹 자동 페이지 조회의 중복 정책은 이 계약 밖.
- **근거·테스트:** [호출 코드](../pages/side-panel/src/SidePanel.tsx); [관련 테스트](../pages/side-panel/src/SidePanel.test.ts); [계약](../packages/shared/src/modules/analytics/Analytics.ts).
- **한계·이력:** 자동 page_view와 수동 이벤트의 환경/속성 범위가 다르다. 외부 페이지 원문 URL을 이 API에 넣는 계약으로 확대하지 않는다. 도입 버전·일자 미확인.

### `feedback_submit`

- **질문:** 일반/제거 피드백 제출 규모가 얼마인가?
- **발생·제외:** useFeedbackMutation의 onSuccess. FeedbackService는 Supabase 응답을 그대로 반환해 resolved error 응답도 onSuccess가 될 수 있다. throw된 실패에서는 없음.
- **속성:** 필수 `feedback_type: "general" | "uninstall"`; 호출 변수 생략 시 general. 원문은 이벤트에 넣지 않는다.
- **단위·중복:** 뮤테이션 성공 콜백당 1회; 사용자/내용별 중복 제거 없음.
- **근거·테스트:** [호출 코드](../packages/shared/src/hooks/supabase/mutations/useFeedbackMutation.ts); 이벤트 전용 테스트 미확인; [계약](../packages/shared/src/utils/supabase/feedbackService.ts).
- **한계·이력:** 서버 저장 완료보다 제출 시도에 가까운 값. 제거 설문 응답률은 분모와 저장 성공 판정을 별도로 확인해야 한다. DB-1107. 도입 버전·일자 미확인.

### `view_change`

- **질문:** 도착한 메모 뷰와 보기 방식은 무엇인가?
- **발생·제외:** TrackViewChange의 pathname/searchParams effect. 직접 진입·검색 매개변수 변경도 포함하며 단순 사이드바 클릭에 한정하지 않는다.
- **속성:** 필수 `view: string`; 현재 all/highlights/trash/setting/plan/wish/star/reading/category. 선택 `layout: "grid" | "list" | "domain"`는 4개 메모 목록 경로에서만.
- **단위·중복:** effect 실행당 1회; 동일 뷰/레이아웃 값의 전역 중복 제거 없음.
- **근거·테스트:** [호출 코드](../apps/web/src/app/%5Blng%5D/%28auth%29/%28sidebar%29/_components/TrackViewChange/index.tsx); [관련 테스트](../apps/web/src/app/%5Blng%5D/%28auth%29/%28sidebar%29/_components/TrackViewChange/index.test.ts).
- **한계·이력:** 뷰별 실제 콘텐츠 표시 성공이나 읽음을 보장하지 않음. 현재 경로/쿼리 해석 결과를 기록하므로 경로 이름만으로 뷰를 역추정하지 않는다. DB-1186. 도입 버전·일자 미확인.

### `login_start`

- **질문:** 웹에서 어느 로그인 수단을 선택하는가?
- **발생·제외:** TrackLoginStartForm의 클릭 capture에서 data-login-method가 있는 가장 가까운 버튼을 찾고 비어 있지 않은 method일 때 기록. OAuth 완료 전.
- **속성:** 필수 `method: string`; 현재 버튼은 google/kakao/apple. 타입은 문자열이며 허용값 검증은 별도 없음.
- **단위·중복:** 조건을 만족하는 클릭당 1회; pending 제공자 버튼 반복 클릭도 전역 중복 제거하지 않음.
- **근거·테스트:** [호출 코드](../apps/web/src/app/%5Blng%5D/%28no-auth%29/login/_components/TrackLoginStartForm/index.tsx); [관련 테스트](../e2e/tests/web/login.test.ts).
- **한계·이력:** 로그인 요청/세션의 고유 식별자가 없고 키보드 form submit 전체를 포괄하는 이벤트도 아니다. login 사용자 수를 나눠 정확한 완료율로 삼지 않는다. DB-1160. 도입 버전·일자 미확인.

### `login`

- **질문:** OAuth/email 콜백 뒤 메모 영역에 도달했는가?
- **발생·제외:** 인증 사이드바 레이아웃 TrackLoginSuccess가 비어 있지 않은 login 쿼리를 읽으면 기록 후 login/signup 쿼리를 router.replace로 제거.
- **속성:** 필수 `method: string`; 콜백의 제공자 값 또는 email.
- **단위·중복:** 쿼리 제거로 정상 재조회 중복을 줄이지만 ref/서버 idempotency 가드는 없음.
- **근거·테스트:** [호출 코드](../apps/web/src/app/%5Blng%5D/%28auth%29/%28sidebar%29/_components/TrackLoginSuccess/index.tsx); [관련 테스트](../apps/web/src/app/auth/callback/route.test.ts).
- **한계·이력:** 서버 로그인 건수 자체가 아니라 콜백 표시 클라이언트 관측. 쿼리 수동 재구성·전송 차단·라우트 이탈/중복 effect를 완전히 막지 않는다. DB-1160. 도입 버전·일자 미확인.

### `sign_up`

- **질문:** 콜백이 신규 계정으로 분류한 도착이 얼마나 있는가?
- **발생·제외:** TrackLoginSuccess에서 login 쿼리가 있고 signup=true면 login에 앞서 함께 기록. signup만 있으면 없음.
- **속성:** 필수 `method: string`; login과 같은 쿼리 값.
- **단위·중복:** 신규 분류 콜백 도착당 시도; 쿼리 제거 정책은 login과 동일.
- **근거·테스트:** [호출 코드](../apps/web/src/app/%5Blng%5D/%28auth%29/%28sidebar%29/_components/TrackLoginSuccess/index.tsx); [관련 테스트](../apps/web/src/app/auth/callback/route.test.ts).
- **한계·이력:** DB 계정 생성 전체를 직접 계수하지 않는다. login과 sign_up은 배타적 이벤트가 아니므로 합산하면 같은 도착이 중복된다. DB-1160. 도입 버전·일자 미확인.

### `logout`

- **질문:** 로그아웃 뮤테이션의 완료 콜백이 발생하는가?
- **발생·제외:** useSignoutMutation onSuccess에서 관련 캐시 제거/무효화 후 기록. AuthService.signout은 auth.signOut 응답을 직접 반환한다.
- **속성:** 추가 속성 없음.
- **단위·중복:** onSuccess당 1회; 별도 중복 제거 없음.
- **근거·테스트:** [호출 코드](../packages/shared/src/hooks/supabase/mutations/useSignoutMutation.ts); 이벤트 전용 테스트 미확인; [계약](../packages/shared/src/utils/supabase/authService.ts).
- **한계·이력:** resolved error 응답에 대한 추가 throw 검사가 훅에 없어 인증 해제 확정 건수로 단정하지 않는다. 자연 세션 만료도 포함하지 않는다. 도입 버전·일자 미확인.

### `side_panel_login_click`

- **질문:** 패널 로그인 안내에서 웹 로그인으로 이동하려는가?
- **발생·제외:** LoginSection 버튼 클릭 시 client ID 조회와 Tab.create 전에 기록. 네트워크 불가 안내에서는 버튼 미표시.
- **속성:** 추가 속성 없음.
- **단위·중복:** 클릭당 1회; 별도 중복 제거 없음.
- **근거·테스트:** [호출 코드](../pages/side-panel/src/components/LoginSection.tsx); [관련 테스트](../pages/side-panel/src/components/LoginSection.test.ts).
- **한계·이력:** 탭 생성·로그인 성공을 뜻하지 않는다. ext_cid 전달 실패/GA 식별 분리 가능성을 별도로 확인한다. 도입 버전·일자 미확인.

### `header_login_click`

- **질문:** 어느 웹 경로에서 로그인으로 진입하는가?
- **발생·제외:** 로그아웃 사용자 로그인 헤더 링크 onClick에서 이동 전에 기록.
- **속성:** 필수 `from: string`; getPathWithoutLanguage가 언어 접두사를 뺀 출발 pathname을 만든다. 쿼리는 넣지 않는다.
- **단위·중복:** 클릭당 1회; 사용자/출발 경로별 중복 제거 없음.
- **근거·테스트:** [호출 코드](../apps/web/src/components/Header/HeaderRight.tsx); 이벤트 전용 테스트 미확인.
- **한계·이력:** 목적지 도달·로그인/메모 열람 성공 아님. 헤더 밖의 진입은 포함하지 않는다. 도입 버전·일자 미확인.

### `header_memos_click`

- **질문:** 어느 웹 경로에서 내 메모로 진입하는가?
- **발생·제외:** 로그인 사용자 내 메모 헤더 링크 onClick에서 이동 전에 기록.
- **속성:** 필수 `from: string`; getPathWithoutLanguage가 언어 접두사를 뺀 출발 pathname을 만든다. 쿼리는 넣지 않는다.
- **단위·중복:** 클릭당 1회; 사용자/출발 경로별 중복 제거 없음.
- **근거·테스트:** [호출 코드](../apps/web/src/components/Header/HeaderRight.tsx); 이벤트 전용 테스트 미확인.
- **한계·이력:** 목적지 도달·로그인/메모 열람 성공 아님. 헤더 밖의 진입은 포함하지 않는다. 도입 버전·일자 미확인.

### `extension_installed`

- **질문:** 신규 확장 설치 신호가 얼마나 수신되는가?
- **발생·제외:** chrome.runtime.onInstalled에서 reason=INSTALL일 때만 await 전송. UPDATE 등 다른 reason은 제외. 계측 실패를 catch하고 가이드/설정 초기화는 계속한다.
- **속성:** 추가 속성 없음; 공통 extension_version은 전송 계층이 부가.
- **단위·중복:** INSTALL 콜백당 1회 시도; 재설치는 또 발생할 수 있음.
- **근거·테스트:** [호출 코드](../apps/chrome-extension/lib/background/index.ts); 이벤트 전용 테스트 미확인.
- **한계·이력:** 스토어 설치 통계·생애 신규 사용자와 동일하지 않다. 과거 업데이트 포함 계측 시계열과 직접 비교 금지. 도입 버전·일자 미확인.

### `extension_uninstall`

- **질문:** 제거 URL 경유 신호가 얼마나 들어오는가?
- **발생·제외:** GET /api/uninstall에서 after() 전송을 예약하고 쿼리 없는 언어별 설문 페이지로 302 응답. HEAD는 리다이렉트만. 서버 MP는 development 제외·staging debug_mode.
- **속성:** 별도 서버 속성 `extension_version: string`(v가 버전 정규식 불일치/없음이면 unknown), build_env 등 서버 공통값. cid는 형식 검증 후 없으면 새 UUID.
- **단위·중복:** GET 요청당 1회 시도; 재방문/직접 호출 중복 제거 없음.
- **근거·테스트:** [호출 코드](../apps/web/src/app/api/uninstall/route.ts); [관련 테스트](../apps/web/src/app/api/uninstall/route.test.ts); [계약](../apps/web/src/modules/ga/measurementProtocol.ts).
- **한계·이력:** 새 제거 URL 등록 설치본만 관측. 실제 고유 제거·설문 조회·응답 아님. 응답 뒤 전송 최대2초 대기; 2xx도 GA 보고서 수신 보장 아님. DB-1182/DB-1230. 도입 버전·일자 미확인.

### `extension_install_click`

- **질문:** 어느 페이지·자리의 설치 링크가 눌리는가?
- **발생·제외:** TrackInstallClick capture에서 data-install-from과 유효 data-install-position이 모두 있는 요소 클릭. 일반 문구·비설치 링크·잘못된 속성은 제외. 링크 기본 새 탭 동작은 유지.
- **속성:** 필수 `from: string`(언어 없는 출발 경로), `position: TInstallClickPosition` = hero/recommendation/final/install_check_dialog.
- **단위·중복:** 조건을 만족하는 클릭당 1회; 설치 여부/사용자별 중복 제거 없음.
- **근거·테스트:** [호출 코드](../apps/web/src/app/%5Blng%5D/%28no-auth%29/_components/TrackInstallClick/index.tsx); 이벤트 전용 테스트 미확인; [계약](../packages/shared/src/modules/analytics/type.ts).
- **한계·이력:** 스토어 도착이나 설치 완료를 보증하지 않는다. from은 호출 마크업 계약이지 수집 시 경로 재검증 결과가 아니다. 도입 버전·일자 미확인.

### `extension_install_dismiss`

- **질문:** 설치 안내를 닫는가?
- **발생·제외:** 현재 타입·분류에는 있으나 제품 코드에서 전송 호출부를 찾지 못했다.
- **속성:** 추가 속성 없음(타입 계약).
- **단위·중복:** 현재 코드상 발생 단위·중복 제거 없음/판별 불가.
- **근거·테스트:** [호출 코드](../packages/shared/src/modules/analytics/type.ts); 이벤트 전용 테스트 미확인.
- **한계·이력:** 현재 수신 0을 설치 안내를 아무도 닫지 않았다는 뜻으로 해석하지 않는다. 과거 빌드의 전송 존재 여부는 별도 이력 확인 필요. 도입 버전·일자 미확인.

### `open_web_from_extension`

- **질문:** 확장의 어느 진입점에서 웹 열기를 요청하는가?
- **발생·제외:** 메모 헤더·폼 토스트/액션·카테고리 팝업·컨텍스트 메뉴 핸들러에서 웹 탭 이동 전 기록.
- **속성:** 필수 `from: "side_panel_memo" | "side_panel_toast" | "side_panel_category" | "context_menu"`.
- **단위·중복:** 각 핸들러 호출당 1회; 경로별/탭별 중복 제거 없음.
- **근거·테스트:** [호출 코드](../pages/side-panel/src/components/MemoSection/components/MemoHeader.tsx); 이벤트 전용 테스트 미확인; [계약](../apps/chrome-extension/lib/background/index.ts).
- **한계·이력:** Tab.create 성공·웹 도착·메모 활용을 뜻하지 않는다. 같은 원문/메모를 여러 번 요청할 수 있다. 도입 버전·일자 미확인.

### `guide_open`

- **질문:** 컨텍스트 메뉴에서 외부 사용 가이드를 요청하는가?
- **발생·제외:** SHOW_GUIDE 컨텍스트 메뉴 선택 시 언어별 외부 Notion 가이드 탭을 만들기 전에 기록.
- **속성:** 필수 `from: "context_menu"`.
- **단위·중복:** 메뉴 선택당 1회; 별도 중복 제거 없음.
- **근거·테스트:** [호출 코드](../apps/chrome-extension/lib/background/index.ts); 이벤트 전용 테스트 미확인.
- **한계·이력:** 웹 앱 Driver.js 온보딩 시작과 다른 접점이다. 탭 생성/가이드 읽음 완료를 뜻하지 않는다. 도입 버전·일자 미확인.

### `guide_step`

- **질문:** 웹 온보딩의 어느 단계를 표시했는가?
- **발생·제외:** useGuide Driver.js onHighlighted에서 activeIndex에 대응하는 stepName이 있을 때 기록. DOM 대상이 없는 단계는 이동 로직에서 건너뛸 수 있다.
- **속성:** 필수 `step_name: string`; 실제 guideSteps 구성의 name.
- **단위·중복:** highlight 콜백당 1회; 뒤로 갔다 재노출되면 다시 기록.
- **근거·테스트:** [호출 코드](../apps/web/src/modules/guide/useGuide.ts); 이벤트 전용 테스트 미확인.
- **한계·이력:** 단계별 고유 사용자나 완료 수가 아니라 표시 콜백이다. 화면에서 실제 설명을 읽었는지 판단 불가. 도입 버전·일자 미확인.

### `guide_finish`

- **질문:** 웹 온보딩이 사용자 흐름에서 종료됐는가?
- **발생·제외:** Driver.js onDestroyed에서 unmount cleanup(isCleanedUp)이 아니면 기록하고 guide 로컬 완료표시를 저장.
- **속성:** 추가 속성 없음.
- **단위·중복:** destroy 콜백당 1회; 언마운트 정리는 제외.
- **근거·테스트:** [호출 코드](../apps/web/src/modules/guide/useGuide.ts); 이벤트 전용 테스트 미확인.
- **한계·이력:** 마지막 단계 학습/이해 증거 아님. onDestroyed라는 종료 경계이며 모든 단계를 관찰했는지 이벤트만으로 보장하지 않는다. 도입 버전·일자 미확인.

### `install_guide_view`

- **질문:** 공개 설치 가이드가 클라이언트에서 마운트됐는가?
- **발생·제외:** InstallGuideViewTracker effect에서 installGuideVisited 로컬 플래그 저장 시도 후 analytics.trackEvent. 플래그 저장 실패는 전송을 막지 않는다.
- **속성:** 추가 속성 없음.
- **단위·중복:** 컴포넌트 인스턴스당 1회(ref 가드); 재방문/재마운트는 재전송.
- **근거·테스트:** [호출 코드](../apps/web/src/app/%5Blng%5D/%28no-auth%29/install/_components/installGuideViewTracker.tsx); [관련 테스트](../e2e/tests/web/installGuide.test.ts).
- **한계·이력:** 가시성·신규 설치 확인 없이 직접 방문도 포함. gtag 차단/이탈로 빠질 수 있으며 install_guide_load와 합산하지 않는다. DB-1159. 도입 버전·일자 미확인.

### `install_guide_tab_opened`

- **질문:** 신규 설치 직후 가이드 탭 생성 요청이 성공했는가?
- **발생·제외:** 신규 INSTALL 뒤 openInstallGuideTab에서 Tab.create resolve/reject를 판정한 뒤 확장 MP로 await 전송. client ID 조회 실패는 cid 없이 탭 열기를 계속.
- **속성:** 필수 `is_success: boolean`; 탭 API 성공=true/throw=false.
- **단위·중복:** 설치 후 가이드 탭 생성 호출당 1회; 전송 실패는 경고 후 종료.
- **근거·테스트:** [호출 코드](../apps/chrome-extension/lib/background/openInstallGuideTab.ts); [관련 테스트](../apps/chrome-extension/lib/background/openInstallGuideTab.test.ts).
- **한계·이력:** 웹 gtag와 다른 전송 경로지만 네트워크/워커 실패까지 면제되는 것은 아님. 페이지 로드·가시성·읽음을 보증하지 않는다. DB-1230. 도입 버전·일자 미확인.

### `install_guide_load`

- **질문:** gtag와 독립된 가이드 로드 신호가 서버에 도달했는가?
- **발생·제외:** InstallGuideLoadBeacon이 mount 후 sendBeacon POST /api/install-guide-load. API는 204 뒤 after()로 서버 MP 전송. 호출부 trackEvent는 사용하지 않음.
- **속성:** 추가 이벤트 속성 없음. 비컨 cid는 허용 형식의 ext_cid만 사용; 본문256자 초과/파싱 오류/invalid cid면 새 UUID로 처리.
- **단위·중복:** 클라이언트 인스턴스당 1회 시도; 서버는 POST마다 전송 예약하며 재전송/직접 호출 중복 제거 없음.
- **근거·테스트:** [호출 코드](../apps/web/src/app/api/install-guide-load/route.ts); [관련 테스트](../apps/web/src/app/api/install-guide-load/route.test.ts); [계약](../apps/web/src/app/%5Blng%5D/%28no-auth%29/install/_components/installGuideLoadBeacon.tsx).
- **한계·이력:** sendBeacon 반환 수락 여부를 확인/재시도하지 않음. 서버 전송도 실패 가능. 신규 설치·읽음 아님; view와 합산하면 같은 로드 이중 계산. DB-1230. 도입 버전·일자 미확인.

### `install_guide_login_click`

- **질문:** 가이드에서 웹 로그인을 선택하는가?
- **발생·제외:** LoginCTA의 일반 클릭은 계측 settle 뒤 router.push. 수정키 클릭은 계측을 시작하고 링크 기본 동작 유지. 계측 실패도 이동은 계속.
- **속성:** 추가 속성 없음.
- **단위·중복:** 일반 클릭은 isNavigating ref로 연속 클릭 차단; 수정키 클릭은 매번 시도.
- **근거·테스트:** [호출 코드](../apps/web/src/app/%5Blng%5D/%28no-auth%29/install/_components/loginCTA.tsx); [관련 테스트](../e2e/tests/web/installGuide.test.ts).
- **한계·이력:** 로그인 페이지 도달/성공 아님. 옛 주 버튼과 현재 텍스트 링크는 노출 조건이 달라 단순 전후 비교 주의. DB-1159. 도입 버전·일자 미확인.

### `install_guide_panel_open_click`

- **질문:** 가이드의 패널 열기 요청이 성공했는가?
- **발생·제외:** 버튼 클릭 후 외부 bridge 응답을 최대3초 기다리고 성공 여부를 기록. throw/무응답/타임아웃은 false.
- **속성:** 필수 `is_success: boolean`; response.success===true일 때만 true.
- **단위·중복:** isOpening ref로 진행 중 재클릭 차단; 요청 완료 뒤 재시도는 새 이벤트.
- **근거·테스트:** [호출 코드](../apps/web/src/app/%5Blng%5D/%28no-auth%29/install/_components/openSidePanelCTA.tsx); [관련 테스트](../e2e/tests/web/installGuide.test.ts).
- **한계·이력:** 확장 API 완료 대리 지표이며 편집 준비·메모 저장을 뜻하지 않음. 툴바/단축키로 연 것은 이 클릭에 포함하지 않는다. DB-1230. 도입 버전·일자 미확인.

### `notice_view`

- **질문:** 표시 가능한 공지가 패널에 노출됐는가?
- **발생·제외:** notice/닫은목록 조회 완료 후 미닫음 공지로 visibleNotice가 정해지면 effect 전송. 로딩/조회 실패/닫힘은 제외. 첫 노출 날짜 저장 실패해도 이벤트는 유지.
- **속성:** 필수 `notice_id: number`.
- **단위·중복:** hook 인스턴스의 Set으로 공지ID당 1회; 패널 재마운트에는 다시 보낼 수 있음.
- **근거·테스트:** [호출 코드](../pages/side-panel/src/components/NoticeBanner/useNoticeBanner.ts); [관련 테스트](../pages/side-panel/src/components/NoticeBanner/useNoticeBanner.test.ts).
- **한계·이력:** 뷰포트 노출/읽음 검증이 아니라 표시 상태 관측이다. 전역 생애 최초 노출 횟수와 다르다. 도입 버전·일자 미확인.

### `notice_return`

- **질문:** 공지 첫 노출 이후 1~7일에 패널로 돌아오는가?
- **발생·제외:** 패널 mount에서 claimNoticeReturns가 로컬 첫 노출 날짜(KST) 대비1~7일이며 미시도인 공지를 claim한 뒤 전송. 당일·8일 이상은 제외.
- **속성:** 필수 `notice_id: number`, `days_since_view: number`(현재1~7).
- **단위·중복:** 로컬 저장소의 공지ID당 returnAttempted를 전송 전에 저장해 시도1회. 전송 실패도 이미 시도로 남음.
- **근거·테스트:** [호출 코드](../pages/side-panel/src/SidePanel.tsx); [관련 테스트](../packages/shared/src/modules/chrome-storage/noticeExposure.test.ts); [계약](../packages/shared/src/modules/chrome-storage/noticeExposure.ts).
- **한계·이력:** GA 도착 보장·공지 때문에 돌아왔다는 인과 증거 아님. 저장소 지우기/별도 프로필과 다중 컨텍스트 경합을 완전히 중복 제거하지 않는다. DB-1163. 도입 버전·일자 미확인.

### `notice_dismiss`

- **질문:** 표시된 공지를 닫으려는가?
- **발생·제외:** visibleNotice와 닫은목록이 있을 때 닫기 핸들러에서 로컬 숨김 직후, sync 저장 이전에 전송.
- **속성:** 필수 `notice_id: number`.
- **단위·중복:** 핸들러 호출당1회; 로컬 숨김·저장된 닫은목록으로 후속 표시를 억제.
- **근거·테스트:** [호출 코드](../pages/side-panel/src/components/NoticeBanner/useNoticeBanner.ts); [관련 테스트](../pages/side-panel/src/components/NoticeBanner/useNoticeBanner.test.ts).
- **한계·이력:** 닫기 저장 성공은 보장하지 않는다. 저장 실패면 같은 패널은 숨기지만 다음 패널에서 공지가 다시 보일 수 있음. 도입 버전·일자 미확인.

### `blog_subscription_change`

- **질문:** 어느 블로그 구독을 켜고 끄는가?
- **발생·제외:** 구독 뮤테이션 onSuccess에서만 기록; onError는 토스트만 표시.
- **속성:** 필수 `blog_id: TBlogId`=toss/daangn/geeknews, `active: boolean`.
- **단위·중복:** 성공 콜백당1회; 사용자·블로그별 생애 중복 제거 없음.
- **근거·테스트:** [호출 코드](../apps/web/src/app/%5Blng%5D/%28auth%29/%28sidebar%29/memos/blogs/_hooks/useBlogReading.ts); [관련 테스트](../e2e/tests/web/blogReading.test.ts); [계약](../packages/shared/src/types/blogReading.ts).
- **한계·이력:** 구독 뒤 실제 글 읽음/메일 수신을 뜻하지 않는다. DB-1134. 도입 버전·일자 미확인.

### `blog_article_open`

- **질문:** 정주행 목록에서 원문 링크를 선택하는가?
- **발생·제외:** 목록 행 원문 링크의 handleArticleOpenClick에서 기록. 실제 탭 도착을 기다리지 않는다.
- **속성:** 필수 `blog_id: TBlogId`, `sort: TBlogReadingSort`=oldest/newest.
- **단위·중복:** 클릭당1회; 글/사용자별 중복 제거 없음.
- **근거·테스트:** [호출 코드](../apps/web/src/app/%5Blng%5D/%28auth%29/%28sidebar%29/memos/blogs/_hooks/useBlogReading.ts); [관련 테스트](../e2e/tests/web/blogReading.test.ts); [계약](../packages/shared/src/types/blogReading.ts).
- **한계·이력:** 원문 읽음·완독 아님. 수정키/반복 클릭과 전송 유실이 가능. DB-1134. 도입 버전·일자 미확인.

### `blog_article_memo_click`

- **질문:** 정주행 글에서 기존/새 메모를 여는가?
- **발생·제외:** 기존 memoId면 다이얼로그 열기 직전 view. 없으면 빈 메모 생성 onSuccess에서 반환 ID가 있을 때 create를 기록하고 다이얼로그를 연다. 생성 오류·ID 미반환은 제외.
- **속성:** 필수 `blog_id: TBlogId`, `action: "create" | "view"`.
- **단위·중복:** 기존 열기 클릭 또는 생성 성공 콜백당1회; 별도 중복 제거 없음.
- **근거·테스트:** [호출 코드](../apps/web/src/app/%5Blng%5D/%28auth%29/%28sidebar%29/memos/blogs/_hooks/useBlogReading.ts); [관련 테스트](../e2e/tests/web/blogReading.test.ts); [계약](../packages/shared/src/types/blogReading.ts).
- **한계·이력:** create는 제목을 포함한 빈 메모 생성일 수 있어 유효 본문 작성 완료 아님. view도 실제 렌더·읽음 완료 아님. DB-1134. 도입 버전·일자 미확인.

### `blog_sync_resume_request`

- **질문:** 블로그 수집 재개 요청 결과는 무엇인가?
- **발생·제외:** syncRequestMutation onSuccess에서 서버 result.status를 기록. onError는 토스트만.
- **속성:** 필수 `blog_id: TBlogId`, `result: "queued" | "running" | "throttled"`.
- **단위·중복:** 성공 응답당1회; 제한 응답도 포함, 재요청은 다시 기록.
- **근거·테스트:** [호출 코드](../apps/web/src/app/%5Blng%5D/%28auth%29/%28sidebar%29/memos/blogs/_hooks/useBlogReading.ts); [관련 테스트](../e2e/tests/web/blogReading.test.ts); [계약](../packages/shared/src/types/blogReading.ts).
- **한계·이력:** 수집 완료·신규 글 생성 수가 아니다. queued/running/throttled를 전부 성공적으로 수집한 건수로 합치지 않는다. DB-1134. 도입 버전·일자 미확인.

### `blog_reading_page_move`

- **질문:** 정주행 목록의 쪽을 얼마나 이동하는가?
- **발생·제외:** 이전: 첫 쪽이 아니면 index 변경 직후. 다음: 캐시된 쪽이면 즉시, 아니면 fetchNextPage가 isError=false일 때만 기록. 정렬/필터 초기화는 이 이벤트 없음.
- **속성:** 필수 `direction: "prev" | "next"`, `page_number: number`(이동 후1-based), `sort: TBlogReadingSort`.
- **단위·중복:** 성공 분기 핸들러당1회; 같은 쪽 재방문 포함.
- **근거·테스트:** [호출 코드](../apps/web/src/app/%5Blng%5D/%28auth%29/%28sidebar%29/memos/blogs/_hooks/useBlogReading.ts); [관련 테스트](../e2e/tests/web/blogReading.test.ts); [계약](../packages/shared/src/types/blogReading.ts).
- **한계·이력:** 목록 DOM 표시 완료나 글 읽음 아님. 다음 조회 오류는 전송하지 않으므로 이 이벤트만으로 실패율 계산 불가. DB-1134. 도입 버전·일자 미확인.

## 코드 반영과 운영 보급을 확인해야 할 항목

- 이 문서는 위 기준 SHA의 AS-IS입니다. 코드에서 확인한 누락·오류 판정 공백을 바람직한 동작으로
  승인하거나, 문서를 고친 것으로 제품 문제가 해결됐다고 취급하지 않습니다.
- `past_memo_view_start/result/reuse`는 기준 SHA에 포함되지만 실제 운영 버전 보급·수신 확인은 별도입니다.
- DB-1250의 신규 3종은 PR #788 구현과 위 명세에 포함됩니다. 확장 1.11.4의 실제 스토어 보급·GA 수신·성숙 설치 코호트는 별도 확인하며 코드 반영과 혼동하지 않습니다.
- DB-1255의 revision·attempt/ACK 확장 필드도 이 기준 SHA에 없습니다. 현재 queue/flush 명세로
  최종 저장 실패율·ACK 지연 백분위를 계산하지 않습니다.
- 도입 일자가 미확인인 항목은 문서 작성일을 도입일로 채우지 않습니다. 과거 의미와 운영 버전은
  해당 변경 PR·릴리스 기록·버전별 수신을 대조해 보완합니다.
