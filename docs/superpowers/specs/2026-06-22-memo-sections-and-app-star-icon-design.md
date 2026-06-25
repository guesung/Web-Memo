# 설계 문서 — 앱 별표 아이콘 분리 & 구조화된 노트(메모/느낀 점/액션 아이템)

**날짜**: 2026-06-22
**유형**: feature
**상태**: 설계 승인 완료 (구현 전)
**대상 베이스 브랜치**: develop (현재 master = develop 동기화 상태, HEAD `5b2ad930`)

---

## 1. 배경 & 목표

두 가지 독립적 작업을 한 설계 문서로 묶는다.

1. **앱 별표 아이콘 분리** — 모바일 앱(`apps/app`)에서 `Star`(⭐) 아이콘이 서로 다른 두 의미로 중복 사용되어 혼란을 준다. 시각적으로 분리한다.
2. **구조화된 노트** — 현재는 저장한 페이지마다 자유 텍스트 `memo` 한 칸만 작성 가능하다. 여기에 **느낀 점**, **액션 아이템** 섹션을 추가해, 한 페이지(메모 레코드)에 세 가지 고정 섹션을 작성할 수 있게 한다.

두 작업은 데이터/코드 의존성이 없으므로 **별도 PR로 분리**하는 것을 권장한다. (단일 설계 문서, 두 구현 단위)

---

## 2. 요청 1 — 앱 별표 아이콘 분리

### 2.1 현재 상태 (HEAD 기준)

`apps/app`에서 `lucide-react-native`의 `Star`가 두 의미로 쓰인다.

| 의미 | 저장소 | 사용처 |
|------|--------|--------|
| **메모 중요** (`isStar`) | Supabase `memo.isStar` (동기화) | 홈 필터 pill, `MemoCard` 배지, `MemoDetailModal` 버튼 |
| **브라우저 즐겨찾기** (`Favorite`) | AsyncStorage (로컬 전용) | `BrowserHeader` 토글, `FavoriteLinks` 섹션, `TechBlogBottomSheet` 섹션 |

둘 다 동일한 `Star` 아이콘 + 앰버색(`#f59e0b`)이라 같은 별이 다른 의미를 가진다. 특히 `BrowserHeader`에는 ⭐(즐겨찾기)와 ❤️(위시) 토글이 한 줄에 나란히 있다.

### 2.2 결정

- **메모 중요**는 ⭐ `Star` 유지.
- **브라우저 즐겨찾기**를 `Bookmark`(🔖) 아이콘으로 변경.
- 기능·데이터·동작은 그대로. **아이콘 표시만 교체** (시각적 혼란 제거).

### 2.3 변경 대상

| 파일 | 위치 | 변경 |
|------|------|------|
| `apps/app/app/(main)/browser/_components/BrowserHeader.tsx` | ~L87-92 | 헤더 즐겨찾기 토글 `Star`/`StarOff` → `Bookmark` 계열 |
| `apps/app/app/(main)/browser/_components/FavoriteLinks.tsx` | ~L28 | 빈 상태 아이콘 `Star` → `Bookmark` |
| `apps/app/app/(main)/browser/_components/TechBlogBottomSheet.tsx` | ~L195 | "즐겨찾기" 섹션 라벨 아이콘 `Star` → `Bookmark` |

- import 교체: `Star`(+`StarOff`) → `Bookmark` (활성/비활성은 `fill` 유무 또는 색상으로 표현). lucide-react-native에 `Bookmark` 존재.
- 색상은 기존 앰버(`#f59e0b`) 유지 가능 — 아이콘 모양 차이만으로 ⭐(중요)와 🔖(즐겨찾기) 구분이 성립한다.
- 메모 중요(`isStar`) 관련 `Star` 사용처는 **건드리지 않는다**.

### 2.4 범위 밖

- 웹/익스텐션의 별표(`isStar`)·평점/마케팅용 `Star`는 이번 작업 대상 아님.
- 즐겨찾기의 데이터 모델/동기화 방식 변경 없음(로컬 AsyncStorage 유지).

---

## 3. 요청 2 — 구조화된 노트 (메모 / 느낀 점 / 액션 아이템)

### 3.1 확정된 요구사항

- 한 페이지(메모 레코드) 안에 **고정 3종 섹션**: `메모` / `느낀 점` / `액션 아이템`.
- 세 섹션 모두 **자유 텍스트**(액션 아이템도 체크리스트가 아닌 텍스트).
- 섹션 유형은 **고정**(사용자 정의 불가).
- 적용 범위: **익스텐션 + 웹 + 앱 전부**.

### 3.2 데이터 모델 (접근법 A — 컬럼 2개 추가)

`memo` 테이블에 nullable 텍스트 컬럼 2개를 추가한다. `isWish`/`isStar`가 추가된 것과 동일한 패턴.

```sql
-- packages/supabase-edge-functions/supabase/migrations/20260622_add_note_sections_to_memo.sql
alter table "memo" add column if not exists "impression" text;
alter table "memo" add column if not exists "actionItem" text;
```

