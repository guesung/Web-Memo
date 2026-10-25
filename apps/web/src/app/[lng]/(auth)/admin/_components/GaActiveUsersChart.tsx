"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { useQuery } from "@tanstack/react-query";
import {
	Area,
	AreaChart,
	Badge,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CartesianGrid,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Skeleton,
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
	XAxis,
	YAxis,
} from "@web-memo/ui";
import { Info, TriangleAlert, Unplug } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

import GaChartEmptyState from "./GaChartEmptyState";

/** 기간 선택지. 라벨을 번역 키로 두어 `lng` 비교 분기를 만들지 않습니다. */
const GA_PERIOD_OPTIONS = [
	{ value: "7", labelKey: "admin.ga.period.days_7" },
	{ value: "30", labelKey: "admin.ga.period.days_30" },
	{ value: "90", labelKey: "admin.ga.period.days_90" },
	{ value: "365", labelKey: "admin.ga.period.days_365" },
];

/**
 * GA4 기준 일자별 활성 사용자 추이.
 *
 * @description 같은 화면의 `UserGrowthChart`와 모양을 맞추되 색만 `--chart-3`으로
 * 가릅니다. 두 추이 그래프가 같은 색이면 출처가 다른 두 지표가 한 지표로 읽힙니다.
 *
 * 크리덴셜 미연결과 조회 실패는 서버가 갈라서 주므로 화면에서도 합치지 않습니다.
 * 미연결은 환경 변수를 채우는 일이라 누를 곳이 없고, 조회 실패는 일시적 장애일 수
 * 있어 다시 시도 버튼이 실제로 의미를 갖습니다.
 */
export default function GaActiveUsersChart({ lng }: GaActiveUsersChartProps) {
	const { t } = useTranslation(lng);
	const [period, setPeriod] = useState("30");
	const { data, isPending, isError, refetch } = useQuery({
		queryKey: ["adminGaActiveUsers", period],
		queryFn: () => fetchActiveUsers(period),
	});

	const handleRetryClick = () => {
		refetch();
	};

	if (isPending) {
		return (
			<GaChartCard
				title={t("admin.ga.title")}
				headerRight={<Skeleton className="h-9 w-32" />}
			>
				<Skeleton className="h-[300px] w-full" />
			</GaChartCard>
		);
	}

	if (isError) {
		return (
			<GaChartCard title={t("admin.ga.title")}>
				<GaChartEmptyState
					icon={TriangleAlert}
					title={t("admin.ga.error_title")}
					description={t("admin.ga.error_description")}
					retryLabel={t("admin.ga.retry")}
					onRetryClick={handleRetryClick}
				/>
			</GaChartCard>
		);
	}

	if (!data.connected) {
		return (
			<GaChartCard title={t("admin.ga.title")}>
				<GaChartEmptyState
					icon={Unplug}
					title={t("admin.ga.disconnected_title")}
					description={t("admin.ga.disconnected_description")}
				/>
			</GaChartCard>
		);
	}

	const chartConfig = {
		activeUsers: {
			label: t("admin.ga.active_users"),
			color: "hsl(var(--chart-3))",
		},
	};
	const chartRows = fillMissingDays({
		rows: data.rows,
		asOf: data.asOf,
		days: Number(period),
	});

	return (
		<GaChartCard
			title={t("admin.ga.title")}
			titleRight={
				<>
					<Badge variant="secondary">{t("admin.ga.delay_badge")}</Badge>
					<TooltipProvider delayDuration={200}>
						<Tooltip>
							<TooltipTrigger
								type="button"
								aria-label={t("admin.ga.delay_hint_label")}
							>
								<Info className="h-4 w-4 text-muted-foreground" />
							</TooltipTrigger>
							<TooltipContent className="max-w-64">
								{t("admin.ga.delay_hint")}
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</>
			}
			headerRight={
				<Select value={period} onValueChange={setPeriod}>
					<SelectTrigger className="w-32">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{GA_PERIOD_OPTIONS.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{t(option.labelKey)}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			}
		>
			<ChartContainer config={chartConfig} className="h-[300px] w-full">
				<AreaChart data={chartRows}>
					<CartesianGrid strokeDasharray="3 3" />
					<XAxis
						dataKey="date"
						tickFormatter={(value: string) =>
							formatCompactDate({
								compactDate: value,
								lng,
								options: { month: "short", day: "numeric" },
							})
						}
						fontSize={12}
					/>
					<YAxis fontSize={12} />
					<ChartTooltip
						content={
							<ChartTooltipContent
								labelFormatter={(value) =>
									formatCompactDate({ compactDate: String(value), lng })
								}
							/>
						}
					/>
					<Area
						type="monotone"
						dataKey="activeUsers"
						stroke="var(--color-activeUsers)"
						fill="var(--color-activeUsers)"
						fillOpacity={0.3}
					/>
				</AreaChart>
			</ChartContainer>
			<p className="mt-2 text-xs text-muted-foreground">
				{t("admin.ga.as_of", {
					date: formatCompactDate({
						compactDate: data.asOf,
						lng,
						options: { month: "long", day: "numeric" },
					}),
				})}
			</p>
		</GaChartCard>
	);
}

/**
 * 네 상태가 공유하는 카드 껍데기.
 *
 * @description 제목은 어느 상태에서나 남고, 지연 배지와 기간 선택은 그래프를 실제로
 * 그릴 때만 붙습니다. 연결이 없는데 기간을 고르게 두면 고를 대상이 없는 선택이 됩니다.
 */
function GaChartCard({
	title,
	titleRight,
	headerRight,
	children,
}: GaChartCardProps) {
	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between">
				<div className="flex items-center gap-2">
					<CardTitle>{title}</CardTitle>
					{titleRight}
				</div>
				{headerRight}
			</CardHeader>
			<CardContent>{children}</CardContent>
		</Card>
	);
}

