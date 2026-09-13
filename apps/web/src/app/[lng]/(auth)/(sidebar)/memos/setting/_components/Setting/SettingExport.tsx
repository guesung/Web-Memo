"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import type { GetMemoResponse } from "@web-memo/shared/types";
import type { ExportFormat } from "@web-memo/shared/utils";
import { exportMemos, MemoService } from "@web-memo/shared/utils";
import { getSupabaseClient } from "@web-memo/shared/utils/web";
import {
	Button,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@web-memo/ui";
import {
	Download,
	FileJson,
	FileSpreadsheet,
	FileText,
	Loader2,
} from "lucide-react";
import { useState } from "react";

import SettingRow from "./SettingRow";

interface IFSettingExportProps extends LanguageType {}

/** 메모 전체를 파일로 내려받는 설정 */
export default function SettingExport({ lng }: IFSettingExportProps) {
	const { t } = useTranslation(lng);
	const [isLoading, setIsLoading] = useState(false);
	const [isOpen, setIsOpen] = useState(false);

	const handleExport = async (format: ExportFormat) => {
		setIsLoading(true);
		setIsOpen(false);

		try {
			const supabaseClient = getSupabaseClient();
			const memoService = new MemoService(supabaseClient);
			const { data } = await memoService.getMemos();

			if (data && data.length > 0) {
				exportMemos(data as GetMemoResponse[], format);
			}
		} catch (error) {
			console.error("Export failed:", error);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<SettingRow
			label={t("setting.export")}
			description={t("setting.exportDescription")}
		>
			<DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
				<DropdownMenuTrigger asChild>
					<Button
						variant="outline"
						className="max-sm:w-full"
						disabled={isLoading}
					>
						{isLoading ? (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						) : (
							<Download className="mr-2 h-4 w-4" />
						)}
						{t("setting.exportMemos")}
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start">
					<DropdownMenuItem onClick={() => handleExport("json")}>
						<FileJson className="mr-2 h-4 w-4" />
						JSON
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => handleExport("csv")}>
						<FileSpreadsheet className="mr-2 h-4 w-4" />
						CSV
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => handleExport("markdown")}>
						<FileText className="mr-2 h-4 w-4" />
						Markdown
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</SettingRow>
	);
}
