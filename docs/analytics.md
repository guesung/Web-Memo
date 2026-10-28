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
| 앱 전송 | Measurement Protocol `POST /mp/collect` — 앱 전용 모듈 `apps/app/lib/analytics/` |
| 전송 게이트 | `buildEnv !== "development"` **그리고** 만든 사람 본인이 아닐 것 (앱은 `__DEV__`가 아닐 것) |

`development` 빌드는 커스텀 이벤트를 보내지 않습니다. `staging`은 보냅니다 — 테스트 서버에서
도착을 눈으로 확인해야 하기 때문이며, 그 트래픽은 `build_env` 차원으로 걸러 냅니다.

주간 메모 리포트 메일의 웹 메모 링크에는 UTM이 붙습니다(`weekly-memo-report/template.ts`의 `withUtm`).
커스텀 이벤트가 아니라 GA4 유입 경로로 집계되므로 "트래픽 획득"에서 소스 `weekly_report` · 매체 `email`로 봅니다.
캠페인은 정기 `weekly_memo_report` / 테스트 `weekly_memo_report_test`, `utm_content`는 누른 자리
(`organize` · `view_all` · `footer_web` · `footer_setting` · `empty_open`)입니다. 메모 원문 링크에는 붙이지 않습니다.

## 이벤트 목록

`core_action`은 사용자가 이 서비스를 쓰는 행위, `engagement`는 그 주변의 이동·설정입니다.
분류는 `EVENT_CATEGORY`가 `Record`로 강제하므로 이벤트를 추가하고 분류를 빠뜨리면 컴파일이
실패합니다.

### core_action

`memo_write`(fields) · `memo_delete`(memo_count) · `memo_restore`(memo_count) ·
`memo_delete_permanently`(memo_count) · `memo_open`(has_search_query, source?) · `memo_source_open` ·
`memo_search`(query_length) · `memo_status_toggle`(status, enabled) · `memo_plan_change`(action, days_ahead?) · `memo_category_change`(action, source) ·
`highlight_note_update` · `highlight_source_jump` · `highlight_panel_open_result`(is_success) · `summary_run`(source) · `summary_complete`(duration_msec) ·
`summary_fail`(reason) · `chat_message_send` · `chat_fail`(reason) ·
`youtube_transcript_extract`(is_success) · `category_suggestion_apply`(is_new_category, source, trigger) ·
`category_create` · `category_update` · `category_delete` ·
`login`(method) · `sign_up`(method) · `feedback_submit` · `extension_install_click`(from, position) ·
`memo_first_write`(source?) · `memo_content_saved`(source) · `export_run`(format) · `highlight_create`(color, has_note) ·
`past_memo_open`(kind, source) · `past_memo_reuse`(source, action) · `blog_subscription_change`(blog_id, active) ·
`blog_article_open`(blog_id, sort) · `blog_article_memo_click`(blog_id, action) ·
`blog_sync_resume_request`(blog_id, result)

하이라이트에서 실제 메모를 생성하면 `memo_first_write`에 `source: highlight`를 보냅니다. 기존 연결을 반환하는 재시도는 제외합니다. 정상 연결 메모 상세를 열면 `memo_open`에 같은 source와 `has_search_query: false`를 보내며 휴지통 경로는 제외합니다. 인용문·메모 본문·URL·ID는 속성에 넣지 않습니다.

현재 작성 동선은 페이지의 하이라이트를 사이드 패널에서 참고하는 방식입니다. 패널을 여는 동작은 메모 생성으로 기록하지 않습니다. 패널 인용을 선택해 원문 위치 검증과 스크롤에 성공한 경우에만 `highlight_source_jump`를 속성 없이 기록합니다. 기존 생성 RPC의 계측과 연결 메모 열기는 이전 연결 데이터와의 호환을 위해 유지합니다.

### engagement

`side_panel_open` · `side_panel_open_click` · `side_panel_login_click` ·
`memo_editor_ready`(source) · `memo_save_result`(is_success, source, reason) ·
`summary_panel_toggle`(action) · `extension_uninstall` · `install_guide_panel_open_click`(is_success) ·
`memo_domain_filter_change`(action, source, domain_option_count?) · `highlight_bubble_dismiss` ·
`header_login_click`(from) · `header_memos_click`(from) ·
`page_view`(page_title, page_location) · `tab_change`(tab_name) · `view_change`(view, 메모 목록에서만 layout: grid/list/domain) ·
`memo_filter`(search_target) · `memo_undo`(action) · `setting_change`(setting_keys) ·
`extension_setting_change`(keys) · `category_suggestion_show`(is_new_category, source) ·
`category_suggestion_dismiss`(is_new_category, source) ·
`login_start`(method) · `logout` · `extension_installed` · `extension_install_dismiss` ·
`open_web_from_extension`(from) · `guide_open`(from) · `guide_step`(step_name) · `guide_finish` ·
`install_guide_view` · `install_guide_tab_opened`(is_success) · `install_guide_load` · `install_guide_login_click` ·
`search_no_result` · `highlight_bubble_disable`(scope) · `notice_view`(notice_id) ·
`notice_dismiss`(notice_id) · `notice_return`(notice_id, days_since_view) ·
`past_memo_show`(kind, source) · `past_memo_dismiss`(kind, source) ·
`past_memo_expand`(kind=related, source=jev) ·
`past_memo_view_start`(source) · `past_memo_view_result`(source, is_success, reason, action) ·
`memo_offline_queued`(trigger) · `memo_offline_sync_result`(trigger, synced_count, conflict_count, has_other_error) ·
`shortcut_change_click`(is_success) · `blog_reading_page_move`(direction, page_number, sort)

