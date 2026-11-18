# 웹 배포 기록

## web · 2026-11-18 15:10 KST · ed4edda
<!-- ref: ed4edda746275c28f8e873d9f8c5d0caa459758e -->

- #872 revert: 파비콘 data-grid-skip을 되돌림
- #871 perf: 분석용 사용자 추적이 받아 둔 사용자를 다시 조회하지 않음
- #870 perf: 도메인 목록의 남은 배치를 동시에 읽음
- #869 perf: 메모 목록 다음 페이지에서는 전체 개수를 세지 않음
- #868 chore: 웹 함수에 Vercel Fluid compute를 켠다
- #866 fix: 메모 목록 첫 렌더의 Suspense 원인(react-i18next 직접 사용) 제거
- #863 perf: 메모 목록을 준비가 끝난 뒤 한 번에 그려 Suspense 공개 지연 제거
- #862 perf: 메모 그리드가 파비콘 로드를 기다리지 않고 카드를 배치
- #861 perf: 메모 목록 첫 페이지를 서버에서 미리 조회
- #860 perf: /memos 진입 시 서버 Supabase Auth 왕복 제거
- #859 [DB-1322] feat: 하이라이트 삭제 발견성 개선과 피드백 출처 전송
- #858 feat: 사이드 패널 로그인·로딩 실패를 Sentry에 보고

## web · 2026-11-16 20:06 KST · 5883dc4
<!-- ref: 5883dc49564e019f7a2361a0815ed18a0b165410 -->

- #851 [DB-1319] feat: 사이드 패널에서 새 탭 없이 로그인 창으로 로그인
- #850 [DB-1319] feat: 사이드 패널에서 카카오·Google로 바로 로그인
- #846 [DB-1263] feat: Sentry 알림에 AI 분석 중 안내 추가
- #841 feat: GA 이벤트 추가 (email_unsubscribe, memo_candidate_select)

## web · 2026-11-07 14:08 KST · 5967a94
<!-- ref: 5967a9458efba1e6381e05b3c57b2f0b6e00a244 -->

기록 시작
