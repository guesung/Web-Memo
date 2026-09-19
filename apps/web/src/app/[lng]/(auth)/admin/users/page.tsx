"use server";

import { HydrationBoundaryWrapper } from "@src/components";
import type { LanguageParams } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.server";
import { getSupabaseClient } from "@src/modules/supabase/util.server";
import { QUERY_KEY } from "@web-memo/shared/constants";
import { AdminService } from "@web-memo/shared/utils";
import { Suspense } from "react";

import { UserSearchForm, UserTable, UserTableSkeleton } from "./_components";

interface PageProps extends LanguageParams {
	searchParams: { q?: string };
}

/** 가입한 사용자를 모아 보는 관리자 화면 */
export default async function UsersPage({
	params: { lng },
	searchParams,
}: PageProps) {
	const { t } = await useTranslation(lng);
	const supabaseClient = getSupabaseClient();
	const adminService = new AdminService(supabaseClient);

	// 빈 문자열을 그대로 넘기면 쿼리 키가 `undefined`인 클라이언트 쪽과 어긋나 같은 목록을 두 번 조회한다.
	const searchQuery = searchParams.q || undefined;

	return (
		<>
			<h1 className="text-2xl font-bold mb-8">{t("admin.users.title")}</h1>

			<HydrationBoundaryWrapper
				queryKey={QUERY_KEY.adminUsers(searchQuery)}
				queryFn={() => adminService.getUsers({ searchQuery })}
			>
				{/* 검색 폼은 표와 같은 경계에 두지 않는다. 검색어가 바뀌면 표가 다시 서스펜드하는데,
				    한 경계에 묶이면 입력창까지 fallback으로 대체되어 타이핑 중 포커스를 잃는다. */}
				<div className="mb-6">
					<Suspense>
						<UserSearchForm lng={lng} />
					</Suspense>
				</div>
				<Suspense fallback={<UserTableSkeleton />}>
					<UserTable lng={lng} />
				</Suspense>
			</HydrationBoundaryWrapper>
		</>
	);
}