2026-09-27부터 카테고리 추천의 `show`는 Jev가 고른 기존 카테고리를 사용자에게 표시한 경우,
`apply`는 사용자가 그 제안을 수락한 경우, `dismiss`는 X 버튼이나 Escape로 명시적으로
거절한 경우에만 발생합니다. 제안은 시간 경과만으로 사라지지 않으며, 탭·메모 전환은
`dismiss`로 기록하지 않습니다.
새 이벤트의 `source`는 `jev`, `is_new_category`는 `false`입니다. 이전에는 자동 적용도
`apply`로 기록되었고 OpenAI 및 새 카테고리 제안도 포함되었으므로, 변경 전후의 `apply` 건수를
같은 의미의 지표로 직접 비교하면 안 됩니다.

### 호출부에 없는 이벤트

`install_guide_load`는 `analytics.trackEvent`로 보내지 않습니다. 설치 가이드 페이지가
`navigator.sendBeacon`으로 `POST /api/install-guide-load`를 부르면 웹 서버가 Measurement Protocol로
보냅니다. 광고 차단기가 gtag를 막아 `install_guide_view`가 빠지는 설치자를 세려고 둔 경로라,
gtag 이벤트와 겹쳐 세지 않도록 이름을 따로 씁니다. `extension_uninstall`도 같은 방식으로
`GET /api/uninstall`의 서버가 보냅니다.

`memo_write` · `memo_status_toggle` · `memo_category_change` 셋은 화면 코드에 직접 심겨 있지
않습니다. 메모 변경 요청의 키를 보고 `Analytics.ts`의 `trackMemoUpdate`가 갈라 보냅니다 —
상태 토글·카테고리 변경·본문 수정이 모두 같은 뮤테이션을 지나기 때문입니다. grep으로 찾으면
안 나오므로 "안 쓰는 이벤트"로 오인하기 쉽습니다.

`memo_category_change`의 `source`는 patch 경로(`useMemoPatchMutation`의 `categorySource`)로
바꾼 것만 붙습니다. 사이드 패널 자동 저장(upsert)은 요청마다 `category_id`를 실어 보내 값이
안 바뀌어도 이 이벤트가 찍히므로, 경로별 비율은 `source`가 있는 이벤트만 세야 합니다.

사이드 패널 오프라인 저장은 `useMemoUpsertMutation`을 거치지 않고 대기열에서 `MemoService`를 직접
부르므로 `memo_write` 계열에 잡히지 않습니다. 대기열로 빠진 저장은 `memo_offline_queued`(trigger:
offline·network_error·already_queued), 올린 결과는 `memo_offline_sync_result`(trigger: mount·
online·retry_click·enqueue)로 셉니다. enqueue는 온라인 상태에서 대기 항목이 막 생겨(이미 대기
중이거나 네트워크 오류 직후) online 전환 없이 곧바로 도는 flush입니다. 후자는 실제로 처리한
항목이 있을 때만 찍혀 빈 대기열 flush로 부풀지 않습니다.

`summary_run`의 `source`는 요약을 실행한 자리입니다. 요약 탭 빈 화면의 버튼이면 `empty_state`,
탭 옆 새로고침 아이콘이면 `tab_trigger`입니다. 같은 `source` 차원을 `memo_category_change`도
쓰므로 이벤트 이름으로 걸러서 봅니다. `summary_fail`의 `reason`은 요약 API가 오류 상태로
응답하면 `http_<상태 코드>`(예: `http_500`)이고, 스트림 오류·네트워크 실패면 오류 메시지입니다.

로그인 완료(`login`·`sign_up`)는 서버에서 끝나 `gtag`가 닿지 않습니다. 도착한 클라이언트가
대신 쏩니다.

## 앱(apps/app)

앱은 공용 `Analytics.ts`를 쓰지 않습니다. 그 모듈이 `@web-memo/env`를 import해 EAS iOS 빌드가
깨지기 때문입니다. 대신 `apps/app/lib/analytics/`가 확장과 같은 형태의 Measurement Protocol
payload를 직접 보냅니다. 이벤트 정의의 원천은 `analyticsCore.ts`의 `TAppAnalyticsEvent`와
`APP_EVENT_CATEGORY`이고, 이름과 파라미터는 웹·확장의 같은 이벤트와 맞춰 합쳐 볼 수 있게 했습니다.

| 항목 | 앱의 동작 |
| --- | --- |
| `client_id` | AsyncStorage `webmemo:analyticsClientId`에 한 번 만든 UUID. 웹·확장과 이어지지 않습니다 |
| `session_id` | 메모리. 마지막 이벤트로부터 30분이 지나면 새로 발급합니다 |
| `user_id` | `AuthProvider` 세션과 동기화합니다. 로그인 직후 `login`은 결과의 user id를 먼저 설정한 뒤 보냅니다 |
| 게이트 | `__DEV__`면 콘솔에만 찍고 보내지 않습니다. 앱은 환경 변수를 쓰지 않아 staging을 구분하지 못합니다 |
| 공통 파라미터 | `event_category` · `engagement_time_msec` · `build_env` · `app_version` · `app_platform`(`ios`·`android`) |
| 화면 조회 | expo-router pathname이 바뀔 때마다 `page_view`(`page_location`은 `webmemo://app<pathname>`). 세션 복원이 끝난 뒤부터 보냅니다 |

