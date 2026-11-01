import { useTabQuery } from "@web-memo/shared/hooks";
import type { Category } from "@web-memo/shared/modules/extension-bridge";
import { bridge } from "@web-memo/shared/modules/extension-bridge";
import type { PropsWithChildren } from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";

interface PageContentState {
	pageKey: string;
	content: string;
	category: Category;
	isLoading: boolean;
	error: string;
}

interface PageContentContextValue extends PageContentState {
	fetchPageContent: () => Promise<void>;
}

const initialState: PageContentState = {
	pageKey: "",
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
	const { data: tab, dataUpdatedAt, isLoading: isTabLoading } = useTabQuery();
	const pageKey =
		tab?.id !== undefined && tab.url ? JSON.stringify([tab.id, tab.url]) : "";
	const [state, setState] = useState<PageContentState>(initialState);
	const requestIdRef = useRef(0);

	const fetchPageContent = useCallback(async () => {
		if (!pageKey) return;
		const requestId = ++requestIdRef.current;
		setState({
			pageKey,
			content: "",
			category: "others",
			isLoading: true,
			error: "",
		});

		try {
			const { content, category } = await bridge.request.PAGE_CONTENT();
			if (requestId !== requestIdRef.current) return;

			setState({
				pageKey,
				content,
				category,
				isLoading: false,
				error: "",
			});
		} catch (error) {
			if (requestId !== requestIdRef.current) return;
			setState({
				pageKey,
				content: "",
				category: "others",
				isLoading: false,
				error:
					error instanceof Error
						? error.message
						: "페이지 콘텐츠를 가져오는데 실패했습니다.",
			});
		}
	}, [pageKey]);

	useEffect(() => {
		if (dataUpdatedAt > 0) void fetchPageContent();
		return () => {
			requestIdRef.current += 1;
		};
	}, [fetchPageContent, dataUpdatedAt]);

	const currentState =
		state.pageKey === pageKey
			? state
			: {
					...initialState,
					pageKey,
					isLoading: Boolean(pageKey) || isTabLoading,
				};

	const value: PageContentContextValue = {
		...currentState,
		fetchPageContent,
	};

	return (
		<PageContentContext.Provider value={value}>
			{children}
		</PageContentContext.Provider>
	);
}
