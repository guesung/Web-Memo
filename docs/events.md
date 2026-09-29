# 이벤트 명세

> `/gs` 파이프라인의 `gs:event-analyst`가 이벤트 명세를 만들기 전에 읽는 문서입니다.
> **값의 원천은 코드입니다.** 이 문서와 코드(`packages/shared/src/modules/analytics/type.ts`)가 어긋나면 코드가 맞고, 이 문서를 고쳐야 합니다.
> `추정:` 표시가 없는 행은 사람이 정한 것이고, 나머지 행의 `발생 시점`·`답하려는 질문`은 이벤트 이름과 속성에서 추정한 초안입니다. 알고 있는 사람이 고쳐 주세요.

## 도구

| 항목 | 내용 |
| --- | --- |
| 도구 | GA4 |
| 호출 방식 | `packages/shared/src/modules/analytics`의 `analytics.trackEvent(이름, 파라미터)`. 이벤트는 `type.ts`의 `TAnalyticsEvent` 판별 유니온에 멤버로 추가하고, 같은 파일의 `EVENT_CATEGORY`에 분류(`engagement` / `core_action`)를 넣어야 컴파일이 통과합니다 |
| 이름 규칙 | `snake_case`. `목적어_동사` 형태가 기본이지만 `login`·`logout`처럼 짧은 이름도 섞여 있습니다. 같은 행동의 변형은 새 이벤트 대신 속성(`source`·`method`·`position`·`from`·`kind`)으로 가릅니다 |
| 공통 파라미터 | 전송 계층이 `event_category`·`engagement_time_msec`·`build_env`(staging 필터 기준)·`user_id`·`session_id`를 얹고, 확장에서는 `extension_version`도 얹습니다 |
| 금지 속성 | 이메일·이름·연락처·사용자가 입력한 문장 원문(메모 본문, 피드백 서술, 검색어 원문). 길이·개수·열거값만 넣습니다 |

## 이벤트

