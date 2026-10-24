import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { cn } from "@web-memo/shared/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Check, CircleAlert, LoaderCircle } from "lucide-react";

/**
 * 메모 자동 저장 상태
 * @description idle: 표시 없음, saving: 저장 중, saved: 저장 완료, error: 저장 실패
 */
export type TMemoSaveStatus = "idle" | "saving" | "saved" | "error";

/** SaveStatusIndicator 컴포넌트 props */
interface SaveStatusIndicatorProps extends LanguageType {
	/** 현재 자동 저장 상태 */
	status: TMemoSaveStatus;
}

/**
 * 메모 자동 저장 상태 인디케이터
 * @description 사이드 패널(SaveStatus)과 같이 저장 중·완료는 회색 아이콘만 조용히 보여주고
 * 문구는 툴팁·스크린 리더로만 전한다. 실패만 문구를 드러낸다.
 */
export default function SaveStatusIndicator({
	status,
	lng,
}: SaveStatusIndicatorProps) {
	const { t } = useTranslation(lng);

	if (status === "idle") return null;

	return (
		<AnimatePresence mode="wait">
			<motion.output
				key={status}
				initial={{ opacity: 0, y: 4 }}
				animate={{ opacity: 1, y: 0 }}
				exit={{ opacity: 0, y: -4 }}
				transition={{ duration: 0.15 }}
				data-testid="memo-save-status"
				data-save-status={status}
				title={status === "error" ? undefined : t(`memos.saveStatus.${status}`)}
				className={cn(
					"flex items-center gap-1.5 text-xs font-medium",
					status === "error" ? "text-red-500" : "text-muted-foreground",
				)}
				aria-live="polite"
			>
				{status === "saving" && (
					<>
						<LoaderCircle
							size={13}
							className="animate-spin"
							aria-hidden="true"
						/>
						<span className="sr-only">{t("memos.saveStatus.saving")}</span>
					</>
				)}
				{status === "saved" && (
					<>
						<Check size={13} aria-hidden="true" />
						<span className="sr-only">{t("memos.saveStatus.saved")}</span>
					</>
				)}
				{status === "error" && (
					<>
						<CircleAlert size={13} />
						<span>{t("memos.saveStatus.error")}</span>
					</>
				)}
			</motion.output>
		</AnimatePresence>
	);
}
