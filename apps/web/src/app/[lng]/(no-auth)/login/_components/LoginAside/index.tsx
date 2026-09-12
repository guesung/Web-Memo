import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.server";
import { Separator } from "@web-memo/ui";
import {
	Cloud,
	Globe,
	Mail,
	MessageCircle,
	ShieldCheck,
	Star,
	Users,
} from "lucide-react";

import { CHROME_STORE_STATS } from "../../../introduce/_constants";

/**
 * 로그인 화면에서 계정이 왜 필요한지 설명하는 영역입니다.
 * @description 로그인 페이지까지 온 사람이 버튼을 누르지 않고 떠나는 것이 문제라, 웹스토어
 * 수치로 먼저 믿을 근거를 주고 계정으로 얻는 것 네 가지를 덧붙입니다. 수치는 구조화 데이터와
 * 어긋나면 안 되므로 소개 페이지와 같은 CHROME_STORE_STATS를 씁니다.
 */
export default async function LoginAside({ lng }: IFLoginAsideProps) {
	const { t } = await useTranslation(lng);

	const reasons = [
		{ icon: Globe, text: t("login.aside.crossDevice") },
		{ icon: Cloud, text: t("login.aside.persistent") },
		{ icon: Mail, text: t("login.aside.minimalData") },
		{ icon: ShieldCheck, text: t("login.aside.noMarketing") },
	];

	return (
		<aside className="flex flex-col gap-6">
			<div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
				<span className="flex items-center gap-1.5 font-medium text-foreground">
					<Star className="h-4 w-4 fill-current" />
					{t("login.aside.rating", { rating: CHROME_STORE_STATS.rating })}
				</span>
				<span className="flex items-center gap-1.5">
					<Users className="h-4 w-4" />
					{t("login.aside.userCount", { users: CHROME_STORE_STATS.userCount })}
				</span>
				<span className="flex items-center gap-1.5">
					<MessageCircle className="h-4 w-4" />
					{t("login.aside.reviewCount", {
						reviews: CHROME_STORE_STATS.reviewCount,
					})}
				</span>
			</div>

			<Separator />

			<ul className="flex flex-col gap-4">
				{reasons.map(({ icon: Icon, text }) => (
					<li
						key={text}
						className="flex items-start gap-3 text-sm text-foreground"
					>
						<Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
						<span>{text}</span>
					</li>
				))}
			</ul>
		</aside>
	);
}

/** LoginAside의 props입니다. */
interface IFLoginAsideProps extends LanguageType {}
