import { notFound } from "next/navigation";

/**
 * `[lng]` 아래 정의되지 않은 모든 경로를 잡아 404 처리한다.
 *
 * @description
 * 루트 레이아웃이 `[lng]`로 옮겨오면서, `/en/없는-경로`처럼 세그먼트가 매칭되지 않는
 * 요청도 `<html lang>`이 해당 로케일로 맞춰진 채 `[lng]/not-found.tsx`가 그려져야 한다.
 * 이 catch-all이 없으면 매칭되는 라우트가 아예 없어 상위(`app/global-error.tsx` 등)로
 * 빠지며 `<html lang="ko">` 고정값이 다시 나간다.
 */
export default function NotFoundCatchAllPage() {
	notFound();
}
