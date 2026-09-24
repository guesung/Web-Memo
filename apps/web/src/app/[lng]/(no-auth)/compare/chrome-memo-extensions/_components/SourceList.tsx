import { EXTERNAL_LINK } from "@web-memo/shared/constants";
import { ExternalLink } from "lucide-react";
import {
	COMPARE_LAST_CHECKED_DATE,
	COMPARE_PAGE_COPY,
	COMPARE_PRODUCTS,
} from "../_constants";

/** 제품별 근거 링크와 확인 날짜. 링크는 모두 새 탭으로 연다 */
const SourceList = () => {
	const { checkedLabel, feedback, feedbackLinkLabel } =
		COMPARE_PAGE_COPY.sources;

	return (
		<div>
			<ul className="border-t border-border">
				{COMPARE_PRODUCTS.map((product) => (
					<li
						key={product.key}
						className="flex flex-col gap-2 border-b border-border py-5 sm:flex-row sm:items-baseline sm:gap-6"
					>
						<span className="w-40 flex-shrink-0 font-medium">
							{product.name}
						</span>

						<span className="flex flex-1 flex-wrap gap-x-4 gap-y-1 text-sm">
							{product.sources.map((source) => (
								<a
									key={source.url}
									href={source.url}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
								>
									{source.label}
									<ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
								</a>
							))}
						</span>

						<span className="text-sm text-muted-foreground">
							{checkedLabel} {COMPARE_LAST_CHECKED_DATE}
						</span>
					</li>
				))}
			</ul>

			<p className="mt-6 text-sm text-muted-foreground">
				{feedback}{" "}
				<a
					href={EXTERNAL_LINK.contactEmail}
					className="text-foreground underline underline-offset-4"
				>
					{feedbackLinkLabel}
				</a>
			</p>
		</div>
	);
};

export default SourceList;
