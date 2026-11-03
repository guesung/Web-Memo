"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { useMemoRetentionQuery } from "@web-memo/shared/hooks";
import type {
	MemoRetentionGranularity,
	MemoRetentionRange,
} from "@web-memo/shared/types";
import {
	Button,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Skeleton,
} from "@web-memo/ui";
import { useState } from "react";

import MemoRewriteRateChart from "./MemoRewriteRateChart";
import ReturningWritersChart from "./ReturningWritersChart";

export default function RetentionSection({ lng }: LanguageType) {
	const { t } = useTranslation(lng);
	const [range, setRange] = useState<MemoRetentionRange>("recent12");
	const [granularity, setGranularity] =
		useState<MemoRetentionGranularity>("month");
	const { data, isPending, isError, refetch } = useMemoRetentionQuery({
		range,
		granularity,
	});

	return (
		<section aria-labelledby="memo-retention-title" className="mt-8">
			<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2 id="memo-retention-title" className="text-xl font-semibold">
						{t("admin.retention.title")}
					</h2>
					<p className="text-sm text-muted-foreground">
						{t("admin.retention.description")}
					</p>
				</div>
				<Select
					value={range}
					onValueChange={(value) => setRange(value as MemoRetentionRange)}
				>
					<SelectTrigger
						aria-label={t("admin.retention.range_label")}
						className="w-40"
					>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="recent12">
							{t("admin.retention.recent12")}
						</SelectItem>
						<SelectItem value="all">{t("admin.retention.all")}</SelectItem>
					</SelectContent>
				</Select>
			</div>
			{isPending ? (
				<output
					className="grid gap-6 lg:grid-cols-2"
					aria-label={t("admin.retention.loading")}
				>
					<Skeleton className="h-[390px] w-full" />
					<Skeleton className="h-[390px] w-full" />
				</output>
			) : isError ? (
				<div role="alert" className="rounded-lg border p-8 text-center">
					<p>{t("admin.retention.error")}</p>
					<Button className="mt-4" variant="outline" onClick={() => refetch()}>
						{t("admin.retention.retry")}
					</Button>
				</div>
			) : data?.cohorts.every((row) => row.cohortSize === 0) &&
				data.returning.every((row) => row.users === 0) ? (
				<p className="rounded-lg border p-8 text-center text-muted-foreground">
					{t("admin.retention.empty")}
				</p>
			) : data ? (
				<div className="grid gap-6 lg:grid-cols-2">
					<MemoRewriteRateChart
						lng={lng}
						stats={data}
						granularity={granularity}
						onGranularityChange={setGranularity}
					/>
					<ReturningWritersChart lng={lng} stats={data} />
				</div>
			) : null}
		</section>
	);
}