| 이름 | 발생 시점 | 속성 | 답하려는 질문 | 추가된 작업 |
| --- | --- | --- | --- | --- |
| feedback_submit | 피드백 저장 뮤테이션의 `onSuccess`(서버가 실패로 답해도 발생하므로 "제출 시도"에 가깝다) | `feedback_type`: `general` \| `uninstall` | `/uninstall` 방문 대비 제출 비율은? 일반 피드백 추이와 삭제 사유 응답이 섞이지 않는가 | DB-1107 |
| side_panel_open | 사이드 패널이 열림 (추정) | — | 확장이 실제로 쓰이는 빈도는? (추정) | — |
| side_panel_open_click | 사이드 패널을 여는 버튼 클릭 (추정) | — | 버튼으로 여는 사람이 얼마나 되는가 (추정) | — |
| page_view | 페이지 조회 | `page_title`, `page_location` | 어느 페이지가 얼마나 보이는가 (추정) | — |
| memo_write | 메모 작성 (추정) | `fields` | 어떤 필드를 채워 메모를 만드는가 (추정) | — |
| memo_first_write | 첫 메모 작성 (추정) | — | 설치 후 첫 메모까지 가는 사람이 얼마나 되는가 (추정) | — |
| memo_delete | 메모 삭제 (추정) | `memo_count` | 지우는 메모가 얼마나 되는가 (추정) | — |
| memo_restore | 휴지통에서 복원 (추정) | `memo_count` | 삭제 후 되살리는 비율 (추정) | — |
| memo_delete_permanently | 영구 삭제 (추정) | `memo_count` | 휴지통을 비우는 빈도 (추정) | — |
| memo_open | 메모 열기 (추정) | `has_search_query` | 검색에서 열리는 비율 (추정) | — |
| memo_source_open | 메모의 원문 페이지 열기 (추정) | — | 저장한 페이지로 되돌아가는가 (추정) | — |
| memo_search | 메모 검색 (추정) | `query_length` | 검색이 쓰이는가(원문은 넣지 않음) (추정) | — |
| memo_filter | 메모 필터 (추정) | `search_target` | 어떤 대상으로 거르는가 (추정) | — |
| search_no_result | 검색 결과 없음 (추정) | — | 검색이 실패하는 비율 (추정) | — |
| memo_status_toggle | 메모 상태(wish/star/reading) 토글 (추정) | `status`, `enabled` | 어떤 상태가 쓰이는가 (추정) | — |
| memo_category_change | 메모 카테고리 변경 (추정) | `source`: `button` \| `hash` \| `ai` | 사람들이 `#` 입력을 아는가 | — |
| memo_undo | 실행 취소 (추정) | `action` | 어떤 조작이 되돌려지는가 (추정) | — |
| memo_offline_queued | 오프라인 대기열에 넣음 | `trigger` | 오프라인 저장이 얼마나 일어나는가 | — |
| memo_offline_sync_result | 대기열 동기화 결과 | `trigger`, `synced_count`, `conflict_count`, `has_other_error` | 동기화가 충돌 없이 끝나는가 | — |
| category_create / category_update / category_delete | 카테고리 생성·수정·삭제 (추정) | — | 카테고리 기능이 쓰이는가 (추정) | — |
| category_suggestion_show / _apply / _dismiss | 카테고리 추천 노출·적용·닫음 | `is_new_category`, `source`: `jev` \| `llm` | 추천이 받아들여지는가 | — |
| past_memo_show / _open / _dismiss | 과거 메모 판정 노출·열기·닫음 | `kind`: `duplicate` \| `related`, `source`: `rule` \| `jev` | 과거 메모 알림이 도움이 되는가 | — |
| highlight_create | 하이라이트 생성 | `color`, `has_note` | 어떤 색·메모 여부로 쓰이는가 | — |
| highlight_note_update | 하이라이트 메모 수정 (추정) | — | 하이라이트에 메모를 다는가 (추정) | — |
| highlight_bubble_disable | 하이라이트 말풍선 끄기 | `scope`: `site` \| `all` | 말풍선이 거슬리는가 (추정) | — |
| summary_run | 요약 실행 | `source`: `empty_state` \| `tab_trigger` | 어느 자리에서 요약이 시작되는가 | — |
| summary_complete | 요약 완료 | `duration_msec` | 요약이 얼마나 걸리는가 (추정) | — |
| summary_fail | 요약 실패 | `reason` | 왜 실패하는가 (추정) | — |
| chat_message_send | 채팅 메시지 전송 (추정) | — | 채팅이 쓰이는가 (추정) | — |
| chat_fail | 채팅 실패 (추정) | `reason` | 왜 실패하는가 (추정) | — |
| youtube_transcript_extract | 유튜브 자막 추출 (추정) | `is_success` | 자막 추출 성공률 (추정) | — |
| tab_change | 탭 이동 (추정) | `tab_name` | 어느 탭이 쓰이는가 (추정) | — |
| view_change | 보기 방식 변경 (추정) | `view` | 어떤 보기가 선호되는가 (추정) | — |
| setting_change / extension_setting_change | 설정 변경 (추정) | `setting_keys` / `keys` | 어떤 설정을 바꾸는가 (추정) | — |
| shortcut_change_click | 단축키 변경 버튼 클릭 (추정) | `is_success` | 단축키 변경이 성공하는가 (추정) | — |
| export_run | 내보내기 실행 | `format` | 어떤 형식으로 내보내는가 | — |
| login_start / login / sign_up / logout | 로그인 시작·완료·가입·로그아웃 (추정) | `method` (logout 없음) | 로그인 퍼널의 어디서 떨어지는가 (추정) | — |
| side_panel_login_click / header_login_click / header_memos_click | 로그인·메모 진입 클릭 | `from`(header 계열, 언어 접두사를 뺀 경로) | 어느 자리에서 로그인·진입이 눌리는가 | — |
| extension_install_click / extension_install_dismiss / extension_installed | 설치 버튼 클릭·닫음·설치 완료 | `from`, `position` | 어느 페이지·어느 버튼이 설치로 이어지는가 | — |
| open_web_from_extension | 확장에서 웹 열기 | `from` | 웹으로 넘어가는 자리는 어디인가 | — |
| guide_open / guide_step / guide_finish | 가이드 열기·단계·완료 | `from`, `step_name` | 가이드 어느 단계에서 그만두는가 (추정) | — |
| notice_view / notice_dismiss | 공지 노출·닫음 | `notice_id` | 공지가 읽히는가 (추정) | — |

## 갱신 규칙

- 이벤트를 추가·수정·제거하면 이 표를 같은 PR에서 고칩니다. 제거된 이벤트는 행을 지우고, 무엇을 지웠는지는 커밋이 기억합니다.
- `답하려는 질문` 칸을 비우지 않습니다. 그 칸이 비는 이벤트는 만들 이유가 없었던 이벤트입니다.
- 서술 원문 같은 개인정보를 속성에 넣지 않습니다.
