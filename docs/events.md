# 이벤트 명세

> `/web-memo` 파이프라인의 `web-memo:event-analyst`가 이벤트 명세를 만들기 전에 읽는 문서입니다.
> **값의 원천은 코드입니다.** 이 문서와 코드(`packages/shared/src/modules/analytics/type.ts`)가 어긋나면 코드가 맞고, 이 문서를 고쳐야 합니다.
> `추정:` 표시가 없는 행은 사람이 정한 것이고, 나머지 행의 `발생 시점`·`답하려는 질문`은 이벤트 이름과 속성에서 추정한 초안입니다. 알고 있는 사람이 고쳐 주세요.

## 도구

| 항목 | 내용 |
| --- | --- |
| 도구 | GA4 |
| 호출 방식 | `packages/shared/src/modules/analytics`의 `analytics.trackEvent(이름, 파라미터)`. 이벤트는 `type.ts`의 `TAnalyticsEvent` 판별 유니온에 멤버로 추가하고, 같은 파일의 `EVENT_CATEGORY`에 분류(`engagement` / `core_action`)를 넣어야 컴파일이 통과합니다 |
| 이름 규칙 | `snake_case`. `목적어_동사` 형태가 기본이지만 `login`·`logout`처럼 짧은 이름도 섞여 있습니다. 같은 행동의 변형은 새 이벤트 대신 속성(`source`·`method`·`position`·`from`·`kind`)으로 가릅니다 |
| 공통 파라미터 | 전송 계층이 `event_category`·`engagement_time_msec`·`build_env`(staging 필터 기준)·`user_id`·`session_id`를 얹고, 확장에서는 `extension_version`도 얹습니다 |
| 앱 | 앱(`apps/app`)은 analytics 전송 계층이 없어 이벤트를 심지 않습니다(미지원) |
| 금지 속성 | 이메일·이름·연락처·사용자가 입력한 문장 원문(메모 본문, 피드백 서술, 검색어 원문). 길이·개수·열거값만 넣습니다 |

## 이벤트

