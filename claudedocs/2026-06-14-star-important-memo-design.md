# 별표(★) 중요 메모 기능 설계

**Date**: 2026-06-14
**Type**: feature
**Status**: in-progress (설계 확정)

## Summary

각 메모에 **별표(★)를 눌러 "중요 메모"로 표시**하는 기능을 크롬 익스텐션·모바일 앱·웹사이트 세 표면 모두에 추가한다.

이미 존재하는 **위시리스트(♥ / `isWish`)** 기능과 **완전히 별개의 독립 축**이다. 메모 하나가 *위시리스트이면서 동시에 중요*일 수 있다. 구현은 위시리스트 패턴(`isWish`)을 그대로 미러링하되, "전체" 목록 노출 방식만 다르다(아래 2절).

핵심 결정 사항(사용자 확정):
- 별표는 위시리스트와 **독립된 새 boolean 컬럼 `isStar`**.
- 별표는 **오버레이 플래그** — 별표해도 "전체" 목록에 그대로 남고 ★ 배지만 붙는다. "중요" 전용 필터 뷰로 따로 모아 본다. (위시리스트는 "전체"에서 빠지는 배타적 버킷인 것과 다름)
- 세 표면 모두 **위시리스트와 동일한 전용 필터 뷰** 제공.
- 모바일 앱은 위시리스트와 동일하게 **오프라인(AsyncStorage)까지** 지원.
- 메인 목록 **정렬은 변경 없음** — 별표 메모는 필터로만 모아 봄.
- 모바일 **브라우저 헤더에는 별표 토글을 넣지 않음** (헤더의 Star 아이콘은 이미 "즐겨찾기 링크" 북마크가 선점). 별표는 메모 카드·상세·필터에서만 관리.

## Background — 기존 위시리스트(`isWish`) 구조

| 영역 | 위치 |
| --- | --- |
| DB 컬럼 | `memo.memo.isWish boolean \| null` |
| 타입(수기 관리) | `packages/shared/src/types/supabase.ts` (memo Row/Insert/Update) |
| 데이터 레이어 | `packages/shared/src/utils/Supabase.ts` → `MemoService.getMemosPaginated({ isWish })`, `updateMemo`, `insertMemo` |
| 공유 읽기 훅 | `packages/shared/src/hooks/supabase/queries/useMemosInfiniteQuery.ts` |
| 공유 쓰기 훅 | `useMemoPatchMutation.ts`, `useMemoUpsertMutation.ts` (전용 토글 훅 없음, 재사용) |
| 쿼리 키 | `packages/shared/src/constants/QueryKey.ts` → `memosPaginated(category, isWish, searchQuery, sortBy)` |
| URL 파라미터 화이트리스트 | `packages/shared/src/modules/search-params/constant.ts` (`isWish`) |

**필터 의미(중요)**: `getMemosPaginated`는 `isWish !== undefined`일 때만 `.eq("isWish", isWish)`를 적용한다. 그런데 웹 `MemoView`는 항상 `isWish: isWish === "true"`로 넘기고(파라미터 없으면 `false`), 앱 `useMemoList`도 "all"일 때 `isWish: false` / 로컬은 `!m.isWish`로 거른다. 즉 **"전체" 뷰 = `isWish=false` (위시리스트 메모는 전체에서 제외)** 인 배타적 버킷 구조다.

표면별 위시리스트 UI:
- **웹**: `MemoCardFooter`(♥ 버튼 → `useMemoPatchMutation`), `MemoSidebar`("내 위시리스트" → `?isWish=true`), `MemoView`(searchParams 읽어 쿼리 전달).
- **익스텐션 사이드패널**: `MemoForm`(♥ → `useMemoForm.toggleWish` → `saveMemo` → `useMemoUpsertMutation`), 토스트 "이동" → 웹 `?isWish=true` 딥링크(`pages/side-panel/src/utils/Url.ts`).
- **모바일 앱**: 로그인 `useMemoWishToggleMutation`, 비로그인 `useLocalMemoWishToggle`(+ `lib/storage/localMemo.ts`의 `toggleWishByUrl`), 홈 "전체/위시리스트" 필터 pill(`useMemoList`, `app/(main)/index.tsx`), `MemoCard` ♥ 배지, `MemoDetailModal` "위시리스트에서 제거". 앱은 공유 Suspense 훅이 아닌 **자체 훅**(`apps/app/lib/hooks/*`)을 쓰며 공유 `MemoService`/`QUERY_KEY`/타입을 재사용한다.

## 핵심 결정: 별표 필터 의미 (오버레이 플래그)

위시리스트는 배타적 버킷이지만, 별표는 **오버레이 플래그**로 둔다.

