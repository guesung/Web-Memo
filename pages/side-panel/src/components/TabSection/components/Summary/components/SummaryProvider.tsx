import { useSummary } from "@src/hooks";
import type { PropsWithChildren } from "react";
import { createContext, useContext } from "react";
import { usePageContentContext } from "../../PageContentProvider";

const SummaryContext = createContext<ReturnType<typeof useSummary> | null>(
	null,
);

export const useSummaryContext = () => {
	const context = useContext<ReturnType<typeof useSummary> | null>(
		SummaryContext,
	);

	if (!context) throw new Error("SummaryProvider가 없습니다.");
	return context;
};

export default function SummaryProvider({ children }: PropsWithChildren) {
	const { content, category, isLoading } = usePageContentContext();

	const useSummaryProps = useSummary({
		content,
		category,
		isPageContentLoading: isLoading,
	});

	return (
		<SummaryContext.Provider value={useSummaryProps}>
			{children}
		</SummaryContext.Provider>
	);
}
