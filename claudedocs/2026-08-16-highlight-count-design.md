# 하이라이트 개수 표시 설계

**Date**: 2026-08-16
**Type**: feature
**Status**: in-progress (설계 확정, 구현 전)
**선행 작업**: [하이라이트 기능](2026-08-15-highlight-design.md) (PR #404)

## Summary

사용자가 하이라이트를 몇 개 그었는지 세 곳에서 보여준다.

1. **모바일 브라우저** — 지금 보는 페이지의 하이라이트 개수
2. **웹 대시보드 `/highlights`** — 출처(URL)별 카드의 개수
3. **앱 메모 목록** — 메모별(= 그 URL의) 개수

전체 통계("지금까지 총 N개")는 범위 밖이다.

## 1. 왜 서버 집계가 필요한가

세 곳의 사정이 다르다.

**현재 페이지는 이미 데이터가 있다.** `useHighlightsByUrl`이 그 URL의 하이라이트를 전부 가져오므로 `rows.length`가 정확하다. 추가 요청이 필요 없다.

**웹 대시보드는 로드된 것만 세면 틀린다.** 무한스크롤이라 어떤 URL에 30개가 있어도 첫 페이지에 20개만 실렸으면 "20"으로 보이고, 스크롤하면 숫자가 늘어난다.

**메모 목록은 셀 데이터 자체가 없다.** 메모를 조회할 뿐 하이라이트는 안 가져온다.

PostgREST의 집계 함수는 이 프로젝트에서 **꺼져 있다**(`PGRST123: Use of aggregate functions is not allowed`). 따라서 `?select=url,count()` 같은 방법을 쓸 수 없고, **RPC 함수가 유일한 서버 집계 경로**다. 이 저장소에는 이미 `get_admin_stats`, `get_user_growth`, `get_active_users_stats` 선례가 있다.

## 2. RPC 설계

```sql
create function memo.get_highlight_counts(target_urls text[])
returns table (url text, count int)
language sql
stable
as $$
  select h.url, count(*)::int
  from memo.highlight h
  where h.url = any(target_urls)
  group by h.url;
$$;

grant execute on function memo.get_highlight_counts(text[]) to authenticated;

comment on function memo.get_highlight_counts(text[]) is
  'Returns highlight counts per URL for the calling user. RLS on memo.highlight restricts rows to the caller.';
```

### 왜 `bigint`가 아니라 `int`인가

`count(*)`는 `bigint`를 반환하는데, PostgREST는 `bigint`를 **JSON 문자열로 직렬화할 수 있다**(정밀도 손실 방지). 그러면 클라이언트에서 `"12"`를 받아 숫자 연산이 어긋난다. 하이라이트 개수가 `int` 범위를 넘을 일은 없으므로 캐스팅해 숫자로 받는다.

### `grant execute`가 필요한 이유

함수는 기본적으로 `PUBLIC`에 실행 권한이 있지만, **이 저장소의 기존 RPC가 명시적으로 부여하는 관례를 따른다.** `20241208_add_active_users_stats.sql:44`가 `GRANT EXECUTE ON FUNCTION memo.get_active_users_stats() TO authenticated;`를 쓰고 `COMMENT ON FUNCTION`으로 설명을 단다. `anon`에는 주지 않는다 — 하이라이트는 로그인 필수다.

**기존 RPC와 다른 점 하나**: `get_active_users_stats`는 `SECURITY DEFINER`다. 관리자 통계라 모든 사용자의 데이터를 집계해야 하기 때문이다. 우리 함수는 반대로 **호출자 본인의 데이터만** 세야 하므로 `security invoker`(기본값)가 맞다. 관례를 따르되 이 지점은 의도적으로 다르게 간다.

### 왜 `security invoker`인가 (기본값, 명시하지 않음)

`security definer`를 쓰면 함수가 소유자 권한으로 돌아 **RLS를 우회**하므로, 함수 안에서 `auth.uid() = user_id`를 직접 걸어야 한다. 빠뜨리면 남의 하이라이트 개수가 새어 나간다.

기본값인 `security invoker`로 두면 호출자 권한으로 실행되어 이미 만들어둔 `highlight_select_own` 정책(`auth.uid() = user_id`)이 그대로 적용된다. **권한 로직을 한 곳에만 두는 편이 안전하다.**

### 왜 URL 배열을 받는가

메모 목록 때문이다. 화면에 메모가 20개면 개별 조회는 요청 20번(N+1)이 되지만, 배열로 넘기면 한 번이다.

### 개수가 0인 URL은 반환하지 않는다

`group by`의 자연스러운 결과다. 호출하는 쪽이 `Map`으로 만들어 없으면 0으로 취급한다. SQL을 단순하게 유지하기 위한 선택이다.

## 3. 화면별 적용

### 3-1. 모바일 브라우저 — 현재 페이지 개수

`useWebViewHighlights`가 이미 `rows`를 반환하므로 `rows.length`를 쓴다. **RPC를 호출하지 않는다.**

표시 위치는 브라우저 헤더의 기존 아이콘 열에 배지로 붙인다. 개수가 0이면 표시하지 않는다.

**주의**: `rows.length`는 저장된 개수이고, 실제로 화면에 그려진 개수와 다를 수 있다. 원문이 바뀌어 앵커를 못 찾으면 렌더는 안 되지만 데이터는 남기 때문이다(설계 §6-3). 주입 스크립트가 `highlight:restored`로 `resolved`/`unresolved`를 이미 보내고 있으나 **현재 소비되지 않는다**. 이 값을 쓰면 "저장 12개 중 10개 표시" 같은 구분이 가능하지만, **v1에서는 하지 않는다** — 사용자에게 두 숫자를 보여주는 것이 오히려 혼란스럽고, "몇 개 그었나"라는 원래 질문에는 저장된 개수가 맞는 답이다.

### 3-2. 웹 대시보드 — 출처별 개수

`groupHighlightsByUrl`이 만든 그룹의 URL을 모아 RPC를 한 번 호출하고, `HighlightGroupCard`의 제목 옆에 개수를 표시한다.

무한스크롤로 그룹이 늘어나면 **새로 등장한 URL만** 추가로 조회한다. 이미 아는 URL을 다시 묻지 않는다.

**배지는 서버 총계다.** 카드 안에 보이는 문장 수와 다를 수 있다(30개 중 20개만 로드된 경우 문장은 20개, 배지는 30). 사용자가 알고 싶은 것은 "이 페이지에서 몇 개 그었나"이고, 화면에 몇 개가 렌더됐는지는 구현 사정이다.

### 3-3. 앱 메모 목록 — 메모별 개수

`useMemoList`가 가진 메모들의 `url`을 모아 RPC를 한 번 호출하고, `MemoCard`에 개수를 표시한다. **개수가 0이면 표시하지 않는다** — 하이라이트를 안 그은 메모가 대부분일 텐데 "0"이 줄줄이 붙으면 시끄럽다.

메모 URL은 저장 시 `normalizeUrl`을 거치고 하이라이트 URL도 마찬가지이므로, 두 값이 같은 기준이라 그대로 매칭된다.

**비로그인 상태에서는 조회하지 않는다.** 하이라이트는 로그인 필수이고(설계 §6-5), 로컬 메모에는 하이라이트가 있을 수 없다.

## 4. 공유 코드

`packages/shared`에 다음을 추가한다.

- `HighlightService.getHighlightCounts(urls: string[])` — RPC 호출. `Map<string, number>`가 아니라 원본 행 배열을 그대로 반환하고, 변환은 훅이 한다(서비스는 데이터 접근만 책임진다).
- `QUERY_KEY.highlightCounts(urls: string[])` — URL 배열을 정렬해 키에 넣는다. 순서가 달라도 같은 캐시를 쓰게 하기 위함이다.

앱과 웹이 각자 훅을 둔다(기존 관례: `apps/app`은 자체 훅, `apps/web`은 `_hooks/`).

## 4-1. 물려받는 한계 — 해시 라우팅 사이트

개수는 URL을 기준으로 세므로, [하이라이트 설계 §6-7](2026-08-15-highlight-design.md)에 기록된 한계를 그대로 물려받는다.

`normalizeUrl`이 해시를 버리기 때문에 해시를 라우팅 수단으로 쓰는 사이트(`example.com/#/article/1`, `/#/article/2`)에서는 여러 글이 한 URL로 뭉친다. 그러면 **개수도 합산되어 나온다** — article/1에 3개, article/2에 2개를 그었으면 양쪽 모두 "5"로 보인다.

이건 개수 기능이 새로 만든 문제가 아니라 URL 기준 자체의 한계이고, 하이라이트·메모가 이미 같은 방식으로 동작한다. **개수만 따로 고칠 수 없다** — 고치려면 `normalizeUrl`을 바꿔야 하고 그건 기존 저장 데이터와 어긋난다. 따라서 여기서도 알려진 한계로 남긴다.

## 5. 에러 처리

**개수 조회가 실패해도 본 기능을 막지 않는다.** 하이라이트 목록이나 메모 목록은 그대로 보이고 배지만 나타나지 않는다. 개수는 부가 정보이지 핵심이 아니다.

따라서 개수 쿼리의 에러는 토스트로 알리지 않고 조용히 넘긴다. 목록 자체가 실패하는 것과는 다르게 다룬다.

## 6. 테스트 전략

**단위 테스트**: RPC 응답을 `Map`으로 변환하는 로직(없는 URL은 0). 순수 함수라 쉽게 덮인다.

**서비스 계층 테스트**: `getHighlightCounts`가 RPC에 올바른 파라미터를 넘기는지. 기존 `highlightService.test.ts`의 목 패턴을 확장한다.

**RPC 자체**: SQL 함수는 단위 테스트로 덮기 어렵다. 마이그레이션 적용 후 실제 호출로 확인한다. **특히 RLS가 실제로 걸리는지** — 다른 사용자의 URL을 넘겼을 때 0이 나오는지 확인해야 한다.

## 7. 마이그레이션

`packages/supabase-edge-functions/supabase/migrations/20260816_add_highlight_counts_function.sql`

이 저장소는 원격에만 있는 마이그레이션이 여러 개라 `supabase db push`가 거부된다(로컬에 없는 원격 버전 9개). 하이라이트 테이블도 대시보드 SQL Editor로 직접 적용했다. **이번에도 같은 방식으로 적용한다.**

## Notes

- 브랜치는 `feat/highlight-count` (`feat/highlight` 위에서 분기). 하이라이트 PR #404가 develop에 머지되면 rebase한다.
- 전체 통계("총 N개")는 이번 범위 밖이다. 필요해지면 별도 RPC로 추가한다.
