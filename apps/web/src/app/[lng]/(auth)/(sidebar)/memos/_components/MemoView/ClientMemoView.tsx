"use client";

import dynamic from "next/dynamic";

import { MemoViewSkeleton } from "./MemoListSkeleton";

/**
 * 브라우저에서만 렌더하는 메모 목록.
 *
 * @description 메모는 브라우저용 Supabase 클라이언트가 쿠키의 세션으로 불러온다. 서버에는 그 세션이
 * 없어 SSR에서는 0개로 렌더되고, 클라이언트의 실제 개수와 어긋나 hydration 에러가 난다.
 * 그래서 SSR을 끄고 서버에서는 스켈레톤만 내보낸다.
 */
const ClientMemoView = dynamic(() => import("./index"), {
	ssr: false,
	loading: () => <MemoViewSkeleton />,
});

export default ClientMemoView;