- 컬럼명: `impression`(느낀 점), `actionItem`(액션 아이템). 기존 카멜케이스 컬럼(`isWish`, `isStar`, `favIconUrl`)과 일관.
- 기존 `memo` 컬럼·데이터는 변경 없음 → 기존 메모는 새 컬럼이 `null`로 자동 하위호환.
- 마이그레이션 후 `pnpm generate-supabase-type`로 `packages/shared/src/types/supabase.ts` 재생성.

#### 대안 (채택 안 함)
- **B. JSONB `sections` 컬럼**: 유연하나 기존 `memo` 컬럼 마이그레이션 필요 + 검색 쿼리 복잡. 고정 3종엔 오버엔지니어링.
- **C. 별도 `memo_section` 테이블(1:N)**: 확장적이나 고정 3종엔 과함, 조인/마이그레이션 부담.

### 3.3 공유 데이터 계층 (`packages/shared`)

- `utils/Supabase.ts` `MemoService` (insert/update/getMemos*): 대부분 `select("*")` + request spread 구조라 새 필드가 자연 통과. insert/update 입력 타입에 `impression`, `actionItem` 포함되는지 확인.
- 뮤테이션 훅: `useMemoUpsertMutation`, `useMemoPatchMutation`, `useMemoPostMutation`이 새 필드를 받도록 입력 타입 확장.
- 검색: `getMemosPaginated`의 `searchQuery`가 현재 `title` + `memo`를 검색 → `impression`, `actionItem`까지 포함하도록 OR 조건 확장.
- `QueryKey`: 섹션별 필터링은 도입하지 않으므로 키 시그니처 변경 불필요.

### 3.4 작성 UI (3종 섹션 텍스트 입력)

세 섹션 모두 텍스트 입력. 기존 자동저장(debounce 1초) 로직을 재사용해 각 섹션 변경 시 전체 필드로 upsert/patch.

| 플랫폼 | 파일 |
|--------|------|
| 익스텐션 | `pages/side-panel/src/components/MemoSection/components/MemoForm/index.tsx`, `.../hooks/useMemoForm.ts`, `pages/side-panel/src/types/Input.ts` |
| 웹 | `apps/web/src/app/[lng]/(auth)/memos/_components/MemoDialog/index.tsx`, `.../_types/Input.ts` |
| 앱 | `apps/app/app/(main)/_components/MemoDetailModal.tsx` |

- 고정 세트이므로 작성 화면에서는 세 섹션을 모두 노출(라벨로 구분).
- 익스텐션의 카테고리 자동 제안은 기존대로 `메모` 텍스트 기준 유지.

### 3.5 표시 UI (채워진 섹션만 라벨과 함께 노출)

목록/카드에서는 **값이 있는 섹션만** 라벨과 함께 표시(빈 섹션은 숨김)해 화면 혼잡을 막는다.

| 플랫폼 | 파일 |
|--------|------|
| 웹 | `apps/web/src/app/[lng]/(auth)/memos/_components/MemoView/MemoItem.tsx` |
| 앱 | `apps/app/app/(main)/_components/MemoCard.tsx` |

### 3.6 i18n (섹션 라벨)

라벨: `메모` / `느낀 점` / `액션 아이템`.

- 웹: `apps/web/src/modules/i18n/locales/{ko,en}/translation.json` — 예) `memoSection.memo`, `memoSection.impression`, `memoSection.actionItem`.
- 익스텐션: `apps/chrome-extension/public/_locales/{ko,en}/messages.json`.
- 앱: 인라인 한글 문자열(앱은 하드코딩 패턴).
- 작업 완료 후 `/i18n-check`로 번역 완전성 검증.

### 3.7 하위호환 & 엣지

- 기존 메모: `impression`/`actionItem`이 `null` → 작성 화면에선 빈 칸, 표시 화면에선 숨김.
- 익스텐션↔웹↔앱이 동일 Supabase 레코드를 공유하므로 한 곳에서 작성한 섹션이 다른 곳에서도 보인다.
- 위시 취소 시 빈 메모 삭제 로직(PR #379)은 현재 `memo` + `isStar` 기준 — 새 섹션이 채워진 경우에도 메모가 유실되지 않도록 "빈 메모" 판정에 `impression`/`actionItem` 포함 여부를 검토(빈 메모 = 세 섹션 모두 비어 있고 isStar 아님).

---

## 4. 테스트 전략

- 단위(Vitest): `MemoService`의 insert/update/검색이 새 필드를 정확히 통과/조회하는지.
- E2E(Playwright): 메모 작성 흐름에서 느낀 점·액션 아이템 입력 → 저장 → 재조회 표시 확인(주요 플랫폼 1곳 이상).
- 회귀: 기존 메모(새 컬럼 null)가 정상 표시/편집되는지.

---

## 5. 작업 분리 (PR 단위)

1. **PR A — 앱 별표 아이콘 분리** (요청 1): 앱 한정, 데이터 변경 없음, 저위험.
2. **PR B — 구조화된 노트** (요청 2): 마이그레이션 + 공유 계층 + 3 플랫폼 UI + i18n.

각 PR은 `pnpm type-check` / `pnpm lint` 통과 후 한글 커밋·PR로 생성.

---

## 6. 미해결 항목

없음. (즐겨찾기 아이콘 = `Bookmark`, 컬럼명 = `impression`/`actionItem`로 확정.)
