import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import {
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Input,
	Label,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@web-memo/ui";
import { useState } from "react";
import { GA_FETCH_DAYS } from "../_constants";
import {
	buildSeries,
	formatAverage,
	type GaMetricsIndex,
	listOtherMetrics,
	summarizeSeries,
} from "../_utils";

/** 카드에 없는 나머지 이벤트의 어제 수치. 이름으로 거르고 '그래프 보기'로 위 그래프에 올린다. */
export default function GaEventTable({
	lng,
	index,
	onMetricSelect,
}: GaEventTableProps) {
	const { t } = useTranslation(lng);
	const [query, setQuery] = useState("");
	const normalizedQuery = query.trim().toLowerCase();
	const metrics = listOtherMetrics(index).filter((metric) =>
		metric.includes(normalizedQuery),
	);

	const handleQueryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setQuery(event.target.value);
	};

	return (
		<Card>
			<CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
				<CardTitle className="text-base">
					{t("admin.gaMetrics.others.title")}
				</CardTitle>
				<div className="flex items-center gap-2">
					<Label htmlFor="ga-event-search" className="text-muted-foreground">
						{t("admin.gaMetrics.others.search")}
					</Label>
					<Input
						id="ga-event-search"
						type="search"
						value={query}
						onChange={handleQueryChange}
						placeholder={t("admin.gaMetrics.others.search_placeholder")}
						className="w-56"
					/>
				</div>
			</CardHeader>
			<CardContent>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>{t("admin.gaMetrics.others.event")}</TableHead>
							<TableHead className="text-right">
								{t("admin.gaMetrics.others.yesterday_users")}
							</TableHead>
							<TableHead className="text-right">
								{t("admin.gaMetrics.others.yesterday_events")}
							</TableHead>
							<TableHead className="text-right">
								{t("admin.gaMetrics.others.average_users")}
							</TableHead>
							<TableHead />
						</TableRow>
					</TableHeader>
					<TableBody>
						{metrics.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={5}
									className="text-center text-muted-foreground"
								>
									{t("admin.gaMetrics.others.no_result")}
								</TableCell>
							</TableRow>
						) : (
							metrics.map((metric) => (
								<GaEventRow
									key={metric}
									lng={lng}
									index={index}
									metric={metric}
									onMetricSelect={onMetricSelect}
								/>
							))
						)}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	);
}

function GaEventRow({ lng, index, metric, onMetricSelect }: GaEventRowProps) {
	const { t } = useTranslation(lng);
	const users = buildSeries({
		index,
		metric,
		unit: "users",
		days: GA_FETCH_DAYS,
	});
	const events = buildSeries({
		index,
		metric,
		unit: "events",
		days: GA_FETCH_DAYS,
	});
	const yesterdayEvents = events.at(-1)?.value;

	return (
		<TableRow>
			<TableCell>
				<code className="text-[13px]">{metric}</code>
			</TableCell>
			<TableCell className="text-right">{users.at(-1)?.value ?? 0}</TableCell>
			<TableCell className="text-right">{yesterdayEvents ?? "–"}</TableCell>
			<TableCell className="text-right">
				{formatAverage(summarizeSeries(users).average)}
			</TableCell>
			<TableCell className="text-right">
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => onMetricSelect(metric)}
				>
					{t("admin.gaMetrics.others.show_chart")}
				</Button>
			</TableCell>
		</TableRow>
	);
}

interface GaEventTableProps extends LanguageType {
	index: GaMetricsIndex;
	onMetricSelect: (metric: string) => void;
}

interface GaEventRowProps extends GaEventTableProps {
	metric: string;
}
