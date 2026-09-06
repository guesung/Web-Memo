"use server";

import { HydrationBoundaryWrapper } from "@src/components";
import { HeaderMargin } from "@src/components/Header";
import type { LanguageParams } from "@src/modules/i18n";
import { getSupabaseClient } from "@src/modules/supabase/util.server";
import { QUERY_KEY } from "@web-memo/shared/constants";
import { CategoryService } from "@web-memo/shared/utils";
import { Loading, SidebarProvider } from "@web-memo/ui";
import type { PropsWithChildren } from "react";
import { Suspense } from "react";

import {
	InitSentryUserInfo,
	MemoSidebar,
	TrackLoginSuccess,
} from "./_components";
import { initSentryUserInfo } from "./_utils";

interface LayoutProps extends LanguageParams, PropsWithChildren {}

/**
 * 사이드바를 공유하는 라우트(메모·하이라이트·설정)의 공통 레이아웃.
 *
 * @description 스크롤 주체를 문서(window) 하나로 고정한다. 예전에는 /memos만
 * `h-screen overflow-y-hidden` 안의 그리드가 스크롤하고 /highlights는 문서가
 * 스크롤해서, 탭을 오갈 때 스크롤 주체가 바뀌며 위치가 튀었다. 여기서 높이를
 * 가두지 않으므로 모든 하위 페이지는 문서 스크롤을 쓴다.
 * 사이드바는 fixed라 문서 스크롤에 영향을 주지 않는다.
 */
export default async function Layout({
	children,
	params: { lng },
}: LayoutProps) {
	const supabaseClient = getSupabaseClient();

	initSentryUserInfo({ lng });

	return (
		<SidebarProvider className="bg-background flex w-full text-sm">
			<HydrationBoundaryWrapper
				queryKey={QUERY_KEY.category()}
				queryFn={() => new CategoryService(supabaseClient).getCategories()}
			>
				<Suspense fallback={<Loading />}>
					<MemoSidebar lng={lng} />
				</Suspense>
			</HydrationBoundaryWrapper>

			<main className="min-w-0 flex-1">
				<HeaderMargin />
				{children}
			</main>

			<Suspense fallback={<Loading />}>
				<InitSentryUserInfo lng={lng} />
			</Suspense>

			<Suspense>
				<TrackLoginSuccess />
			</Suspense>
		</SidebarProvider>
	);
}
