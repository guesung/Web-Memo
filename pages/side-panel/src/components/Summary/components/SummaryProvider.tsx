import { useSummary } from "@src/hooks";
import type { PropsWithChildren } from "react";
import { createContext, useContext } from "react";

interface SummaryContext extends ReturnType<typeof useSummary> {}

const SummaryContext = createContext<SummaryContext>({
	refetchSummary: async () => {},
	isSummaryLoading: false,
	category: "others",
	summary: "",
	errorMessage: "",
});

export const useSummaryContext = () => {
	const context = useContext<SummaryContext>(SummaryContext);

	if (!context) throw new Error("SummaryProvider가 없습니다.");
	return context;
};

export default function SummaryProvider({ children }: PropsWithChildren) {
	const useSummaryProps = useSummary();

	return (
		<SummaryContext.Provider value={useSummaryProps}>
			{children}
		</SummaryContext.Provider>
	);
}
