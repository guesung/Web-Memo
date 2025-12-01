"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { URL } from "@web-memo/shared/constants";
import { motion } from "framer-motion";
import { Mail, Youtube, MessageCircle, Chrome, Github, Heart } from "lucide-react";
import Link from "next/link";

interface FooterProps extends LanguageType {}

export default function Footer({ lng }: FooterProps) {
	const { t } = useTranslation(lng);

	const socialLinks = [
		{
			icon: Mail,
			href: URL.email,
			label: t("introduce.footer.social.email"),
			color: "hover:text-blue-500",
		},
		{
			icon: Youtube,
			href: URL.youtube,
			label: t("introduce.footer.social.youtube"),
			color: "hover:text-red-500",
		},
		{
			icon: MessageCircle,
			href: URL.kakaoTalk,
			label: t("introduce.footer.social.kakaotalk"),
			color: "hover:text-yellow-500",
		},
	];

	const productLinks = [
		{
			href: URL.chromeStore,
			label: lng === "ko" ? "Chrome 확장 프로그램" : "Chrome Extension",
			external: true,
		},
		{
			href: "#demo",
			label: lng === "ko" ? "기능 살펴보기" : "Features",
			external: false,
		},
	];

	const companyLinks = [
		{
			href: "mailto:pagers@kakao.com",
			label: lng === "ko" ? "문의하기" : "Contact",
			external: false,
		},
	];

	return (
		<motion.footer
			initial={{ opacity: 0 }}
			whileInView={{ opacity: 1 }}
			viewport={{ once: true }}
			transition={{ duration: 0.5 }}
			className="relative bg-gray-900 text-gray-300"
		>
			{/* Gradient Top Border */}
			<div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500" />

			<div className="mx-auto max-w-6xl px-4 py-16">
				{/* Main Footer Content */}
				<div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
					{/* Brand Section */}
					<div className="md:col-span-2">
						<h2 className="text-2xl font-bold text-white mb-4">
							{t("introduce.footer.title")}
						</h2>
						<p className="text-gray-400 mb-6 max-w-md">
							{t("introduce.footer.description")}
						</p>

						{/* Social Links */}
						<div className="flex gap-4">
							{socialLinks.map((link) => (
								<Link
									key={link.label}
									href={link.href}
									target="_blank"
									rel="noopener noreferrer"
									className={`p-3 rounded-lg bg-gray-800 text-gray-400 transition-all duration-300 hover:bg-gray-700 ${link.color}`}
									aria-label={link.label}
								>
									<link.icon className="h-5 w-5" />
								</Link>
							))}
						</div>
					</div>

					{/* Product Links */}
					<div>
						<h3 className="text-white font-semibold mb-4">
							{lng === "ko" ? "제품" : "Product"}
						</h3>
						<ul className="space-y-3">
							{productLinks.map((link) => (
								<li key={link.label}>
									<Link
										href={link.href}
										target={link.external ? "_blank" : undefined}
										rel={link.external ? "noopener noreferrer" : undefined}
										className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
									>
										{link.external && <Chrome className="h-4 w-4" />}
										{link.label}
									</Link>
								</li>
							))}
						</ul>
					</div>

					{/* Company Links */}
					<div>
						<h3 className="text-white font-semibold mb-4">
							{lng === "ko" ? "회사" : "Company"}
						</h3>
						<ul className="space-y-3">
							{companyLinks.map((link) => (
								<li key={link.label}>
									<Link
										href={link.href}
										className="text-gray-400 hover:text-white transition-colors"
									>
										{link.label}
									</Link>
								</li>
							))}
						</ul>
					</div>
				</div>

				{/* Divider */}
				<div className="border-t border-gray-800 pt-8">
					<div className="flex flex-col md:flex-row justify-between items-center gap-4">
						{/* Copyright */}
						<p className="text-gray-500 text-sm">
							&copy; {new Date().getFullYear()} {t("introduce.footer.copyright")}
						</p>

						{/* Made with Love */}
						<p className="text-gray-500 text-sm flex items-center gap-1">
							Made with <Heart className="h-4 w-4 text-red-500 fill-red-500" /> in Korea
						</p>
					</div>
				</div>
			</div>
		</motion.footer>
	);
}