보내는 이벤트는 `page_view` · `memo_first_write` · `memo_write` · `memo_status_toggle` ·
`memo_delete` · `memo_restore` · `login` · `highlight_create`입니다. 공유 인텐트로 위시리스트에
저장하면 `memo_status_toggle`에 `source: share_intent`가 붙습니다.

**앱 트래픽을 가르려면 `app_platform`을 봐야 합니다.** 그런데 `app_version`·`app_platform`은
아직 커스텀 차원으로 등록되지 않아 보고서에서 조회할 수 없습니다. `build_env=production`에는
develop push로 Play 내부 테스트에 올라간 빌드도 섞입니다.

## 커스텀 차원·측정항목

파라미터를 **보내는 것**과 GA4가 그것을 **보고서 차원으로 제공하는 것**은 별개입니다. 등록돼
있지 않으면 Data API 요청에서 차원 이름으로 쓸 수 없습니다.

### 등록된 이벤트 범위 커스텀 차원 (22개)

`build_env` · `ext_client_id` · `method` · `fields` · `from` · `status` · `enabled` ·
`is_success` · `is_new_category` · `has_search_query` · `reason` · `search_target` ·
`setting_keys` · `keys` · `tab_name` · `view` · `action` · `position` · `step_name` ·
`event_category` · `source` · `extension_version`

`position`은 2026-09-24에 `설치 버튼 위치`로 등록했습니다. `extension_install_click`의
`hero`·`recommendation`·`final`·`install_check_dialog` 값을 구분합니다.
같은 날 `step_name`(`가이드 단계`), `event_category`(`이벤트 분류`),
`source`(`메모 카테고리 변경 경로`)도 이벤트 범위로 등록했습니다.

`extension_version`은 2026-09-26에 `확장 버전`으로 등록했습니다. 확장이 보내는 모든 커스텀
이벤트에 매니페스트 버전(`chrome.runtime.getManifest().version`)을 공통 파라미터로 싣고, 웹
이벤트에는 붙이지 않습니다. 배포 전후를 버전으로 가르는 기준이며, 등록 이전 버전의 이벤트는
`(not set)`입니다.

