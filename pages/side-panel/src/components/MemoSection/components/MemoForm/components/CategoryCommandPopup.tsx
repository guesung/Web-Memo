import { CONFIG } from "@web-memo/env";
import { DEFAULT_CATEGORY_COLOR, PATHS } from "@web-memo/shared/constants";
import { analytics } from "@web-memo/shared/modules/analytics";
import type { CategoryRow } from "@web-memo/shared/types";
import { I18n, Tab } from "@web-memo/shared/utils/extension";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@web-memo/ui";
import { CheckIcon, ExternalLinkIcon } from "lucide-react";
import type { TCategoryPopupPosition } from "../hooks";

/** 카테고리 선택 팝업 props */
interface IFCategoryCommandPopupProps {
	/** 팝업 바깥 클릭 판정에 쓰는 컨테이너 ref */
	popupRef: React.RefObject<HTMLDivElement | null>;
	/** 열리자마자 포커스할 검색창 ref */
	commandInputRef: React.RefObject<HTMLInputElement | null>;
	/** fixed 위치(px) */
	position: TCategoryPopupPosition;
	/** 사용자의 카테고리 목록 */
	categories: CategoryRow[] | null | undefined;
	/** 메모에 지정된 카테고리 id. 해당 항목에 체크 표시를 한다 */
	currentCategoryId: number | null;
	/** 카테고리 항목 선택 */
	onCategorySelect: (category: CategoryRow) => void;
	/** 검색창에서 Esc */
	onEscapeKeyDown: () => void;
}

/**
 * 메모 카테고리를 고르는 검색 팝업
 * @description 본문 # 입력과 칩·배지 클릭이 같은 팝업을 쓴다. 카테고리가 하나도 없으면
 * 빈 상태 문구와 웹 설정 페이지 링크를 보여준다. 사용처: MemoForm/index.tsx
 */
const CategoryCommandPopup = (props: IFCategoryCommandPopupProps) => {
	const hasNoCategories = !props.categories?.length;

	const handleCreateOnWebSelect = () => {
		analytics.trackEvent({
			name: "open_web_from_extension",
			params: { from: "side_panel_category" },
		});
		Tab.create({ url: `${CONFIG.webUrl}${PATHS.memosSetting}` });
	};

	return (
		<div
			ref={props.popupRef}
			data-testid="category-popup"
			className="bg-popover fixed z-50 w-64 rounded-md border shadow-lg"
			style={props.position}
		>
			<Command>
				<CommandInput
					ref={props.commandInputRef}
					placeholder={I18n.get("search_category")}
					onKeyDown={(event) => {
						if (event.key === "Escape") {
							props.onEscapeKeyDown();
						}
					}}
				/>
				<CommandList>
					{hasNoCategories ? (
						<>
							<p className="text-muted-foreground px-2 pt-4 pb-2 text-center text-sm">
								{I18n.get("category_empty")}
							</p>
							<CommandItem
								forceMount
								value="create-category-on-web"
								onSelect={handleCreateOnWebSelect}
								className="m-1 justify-center"
							>
								<ExternalLinkIcon aria-hidden="true" />
								{I18n.get("category_create_on_web")}
							</CommandItem>
						</>
					) : (
						<>
							<CommandEmpty>{I18n.get("no_categories_found")}</CommandEmpty>
							<CommandGroup>
								{props.categories?.map((category) => (
									<CommandItem
										key={category.id}
										onSelect={() => props.onCategorySelect(category)}
										className="flex items-center gap-2"
									>
										<div
											className="h-3 w-3 shrink-0 rounded-full"
											style={{
												backgroundColor:
													category.color || DEFAULT_CATEGORY_COLOR,
											}}
										/>
										<span className="truncate">{category.name}</span>
										{category.id === props.currentCategoryId && (
											<CheckIcon className="ml-auto" aria-hidden="true" />
										)}
									</CommandItem>
								))}
							</CommandGroup>
						</>
					)}
				</CommandList>
			</Command>
		</div>
	);
};

export default CategoryCommandPopup;
