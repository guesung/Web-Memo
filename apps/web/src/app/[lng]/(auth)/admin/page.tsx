"use server";

import { HydrationBoundaryWrapper } from "@src/components";
import type { LanguageParams } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.server";
import { getSupabaseClient } from "@src/modules/supabase/util.server";
import { QUERY_KEY } from "@web-memo/shared/constants";
import { AdminService } from "@web-memo/shared/utils";
import { Loading } from "@web-memo/ui";
import { Suspense } from "react";

import {
	ActiveUsersCard,
	ActivityChart,
	StatsCards,
	UserGrowthChart,
} from "./_components";

interface PageProps extends LanguageParams {}

export default async function AdminPage({ params: { lng } }: PageProps) {
	const { t } = await useTranslation(lng);
	const supabaseClient = getSupabaseClient();
	const adminService = new AdminService(supabaseClient);

	return (
		<>
			<h1 className="text-2xl font-bold mb-8">{t("admin.title")}</h1>

			<HydrationBoundaryWrapper
				queryKey={QUERY_KEY.adminStats()}
				queryFn={() => adminService.getAdminStats()}
			>
				<Suspense fallback={<Loading />}>
					<StatsCards lng={lng} />
				</Suspense>
			</HydrationBoundaryWrapper>

			<div className="mt-8">
				<HydrationBoundaryWrapper
					queryKey={QUERY_KEY.activeUsersStats()}
					queryFn={() => adminService.getActiveUsersStats()}
				>
					<Suspense fallback={<Loading />}>
						<ActiveUsersCard lng={lng} />
					</Suspense>
				</HydrationBoundaryWrapper>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
				<HydrationBoundaryWrapper
					queryKey={QUERY_KEY.userGrowth(30)}
					queryFn={() => adminService.getUserGrowth(30)}
				>
					<Suspense fallback={<Loading />}>
						<UserGrowthChart lng={lng} />
					</Suspense>
				</HydrationBoundaryWrapper>

				<HydrationBoundaryWrapper
					queryKey={QUERY_KEY.adminStats()}
					queryFn={() => adminService.getAdminStats()}
				>
					<Suspense fallback={<Loading />}>
						<ActivityChart lng={lng} />
					</Suspense>
				</HydrationBoundaryWrapper>
			</div>
		</>
	);
}
