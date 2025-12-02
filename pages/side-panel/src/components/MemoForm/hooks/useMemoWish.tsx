import type { MemoInput } from "@src/types/Input";
import { getMemoUrl } from "@src/utils";
import { I18n, Tab } from "@web-memo/shared/utils/extension";
import { ToastAction, toast } from "@web-memo/ui";
import { useFormContext } from "react-hook-form";

interface UseMemoWishProps {
	memoId: number | undefined;
	onWishClick: (isWish: boolean) => Promise<void>;
}

export default function useMemoWish({ memoId, onWishClick }: UseMemoWishProps) {
	const { watch } = useFormContext<MemoInput>();

	const handleWishClick = async () => {
		const isWish = watch("isWish");

		await onWishClick(isWish);

		const handleWishListClick = () => {
			const memoWishListUrl = getMemoUrl({
				id: memoId,
				isWish: !isWish,
			});

			Tab.create({ url: memoWishListUrl });
		};

		toast({
			title: !isWish
				? I18n.get("wish_list_added")
				: I18n.get("wish_list_deleted"),
			action: (
				<ToastAction altText={I18n.get("go_to")} onClick={handleWishListClick}>
					{I18n.get("go_to")}
				</ToastAction>
			),
		});
	};

	return {
		handleWishClick,
	};
}