| 이름 | 발생 시점 | 속성 | 답하려는 질문 | 추가된 작업 |
| --- | --- | --- | --- | --- |
| feedback_submit | 피드백 저장 뮤테이션의 `onSuccess`(서버가 실패로 답해도 발생하므로 "제출 시도"에 가깝다) | `feedback_type`: `general` \| `uninstall` | `/uninstall` 방문 대비 제출 비율은? 일반 피드백 추이와 삭제 사유 응답이 섞이지 않는가 | DB-1107 |
| side_panel_open | 사이드 패널이 열림 (추정) | — | 확장이 실제로 쓰이는 빈도는? (추정) | — |
| side_panel_open_click | 사이드 패널을 여는 버튼 클릭 (추정) | — | 버튼으로 여는 사람이 얼마나 되는가 (추정) | — |
| page_view | 페이지 조회 | `page_title`, `page_location` | 어느 페이지가 얼마나 보이는가 (추정) | — |
| memo_write | 저장된 메모의 제목·본문·인상·할 일 수정. 확장 upsert는 이전 값과 다른 필드에만 발생 | `fields`: 변경된 필드 이름 | 어떤 내용을 수정하는가 (추정) | DB-1158 |
| memo_first_write | 새 메모 insert 성공 시마다 발생 (사용자 생애 첫 작성만 뜻하지 않음) | — | 새 메모를 만든 사용자가 얼마나 되는가 | — |
| memo_delete | 메모 삭제 (추정) | `memo_count` | 지우는 메모가 얼마나 되는가 (추정) | — |
| memo_restore | 휴지통에서 복원 (추정) | `memo_count` | 삭제 후 되살리는 비율 (추정) | — |
| memo_delete_permanently | 영구 삭제 (추정) | `memo_count` | 휴지통을 비우는 빈도 (추정) | — |
| memo_open | 메모 열기 (추정) | `has_search_query` | 검색에서 열리는 비율 (추정) | — |
| memo_source_open | 메모의 원문 페이지 열기 (추정) | — | 저장한 페이지로 되돌아가는가 (추정) | — |
| memo_search | 메모 검색 (추정) | `query_length` | 검색이 쓰이는가(원문은 넣지 않음) (추정) | — |
| memo_filter | 메모 필터 (추정) | `search_target` | 어떤 대상으로 거르는가 (추정) | — |
| search_no_result | 검색 결과 없음 (추정) | — | 검색이 실패하는 비율 (추정) | — |
| memo_status_toggle | 메모 상태(wish/star/reading) 변경. 확장 upsert는 이전 값과 다를 때만 발생 | `status`, `enabled` | 어떤 상태가 쓰이는가 (추정) | DB-1158 |
| memo_category_change | 메모 카테고리 변경. 확장 upsert는 이전 값과 다를 때만 발생 | `source`: `button` \| `hash` \| `ai` (선택, 확장 upsert에서는 없음) | 사람들이 `#` 입력을 아는가 | DB-1158 |
| memo_undo | 실행 취소 (추정) | `action` | 어떤 조작이 되돌려지는가 (추정) | — |
| memo_offline_queued | 오프라인 대기열에 넣음 | `trigger` | 오프라인 저장이 얼마나 일어나는가 | — |
| memo_offline_sync_result | 대기열 동기화 결과 | `trigger`, `synced_count`, `conflict_count`, `has_other_error` | 동기화가 충돌 없이 끝나는가 | — |
| category_create / category_update / category_delete | 카테고리 생성·수정·삭제 (추정) | — | 카테고리 기능이 쓰이는가 (추정) | — |
| category_suggestion_show / _apply / _dismiss | 카테고리 추천 노출·적용·닫음 | `is_new_category`, `source`: `jev` \| `llm` | 추천이 받아들여지는가 | — |
| past_memo_show / _open / _dismiss / _expand | 과거 메모 종류별 노출·원문 열기·닫음·관련 목록 펼침. 노출과 첫 열기는 URL·종류당 한 번 집계하며, 중복·관련이 함께 있으면 종류별로 각각 노출·닫음을 기록 | `kind`: `duplicate` \| `related`, `source`: `rule` \| `jev` (`_expand`는 related/jev) | 과거 메모 안내를 보고 원문을 여는가 | — |
| highlight_create | 하이라이트 생성 | `color`, `has_note` | 어떤 색·메모 여부로 쓰이는가 | — |
| highlight_note_update | 하이라이트 메모 수정 (추정) | — | 하이라이트에 메모를 다는가 (추정) | — |
| highlight_bubble_disable | 하이라이트 말풍선 끄기 | `scope`: `site` \| `all` | 말풍선이 거슬리는가 (추정) | — |
| summary_run | 요약 실행. 요약 보기에서 첫 요청은 `disclosure`, 명시 재시도는 기존 `empty_state`. 재열기로 요청을 재사용하면 기록하지 않음 | `source`: `disclosure` \| `empty_state` \| `tab_trigger`(기존 버전) | 어느 자리에서 요약이 시작되는가 | — |
| summary_panel_toggle | 요약 행을 직접 열거나 접음. 초기 렌더·페이지 변경에 따른 자동 접힘은 제외 | `action`: `open` \| `close` | 요약 진입과 메모 화면 복귀를 얼마나 하는가 | — |
| summary_complete | 요약 완료 | `duration_msec` | 요약이 얼마나 걸리는가 (추정) | — |
| summary_fail | 요약 실패 | `reason` | 왜 실패하는가 (추정) | — |
| chat_message_send | 채팅 메시지 전송 (추정) | — | 채팅이 쓰이는가 (추정) | — |
| chat_fail | 채팅 실패 (추정) | `reason` | 왜 실패하는가 (추정) | — |
| youtube_transcript_extract | 유튜브 자막 추출 (추정) | `is_success` | 자막 추출 성공률 (추정) | — |
| tab_change | 실제 탭 클릭. 요약 행 조작은 `summary_panel_toggle`로 기록하고 자동 전환은 제외 | `tab_name` | 어느 AI 탭에 진입하는가 | — |
| view_change | 보기 방식 변경 (추정) | `view` | 어떤 보기가 선호되는가 (추정) | — |
| setting_change / extension_setting_change | 설정 변경 (추정). 서버 설정 저장 성공 시 `setting_change` — AI 채팅 스위치는 `show_ai_chat`. 요약 스위치는 안내로 교체되어 `show_summary` 저장은 발생하지 않음 | `setting_keys` / `keys` | 어떤 설정을 바꾸는가 (추정) · AI 채팅을 켜는 사용자가 얼마나 되는가 | — |
| shortcut_change_click | 단축키 변경 버튼 클릭 (추정) | `is_success` | 단축키 변경이 성공하는가 (추정) | — |
| export_run | 내보내기 실행 | `format` | 어떤 형식으로 내보내는가 | — |
| login_start / login / sign_up / logout | `login_start`: 웹 로그인 제공자 버튼 클릭. `login`: OAuth 성공 후 메모 레이아웃에 도착한 클라이언트. `sign_up`: 같은 도착 시 신규 계정으로 판정된 경우. `logout`: 로그아웃 | `method` (logout 없음) | 제공자별 시작·도착 규모는? 두 이벤트에는 시도 식별자가 없으므로 사용자 수 비율을 실제 로그인 완료율로 단정하지 않는다 | DB-1160 |
| side_panel_login_click / header_login_click / header_memos_click | 로그인·메모 진입 클릭 | `from`(header 계열, 언어 접두사를 뺀 경로) | 어느 자리에서 로그인·진입이 눌리는가 | — |
| extension_install_click / extension_install_dismiss / extension_installed | 설치 버튼 클릭·닫음·설치 완료 | `from`, `position` | 어느 페이지·어느 버튼이 설치로 이어지는가 | — |
| extension_uninstall | 확장 제거 URL의 `GET /api/uninstall` 요청에서 서버가 GA4로 전송 시도. development·HEAD 제외 | `extension_version`(없거나 잘못되면 `unknown`), `build_env` | 새 제거 URL을 등록한 설치본에서 제거 흐름이 얼마나 발생하며 어느 버전·환경에서 발생하는가 | DB-1182 |
| open_web_from_extension | 확장에서 웹 열기 | `from` | 웹으로 넘어가는 자리는 어디인가 | — |
| guide_open / guide_step / guide_finish | 가이드 열기·단계·완료 | `from`, `step_name` | 가이드 어느 단계에서 그만두는가 (추정) | — |
| install_guide_view | 로그인 전 설치 가이드 화면 조회 | — | 신규 설치자가 로그인 전에 가이드에 도달하는가 | DB-1159 |
| install_guide_login_click | 설치 가이드에서 로그인 버튼 클릭 | — | 가이드 조회가 로그인 시도로 이어지는가 | DB-1159 |
| notice_view / notice_dismiss | 공지 노출·닫음 | `notice_id` | 공지가 읽히는가 (추정) | — |
| notice_return | 공지를 처음 본 다음 날부터 7일 안에 사이드 패널을 다시 연 최초 시도 | `notice_id`, `days_since_view`(1~7) | 공지 노출자가 이후 다시 패널을 여는가 (인과 효과는 알 수 없음) | DB-1163 |
| blog_subscription_change | 블로그 구독 변경 뮤테이션의 `onSuccess`(실패 제외) | `blog_id`, `active`: boolean | 어떤 블로그가 구독·해제되는가 | DB-1134 |
| blog_article_open | 정주행 목록 행의 '원문' 링크 클릭 | `blog_id`, `sort`: `oldest` \| `newest` | 체크리스트에서 원문으로 실제 넘어가는가, 정렬에 따라 다른가 | DB-1134 |
| blog_article_memo_click | 정주행 행에서 메모 열기 성공 뒤(기존 메모는 다이얼로그 열기 직전, 새 메모는 생성 뮤테이션 `onSuccess`) | `blog_id`, `action`: `create` \| `view` | 정주행이 메모 작성으로 이어지는가 | DB-1134 |
| blog_sync_resume_request | 수집 재개 요청 뮤테이션의 `onSuccess`(오류 제외) | `blog_id`, `result`: `queued` \| `running` \| `throttled` | 수집 재개가 얼마나 쓰이고 제한에 얼마나 걸리는가 | DB-1134 |
| blog_reading_page_move | 정주행 목록 쪽 이동 성공 뒤(다음 쪽은 `fetchNextPage` 성공 시) | `direction`: `prev` \| `next`, `page_number`(이동 후, 1부터), `sort` | 목록을 몇 쪽까지 읽어 나가는가 | DB-1134 |

