import type { LanguageType } from "@src/modules/i18n";
import getTranslation from "@src/modules/i18n/util.server";
import { PATHS } from "@web-memo/shared/constants";
import { SidebarGroup, SidebarMenu } from "@web-memo/ui";
import { Trash2 } from "lucide-react";

import SidebarNavItem from "./SidebarNavItem";

/** 메모 복구 대상인 휴지통을 별도 탐색 섹션으로 표시한다. */
export default async function SidebarTrashSection({ lng }: LanguageType) {
	const { t } = await getTranslation(lng);

	return (
		<SidebarGroup className="p-0">
			<SidebarMenu className="gap-0">
				<SidebarNavItem
					lng={lng}
					href={PATHS.memosTrash}
					label={t("sideBar.trash")}
					icon={<Trash2 size={16} className="text-muted-foreground" />}
					iconChipClassName="bg-foreground/5 group-hover:bg-foreground/10"
				/>
			</SidebarMenu>
		</SidebarGroup>
	);
}
