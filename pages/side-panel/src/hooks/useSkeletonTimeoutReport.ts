import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { reportSkeletonTimeout } from "../utils/reportLoginFailure";

/** 이 시간을 넘겨 스켈레톤이 보이면 로딩이 멈춘 것으로 본다. 정상 로딩은 1초 안팎이다. */
export const SKELETON_TIMEOUT_MS = 5_000;

/**
 * 스켈레톤이 `SKELETON_TIMEOUT_MS`를 넘겨 보이면 그때 끝나지 않은 쿼리와 함께 한 번 보고한다.
 *
 * @description 쿼리에 타임아웃이 없어 응답이 오지 않으면 스켈레톤이 끝없이 남고 오류도 나지 않는다.
 * 스켈레톤이 사라지면(언마운트) 타이머를 해제해 보고하지 않는다. 현재 사용처: MemoFormSkeleton.tsx
 */
export default function useSkeletonTimeoutReport() {
	const queryClient = useQueryClient();

	useEffect(
		function reportWhenSkeletonStaysTooLong() {
			const timer = setTimeout(() => {
				reportSkeletonTimeout(queryClient, SKELETON_TIMEOUT_MS);
			}, SKELETON_TIMEOUT_MS);

			return () => clearTimeout(timer);
		},
		[queryClient],
	);
}
