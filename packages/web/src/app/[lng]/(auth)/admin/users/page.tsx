"use server";

import { HydrationBoundaryWrapper } from "@src/components";
import type { LanguageParams } from "@src/modules/i18n";
import { getSupabaseClient } from "@src/modules/supabase/util.server";
import { QUERY_KEY } from "@web-memo/shared/constants";
import { AdminService } from "@web-memo/shared/utils";
import { Loading } from "@web-memo/ui";
import { Suspense } from "react";

import { UserSearchForm, UserTable } from "./_components";

interface PageProps extends LanguageParams {}

export default async function UsersPage({ params: { lng } }: PageProps) {
	const supabaseClient = getSupabaseClient();
	const adminService = new AdminService(supabaseClient);

	return (
		<>
			<h1 className="text-2xl font-bold mb-8">
				{lng === "ko" ? "사용자 관리" : "User Management"}
			</h1>

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
