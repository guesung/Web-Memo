import { CheckIcon, Loader2Icon } from "lucide-react";

interface SaveStatusProps {
	isSaving: boolean;
	memo: string;
}

export default function SaveStatus({ isSaving, memo }: SaveStatusProps) {
	return (
		<div className="flex items-center gap-1">
			{isSaving ? (
				<>
					<Loader2Icon className="w-3 h-3 animate-spin text-muted-foreground" />
					<span className="text-xs text-muted-foreground">저장 중...</span>
				</>
			) : (
				memo && (
					<>
						<CheckIcon className="h-3 w-3 text-green-600 dark:text-green-400" />
						<span className="text-xs text-green-600 dark:text-green-400">
							저장됨
						</span>
					</>
				)
			)}
		</div>
	);
}
