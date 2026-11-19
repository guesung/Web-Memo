import { ChartContainer, Line, LineChart, XAxis, YAxis } from "@web-memo/ui";
import type { GaSeriesPoint } from "../_types";

/** 카드 안에 들어가는 축 없는 작은 추이선. 적재가 빠진 날은 선이 끊긴다. */
export default function GaSparkline({ series, selected }: GaSparklineProps) {
	const chartConfig = {
		value: {
			label: "value",
			color: selected ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
		},
	};

	return (
		<ChartContainer
			config={chartConfig}
			className="aspect-auto h-10 w-full"
			aria-hidden
		>
			<LineChart
				data={series}
				margin={{ top: 4, right: 2, bottom: 4, left: 2 }}
			>
				<XAxis dataKey="date" hide />
				<YAxis domain={[0, "auto"]} hide />
				<Line
					dataKey="value"
					stroke="var(--color-value)"
					strokeWidth={1.5}
					dot={false}
					connectNulls={false}
					isAnimationActive={false}
				/>
			</LineChart>
		</ChartContainer>
	);
}

interface GaSparklineProps {
	series: GaSeriesPoint[];
	/** 선택된 카드는 강조색으로 그린다 */
	selected: boolean;
}
