import type { IFReportErrorParams } from "../../../utils/errorReporter";

/**
 * mutation의 `meta`에 싣는 보고용 값. `MutationCache`가 실패를 보고할 때 태그로 쓴다.
 *
 * @description 인터페이스는 암묵적 인덱스 시그니처가 없어 React Query의
 * `Record<string, unknown>` 제약을 통과하지 못하므로 타입 별칭으로 둔다.
 */
export type TMutationReportMeta = Pick<
	IFReportErrorParams,
	"feature" | "operation" | "stage"
>;

// `utils` 배럴에 두면 React Query가 없는 `@web-memo/ui`의 타입체크가 깨지므로 mutation 훅 옆에 둔다.
// meta를 읽는 QueryProvider(웹·사이드 패널)는 `@web-memo/shared/hooks`를 거쳐 이 선언을 본다.
// 선언이 안 보이면 meta가 `Record<string, unknown>`으로 돌아가 QueryProvider의 타입체크가 실패한다.
declare module "@tanstack/react-query" {
	interface Register {
		mutationMeta: TMutationReportMeta;
	}
}
