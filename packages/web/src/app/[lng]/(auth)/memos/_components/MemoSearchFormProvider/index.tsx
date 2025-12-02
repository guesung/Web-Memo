"use client";

import type { MemoSortBy } from "@web-memo/shared/constants";
import type { PropsWithChildren } from "react";
import { FormProvider, useForm } from "react-hook-form";

type SearchTargetType = "all" | "title" | "memo";
export interface SearchFormValues {
	searchQuery: string;
	searchTarget: SearchTargetType;
	sortBy: MemoSortBy;
}

export default function MemoSearchFormProvider({
	children,
}: PropsWithChildren) {
	const methods = useForm<SearchFormValues>({
		defaultValues: {
			searchQuery: "",
			searchTarget: "all",
			sortBy: "updated_at",
		},
	});

	return <FormProvider {...methods}>{children}</FormProvider>;
}
