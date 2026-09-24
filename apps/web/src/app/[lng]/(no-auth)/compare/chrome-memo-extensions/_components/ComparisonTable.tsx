import {
	COMPARE_CRITERIA,
	COMPARE_PAGE_COPY,
	COMPARE_PRODUCTS,
} from "../_constants";
import type { TSupportStatus } from "../_types";
import SupportMark from "./SupportMark";

/**
 * 제품(열) × 기준(행) 비교표와 범례.
 * @description
 * 기준 열은 가로 스크롤 중에도 보이도록 왼쪽에 고정한다. 고정 셀은 뒤로 지나가는
 * 셀을 가려야 하므로 반투명이 아닌 역할 토큰 배경을 쓴다.
 * `<caption>`은 스크롤 영역 안에서 잘리지 않도록 화면 읽기 도구용으로만 두고,
 * 같은 문구를 표 위에 한 번 더 보인다.
 */
const ComparisonTable = () => {
	const { caption, loginNote, criterionHeader, scrollHint } =
		COMPARE_PAGE_COPY.comparison;

	return (
		<div>
			<ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
				{LEGEND_STATUSES.map((status) => (
					<li key={status}>
						<SupportMark status={status} />
					</li>
				))}
			</ul>

			<p aria-hidden="true" className="mt-4 text-sm text-muted-foreground">
				{caption}
			</p>
			<p className="mt-2 text-sm text-muted-foreground sm:hidden">
				{scrollHint}
			</p>

			<div className="relative mt-4 overflow-x-auto rounded-lg border border-border">
				<table className="w-full min-w-[56rem] border-collapse text-left text-sm">
					<caption className="sr-only">{caption}</caption>
					<thead className="bg-muted">
						<tr>
							<th
								scope="col"
								className="sticky left-0 z-10 w-40 bg-muted px-4 py-3 font-semibold"
							>
								{criterionHeader}
							</th>
							{COMPARE_PRODUCTS.map((product) => (
								<th
									key={product.key}
									scope="col"
									className="px-4 py-3 font-semibold"
								>
									{product.name}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{COMPARE_CRITERIA.map((criterion) => (
							<tr key={criterion.key} className="border-border border-t">
								<th
									scope="row"
									className="sticky left-0 z-10 bg-background px-4 py-3 text-left align-top font-medium text-foreground"
								>
									{criterion.label}
								</th>
								{COMPARE_PRODUCTS.map((product) => {
									const cell = criterion.cells[product.key];

									return (
										<td
											key={product.key}
											className="px-4 py-3 align-top leading-relaxed text-muted-foreground"
										>
											<SupportMark
												status={cell.status}
												description={cell.description}
											/>
										</td>
									);
								})}
							</tr>
						))}
					</tbody>
				</table>
			</div>

			<p className="mt-4 text-sm text-muted-foreground">{loginNote}</p>
		</div>
	);
};

export default ComparisonTable;

const LEGEND_STATUSES: TSupportStatus[] = [
	"supported",
	"partial",
	"unsupported",
	"unknown",
];
