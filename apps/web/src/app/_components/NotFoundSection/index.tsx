"use client";

import LocalizedLink from "@src/components/LocalizedLink";
import type { Language } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { FileSearch } from "lucide-react";
import Link from "next/link";

interface IFNotFoundSectionProps {
	/**
	 * 서버에서 이미 알고 있는 언어. 경로 기반 클라이언트 감지가 통하지 않는 자리
	 * (예: `global-not-found.tsx`)에서 넘긴다. 생략하면 기존처럼 클라이언트가
	 * 경로를 보고 감지한다.
	 */
	lng?: Language;
}

/**
 * 404 안내 화면. 고정 헤더(h-12) 아래 남은 영역의 세로 가운데에 놓인다.
 */
export default function NotFoundSection({ lng }: IFNotFoundSectionProps) {
	const { t } = useTranslation(lng);

	return (
		<section className="flex min-h-screen items-center justify-center bg-background px-4 pt-12">
			<div className="flex w-full max-w-lg flex-col items-center text-center">
				<div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
					<FileSearch className="h-[30px] w-[30px] text-muted-foreground" />
				</div>

				<h1 className="text-xl font-bold text-foreground">
					{t("error.404.title")}
				</h1>

				<p className="mt-2 text-sm text-muted-foreground">
					{t("error.404.description")}
				</p>

				{lng ? (
					<LocalizedLink
						lng={lng}
						href="/"
						className="mt-6 inline-block rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
					>
						{t("error.404.backToHome")}
					</LocalizedLink>
				) : (
					<Link
						href="/"
						className="mt-6 inline-block rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
					>
						{t("error.404.backToHome")}
					</Link>
				)}
			</div>
		</section>
	);
}
