"use client";

import type { LanguageType } from "@src/modules/i18n";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import BlogReadingSkeleton from "./blogReadingSkeleton";

/**
 * 브라우저에서만 렌더하는 블로그 정주행 화면.
 * @description 구독·메모는 브라우저용 Supabase 클라이언트가 쿠키 세션으로 읽는다. 서버에는 그 세션이 없어
 * SSR 결과가 클라이언트와 어긋나므로 SSR을 끄고 스켈레톤만 내보낸다.
 */
const BlogReadingView = dynamic(() => import("./blogReadingView"), {
	ssr: false,
});

/** SSR을 끈 정주행 화면을 Suspense 스켈레톤으로 감싼다. */
export default function ClientBlogReadingView({ lng }: LanguageType) {
	return (
		<Suspense fallback={<BlogReadingSkeleton lng={lng} />}>
			<BlogReadingView lng={lng} />
		</Suspense>
	);
}
