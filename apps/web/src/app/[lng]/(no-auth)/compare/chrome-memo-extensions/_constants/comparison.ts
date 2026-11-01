import type { Language } from "@src/modules/i18n";
import { EXTERNAL_LINK } from "@web-memo/shared/constants";
import type { IFCompareCriterionFact, IFCompareProductFact } from "../_types";

/** Date the cited product information was last verified. */
export const COMPARE_LAST_CHECKED_DATE = "2026-10-27";
export const COMPARE_PAGE_PATH = "/compare/chrome-memo-extensions";

export const COMPARE_ARTICLE_PUBLISHED_DATE: Record<Language, string> = {
	ko: "2026-09-24",
	en: "2026-10-27",
};
export const COMPARE_ARTICLE_MODIFIED_DATE = "2026-10-27";

export const COMPARE_PRODUCTS: IFCompareProductFact[] = [
	{
		key: "webMemo",
		sources: [
			{
				url: EXTERNAL_LINK.chromeWebStoreListing,
			},
		],
	},
	{
		key: "notionWebClipper",
		sources: [
			{
				url: "https://www.notion.com/web-clipper",
			},
			{
				url: "https://www.notion.com/help/web-clipper",
			},
			{
				url: "https://www.notion.com/pricing",
			},
			{
				url: "https://www.notion.com/help/export-your-content",
			},
		],
	},
	{
		key: "liner",
		sources: [
			{
				url: "https://liner.com",
			},
			{
				url: "https://liner.com/pricing",
			},
			{
				url: "https://support.liner.com/hc/en-us/articles/29882619907737-What-s-new-March-2024",
			},
			{
				url: "https://liner.com/learn/liner-highlighter",
			},
			{
				url: "https://chromewebstore.google.com/detail/liner-chatgpt-ai-copilot/bmhcbmnbenmcecpmpepghooflbehcack",
			},
		],
	},
	{
		key: "glasp",
		sources: [
			{
				url: "https://glasp.co",
			},
			{
				url: "https://blog.glasp.co/faqs/",
			},
			{
				url: "https://glasp.co/web-highlighter",
			},
			{
				url: "https://glasp.co/support",
			},
			{
				url: "https://glasp.co/pricing",
			},
			{
				url: "https://glasp.co/youtube-summary",
			},
			{
				url: "https://chromewebstore.google.com/detail/glasp-web-highlighter-pdf/blillmbchncajnhkjfdnincfndboieik",
			},
		],
	},
	{
		key: "googleKeep",
		sources: [
			{
				url: "https://chromewebstore.google.com/detail/google-keep-chrome-extens/lpcaedmchfhocbbapmcbpinfpgnhiddi",
			},
			{
				url: "https://support.google.com/keep/answer/3003125",
			},
			{
				url: "https://support.google.com/keep/answer/10017039",
			},
		],
	},
];

export const COMPARE_CRITERIA: IFCompareCriterionFact[] = [
	{
		key: "recordingMethod",
		cells: {
			webMemo: {
				status: "supported",
			},
			notionWebClipper: {
				status: "supported",
			},
			liner: {
				status: "supported",
			},
			glasp: {
				status: "supported",
			},
			googleKeep: {
				status: "supported",
			},
		},
	},
	{
		key: "memoBesidePage",
		cells: {
			webMemo: {
				status: "supported",
			},
			notionWebClipper: {
				status: "partial",
			},
			liner: {
				status: "partial",
			},
			glasp: {
				status: "partial",
			},
			googleKeep: {
				status: "partial",
			},
		},
	},
	{
		key: "highlight",
		cells: {
			webMemo: {
				status: "supported",
			},
			notionWebClipper: {
				status: "unknown",
			},
			liner: {
				status: "supported",
			},
			glasp: {
				status: "supported",
			},
			googleKeep: {
				status: "partial",
			},
		},
	},
	{
		key: "aiSummary",
		cells: {
			webMemo: {
				status: "partial",
			},
			notionWebClipper: {
				status: "partial",
			},
			liner: {
				status: "supported",
			},
			glasp: {
				status: "partial",
			},
			googleKeep: {
				status: "unknown",
			},
		},
	},
	{
		key: "youtube",
		cells: {
			webMemo: {
				status: "partial",
			},
			notionWebClipper: {
				status: "partial",
			},
			liner: {
				status: "supported",
			},
			glasp: {
				status: "supported",
			},
			googleKeep: {
				status: "partial",
			},
		},
	},
	{
		key: "export",
		cells: {
			webMemo: {
				status: "supported",
			},
			notionWebClipper: {
				status: "supported",
			},
			liner: {
				status: "partial",
			},
			glasp: {
				status: "supported",
			},
			googleKeep: {
				status: "partial",
			},
		},
	},
	{
		key: "koreanInterface",
		cells: {
			webMemo: {
				status: "supported",
			},
			notionWebClipper: {
				status: "unknown",
			},
			liner: {
				status: "supported",
			},
			glasp: {
				status: "supported",
			},
			googleKeep: {
				status: "supported",
			},
		},
	},
	{
		key: "login",
		cells: {
			webMemo: {
				status: "unsupported",
			},
			notionWebClipper: {
				status: "partial",
			},
			liner: {
				status: "unknown",
			},
			glasp: {
				status: "partial",
			},
			googleKeep: {
				status: "unknown",
			},
		},
	},
];
