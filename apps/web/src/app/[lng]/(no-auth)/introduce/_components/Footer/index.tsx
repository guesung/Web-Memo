import LocalizedLink from "@src/components/LocalizedLink";
import type { LanguageType } from "@src/modules/i18n";
import getTranslation from "@src/modules/i18n/util.server";
import { EXTERNAL_LINK, PATHS } from "@web-memo/shared/constants";
import { Chrome, Mail, MessageCircle, Scale, Youtube } from "lucide-react";
import Link from "next/link";
import type { ComponentType } from "react";
import { GooglePlayIcon } from "../StoreIcon";

/**
 * 랜딩 푸터.
 * @description
 * 아이콘은 항목마다 `icon` 필드로 갖는다. 외부 링크인지와 어느 제품으로 이동하는지는
 * 서로 다른 정보이므로 한 필드로 묶지 않는다.
 */

/** 링크 앞에 붙는 아이콘. lucide와 `StoreIcon`의 브랜드 로고를 함께 받는다 */
type TLinkIcon = ComponentType<{ className?: string }>;

interface FooterProps extends LanguageType {}

export default async function Footer({ lng }: FooterProps) {
	const { t } = await getTranslation(lng);

	const socialLinks: { icon: TLinkIcon; href: string; label: string }[] = [
		{
			icon: Mail,
			href: EXTERNAL_LINK.contactEmail,
			label: t("introduce.footer.social.email"),
		},
		{
			icon: Youtube,
			href: EXTERNAL_LINK.youtubeChannel,
			label: t("introduce.footer.social.youtube"),
		},
		{
			icon: MessageCircle,
			href: EXTERNAL_LINK.kakaoOpenChat,
			label: t("introduce.footer.social.kakaotalk"),
		},
	];

	const productLinks: {
		href: string;
		label: string;
		icon?: TLinkIcon;
		isExternal?: boolean;
	}[] = [
		{
			href: EXTERNAL_LINK.chromeWebStoreListing,
			label: t("introduce.footer.chrome_extension"),
			icon: Chrome,
			isExternal: true,
		},
		{
			href: EXTERNAL_LINK.playStoreListing,
			label: t("introduce.footer.android_app"),
			icon: GooglePlayIcon,
			isExternal: true,
		},
		{
			href: "#demo",
			label: t("introduce.footer.features_link"),
		},
		...(lng === "ko"
			? [
					{
						href: `/${lng}${PATHS.compareChromeMemoExtensions}`,
						label: "크롬 메모 확장 비교",
						icon: Scale,
					},
				]
			: []),
	];

	const companyLinks = [
		{
			href: EXTERNAL_LINK.contactEmail,
			label: t("introduce.footer.contact_link"),
		},
	];

	return (
		<footer className="border-t border-border bg-background text-muted-foreground">
			<div className="mx-auto max-w-[1200px] px-6 py-16">
				<div className="mb-14 grid gap-12 md:grid-cols-4">
					<div className="md:col-span-2">
						<h2 className="text-xl tracking-[-0.015em] text-foreground">
							{t("introduce.footer.title")}
						</h2>

						<p className="mt-3 max-w-md leading-relaxed">
							{t("introduce.footer.description")}
						</p>

						<div className="mt-6 flex gap-3">
							{socialLinks.map((link) => (
								<Link
									key={link.label}
									href={link.href}
									target="_blank"
									rel="noopener noreferrer"
									className="flex h-11 w-11 items-center justify-center rounded-full border border-border transition-colors duration-base hover:text-foreground"
									aria-label={link.label}
								>
									<link.icon className="h-4 w-4" />
								</Link>
							))}
						</div>
					</div>

					<div>
						<h3 className="text-sm text-foreground">
							{t("introduce.footer.product.title")}
						</h3>

						<ul className="mt-4 space-y-3 text-sm">
							{productLinks.map((link) => (
								<li key={link.label}>
									<Link
										href={link.href}
										target={link.isExternal ? "_blank" : undefined}
										rel={link.isExternal ? "noopener noreferrer" : undefined}
										className="flex items-center gap-2 transition-colors duration-base hover:text-foreground"
									>
										{link.icon ? <link.icon className="h-4 w-4" /> : null}
										{link.label}
									</Link>
								</li>
							))}
						</ul>
					</div>

					<div>
						<h3 className="text-sm text-foreground">
							{t("introduce.footer.company.title")}
						</h3>

						<ul className="mt-4 space-y-3 text-sm">
							{companyLinks.map((link) => (
								<li key={link.label}>
									<Link
										href={link.href}
										className="transition-colors duration-base hover:text-foreground"
									>
										{link.label}
									</Link>
								</li>
							))}
						</ul>
					</div>
				</div>

				<div className="flex flex-col items-center justify-between gap-4 border-t border-border pt-8 text-sm md:flex-row">
					<p>
						&copy; {new Date().getFullYear()} {t("introduce.footer.copyright")}
					</p>

					<LocalizedLink
						lng={lng}
						href="/privacy"
						className="transition-colors duration-base hover:text-foreground"
					>
						{t("introduce.footer.legal.privacy_policy")}
					</LocalizedLink>
				</div>
			</div>
		</footer>
	);
}
