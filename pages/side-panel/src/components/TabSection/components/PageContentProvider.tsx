import type { Category } from "@web-memo/shared/modules/extension-bridge";
import { bridge } from "@web-memo/shared/modules/extension-bridge";
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

export default function PageContentProvider({ children }: PropsWithChildren) {
	const [state, setState] = useState<PageContentState>(initialState);

	const fetchPageContent = useCallback(async () => {
		setState((prev) => ({
			...prev,
			isLoading: true,
			error: "",
		}));

		try {
			const { content, category } = await bridge.request.PAGE_CONTENT();

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
	};

	return (
		<PageContentContext.Provider value={value}>
			{children}
		</PageContentContext.Provider>
	);
}
