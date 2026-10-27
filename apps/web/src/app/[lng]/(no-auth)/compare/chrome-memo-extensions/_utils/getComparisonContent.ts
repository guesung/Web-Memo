import type { Language } from "@src/modules/i18n";
import getTranslation from "@src/modules/i18n/util.server";
import {
	COMPARE_CRITERIA,
	COMPARE_LAST_CHECKED_DATE,
	COMPARE_PRODUCTS,
} from "../_constants";
import type {
	IFCompareCriterion,
	IFCompareProduct,
	IFCompareRecommendation,
	TSupportStatus,
} from "../_types";

const PREFIX = "compareChromeMemoExtensions";

/** Combines language-independent product facts with translated display text. */
export const getComparisonContent = async (lng: Language) => {
	const { t } = await getTranslation(lng);
	const key = (path: string) => `${PREFIX}.${path}`;
	const products: IFCompareProduct[] = COMPARE_PRODUCTS.map((product) => ({
		...product,
		name: t(key(`products.${product.key}.name`)),
		identity: t(key(`products.${product.key}.identity`)),
		sources: product.sources.map((source, index) => ({
			...source,
			label: t(key(`products.${product.key}.sources.${index}`)),
		})),
	}));
	const criteria: IFCompareCriterion[] = COMPARE_CRITERIA.map((criterion) => ({
		key: criterion.key,
		label: t(key(`criteria.${criterion.key}.label`)),
		cells: Object.fromEntries(
			products.map((product) => [
				product.key,
				{
					status: criterion.cells[product.key].status,
					description: t(key(`criteria.${criterion.key}.cells.${product.key}`)),
				},
			]),
		) as IFCompareCriterion["cells"],
	}));
	const recommendations: IFCompareRecommendation[] = [0, 1, 2, 3, 4, 5].map(
		(index) => ({
			situation: t(key(`recommendations.${index}.situation`)),
			productName: t(key(`recommendations.${index}.productName`)),
			...(t(key(`recommendations.${index}.note`), { defaultValue: "" })
				? { note: t(key(`recommendations.${index}.note`)) }
				: {}),
		}),
	);
	const statuses = Object.fromEntries(
		(["supported", "partial", "unsupported", "unknown"] as const).map(
			(status) => [status, t(key(`statuses.${status}`))],
		),
	) as Record<TSupportStatus, string>;

	return {
		hero: {
			badge: t(key("hero.badge")),
			title: t(key("hero.title")),
			descriptions: [
				t(key("hero.descriptions.0")),
				t(key("hero.descriptions.1")),
			],
			disclosure: t(key("hero.disclosure")),
			lastCheckedLabel: t(key("hero.lastCheckedLabel")),
			anchorLabel: t(key("hero.anchorLabel")),
		},
		overview: { title: t(key("overview.title")) },
		comparison: {
			title: t(key("comparison.title")),
			caption: t(key("comparison.caption")),
			loginNote: t(key("comparison.loginNote")),
			criterionHeader: t(key("comparison.criterionHeader")),
			scrollHint: t(key("comparison.scrollHint")),
		},
		recommendation: { title: t(key("recommendation.title")) },
		sources: {
			title: t(key("sources.title")),
			checkedLabel: t(key("sources.checkedLabel")),
			feedback: t(key("sources.feedback")),
			feedbackLinkLabel: t(key("sources.feedbackLinkLabel")),
		},
		finalCTA: {
			title: t(key("finalCTA.title")),
			description: t(key("finalCTA.description")),
		},
		products,
		criteria,
		recommendations,
		statuses,
		lastCheckedDate: COMPARE_LAST_CHECKED_DATE,
	};
};

export type TComparisonContent = Awaited<
	ReturnType<typeof getComparisonContent>
>;