| 뷰 | 쿼리 파라미터 | 결과 |
| --- | --- | --- |
| 전체 | `isWish: false` (그대로), `isStar: undefined` | 위시 아닌 메모 전부 (별표 메모는 ★ 배지와 함께 그대로 보임) |
| 위시리스트 | `isWish: true`, `isStar: undefined` | 변경 없음 |
| 중요(신규) | `isWish: undefined`, `isStar: true` | 위시 여부 무관, 별표한 모든 메모 |

`getMemosPaginated`는 `isWish`와 동일하게 **`isStar !== undefined`일 때만 `.eq("isStar", isStar)`** 를 적용한다. 따라서 전체/위시 뷰는 `isStar`를 넘기지 않고, 중요 뷰만 `isStar: true`(그리고 `isWish`는 넘기지 않음)를 넘긴다.

## Changes Made (구현 대상 파일)

### A. 데이터 모델 / 마이그레이션
1. **Supabase DB**: `ALTER TABLE memo.memo ADD COLUMN "isStar" boolean DEFAULT false;` 실행.
   - 레포에 테이블 DDL이 추적되지 않으므로, 기록용으로 `packages/supabase-edge-functions/supabase/migrations/<timestamp>_add_isStar_to_memo.sql` 추가.
2. **`packages/shared/src/types/supabase.ts`**: memo 테이블 `Row`/`Insert`/`Update`에 `isStar: boolean | null` 추가 (`isWish` 바로 옆, Insert/Update는 optional).
3. **`apps/app/lib/storage/localMemo.ts`**: `LocalMemo` 인터페이스에 `isStar?: boolean` 추가.

### B. 공유 데이터 레이어 (`@web-memo/shared`)
4. **`utils/Supabase.ts` → `MemoService.getMemosPaginated`**: `isStar?: boolean` 파라미터 추가, `if (isStar !== undefined) query = query.eq("isStar", isStar);` 추가.
5. **`constants/QueryKey.ts` → `memosPaginated`**: `isStar` 차원 추가. 시그니처를 `(category, isWish, searchQuery, sortBy, isStar)`로 **맨 끝에 positional 추가**(기존 호출부 순서 보존), 키 객체에도 `isStar` 포함하여 캐시 충돌 방지.
6. **`hooks/supabase/queries/useMemosInfiniteQuery.ts`**: `isStar?: boolean` prop 추가 → 쿼리 키 + `getMemosPaginated`에 전달. (전체/위시 뷰에서는 미전달 → `undefined`)
7. **`hooks/supabase/mutations/useMemoUpsertMutation.ts`**: 낙관적 업데이트 기본값에 `isStar: data.isStar ?? false` 추가, upsert 시 `isWish`/`isStar` 둘 다 보존.
8. **`modules/search-params/constant.ts`**: `SEARCH_PARAMS_KEYS`에 `isStar` 추가.

### C. 웹 (`apps/web`, Next.js)
9. **`.../memos/_components/MemoCardFooter/index.tsx`**: ♥ 옆에 ★ 버튼 추가 → `handleIsStarClick`(`event.stopPropagation`) → `useMemoPatchMutation({ id, request: { isStar: !memo.isStar } })` + 실행취소 토스트(♥와 동일 패턴). 별표 시 채움색 적용.
10. **`.../memos/_components/MemoSidebar/index.tsx`**: "중요 메모" 링크 추가 → `${PATHS.memos}?isStar=true` (Star 아이콘).
11. **`.../memos/_components/MemoView/index.tsx`**: `searchParams.get("isStar")` 읽어 `useMemosInfiniteQuery`에 전달. `isStar === "true"`일 때만 `isStar: true` 전달, 그 외에는 미전달(전체/위시 동작 보존).

### D. 크롬 익스텐션 (`pages/side-panel`)
12. **`.../MemoForm/index.tsx`**: ♥ 옆 ★ 버튼 → `handleStarClick` → `toggleStar`.
13. **`.../MemoForm/hooks/useMemoForm.ts`**: `toggleStar`(폼 `isStar`만 뒤집고 `isWish` 유지) → `saveMemo({ isStar })`. 폼 초기값에 `isStar` 시드(`initMemoData`).
14. **`pages/side-panel/src/utils/Url.ts`**: 웹 딥링크 빌드에 `isStar` 지원 → 토스트 "이동" 액션이 `?isStar=true` 웹 중요 뷰로 이동.

