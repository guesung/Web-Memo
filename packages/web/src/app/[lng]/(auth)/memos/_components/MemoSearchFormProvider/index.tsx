"use client";

import type { PropsWithChildren } from "react";
import { FormProvider, useForm } from "react-hook-form";

type SearchTargetType = "all" | "title" | "memo";
export type SortByType = "updatedAt" | "createdAt" | "title";
export type SortOrderType = "desc" | "asc";

export interface SearchFormValues {
	searchQuery: string;
	searchTarget: SearchTargetType;
	sortBy: SortByType;
	sortOrder: SortOrderType;
}

export default function MemoSearchFormProvider({
	children,
}: PropsWithChildren) {
	const methods = useForm<SearchFormValues>({
		defaultValues: {
			searchQuery: "",
			searchTarget: "all",
			sortBy: "updatedAt",
			sortOrder: "desc",
		},
	});

	return <FormProvider {...methods}>{children}</FormProvider>;
}
