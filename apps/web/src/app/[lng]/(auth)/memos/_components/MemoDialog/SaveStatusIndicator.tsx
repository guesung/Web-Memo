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
 * 메모 자동 저장 상태를 아이콘과 텍스트로 보여주는 인디케이터
 * @description Dialog 하단에 상시 노출되어 사용자가 자동 저장 진행 상황을 확인할 수 있게 한다.
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
				className={cn(
					"flex items-center gap-1.5 text-xs font-medium",
					status === "saving" && "text-gray-400",
					status === "saved" && "text-emerald-500",
					status === "error" && "text-red-500",
				)}
				aria-live="polite"
			>
				{status === "saving" && (
					<>
						<LoaderCircle size={13} className="animate-spin" />
						<span>{t("memos.saveStatus.saving")}</span>
					</>
				)}
				{status === "saved" && (
					<>
						<Check size={13} />
						<span>{t("memos.saveStatus.saved")}</span>
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
