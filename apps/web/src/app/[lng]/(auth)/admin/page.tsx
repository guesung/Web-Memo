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

			{/* GA는 Supabase를 센 숫자가 아니라 출처가 다르므로, 아래 2열 그리드에 끼워 넣지 않고 자기 섹션에서 전폭을 씁니다. */}
			<Separator className="my-8" />

			<GaActiveUsersChart lng={lng} />

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
