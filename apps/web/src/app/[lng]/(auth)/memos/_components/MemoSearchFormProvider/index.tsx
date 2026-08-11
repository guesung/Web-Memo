"use client";

import type { MemoSearchTarget } from "@web-memo/shared/utils";
import type { PropsWithChildren } from "react";
import { FormProvider, useForm } from "react-hook-form";

export interface SearchFormValues {
	searchQuery: string;
	searchTarget: MemoSearchTarget;
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
