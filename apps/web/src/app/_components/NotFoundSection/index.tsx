"use client";

import type { Language } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { motion } from "framer-motion";
import Link from "next/link";

interface IFNotFoundSectionProps {
	/**
	 * 서버에서 이미 알고 있는 언어. 경로 기반 클라이언트 감지가 통하지 않는 자리
	 * (예: `global-not-found.tsx`)에서 넘긴다. 생략하면 기존처럼 클라이언트가
	 * 경로를 보고 감지한다.
	 */
	lng?: Language;
}

export default function NotFoundSection({ lng }: IFNotFoundSectionProps) {
	const { t } = useTranslation(lng);

	return (
		<section className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 px-4">
			<div className="w-full max-w-lg text-center">
				<motion.div
					initial={{ scale: 0 }}
					animate={{ scale: 1 }}
					transition={{ duration: 0.5 }}
					className="mb-8 text-9xl font-bold text-gray-300"
				>
					404
				</motion.div>

				<motion.div
					initial={{ y: 20, opacity: 0 }}
					animate={{ y: 0, opacity: 1 }}
					transition={{ delay: 0.2 }}
					className="space-y-6"
				>
					<h1 className="text-4xl font-bold text-foreground">
						{t("error.404.title")}
					</h1>

					<p className="text-lg text-muted-foreground">
						{t("error.404.description")}
					</p>

					<div className="relative">
						<motion.div
							animate={{
								x: [-20, 20, -20],
								y: [-10, 10, -10],
							}}
							transition={{
								repeat: Infinity,
								duration: 5,
							}}
							className="mx-auto h-32 w-32"
						>
							<img
								src="/images/error/lost-astronaut.svg"
								alt="Lost in Space"
								className="h-full w-full"
							/>
						</motion.div>
					</div>

					<Link
						href="/"
						className="inline-block rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700"
					>
						{t("error.404.backToHome")}
					</Link>
				</motion.div>
			</div>
		</section>
	);
}
