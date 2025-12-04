"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { cn } from "@web-memo/shared/utils";
import {
	Button,
	Input,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@web-memo/ui";
import { FileText, Search, StickyNote, X } from "lucide-react";
import { Controller, useFormContext } from "react-hook-form";

import type { SearchFormValues } from "../MemoSearchFormProvider";

interface MemoSearchFormProps extends LanguageType {}

export default function MemoSearchForm({ lng }: MemoSearchFormProps) {
	const { t } = useTranslation(lng);
	const {
		control,
		reset,
		formState: { isDirty },
	} = useFormContext<SearchFormValues>();

	return (
		<form
			className="w-full max-w-4xl mx-auto"
			onSubmit={(e) => e.preventDefault()}
		>
			<div className="flex items-center gap-3">
				<Controller
					name="searchTarget"
					control={control}
					render={({ field }) => (
						<Select onValueChange={field.onChange} value={field.value}>
							<SelectTrigger
								className={cn(
									"w-auto min-w-[130px] h-12",
									"rounded-xl",
									"border-2 border-gray-200 dark:border-gray-800",
									"bg-white dark:bg-gray-900",
									"hover:border-purple-300 dark:hover:border-purple-700",
									"transition-colors",
								)}
							>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">
									<span className="flex items-center gap-2">
										<Search className="h-4 w-4" />
										{t("memos.searchTarget.all")}
									</span>
								</SelectItem>
								<SelectItem value="title">
									<span className="flex items-center gap-2">
										<FileText className="h-4 w-4" />
										{t("memos.searchTarget.title")}
									</span>
								</SelectItem>
								<SelectItem value="memo">
									<span className="flex items-center gap-2">
										<StickyNote className="h-4 w-4" />
										{t("memos.searchTarget.memo")}
									</span>
								</SelectItem>
							</SelectContent>
						</Select>
					)}
				/>

				<Controller
					name="searchQuery"
					control={control}
					render={({ field }) => (
						<div className="relative flex-1">
							<Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
							<Input
								type="text"
								placeholder={t("memos.searchPlaceholder")}
								className={cn(
									"w-full h-12 pl-12 pr-12",
									"text-base",
									"rounded-xl",
									"border-2 border-gray-200 dark:border-gray-800",
									"bg-white dark:bg-gray-900",
									"shadow-sm",
									"focus:border-purple-500 dark:focus:border-purple-500",
									"focus:ring-4 focus:ring-purple-500/20",
									"transition-all",
								)}
								{...field}
							/>
							{isDirty && (
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 p-0 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
									onClick={() => reset()}
									aria-label="Clear search"
								>
									<X className="h-4 w-4" />
								</Button>
							)}
						</div>
					)}
				/>
			</div>
		</form>
	);
}
