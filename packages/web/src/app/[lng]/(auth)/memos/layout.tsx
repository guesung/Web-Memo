"use server";

import { HydrationBoundaryWrapper } from "@src/components";
import type { LanguageParams } from "@src/modules/i18n";
import { getSupabaseClient } from "@src/modules/supabase/util.server";
import { QUERY_KEY } from "@web-memo/shared/constants";
import { CategoryService } from "@web-memo/shared/utils";
import { Loading, SidebarProvider } from "@web-memo/ui";
import type { PropsWithChildren } from "react";
import { Suspense } from "react";

import { CheckUserLogin, InitSentryUserInfo, MemoSidebar } from "./_components";
import { initSentryUserInfo } from "./_utils";

interface LayoutProps extends LanguageParams, PropsWithChildren {}

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
			{children}

			<Suspense fallback={<Loading />}>
				<InitSentryUserInfo lng={lng} />
			</Suspense>

			<CheckUserLogin />
		</SidebarProvider>
	);
}
