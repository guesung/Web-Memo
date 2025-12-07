"use server";

import { HydrationBoundaryWrapper } from "@src/components";
import type { LanguageParams } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.server";
import { getSupabaseClient } from "@src/modules/supabase/util.server";
import { QUERY_KEY } from "@web-memo/shared/constants";
import { AdminService } from "@web-memo/shared/utils";
import { Loading } from "@web-memo/ui";
import type { Metadata } from "next";
import { Suspense } from "react";

import { UserSearchForm, UserTable } from "./_components";

interface PageProps extends LanguageParams {}

export async function generateMetadata({
	params,
}: LanguageParams): Promise<Metadata> {
	const isKorean = params.lng === "ko";
	return {
		title: isKorean ? "사용자 관리 | 웹 메모" : "User Management | Web Memo",
		robots: {
			index: false,
			follow: false,
		},
	};
}

export default async function UsersPage({ params: { lng } }: PageProps) {
	const { t } = await useTranslation(lng);
	const supabaseClient = getSupabaseClient();
	const adminService = new AdminService(supabaseClient);

	return (
		<>
			<h1 className="text-2xl font-bold mb-8">{t("admin.users.title")}</h1>

			<HydrationBoundaryWrapper
				queryKey={QUERY_KEY.adminUsers()}
				queryFn={() => adminService.getUsers()}
			>
				<div className="mb-6">
					<UserSearchForm lng={lng} />
				</div>
				<Suspense fallback={<Loading />}>
					<UserTable lng={lng} />
				</Suspense>
			</HydrationBoundaryWrapper>
		</>
	);
}
