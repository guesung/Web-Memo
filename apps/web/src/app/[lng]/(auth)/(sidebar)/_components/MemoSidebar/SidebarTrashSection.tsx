import type { LanguageType } from "@src/modules/i18n";
import { PATHS } from "@web-memo/shared/constants";
import { SidebarGroup, SidebarMenu } from "@web-memo/ui";
import { Trash2 } from "lucide-react";

import SidebarNavItem from "./SidebarNavItem";

/** 휴지통 섹션의 입력값. */
interface IFSidebarTrashSectionProps extends LanguageType {
	/** 현지화된 휴지통 이름. */
	label: string;
}

/** 메모 복구 대상인 휴지통을 별도 탐색 섹션으로 표시한다. */
const SidebarTrashSection = ({ lng, label }: IFSidebarTrashSectionProps) => (
	<SidebarGroup className="p-0">
		<SidebarMenu className="gap-0">
			<SidebarNavItem
				lng={lng}
				href={PATHS.memosTrash}
				label={label}
				icon={<Trash2 size={16} className="text-muted-foreground" />}
				iconChipClassName="bg-foreground/5 group-hover:bg-foreground/10"
			/>
		</SidebarMenu>
	</SidebarGroup>
);

export default SidebarTrashSection;
