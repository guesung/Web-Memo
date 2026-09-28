import type { InitialProps } from "expo-share-extension";
import { close, openHostApp } from "expo-share-extension";
import { AlertTriangle, Check } from "lucide-react-native";
import { useState } from "react";
import {
	ActivityIndicator,
	Image,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { appendMemoText } from "@/lib/sharing/memoAppend";
import { getFallbackTitle } from "@/lib/sharing/pageMetadata";
import { memoService } from "@/lib/supabase/client";
import { useShareExtensionSave } from "./useShareExtensionSave";

/**
 * iOS 공유 시트에서 뜨는 위시 저장 화면의 루트 컴포넌트.
 * @description 열리자마자 위시 저장을 시도한다. 성공하면 메모를 남길 수 있고, 후보가
 * 여럿이거나 오류·비로그인이면 안내와 함께 본 앱으로 넘길 수 있는 버튼을 보여준다.
 */
export default function ShareExtension({ url, text }: InitialProps) {
	const sharedUrl = url ?? text ?? "";
	const { status, title, favIconUrl, memo, onRetryButtonClick } =
		useShareExtensionSave(sharedUrl);
	const [memoText, setMemoText] = useState("");
	const [isSavingMemo, setIsSavingMemo] = useState(false);
	const [didSaveMemo, setDidSaveMemo] = useState(false);

	const handleCompleteButtonClick = () => {
		close();
	};

	const handleCancelButtonClick = () => {
		close();
	};

	const handleOpenHostAppButtonClick = () => {
		openHostApp(
			`share?url=${encodeURIComponent(sharedUrl)}&title=${encodeURIComponent(title)}`,
		);
	};

	const handleMemoSaveButtonClick = async () => {
		if (!memo) {
			return;
		}
		setIsSavingMemo(true);
		try {
			const result = await memoService.updateMemo({
				id: memo.id,
				request: { memo: appendMemoText(memo.memo, memoText.trim()) },
			});
			if (result.error) {
				throw result.error;
			}
			setDidSaveMemo(true);
			setTimeout(() => close(), 900);
		} catch {
			setIsSavingMemo(false);
		}
	};

	if (!sharedUrl) {
		return (
			<View className="flex-1 items-center justify-center bg-white dark:bg-neutral-900 p-6">
				<Text
					className="text-neutral-500 dark:text-neutral-400"
					allowFontScaling={false}
				>
					공유할 수 있는 링크가 없어요.
				</Text>
			</View>
		);
	}

	if (status === "loading") {
		return (
			<View className="flex-1 items-center justify-center bg-white dark:bg-neutral-900 p-8">
				<ActivityIndicator color="#5b93f0" />
			</View>
		);
	}

	if (status === "not-logged-in") {
		return (
			<WarningPanel
				icon={<AlertTriangle size={22} color="#f97316" />}
				title="로그인하지 않은 상태에서는 앱에서 담아요"
				primaryLabel="앱에서 담기"
				onPrimaryButtonClick={handleOpenHostAppButtonClick}
				onCloseButtonClick={handleCancelButtonClick}
			/>
		);
	}

	if (status === "multiple-candidates") {
		return (
			<WarningPanel
				icon={<AlertTriangle size={22} color="#f97316" />}
				title="이 페이지에 메모가 여러 개 있어요"
				description="어느 메모에 담을지 골라야 합니다. 공유 요청은 보관해 두었어요."
				primaryLabel="앱에서 고르기"
				onPrimaryButtonClick={handleOpenHostAppButtonClick}
				onCloseButtonClick={handleCancelButtonClick}
			/>
		);
	}

	if (status === "error") {
		return (
			<WarningPanel
				icon={<AlertTriangle size={22} color="#ef4444" />}
				title="저장하지 못했어요"
				description="네트워크를 확인해 주세요. 공유 요청은 보관했고, 앱을 열면 다시 담습니다."
				primaryLabel="다시 시도"
				onPrimaryButtonClick={onRetryButtonClick}
				onCloseButtonClick={handleCancelButtonClick}
			/>
		);
	}

	// status === "saved"
	if (didSaveMemo) {
		return (
			<View className="flex-1 items-center justify-center gap-2 bg-white dark:bg-neutral-900 p-6">
				<Check size={22} color="#22c55e" />
				<Text
					className="text-neutral-700 dark:text-neutral-200"
					allowFontScaling={false}
				>
					메모를 저장했습니다
				</Text>
			</View>
		);
	}

	const isMemoTextEmpty = memoText.trim().length === 0;

	return (
		<View className="flex-1 gap-4 bg-white dark:bg-neutral-900 p-5">
			<View className="flex-row items-center gap-2">
				<Check size={18} color="#22c55e" />
				<Text
					className="font-semibold text-neutral-900 dark:text-white"
					allowFontScaling={false}
				>
					위시리스트에 추가되었습니다
				</Text>
			</View>
			<View className="flex-row items-center gap-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 p-3">
				{favIconUrl ? (
					<Image source={{ uri: favIconUrl }} className="h-8 w-8 rounded" />
				) : null}
				<View className="flex-1">
					<Text
						numberOfLines={1}
						className="font-medium text-neutral-900 dark:text-white text-sm"
						allowFontScaling={false}
					>
						{title}
					</Text>
					<Text
						numberOfLines={1}
						className="text-neutral-400 text-xs"
						allowFontScaling={false}
					>
						{getFallbackTitle(sharedUrl)}
					</Text>
				</View>
			</View>
			<TextInput
				value={memoText}
				onChangeText={setMemoText}
				placeholder="메모를 남겨보세요 (선택)"
				placeholderTextColor="#a3a3a3"
				allowFontScaling={false}
				multiline
				className="min-h-[72px] rounded-xl border border-neutral-200 dark:border-neutral-700 p-3 text-neutral-900 dark:text-white"
			/>
			{isMemoTextEmpty ? (
				<TouchableOpacity
					onPress={handleCompleteButtonClick}
					className="items-center rounded-xl bg-[#5b93f0] py-3"
				>
					<Text className="font-semibold text-white" allowFontScaling={false}>
						완료
					</Text>
				</TouchableOpacity>
			) : (
				<View className="flex-row gap-3">
					<TouchableOpacity
						onPress={handleCancelButtonClick}
						className="flex-1 items-center rounded-xl border border-neutral-200 dark:border-neutral-700 py-3"
					>
						<Text
							className="font-semibold text-neutral-700 dark:text-neutral-200"
							allowFontScaling={false}
						>
							취소
						</Text>
					</TouchableOpacity>
					<TouchableOpacity
						onPress={handleMemoSaveButtonClick}
						disabled={isSavingMemo}
						className="flex-1 items-center rounded-xl bg-[#5b93f0] py-3"
					>
						{isSavingMemo ? (
							<ActivityIndicator color="#ffffff" />
						) : (
							<Text
								className="font-semibold text-white"
								allowFontScaling={false}
							>
								메모 저장
							</Text>
						)}
					</TouchableOpacity>
				</View>
			)}
		</View>
	);
}

/** 경고 패널 컴포넌트가 받는 값. */
interface IFWarningPanelProps {
	icon: React.ReactNode;
	title: string;
	description?: string;
	primaryLabel: string;
	onPrimaryButtonClick: () => void;
	onCloseButtonClick: () => void;
}

/** 오류·다중 후보·비로그인처럼 사용자가 판단해야 하는 상태를 보여주는 경고 패널. */
function WarningPanel({
	icon,
	title,
	description,
	primaryLabel,
	onPrimaryButtonClick,
	onCloseButtonClick,
}: IFWarningPanelProps) {
	return (
		<View className="flex-1 items-center justify-center gap-3 bg-white dark:bg-neutral-900 p-6">
			{icon}
			<Text
				className="text-center font-semibold text-neutral-900 dark:text-white"
				allowFontScaling={false}
			>
				{title}
			</Text>
			{description ? (
				<Text
					className="text-center text-neutral-500 dark:text-neutral-400 text-sm"
					allowFontScaling={false}
				>
					{description}
				</Text>
			) : null}
			<View className="mt-2 w-full flex-row gap-3">
				<TouchableOpacity
					onPress={onCloseButtonClick}
					className="flex-1 items-center rounded-xl border border-neutral-200 dark:border-neutral-700 py-3"
				>
					<Text
						className="font-semibold text-neutral-700 dark:text-neutral-200"
						allowFontScaling={false}
					>
						닫기
					</Text>
				</TouchableOpacity>
				<TouchableOpacity
					onPress={onPrimaryButtonClick}
					className="flex-1 items-center rounded-xl bg-[#5b93f0] py-3"
				>
					<Text className="font-semibold text-white" allowFontScaling={false}>
						{primaryLabel}
					</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
}
