"use server";

import { HydrationBoundaryWrapper } from "@src/components";
import type { LanguageParams } from "@src/modules/i18n";
import getTranslation from "@src/modules/i18n/util.server";
import { getSupabaseClient } from "@src/modules/supabase/util.server";
import { QUERY_KEY } from "@web-memo/shared/constants";
import { AdminService } from "@web-memo/shared/utils";
import { Loading, Separator } from "@web-memo/ui";
import { Suspense } from "react";

import {
	ActiveUsersCard,
	ActivityChart,
	GaMetricsSection,
	GaMetricsSkeleton,
	IncludeAdminToggle,
	RetentionSection,
	RetentionTabSkeleton,
	StatsCards,
	UserGrowthChart,
} from "./_components";

/**
 * 통계를 prefetch한 뒤 신선하게 보는 시간(ms).
 *
 * @description `StatsCards`와 `ActivityChart`가 같은 쿼리를 각자의 경계에서 prefetch합니다.
 * 이 값이 0이면 두 번째 경계가 방금 받은 값을 낡은 것으로 보고 같은 RPC를 다시 부릅니다.
 */
const ADMIN_STATS_PREFETCH_STALE_MS = 60_000;

interface PageProps extends LanguageParams {
	searchParams: Promise<{ includeAdmin?: string }>;
}

export default async function AdminPage({ params, searchParams }: PageProps) {
	const { lng } = await params;
	const includeAdmin = (await searchParams).includeAdmin === "1";
	const { t } = await getTranslation(lng);
	const supabaseClient = await getSupabaseClient();
	const adminService = new AdminService(supabaseClient);
	const adminStatsQuery = {
		queryKey: QUERY_KEY.adminStats(includeAdmin),
		queryFn: () => adminService.getAdminStats({ includeAdmin }),
		staleTime: ADMIN_STATS_PREFETCH_STALE_MS,
	};

	return (
		<>
			<div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<h1 className="text-2xl font-bold">{t("admin.title")}</h1>
				<IncludeAdminToggle lng={lng} />
			</div>

			<Suspense fallback={<Loading />}>
				<HydrationBoundaryWrapper {...adminStatsQuery}>
					<StatsCards lng={lng} includeAdmin={includeAdmin} />
				</HydrationBoundaryWrapper>
			</Suspense>

			<div className="mt-8">
				<Suspense fallback={<Loading />}>
					<HydrationBoundaryWrapper
						queryKey={QUERY_KEY.activeUsersStats(includeAdmin)}
						queryFn={() => adminService.getActiveUsersStats({ includeAdmin })}
					>
						<ActiveUsersCard lng={lng} includeAdmin={includeAdmin} />
					</HydrationBoundaryWrapper>
				</Suspense>
			</div>

			{/* GA와 리텐션은 Supabase를 센 숫자와 출처가 다르므로, 아래 2열 그리드에 끼워 넣지 않고 자기 섹션에서 전폭을 씁니다. 두 섹션은 클라이언트에서 조회하며 서버 prefetch로 첫 화면을 막지 않습니다. */}
			<Separator className="my-8" />

			<Suspense fallback={<GaMetricsSkeleton />}>
				<GaMetricsSection lng={lng} />
			</Suspense>

			<div className="mt-12">
				<Suspense fallback={<RetentionTabSkeleton />}>
					<RetentionSection lng={lng} />
				</Suspense>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
				<Suspense fallback={<Loading />}>
					<HydrationBoundaryWrapper
						queryKey={QUERY_KEY.userGrowth(30, includeAdmin)}
						queryFn={() =>
							adminService.getUserGrowth({ daysAgo: 30, includeAdmin })
						}
					>
						<UserGrowthChart lng={lng} includeAdmin={includeAdmin} />
					</HydrationBoundaryWrapper>
				</Suspense>

				<Suspense fallback={<Loading />}>
					<HydrationBoundaryWrapper {...adminStatsQuery}>
						<ActivityChart lng={lng} includeAdmin={includeAdmin} />
					</HydrationBoundaryWrapper>
				</Suspense>
			</div>
		</>
	);
}
