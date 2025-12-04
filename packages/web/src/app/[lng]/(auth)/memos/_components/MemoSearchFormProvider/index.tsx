"use client";

import type { PropsWithChildren } from "react";
import { FormProvider, useForm } from "react-hook-form";

type SearchTargetType = "all" | "title" | "memo";
export interface SearchFormValues {
	searchQuery: string;
	searchTarget: SearchTargetType;
}

export default function MemoSearchFormProvider({
	children,
}: PropsWithChildren) {
	const methods = useForm<SearchFormValues>({
		defaultValues: {
			searchQuery: "",
			searchTarget: "all",
		},
	});

	return <FormProvider {...methods}>{children}</FormProvider>;
}