/** 관리자 전용 라우트라 세션 쿠키만으로 인증됩니다. 헤더를 따로 붙이지 않습니다. */
const fetchActiveUsers = async (
	period: string,
): Promise<TActiveUsersResponse> => {
	const response = await fetch(`/api/admin/ga/active-users?days=${period}`);

	if (!response.ok) {
		throw new Error("GA 활성 사용자를 조회하지 못했습니다.");
	}

	return await response.json();
};

/**
 * 활성 사용자가 0인 날을 0으로 메워 날짜 축을 연속으로 만듭니다.
 *
 * @description GA4가 활성 사용자 0인 날의 행을 아예 주지 않아, 받은 그대로 그리면
 * 빈 날이 축에서 사라지고 앞뒤 점이 곧장 이어집니다. 서버가 "행이 없는 날"과 "0명인
 * 날"을 합치지 않으므로 그 판단을 화면이 맡습니다.
 */
const fillMissingDays = ({
	rows,
	asOf,
	days,
}: {
	rows: IFActiveUsersRow[];
	asOf: string;
	days: number;
}): IFActiveUsersRow[] => {
	const activeUsersByDate = new Map(
		rows.map((row) => [row.date, row.activeUsers]),
	);
	const filledRows: IFActiveUsersRow[] = [];

	for (let offset = days - 1; offset >= 0; offset -= 1) {
		const date = shiftCompactDate(asOf, -offset);

		filledRows.push({ date, activeUsers: activeUsersByDate.get(date) ?? 0 });
	}

	return filledRows;
};

/** 구분자 없는 YYYYMMDD를 days만큼 옮깁니다. UTC 자정으로 고정해 날짜만 셉니다. */
const shiftCompactDate = (compactDate: string, days: number) =>
	new Date(parseCompactDate(compactDate).getTime() + days * 86400000)
		.toISOString()
		.slice(0, 10)
		.replace(/-/g, "");

/** 구분자 없는 YYYYMMDD를 UTC 자정의 Date로 읽습니다. */
const parseCompactDate = (compactDate: string) =>
	new Date(
		`${compactDate.slice(0, 4)}-${compactDate.slice(4, 6)}-${compactDate.slice(6, 8)}T00:00:00Z`,
	);

/** 구분자 없는 YYYYMMDD를 현재 언어의 날짜 표기로 폅니다. */
const formatCompactDate = ({
	compactDate,
	lng,
	options,
}: {
	compactDate: string;
	lng: string;
	options?: Intl.DateTimeFormatOptions;
}) =>
	parseCompactDate(compactDate).toLocaleDateString(
		lng === "ko" ? "ko-KR" : "en-US",
		{ timeZone: "UTC", ...options },
	);

/** GA 활성 사용자 차트의 props. */
interface GaActiveUsersChartProps extends LanguageType {}

/** 카드 껍데기의 props. */
interface GaChartCardProps {
	/** 어느 상태에서나 남는 카드 제목 */
	title: string;
	/** 제목 바로 옆에 붙는 것(지연 배지와 설명 아이콘) */
	titleRight?: ReactNode;
	/** 헤더 우측 끝에 붙는 것(기간 선택 또는 그 자리의 스켈레톤) */
	headerRight?: ReactNode;
	/** 카드 본문. 세 상태 모두 높이가 `h-[300px]`로 같습니다 */
	children: ReactNode;
}

/** 일자별 활성 사용자 한 점. */
interface IFActiveUsersRow {
	/** 구분자 없는 YYYYMMDD */
	date: string;
	/** 그날의 활성 사용자 수 */
	activeUsers: number;
}

/**
 * 활성 사용자 추이 응답.
 *
 * @description `connected`로 가른 유니온인 이유는, 연결된 응답에서만 `asOf`가 항상
 * 채워지기 때문입니다. 한 덩어리로 두면 화면이 `asOf`의 null을 매번 다시 재야 하고,
 * 그러다 "연결 없음"과 "활성 사용자가 없음"이 같은 분기로 합쳐집니다.
 */
type TActiveUsersResponse =
	| {
			/** 크리덴셜이 아직 없는 상태 */
			connected: false;
			rows: IFActiveUsersRow[];
			asOf: null;
	  }
	| {
			/** 실제로 조회한 상태. 행이 비어 있으면 그 기간에 활성 사용자가 없었던 것입니다 */
			connected: true;
			rows: IFActiveUsersRow[];
			asOf: string;
	  };
