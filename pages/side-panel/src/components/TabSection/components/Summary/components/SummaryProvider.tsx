import { useSummary } from "@src/hooks";
import type { PropsWithChildren } from "react";
import { createContext, useContext } from "react";

const SummaryContext = createContext<ReturnType<typeof useSummary> | null>(
	null,
);

export function useSummaryContext(): ReturnType<typeof useSummary> {
	const context = useContext<ReturnType<typeof useSummary> | null>(
		SummaryContext,
	);

	if (!context) throw new Error("SummaryProvider가 없습니다.");
	return context;
}

export default function SummaryProvider({ children }: PropsWithChildren) {
	const useSummaryProps = useSummary();

	return (
		<SummaryContext.Provider value={useSummaryProps}>
			{children}
		</SummaryContext.Provider>
	);
}
