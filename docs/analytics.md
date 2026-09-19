# GA 수집 현황

GA4로 무엇을 수집하고 있는지, 그중 무엇을 보고서 차원으로 조회할 수 있는지를 적습니다.

**이벤트 정의의 원천은 코드입니다** — `packages/shared/src/modules/analytics/type.ts`의 판별
유니온(`TAnalyticsEvent`)과 그 아래 `EVENT_CATEGORY`가 단일 진실 원천이고, 이 문서는 그것을
GA4 속성 설정과 대조한 결과입니다. 코드와 이 문서가 어긋나면 코드가 맞고 이 문서를 고칩니다.

## 속성

| 항목 | 값 |
| --- | --- |
| GA4 속성 | `properties/471860782` (web-memo, 표준 속성, Asia/Seoul) |
| 측정 ID | `G-6HHNP7KJM5` — gtag용입니다. **Data API에 넣으면 403/404가 납니다** |
| GTM | `GTM-WSDF6FQ2` |
| 웹 전송 | `window.gtag("event", ...)` |
| 확장 전송 | Measurement Protocol `POST /mp/collect` |
| 전송 게이트 | `buildEnv !== "development"` **그리고** 만든 사람 본인이 아닐 것 |

`development` 빌드는 커스텀 이벤트를 보내지 않습니다. `staging`은 보냅니다 — 테스트 서버에서
도착을 눈으로 확인해야 하기 때문이며, 그 트래픽은 `build_env` 차원으로 걸러 냅니다.

## 이벤트 43종

`core_action`은 사용자가 이 서비스를 쓰는 행위, `engagement`는 그 주변의 이동·설정입니다.
분류는 `EVENT_CATEGORY`가 `Record`로 강제하므로 이벤트를 추가하고 분류를 빠뜨리면 컴파일이
실패합니다.

### core_action (24종)

`memo_write`(fields) · `memo_delete`(memo_count) · `memo_restore`(memo_count) ·
`memo_delete_permanently`(memo_count) · `memo_open`(has_search_query) · `memo_source_open` ·
`memo_search`(query_length) · `memo_status_toggle`(status, enabled) · `memo_category_change` ·
`highlight_note_update` · `summary_run` · `summary_complete`(duration_msec) ·
`summary_fail`(reason) · `chat_message_send` · `chat_fail`(reason) ·
`youtube_transcript_extract`(is_success) · `category_suggestion_apply`(is_new_category) ·
`category_create` · `category_update` · `category_delete` · `login`(method) · `sign_up`(method) ·
`feedback_submit` · `extension_install_click`

### engagement (19종)

`side_panel_open` · `side_panel_open_click` · `side_panel_login_click` ·
`page_view`(page_title, page_location) · `tab_change`(tab_name) · `view_change`(view) ·
`memo_filter`(search_target) · `memo_undo`(action) · `setting_change`(setting_keys) ·
`extension_setting_change`(keys) · `category_suggestion_show`(is_new_category) ·
`login_start`(method) · `logout` · `extension_installed` · `extension_install_dismiss` ·
`open_web_from_extension`(from) · `guide_open`(from) · `guide_step`(step_name) · `guide_finish`

### 호출부에 없는 이벤트

`memo_write` · `memo_status_toggle` · `memo_category_change` 셋은 화면 코드에 직접 심겨 있지
않습니다. 메모 변경 요청의 키를 보고 `Analytics.ts`의 `trackMemoUpdate`가 갈라 보냅니다 —
상태 토글·카테고리 변경·본문 수정이 모두 같은 뮤테이션을 지나기 때문입니다. grep으로 찾으면
안 나오므로 "안 쓰는 이벤트"로 오인하기 쉽습니다.

로그인 완료(`login`·`sign_up`)는 서버에서 끝나 `gtag`가 닿지 않습니다. 도착한 클라이언트가
대신 쏩니다.

## 커스텀 차원·측정항목

파라미터를 **보내는 것**과 GA4가 그것을 **보고서 차원으로 제공하는 것**은 별개입니다. 등록돼
있지 않으면 Data API 요청에서 차원 이름으로 쓸 수 없습니다.

### 등록된 이벤트 범위 커스텀 차원 (17개)

`build_env` · `ext_client_id` · `method` · `fields` · `from` · `status` · `enabled` ·
`is_success` · `is_new_category` · `has_search_query` · `reason` · `search_target` ·
`setting_keys` · `keys` · `tab_name` · `view` · `action`