`ext_client_id`는 등록만 남아 있고 더는 보내지 않습니다. gtag가 이 이름을 예약 필드(`excid`)로
바꿔 보내 커스텀 차원에 값이 한 번도 도달하지 않았기 때문입니다. 확장과 웹을 잇는 방법은
[지표를 읽을 때 주의할 것](#지표를-읽을-때-주의할-것)을 보세요.

`past_memo_*` 이벤트는 `kind`를 전송하지만, `kind`는 아직 이벤트 범위 맞춤 측정기준으로
등록되지 않았습니다. 등록 전에는 Data API에서 중복·관련 종류별 열기 비율을 조회할 수 없으며,
등록 이전 값도 소급해 조회할 수 없습니다. 등록 확인 전에는 종류별 개선을 판정하지 않습니다.

### 과거 메모 패널 열람 계측 (DB-1251)

기존 `past_memo_open`은 조회 전에 찍히는 클릭 의도입니다. 중복 안내는 확장 1.11.0부터
패널 메모 보기, 관련 추천은 원문 탭 이동이므로 하나의 재열람 성공 지표로 묶지 않습니다.
`past_memo_show/open`은 URL·kind 기준의 중복 제거를 사용하지만 신규 `view_start/result`는
직접 클릭으로 만든 로컬 시도 단위입니다. 두 이벤트 집합의 건수를 같은 분모로 나누지 않습니다.

신규 `past_memo_view_result`의 성공은 비공백 기록이 활성 문서 DOM에 렌더된 것을 뜻합니다.
현재 설정에서 숨긴 느낀 점·액션 아이템이나 제목만 있는 메모는 내용으로 세지 않습니다.
스크롤 영역 안의 본문 전체 가시성·정독·효용을 증명하지 않습니다. 시도 시작보다 24시간 이상 전에
생성된 기록은 `action=existing`, 그 이후부터 시작 시각까지는 `recent`, 시각 불명·미래·미조회는
`unknown`입니다. 나이는 클라이언트에서 분류하며 원시 생성 시각은 보내지 않습니다.

주 지표는 신규 버전 production의 `result(is_success=true, action=existing)` 건수·고유 사용자
수입니다. 보조는 관측된 결과의 성공비, `start` 대비 `result` 완료 관찰비, 실패·취소 사유별
건수와 `past_memo_reuse`(기존 기록 렌더 후 원문 탭 생성 성공)입니다. 계정 전환·프로세스 종료·
전송 누락은 start와 result의 차이를 만들 수 있습니다. 전체 기존 기록 보유자 재열람률이나
같은 사용자의 순차 전환율로 해석하지 않습니다. 공통 `engagement_time_msec`도 실제 읽기 시간이 아닙니다.

신규 이벤트 속성은 이미 등록된 `source/action/is_success/reason`의 열거값만 사용합니다.
메모 ID·시도 토큰·제목·본문·URL·검색어·사용자 ID를 신규 params에 넣지 않습니다.
기존 전송층의 인증 식별 정책은 유지합니다. 계정 전환을 인지한 뒤에는 과거 시도의 전송 호출을
생략하지만, 호출 이후 공통 전송층의 비동기 사용자 해석까지 개인별 귀속을 보장하지는 않습니다.
전송 성공 응답도 GA 보고서 반영의 보장은 아닙니다.

신규 버전 출시 후 4주를 최초 기준선으로 모으고, 마지막 날 종료 후 처리 시간 48시간을 기다립니다.
`existing` 성공 사용자가 5명 미만이거나 관측 완료 시도가 20회 미만이면 판단을 보류합니다.
최대 8주 후에도 부족하면 효과 미확인으로 종료합니다. 이는 운영상 표본 확보 기준이며 통계적
유의성 기준이 아닙니다. 반복 시도를 독립 표본으로 간주하거나 인과 효과를 확정하지 않습니다.
운영 호스트 허용 목록과 `build_env=production`, 해당 계측이 포함된 확장 버전을 함께 필터링하고,
샘플링·임곗값·other 손실·잘림 메타데이터를 보존합니다. 단계별 사용자 수를 따로 조회해 나눈 값을
정확한 코호트 전환율로 표기하지 않습니다.

### 등록된 커스텀 측정항목 (3종 × 3형태)

`duration_msec`(요약 소요 시간) · `memo_count`(처리한 메모 수) · `query_length`(검색어 길이).
각각 원값·`average`·`count` 세 형태로 등록돼 있습니다.

등록된 맞춤 측정기준은 **소급 적용되지 않으므로** 등록 이후의 데이터부터 조회됩니다.

### 공지 재방문 계측

`notice_return`은 공지가 실제 표시된 KST 날짜를 확장 `chrome.storage.local`에 처음 기록한 뒤,
**D1–D7에 사이드 패널을 다시 연 최초 전송 시도**입니다. D0·D8 이후는 보내지 않습니다.
로컬 저장소 실패·확장 재설치·여러 기기·네트워크 누락은 재방문 수를 낮출 수 있고,
서로 다른 패널의 동시 실행은 중복 시도를 만들 수 있습니다. 보고서는 이벤트 건수 대신
`totalUsers`로 고유 사용자를 셉니다. 이 이벤트는 패널 안에서 생기므로 공지가 패널 밖의
사용자를 다시 불렀다는 증거가 아닙니다.
만료된 공지의 로컬 키는 현재 자동 삭제하지 않습니다. 공지가 일시적으로 다른 공지에
가려졌다가 다시 표시될 수 있어 ID 기록을 지우면 재노출을 새 첫 노출로 잘못 셀 수
있습니다. 공지 종료가 확정되는 정리 경로를 마련할 때 삭제합니다.

공지별 조회에는 이벤트 범위 커스텀 차원 `notice_id`가 필요합니다. **2026-10-04
15:51 KST에 GA4 속성 471860782에 등록하고 재조회로 확인했습니다**
(`properties/471860782/customDimensions/16038714798`, [실행 기록](https://github.com/guesung/Web-Memo/actions/runs/37184037854)).
GA4 처리 24~48시간을 확인하고,
그 뒤 계측이 배포된 상태에서 처음 시작한 공지만 완결된 관찰 대상으로 삼습니다.
기존 하이라이트 공지는 마이그레이션상 2026-11-01까지 활성이고, 더 최근 공지가 끝나면
다시 보일 수 있습니다. 운영 실험에서는 활성 공지 기간을 겹치지 않게 관리합니다.

공지 노출 기간을 `[S,E]`(Asia/Seoul)로 정했다면 분모는 그 기간의 `notice_view` 고유 사용자,
분자는 `[S+1,E+7]`의 같은 `notice_id`를 가진 `notice_return` 고유 사용자입니다.
두 수는 독립된 `totalUsers` 집계이므로 분자 사용자가 모두 분모에 속한다고 증명하지는
못합니다. 비율은 공지별 **노출 대비 재방문 관찰비**로만 읽고, 정확한 첫 노출 코호트
재방문율로 부르지 않습니다.
**E+7일이 끝난 뒤 GA 처리 48시간을 더 기다려** 조회합니다. 저장소·전송 누락이나
GA 임곗값·샘플링이 있으면 결과를 `효과 미확인`으로 읽습니다. 메모 보조 지표는
`notice_return` 이후 24시간 안의 `memo_first_write`(새 메모 생성) 또는
`memo_write`(기존 메모 수정) 순서 퍼널이며, D1–D7 메모율로 부르지 않습니다.

과거 `notice_view → side_panel_open` 168시간 퍼널에는 D0가 포함됩니다. 공지별 첫 노출
코호트를 소급 복원할 수 없으므로 `재방문율`이나 `공지 효과`로 표기하지 않습니다.
2026-10-04 15:52 KST의 [실제 조회](https://github.com/guesung/Web-Memo/actions/runs/37184062182)는
9/30~10/1 노출자 17명 중 168시간 이내 후속 `side_panel_open` 12명,
메모 행동 2명을 반환했습니다. **168시간 창과 GA 처리 시간이 끝나지 않은 잠정값**이고
하이라이트 출시가 겹쳤으므로 효과는 미확인입니다. 같은 기간의 최종 탐색값은
2026-10-11 00:00 KST 이후 다시 조회합니다.

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

gtag가 `_ga`에 심은 UUID를 cid로 받아 주는 것은 문서에 없는 동작이라, Google이 쿠키 해석을
바꾸면 에러 없이 새 cid가 발급되고 이 연결이 조용히 끊깁니다. GA Data API에는 `client_id`
차원이 없어 수집된 데이터로는 알 수 없으므로, `audit-ga-cid-adoption.yml`이 매주 월요일
09:13(KST)에 운영 로그인 페이지를 프로브 전용 `ext_cid`로 열어 확인합니다
(`e2e/probes/gaClientIdAdoption.probe.ts`). GA로 가는 요청은 모두 abort해 운영 데이터에 흔적을
남기지 않습니다. 실패 메시지의 ①은 `_ga` 쿠키가 심기지 않은 경우(우리 코드 회귀), ②는 쿠키는
심겼지만 gtag가 그 값을 cid로 쓰지 않은 경우(gtag 변화)입니다. 로컬에서는
`pnpm -F e2e exec playwright test --config playwright.probe.config.ts`로 돌립니다.

**운영 커스텀 이벤트는 `hostName` 허용 목록과 `build_env=production`을 함께 적용합니다.**
확장은 staging과 production에서 같은 hostName을 사용하므로 hostName만으로 구분할 수 없습니다.
반대로 `activeUsers` 같은 지표는 gtag 자동 수집 기반이라 `build_env` 파라미터가 없습니다.
따라서 활성 사용자 분모에는 hostName만 적용하며, 커스텀 이벤트 집계와 모수가 완전히 같지 않습니다.

**개발 빌드의 자동 수집은 전송 게이트가 막지 않습니다.** 게이트는 커스텀 이벤트만 봅니다.
그래서 웹은 `isProduction()`이 아니면 GA 스크립트를 아예 싣지 않는 방식으로 막고 있습니다.

## 만든 사람 본인의 트래픽

사용자가 적은 지금은 본인의 사용이 섞이면 지표가 통째로 흔들려, 두 경로 모두에서 막습니다.

| 경로 | 막는 곳 |
| --- | --- |
| 커스텀 이벤트 48종 | `Analytics.ts`의 전송 게이트 — 메모리와 확장 storage의 `user_id`를 먼저 해석하고, 값이 `ANALYTICS_EXCLUDED_USER_ID`면 보내지 않습니다 |
| gtag 자동 수집 | 웹 루트 레이아웃 — 브라우저에 남은 표식을 읽어 gtag보다 먼저 `ga-disable-<측정ID>`를 켭니다 |

판정 기준이 `profiles.role`이 아니라 UUID 상수인 이유는 **확장이 role을 모르기 때문입니다.**
role을 읽는 코드는 `checkIsAdmin` 하나이고 호출부가 웹 서버 컴포넌트뿐이며, 생성된 `profiles`
타입에는 role 컬럼조차 없습니다.

**한계 두 가지.** 로그인하지 않은 상태의 트래픽은 어느 쪽으로도 걸러지지 않습니다. 그리고
로그인 직후 그 세션의 첫 `page_view`는 이미 나간 뒤라 막히지 않습니다 — 표식이 남은 다음
방문부터 자동 수집이 완전히 꺼집니다.

**이미 쌓인 과거 데이터는 그대로입니다.** GA4 데이터 필터도, 이 방식도 소급 적용되지 않습니다.

확장은 이벤트 전송 전에 storage의 user ID까지 확인합니다. storage 조회 중 로그인이나 로그아웃이
발생하면 가장 최근에 메모리에 설정된 값을 우선하고, 로그아웃 뒤에는 이전 storage 값을 다시
복구하지 않습니다. 전송 여부와 Measurement Protocol payload가 같은 user ID를 사용합니다.

### 대상 기간의 사용자 확인

표준 이벤트 보고서와 Data API는 원본 `user_id`를 차원으로 제공하지 않습니다. 개별 사용자 확인이
필요하면 GA4의 `탐색 > 사용자 개별화 분석`에서 `Effective user ID`를 봅니다. User-ID가 수집된
로그인 사용자는 User-ID가, 그렇지 않은 사용자는 기기 기반 식별자가 표시됩니다.

1. 기간을 확인할 주간으로 설정합니다.
2. `이벤트 이름`과 `build_env=production` 조건으로 사용자 집합을 나눕니다.
3. 알려진 운영자 UUID와만 대조합니다.
4. 결과에는 운영자 일치·운영자 외·기기 기반 식별자의 **집계만** 남기고 원문 ID는 기록하지 않습니다.

권한, Reporting identity, 데이터 임계값, 보관기간 때문에 값이 가려지거나 `(not set)`이면 해당
범위를 운영자 외 사용자로 단정하지 않습니다. 반복 가능한 이벤트 수준 원시 데이터가 필요하면
BigQuery export를 별도로 연결해야 하며, 연결 전 데이터는 소급되지 않습니다.

## 조회 스크립트

### 설치 후 첫 유효 메모 관측 (DB-1250)

기존 `memo_first_write`는 insert마다 발생하고 `memo_write`에는 제목·공백·본문 삭제도
포함될 수 있습니다. 둘을 생애 첫 유효 본문 작성으로 바꾸거나 과거 수치를 소급하지 않습니다.
새 계측은 확장 메모 폼의 온라인 저장과 오프라인 대기열의 실제 클라우드 write만 봅니다.
웹·앱 저장과 하이라이트 단독 생성은 이 지표의 범위 밖입니다.

| 이벤트 | 의미 | 제외 |
| --- | --- | --- |
| `memo_editor_ready` | 인증·후보 조회 성공 후 실제 표시된 활성 본문 입력란. 사용자·탭·페이지 범위당 최초 1회 시도 | 로그인·로딩·조회 실패·잠금 |
| `memo_content_saved` | 서버 성공 응답의 반환 행에서 memo/impression/actionItem 중 trim 후 비어 있지 않은 변경을 확인 | 자동 제목·URL·토글·카테고리만 변경, 앞뒤 공백만 수정, 본문 삭제, 로컬 대기열 적재, no-op |
| `memo_save_result` | 실제 write가 응답/reject할 때 결과 1회. `is_success`, `source`, 고정 `reason`만 전송 | 사전 조회 실패, 큐 적재·삭제·동일 내용 no-op |

저장 결과와 유효 저장의 `source`는 `side_panel`/`offline_sync`, `reason`은
`none`/`network`/`server`/`unknown`입니다. 기존 등록 차원 source/is_success/reason과
공통 build_env/extension_version을 재사용하므로 새 GA 차원을 등록할 필요가 없습니다.
원문·제목·URL·메모 ID·상세 오류·새 사용자 식별자는 신규 payload에 넣지 않습니다.
저장 당시 계정과 전송 시 계정이 다르면 새 계측을 생략하며 기존 운영자 제외를 따릅니다.

로컬 큐 적재는 서버 성공이 아닙니다. 나중에 실제 sync write가 끝났을 때만 유효 기록을
세므로 설치 7일 뒤 동기화한 기록은 7일 지표 밖입니다. 서버에 같은 내용이 이미 있는
no-op flush는 새 write로 세지 않습니다. 큐 삭제 실패·재시도·네트워크 응답 유실 때문에
서버 반영과 이벤트를 정확히 한 번 대응시킬 수는 없습니다.
새 계측과 사이드 패널의 기존 작성 이벤트 전송은 저장 결과를 기다리게 하지 않습니다.

**정식 지표명: 신규 설치 식별자 중 설치 후 7일 이내 유효 메모 본문 저장 관측률.**
실제 사람의 신규 가입률·생애 최초 작성률과 다릅니다. 재설치·기기 변경·이벤트 유실이 있고,
GA 사용자 식별은 설치 ID와 일대일임을 보장하지 않습니다.

`.github/scripts/ga/measure-first-memo.mjs`는 다음을 읽기 전용 JSON으로 출력합니다.

- 주 지표는 `extension_installed → memo_content_saved`의 닫힌 **2단계** 퍼널입니다.
  후속은 설치부터 604800초 이내로 제한하며 로그인 버튼·가입 이벤트를 필수로 두지 않습니다.
- 설치 단계만 코호트 기간 C로 제한하고 전체 조회는 C끝+7일까지 읽습니다.
  마지막 설치일 전체+7일이 끝난 뒤 GA 처리 48시간을 더 기다립니다.
- `--instrumented-on`은 실제 계측 게시일입니다. 부분 배포일을 피하기 위해 C는 그 다음
  온전한 날짜부터 시작합니다. `--versions`는 실제 계측이 있는 버전을 명시해야 하며,
  관찰 중 업그레이드한 후속 버전도 포함해야 합니다. 버전별 사용자 수를 합산하지 않습니다.
- 진단용 패널/편집 준비는 각각 별도의 설치→목표 2단계 7일 퍼널입니다.
  다단계 간 7일 조건을 전체 설치 후 7일로 해석하지 않습니다.
- 보호 지표는 같은 대상 버전·조회 기간의 **전체 수집 write 결과**를 source별로 나눈
  실패 eventCount / 전체 결과 eventCount입니다. 설치 코호트로 한정한 집계가 아니며,
  실제 전체 저장 실패율로 부르지 않습니다. 미관측·분모 0은 비율 null입니다.
- 표본 추출·임곗값 적용 대상·잘린 행·잘못된 헤더/집계는 `incomplete`와 이유를 출력하며
  비율을 확정하지 않습니다. 퍼널 응답에는 threshold 필드가 없어 그 부재로 임계값 미적용을
  확인할 수 없습니다. API 오류를 0건으로 바꾸지 않습니다.

```bash
# GA4_PROPERTY_ID, GA4_SERVICE_ACCOUNT_JSON은 기존 읽기 전용 인증을 사용합니다.
# 아래 날짜와 버전은 예시입니다. 실제 계측 게시일·버전·관찰 완료일로 바꿉니다.
node .github/scripts/ga/measure-first-memo.mjs \
  --from 2026-11-02 --to 2026-11-29 \
  --instrumented-on 2026-11-01 --versions 1.11.4,1.11.5
```

첫 기준선은 계측 게시 후부터만 측정합니다. 28일 설치 관찰과 마지막 설치자의 7일+48시간
후 검토를 제안하되, 이는 예약 작업이나 A/B 실험 개시가 아닙니다. 이전 insert 3/70을 새 정의의
기준선으로 대입하지 않습니다. 최신 UI는 소표본 관찰과 동의 기반 사용성 관찰로 후보를 좁히고,
후속 화면 변경은 별도 시각 목업 승인 뒤에 진행합니다. 관찰만으로 인과 효과를 선언하지 않습니다.

`.github/scripts/ga/`에 다음 GA 조회 스크립트가 있습니다. 커스텀 이벤트는 호스트 허용 목록과
`build_env=production`을 함께 적용하고, 활성 사용자는 호스트 허용 목록만 적용합니다. 이벤트
목록의 원본과 사람 수 집계는 `ga/ga4-client.mjs`·`ga/ga4-weekly.mjs`의 같은 조각을 함께 써서
서로 다른 숫자를 내지 않습니다.

| 스크립트 | 답하는 질문 | 실행 |
| --- | --- | --- |
| `report-daily-ga.mjs` | 로깅이 살아 있는가 | 매일 크론 |
| `report-weekly-ga.mjs` | 지난주에 무엇을 얼마나 썼고 어디서 새는가 | 매주 월요일 크론 |
| `measure-feature-usage.mjs` | 이 기간에 이 기능을 몇 명이 몇 번 썼는가 | 손으로, 터미널 |
| `measure-notice-return.mjs` | 공지 이후 후속 행동 또는 향후 공지별 D1–D7 관찰값은? | 손으로, 터미널 |
| `measure-first-memo.mjs` | 계측 이후 신규 설치 식별자의 7일 내 유효 본문 저장 관측률과 저장 결과는? | 손으로, 터미널 |

주간 퍼널은 순서 강제입니다(`runFunnelReport`). 그 주에 설치한 사람이 같은 사용자로 `설치 →
사이드 패널 열기 → 로그인하러가기 클릭 → 로그인 버튼 클릭 → 가입 → 메모 작성`을 밟은 수를
셉니다. 확장→웹 구간은 웹이 확장의 `client_id`를 `_ga` 쿠키로 이어받는 변경이 배포된 뒤의
데이터부터 이어집니다. 그 전 기간에는 이 구간이 실제보다 낮게 나옵니다.

기능별 사용량은 기간을 정해 묻습니다. `--from`·`--to`를 생략하면 지난주이고, 직전 같은 길이
기간과 비교합니다. `--format`은 `table`(기본)·`csv`·`json`입니다.

```bash
GA4_PROPERTY_ID=471860782 \
GA4_SERVICE_ACCOUNT_JSON="$(cat ~/ga4-service-account.json)" \
node .github/scripts/ga/measure-feature-usage.mjs --from 2026-09-11 --to 2026-09-17
```

공지 조회는 같은 `GA4_PROPERTY_ID`·`GA4_SERVICE_ACCOUNT_JSON`을 읽습니다. 날짜는
GA4 속성의 Asia/Seoul 기준입니다. 과거 모드의 `--from`·`--to`는 **첫 노출 코호트가
아니라** 탐색할 이벤트 시작 구간입니다.
로컬 인증이 없으면 `report-ga-daily.yml`의 수동 실행에서 `notice_task=historical`로
9/30~10/1 과거 퍼널을 다시 조회하거나 `notice_task=register-dimension`으로 차원
등록 여부를 확인할 수 있습니다. 수동 작업은 일일 Slack 리포트를 보내지 않습니다.

```bash
node .github/scripts/ga/measure-notice-return.mjs \
  --mode historical --from 2026-09-30 --to 2026-10-01

# 새 공지가 끝나고 7일 관찰 + 48시간 처리까지 완료된 뒤
node .github/scripts/ga/measure-notice-return.mjs \
  --mode prospective --from <공지-시작일> --to <공지-종료일> \
  --notice-id <공지-ID> --dimension-registered-on <notice_id-차원-등록일>
```

두 번째 명령은 차원 등록일·관찰 기간을 검사합니다. 계측 배포일과 공지 기간 비중복은
운영 기록과 함께 확인해야 합니다. 현재 작업에서는 새 공지를 발행하지 않습니다.

### 후속 공지 운영 실험안 (미발행)

- 소식 한 건: **블로그 정주행에서 지원 블로그의 글을 이어 읽고 메모로 남길 수 있음**을 기존 공지 카드로 알립니다. 게시 전 실제 기능 제공과 문구를 확인합니다.
- 후보 노출 기간: **2026-11-03~11-05 KST**. 현재 하이라이트 공지가 11-01까지 살아 있으므로, 종료를 확인하고 새 공지가 끝난 뒤 이전 공지가 다시 나타나지 않는지 확인합니다. 계측 배포·`notice_id` 차원 등록 후 48시간이 지나지 않았다면 시작일과 종료일을 함께 뒤로 옮깁니다. 다른 공지와 기간을 겹치지 않게 합니다.
- 판정 시점: 후보 기간이 그대로면 **2026-11-15 00:00 KST 이후**(E+7일 종료+48시간). 공지 ID, 실제 S/E, 차원 등록일, 배포일과 동시 기능 출시 여부를 기록하고 위 명령으로 조회합니다.
- 노출 사용자가 30명 미만이면 작은 표본으로 기록하고 정기 운영 판단을 보류합니다. 임곗값·표본 추출·식별 누락이 있으면 `효과 미확인`입니다. 노출이 적을 것으로 보이면 E 전에 종료일을 최대 7일 연장하고, 관찰 종료 시점도 다시 계산합니다. 그래도 부족하면 다음 비중복 공지에서 같은 절차를 반복합니다. 숫자가 확보돼도 이 한 번의 관찰비만으로 공지의 인과 효과나 정기 운영 성공을 선언하지 않습니다.

## 주간 수치 누적 (Google Sheets)

Slack 주간 리포트는 그 주와 전주만 보여 줍니다. 몇 달에 걸친 추이를 보려고 `report-weekly-ga.mjs`가
같은 조회 결과를 Google Sheets에도 씁니다. **GA에서 다시 뽑으면 되지 않느냐**고 볼 수 있지만,
집계 기준(필터)이 바뀌면 과거 주의 숫자도 같이 바뀝니다. 시트는 그 주에 실제로 본 숫자를 남깁니다.

| 탭 | 한 행 | 키 | 열 |
| --- | --- | --- | --- |
| `요약` | 한 주 | `주 시작일` | `주 종료일` · `활성 사용자` · `퍼널: <단계 이벤트>` · `기록 시각` · `기록 경위` |
| `이벤트` | 한 주의 이벤트 하나 | `주 시작일` + `이벤트` | `주 종료일` · `사용자 수` · `기록 시각` · `기록 경위` |

- 같은 주를 다시 쓰면 그 행을 **덮어씁니다.** 행이 늘지 않습니다.
- `기록 경위`는 `정기`(월요일 크론) · `재실행`(입력 없이 수동 실행) · `백필`입니다. `정기`만 "그 주에
  본 숫자"이고, 나머지 둘은 다시 쓴 시점의 기준으로 계산한 값입니다.
- 퍼널 단계가 바뀌면 새 단계 열이 끝에 붙고 옛 열은 그대로 남습니다. 과거 행을 다시 쓰지 않습니다.
- 이벤트 탭은 추적 이벤트 전부를 씁니다. 그 주에 아무도 안 쓴 이벤트도 `0`으로 남습니다.

### 백필

워크플로를 손으로 실행하면서 `from`·`to`(둘 다 월요일, `YYYY-MM-DD`)를 넣으면 그 사이 주들을
채웁니다. Slack에는 게시하지 않습니다. 둘 다 비우면 평소처럼 지난주 리포트를 게시하고 씁니다.

**지표마다 채울 수 있는 시작점이 다릅니다.**

| 지표 | 시작 주 | 이유 |
| --- | --- | --- |
| 활성 사용자 | 2025-10-13 | 확장 트래픽이 2025-10-11(토)에 처음 찍혀, 그 전 주는 확장 사용자를 셀 수 없습니다 |
| 이벤트·퍼널 | 2026-09-07 | 커스텀 이벤트의 `build_env=production` 값이 이 주부터만 있습니다 |

이벤트·퍼널은 `build_env=production` 조건으로 거르는데, 그 전 주의 이벤트는 전부 `(not set)`입니다.
그대로 소급하면 과거가 0명으로 채워져 9월에 갑자기 급성장한 것처럼 보입니다. 그래서 2026-09-07
이전 주는 요약 탭의 퍼널 칸을 비우고 이벤트 탭에는 행을 만들지 않습니다. 빈칸은 차트에서 끊긴
선으로 보여 "측정 전"과 "0명"이 구분됩니다.

활성 사용자는 운영 웹 도메인이 바뀐 것도 감안합니다. 운영 웹은 2026-09-02에 `www.webmemo.site`에서
`www.webmemo.xyz`로 옮겼는데, 지금 호스트 허용 목록에는 새 도메인만 있습니다. 그대로 세면 그 전 주는
웹 사용자가 통째로 빠집니다. 그래서 2026-09-07 이전 주는 허용 목록에 `www.webmemo.site`를 더해
셉니다. 2025-10-13 이전은 확장 사용자가 어느 호스트로 잡혔는지 확인되지 않아(`localhost`에 개발
환경과 섞여 있습니다) 채우지 않고, `from`에 그보다 이른 날짜를 넣으면 실행이 시작 전에 멈춥니다.

### 처음 설정

코드 밖에서 사람이 한 번 해야 합니다.

1. 서비스 계정(`GA4_SERVICE_ACCOUNT_JSON`)이 속한 GCP 프로젝트에서 Google Sheets API를 켭니다.
2. 본인 Google 계정으로 스프레드시트를 만들고, 서비스 계정 이메일에 **편집자**로 공유합니다.
   탭은 없으면 스크립트가 만듭니다.
3. 스프레드시트 ID(URL의 `/d/`와 `/edit` 사이)를 GitHub Secret `GA_SHEET_ID`로 등록합니다.
4. `Weekly GA Report` 워크플로를 `from=2025-10-13`, `to=<지난주 월요일>`로 실행해 백필합니다.

`GA_SHEET_ID`는 GA 전용 스프레드시트입니다. SEO 하네스는 `SEO_SHEET_ID`로 다른 시트에 쌓습니다 —
한 ID를 두 작업이 나눠 쓰면 한쪽이 Secret을 바꿨을 때 다른 쪽이 경고 없이 남의 시트에 씁니다.

`GA_SHEET_ID`가 없으면 시트 쓰기만 경고를 남기고 건너뜁니다. 시트 쓰기가 실패하면 Slack 게시는
그대로 하고, 잡은 실패로 끝나 실패 알림이 갑니다.

주간 Slack 리포트 맨 아래 줄에 이 시트로 가는 `누적 시트` 링크가 붙습니다. 몇 주에 걸친 추이는
메시지가 아니라 시트에서 봅니다. `GA_SHEET_ID`가 없는 실행에는 링크를 싣지 않습니다.

## Data API 쿼터

표준 속성 기준 속성당 하루 200,000 토큰, 시간당 40,000 토큰입니다. 무료입니다.

`date` 차원 하나에 `activeUsers` 지표 하나짜리 단순 조회는 **한 건에 2토큰**을 씁니다(실측).
6시간 캐시까지 감안하면 대시보드를 하루 100번 열어도 일일 쿼터의 0.1%에 닿지 않습니다.
요청에 `returnPropertyQuota: true`를 넣으면 실제 소모량을 응답으로 되받아 볼 수 있습니다.
