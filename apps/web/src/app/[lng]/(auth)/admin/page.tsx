"use server";

import { HydrationBoundaryWrapper } from "@src/components";
import type { LanguageParams } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.server";
import { getSupabaseClient } from "@src/modules/supabase/util.server";
import { QUERY_KEY } from "@web-memo/shared/constants";
import { AdminService } from "@web-memo/shared/utils";
import { Loading, Separator } from "@web-memo/ui";
import { Suspense } from "react";

import {
	ActiveUsersCard,
	ActivityChart,
	GaActiveUsersChart,
	IncludeAdminToggle,
	StatsCards,
	UserGrowthChart,
} from "./_components";

interface PageProps extends LanguageParams {
	searchParams: Promise<{ includeAdmin?: string }>;
}

export default async function AdminPage({ params, searchParams }: PageProps) {
	const { lng } = await params;
	const includeAdmin = (await searchParams).includeAdmin === "1";
	const { t } = await useTranslation(lng);
	const supabaseClient = await getSupabaseClient();
	const adminService = new AdminService(supabaseClient);

	return (
		<>
			<div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<h1 className="text-2xl font-bold">{t("admin.title")}</h1>
				<IncludeAdminToggle lng={lng} />
			</div>

			<HydrationBoundaryWrapper
				queryKey={QUERY_KEY.adminStats(includeAdmin)}
				queryFn={() => adminService.getAdminStats({ includeAdmin })}
			>
				<Suspense fallback={<Loading />}>
					<StatsCards lng={lng} includeAdmin={includeAdmin} />
				</Suspense>
			</HydrationBoundaryWrapper>

			<div className="mt-8">
				<HydrationBoundaryWrapper
					queryKey={QUERY_KEY.activeUsersStats(includeAdmin)}
					queryFn={() => adminService.getActiveUsersStats({ includeAdmin })}
				>
					<Suspense fallback={<Loading />}>
						<ActiveUsersCard lng={lng} includeAdmin={includeAdmin} />
					</Suspense>
				</HydrationBoundaryWrapper>
			</div>

			{/* GA는 Supabase를 센 숫자가 아니라 출처가 다르므로, 아래 2열 그리드에 끼워 넣지 않고 자기 섹션에서 전폭을 씁니다. */}
			<Separator className="my-8" />

			<GaActiveUsersChart lng={lng} />

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
				<HydrationBoundaryWrapper
					queryKey={QUERY_KEY.userGrowth(30, includeAdmin)}
					queryFn={() =>
						adminService.getUserGrowth({ daysAgo: 30, includeAdmin })
					}
				>
					<Suspense fallback={<Loading />}>
						<UserGrowthChart lng={lng} includeAdmin={includeAdmin} />
					</Suspense>
				</HydrationBoundaryWrapper>

				<HydrationBoundaryWrapper
					queryKey={QUERY_KEY.adminStats(includeAdmin)}
					queryFn={() => adminService.getAdminStats({ includeAdmin })}
				>
					<Suspense fallback={<Loading />}>
						<ActivityChart lng={lng} includeAdmin={includeAdmin} />
					</Suspense>
				</HydrationBoundaryWrapper>
			</div>
		</>
	);
}