### E. 모바일 앱 (`apps/app`, Expo) — 오프라인 이중 경로
15. **`lib/hooks/useMemoMutation.ts`**: `useMemoStarToggleMutation` 신설 (`useMemoWishToggleMutation` 미러: `getMemoByUrl` → `updateMemo({ isStar: !current })` 또는 `insertMemo({ isStar: true })`).
16. **`lib/hooks/useLocalMemos.ts`**: `useLocalMemoStarToggle` 신설 (`useLocalMemoWishToggle` 미러).
17. **`lib/storage/localMemo.ts`**: `toggleStarByUrl` 추가 (`toggleWishByUrl` 미러).
18. **`lib/hooks/useMemos.ts`**: `useMemosInfinite` params에 `isStar?` 추가 → `QUERY_KEY.memosPaginated` + `getMemosPaginated`에 전달.
19. **`app/(main)/_hooks/useMemoList.ts`**: `MemoFilter = "all" | "wish" | "star"`로 확장. 로그인 시 `star` → `useMemosInfinite({ isStar: true })`(isWish 미전달), 로컬은 `m.isStar` 필터. `handleStarRemove`/토글 라우팅 추가.
20. **`app/(main)/index.tsx`**: "전체/위시리스트/중요" 필터 pill 추가(Star 아이콘). 중요 빈 상태 카피 추가.
21. **`app/(main)/_components/MemoCard.tsx`**: `memo.isStar`일 때 ★ 배지.
22. **`app/(main)/_components/MemoDetailModal.tsx`**: "중요 표시/해제" 버튼(Star/StarOff) → `onStarToggle`.
23. **(미변경)** 브라우저 헤더(`browser/_components/BrowserHeader.tsx`, `_hooks/useBrowserState.ts`): 별표 토글 추가하지 않음 — 헤더 Star는 즐겨찾기 링크 유지.

### F. i18n
24. **웹** `apps/web/src/modules/i18n/locales/{ko,en}/translation.json`: `sideBar.importantMemo`(예: "중요 메모" / "Important"), `toastTitle.memoStarAdded`/`memoStarDeleted`.
25. **익스텐션** `apps/chrome-extension/public/_locales/{ko,en}/messages.json`: `star_added`, `star_deleted`.
26. **앱**: 기존 위시리스트가 한글 하드코딩이므로 동일 패턴으로 인라인("중요", "중요 표시", "중요 해제", "중요 메모가 비어있습니다" 등).
27. i18n 수정 후 `/i18n-check`로 번역 완전성 검증.

## Technical Details

- **네이밍**: DB/코드 `isStar` (`isWish` 대칭). 사용자 라벨 KO "중요 메모"/"중요", EN "Important". lucide `Star`/`StarOff` 아이콘.
- **토글 패턴**: 위시리스트와 동일하게 웹=`useMemoPatchMutation`, 익스텐션=`useMemoUpsertMutation` 재사용(전용 공유 훅 신설 안 함). 앱만 자체 토글 훅 신설(기존 구조가 그러함).
- **캐시 무효화**: `useMemoPatchMutation`은 `["memo"]`/`QUERY_KEY.memos()`(`["memos"]`)를 무효화 → prefix 매칭으로 `["memos","paginated",...]`까지 갱신됨(위시리스트와 동일 메커니즘).
- **응답 타입**: `getMemosPaginated`가 `*`를 select하므로 `supabase.ts` Row에 `isStar` 추가 시 `GetMemoResponse`에 자동 포함.
- **컨벤션**: 신규 코드는 팀 프론트엔드 컨벤션 준수(화살표 함수, 핸들러 `handle*`/props `on*`, JSDoc, `useCallback`/`useMemo` 미사용, `if` 블록). `QUERY_KEY.memosPaginated`의 positional 파라미터 확장은 기존 스타일 유지를 위한 의도적 선택(향후 옵션 객체 리팩토링은 별건).

## 엣지 케이스
- 위시+중요 동시 메모: "위시리스트"·"중요" 두 뷰 모두 노출, "전체"에는 위시이므로 미노출. 정상.
- 비로그인 → 로그인 동기화: 로컬 `isStar` 보존(기존 위시 동기화 로직 편승, upsert 시 `isStar` 보존).
- 익스텐션 토글 시 현재 `isWish` 값 보존(`saveMemo`가 폼의 `isWish`·`isStar` 모두 전달).

## Test Plan
- `pnpm type-check`, `pnpm lint` 통과.
- 웹: 카드 ★ 토글 + 실행취소, 사이드바 "중요 메모" 필터 뷰, 별표 메모가 "전체"에도 보이는지 확인.
- 익스텐션: 사이드패널 ★ 토글, 토스트 딥링크가 웹 중요 뷰로 이동.
- 앱: 로그인/비로그인 각각 ★ 토글, "중요" 필터 pill, 카드 배지, 상세 모달 토글, 오프라인 동작.
- `/i18n-check` 통과.

## Related Issues/PRs
- (작성 예정)

## Notes
- DB 컬럼 추가는 코드 머지 전 Supabase에 선반영 필요(기존 메모는 DEFAULT false).
- AGENTS.md 기준 위시리스트와의 차이(오버레이 vs 배타적 버킷)는 의도된 설계.