`ext_client_id`는 등록만 남아 있고 더는 보내지 않습니다. gtag가 이 이름을 예약 필드(`excid`)로
바꿔 보내 커스텀 차원에 값이 한 번도 도달하지 않았기 때문입니다. 확장과 웹을 잇는 방법은
[지표를 읽을 때 주의할 것](#지표를-읽을-때-주의할-것)을 보세요.

### 등록된 커스텀 측정항목 (3종 × 3형태)

`duration_msec`(요약 소요 시간) · `memo_count`(처리한 메모 수) · `query_length`(검색어 길이).
각각 원값·`average`·`count` 세 형태로 등록돼 있습니다.

### 등록되지 않은 파라미터 (2개)

| 파라미터 | 붙는 이벤트 | 없으면 못 하는 것 |
| --- | --- | --- |
| `step_name` | `guide_step` | 가이드의 **어느 단계에서 이탈하는지** 볼 수 없습니다 |
| `event_category` | 전 이벤트 | `core_action`과 `engagement`를 **나눠 보는 조회**가 막힙니다 |

둘 다 GA4 콘솔에서 커스텀 차원으로 등록하면 끝나는 일이고 코드 변경이 필요 없습니다.
등록해도 **소급 적용되지 않으므로** 등록 이후의 데이터부터 조회됩니다.

## 지표를 읽을 때 주의할 것

**`hostName`으로 걸러야 합니다.** 최근 30일 활성 사용자의 대부분이 `localhost`입니다. 이
레포는 공개돼 있어 클론한 사람이 로컬에서 돌리면 그 트래픽이 운영 속성으로 들어옵니다.

**확장은 `hostName`에 잡히지 않습니다.** 사이드 패널은 `chrome-extension://` 문서라 호스트가
비어 `(not set)` 또는 빈 문자열로 들어옵니다. `extension_installed`·`side_panel_open`·
`memo_write`가 전부 그 두 호스트에 몰려 있는 것이 근거입니다. **운영 도메인만 남기는 필터는
이 서비스의 주된 사용 경로를 통째로 지웁니다.**

**확장→웹 퍼널은 `client_id`를 맞춰서 잇습니다.** 확장은 Measurement Protocol로 자체
`client_id`를, 웹은 gtag의 `_ga` 쿠키를 써서 그냥 두면 서로 다른 사용자입니다. 사이드패널이
로그인 탭을 `?ext_cid=<확장 client_id>`로 열면, 웹 루트 레이아웃의 `beforeInteractive` 스크립트가
gtag보다 먼저 `_ga` 쿠키에 그 값을 심어 이후 웹 이벤트가 같은 사용자로 집계됩니다. UUID 형식이
아니면 무시합니다. 이미 웹에 방문한 적 있는 사람이 이 링크로 들어오면 `_ga`가 덮어써져 이전 웹
방문 기록은 다른 사용자로 갈라집니다. 이 연결은 배포 이후 데이터부터 유효합니다.

**`build_env` 필터는 커스텀 이벤트에만 걸립니다.** `activeUsers` 같은 지표는 gtag 자동 수집
기반이라 그 파라미터가 아예 없습니다. 자동 수집 이벤트를 거르려면 `hostName`을 써야 합니다.

**개발 빌드의 자동 수집은 전송 게이트가 막지 않습니다.** 게이트는 커스텀 이벤트만 봅니다.
그래서 웹은 `isProduction()`이 아니면 GA 스크립트를 아예 싣지 않는 방식으로 막고 있습니다.

## 만든 사람 본인의 트래픽

사용자가 적은 지금은 본인의 사용이 섞이면 지표가 통째로 흔들려, 두 경로 모두에서 막습니다.

| 경로 | 막는 곳 |
| --- | --- |
| 커스텀 이벤트 43종 | `Analytics.ts`의 전송 게이트 — `user_id`가 `ANALYTICS_EXCLUDED_USER_ID`면 보내지 않습니다 |
| gtag 자동 수집 | 웹 루트 레이아웃 — 브라우저에 남은 표식을 읽어 gtag보다 먼저 `ga-disable-<측정ID>`를 켭니다 |

판정 기준이 `profiles.role`이 아니라 UUID 상수인 이유는 **확장이 role을 모르기 때문입니다.**
role을 읽는 코드는 `checkIsAdmin` 하나이고 호출부가 웹 서버 컴포넌트뿐이며, 생성된 `profiles`
타입에는 role 컬럼조차 없습니다.

**한계 두 가지.** 로그인하지 않은 상태의 트래픽은 어느 쪽으로도 걸러지지 않습니다. 그리고
로그인 직후 그 세션의 첫 `page_view`는 이미 나간 뒤라 막히지 않습니다 — 표식이 남은 다음
방문부터 자동 수집이 완전히 꺼집니다.

**이미 쌓인 과거 데이터는 그대로입니다.** GA4 데이터 필터도, 이 방식도 소급 적용되지 않습니다.

## Data API 쿼터

표준 속성 기준 속성당 하루 200,000 토큰, 시간당 40,000 토큰입니다. 무료입니다.

`date` 차원 하나에 `activeUsers` 지표 하나짜리 단순 조회는 **한 건에 2토큰**을 씁니다(실측).
6시간 캐시까지 감안하면 대시보드를 하루 100번 열어도 일일 쿼터의 0.1%에 닿지 않습니다.
요청에 `returnPropertyQuota: true`를 넣으면 실제 소모량을 응답으로 되받아 볼 수 있습니다.
