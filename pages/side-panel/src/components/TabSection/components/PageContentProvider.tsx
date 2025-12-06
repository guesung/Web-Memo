import type { Category } from "@web-memo/shared/modules/extension-bridge";
import { ExtensionBridge } from "@web-memo/shared/modules/extension-bridge";
import { checkYoutubeUrl } from "@web-memo/shared/utils";
import { Tab } from "@web-memo/shared/utils/extension";
import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useState } from "react";

interface PageContentState {
	content: string;
	category: Category;
	isLoading: boolean;
	error: string;
}

interface PageContentContextValue extends PageContentState {
	fetchPageContent: () => Promise<void>;
	resetPageContent: () => void;
}

const initialState: PageContentState = {
	content: "",
	category: "others",
	isLoading: false,
	error: "",
};

const PageContentContext = createContext<PageContentContextValue | null>(null);

export function usePageContentContext() {
	const context = useContext(PageContentContext);

	if (!context) {
		throw new Error("PageContentProvider가 없습니다.");
	}

	return context;
}

async function fetchYoutubeTranscript(): Promise<string> {
	const result = await ExtensionBridge.requestYoutubeTranscript();

	if (!result.success) {
		throw new Error(result.error ?? "Failed to extract transcript");
	}

	return result.transcript;
}

async function getPageContent(
	url: string,
): Promise<{ content: string; category: Category }> {
	const isYoutube = checkYoutubeUrl(url);

	if (isYoutube) {
		const transcript = await fetchYoutubeTranscript();
		return {
			content: transcript,
			category: "youtube",
		};
	}

	const { content } = await ExtensionBridge.requestPageContent();
	return {
		content,
		category: "others",
	};
}

export default function PageContentProvider({ children }: PropsWithChildren) {
	const [state, setState] = useState<PageContentState>(initialState);

	const resetPageContent = useCallback(() => {
		setState(initialState);
	}, []);

	const fetchPageContent = useCallback(async () => {
		setState((prev) => ({
			...prev,
			isLoading: true,
			error: "",
		}));

		try {
			const tabs = await Tab.get();
			if (!tabs?.url) {
				throw new Error("탭 URL을 가져올 수 없습니다.");
			}

			const { content, category } = await getPageContent(tabs.url);

			setState({
				content,
				category,
				isLoading: false,
				error: "",
			});
		} catch (error) {
			setState((prev) => ({
				...prev,
				isLoading: false,
				error:
					error instanceof Error
						? error.message
						: "페이지 콘텐츠를 가져오는데 실패했습니다.",
			}));
		}
	}, []);

	const value: PageContentContextValue = {
		...state,
		fetchPageContent,
		resetPageContent,
	};

	return (
		<PageContentContext.Provider value={value}>
			{children}
		</PageContentContext.Provider>
	);
}