### 확장 제거 이벤트의 수집 범위

- 확장은 서비스 워커가 시작할 때 저장된 `client_id`와 버전으로 제거 URL을 등록합니다. 서버는 같은 ID를 전송하며, ID가 없거나 유효하지 않으면 새 ID를 만들어 개수만 셉니다. 이전 URL을 등록한 구버전 설치본의 `/uninstall` 직접 방문에는 이 이벤트가 없습니다.
- 서버는 GA 전송을 최대 2초 기다린 뒤 성공·실패와 무관하게 쿼리 없는 기존 설문 페이지로 302 이동합니다. GA의 2xx 응답은 실제 보고서 저장을 보장하지 않습니다.
- 공개 GET URL의 재방문·직접 호출도 이벤트를 보냅니다. 고유 제거 건수나 실제 제거를 증명하는 값으로 단정하지 않습니다. 설문 페이지의 자동 `page_view`와 별도로 집계합니다.
- 기존 분석 정책을 따라 `event_category: engagement`, `engagement_time_msec: 100`, 서버 시각의 새 `session_id`를 넣고 staging에서만 `debug_mode`를 켭니다. 기존 확장 세션을 복원한 값이나 실제 참여 시간을 측정한 값은 아닙니다.
- 기존 확장의 UUID `client_id`를 유지합니다. GA 검증 API의 기본 `RELAXED` 모드에서는 오류가 없었지만, `ENFORCE_RECOMMENDATIONS` 모드는 숫자.숫자 형식을 요구합니다. 엄격 모드로 전환할 때는 기존 확장 분석과 함께 식별자 정책을 검토해야 합니다.

## 갱신 규칙

- 이벤트를 추가·수정·제거하면 이 표를 같은 PR에서 고칩니다. 제거된 이벤트는 행을 지우고, 무엇을 지웠는지는 커밋이 기억합니다.
- `답하려는 질문` 칸을 비우지 않습니다. 그 칸이 비는 이벤트는 만들 이유가 없었던 이벤트입니다.
- 서술 원문 같은 개인정보를 속성에 넣지 않습니다.
