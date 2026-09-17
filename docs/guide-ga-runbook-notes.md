# GA 조회 런북

이번 분석(`docs/guide-ga-analysis-notes.md`)에서 실제로 실행한 조회 절차. 재현하거나 다음 분석 때 갱신하는 용도.

## 사전 준비
- GA4 속성: `web-memo` (property_id `471860782`, account `Web Memo` / 339839568)
- 시간대: `Asia/Seoul`. GA 처리 지연(24~48시간)이 있으므로 조회일 당일·전일 데이터는 참고용으로만 쓴다.
- 대상 이벤트: `side_panel_open`, `memo_write`, `page_view`, `extension_installed`, `guide_step`, `guide_finish`(신규), `guide_open`(정의는 있으나 이번 조회 기간엔 0건)

## 실행 순서
1. **이벤트 전체 스캔** — 최근 28일 `eventName` × `eventCount`/`totalUsers`로 어떤 이벤트가 실제로 들어오는지 먼저 확인한다. 코드만 보고 "이 이벤트는 없다"고 단정하지 않는다(가이드 이벤트가 이미 생겼다는 걸 이 단계에서 발견했다).
2. **일자별 추이** — 관심 이벤트만 골라 `date` × `eventName`으로 60일치를 뽑아 언제부터 데이터가 생겼는지/급증했는지를 본다. `guide_step`/`guide_finish`가 2026-09-14부터 시작된 것, `extension_installed`가 09-11부터 급증한 것을 여기서 확인했다.
3. **신규/기존 분리** — `eventName` × `newVsReturning`으로 신규 사용자 비중을 분리한다. `newVsReturning`이 빈 문자열로 나오는 행이 있을 수 있다(귀속 실패), 전체에서 제외하지 않고 별도 행으로 남겨 합계 누락을 피한다.
4. **시퀀셜 퍼널** — 단순 이벤트 카운트 비교가 아니라 GA4 퍼널 리포트(`run_funnel_report`)로 "그 순서대로 실제 이어졌는지"를 본다. 이번에 쓴 스텝:
   - `extension_installed → side_panel_open → memo_write` (28일)
   - `side_panel_open → memo_write` (28일, 설치 이벤트가 이 창 밖에서 일어난 기존 사용자도 포함)
   - `guide_step → memo_write` (2026-09-14~09-18, 가이드 이벤트가 존재하는 기간만)
   - 주의: `funnel_steps`는 `{"name", "event"}` 형태의 단순 스텝으로 넘긴다. `funnel_event_filter`를 직접 쓰면 스키마 오류가 난다.
5. **판단 유보 기준 적용** — 표본(활성 사용자 수)이 두 자릿수 이하인 스텝 비교는 결론에 쓰지 않고 "참고용"으로만 남긴다(`guide_step→memo_write`가 여기에 해당, n=3).

## 검토 체크포인트
- 결론은 이번에 실제로 조회한 수치만 반영한다. 조회하지 않은 것(유입 채널, iOS 앱, 장기 트렌드)은 "미확인"으로 명시한다.
- `memo_write`를 첫 메모 작성으로 직접 치환하지 않는다 — 반복 작성/수정이 섞여 있다.
- 가이드 노출 이벤트가 있다고 해서 바로 노출/비노출 비교로 넘어가지 않는다 — 표본 크기부터 확인한다.
- 후속 실험·계측 변경은 이 분석 문서에 코드로 반영하지 않는다. 실제 계측 갭 수정은 별도 PR(#492)로 분리했다.
