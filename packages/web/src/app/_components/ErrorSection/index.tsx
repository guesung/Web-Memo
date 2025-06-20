"use client";

import { Button } from "@extension/ui";
import * as Sentry from "@sentry/nextjs";
import useTranslation from "@src/modules/i18n/util.client";
import { useEffect } from "react";

interface ErrorSectionProps {
	error: Error & { digest?: string };
	reset: () => void;
}

export default function ErrorSection({ error, reset }: ErrorSectionProps) {
	useEffect(() => {
		Sentry.captureException(error, {
			level: "fatal",
		});
	}, [error]);

	const { t } = useTranslation();

	return (
		<div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4 text-center">
			<h1 className="text-4xl font-bold text-gray-800 dark:text-gray-100">
				{t("error.500.title")}
			</h1>

			<Button
				onClick={reset}
				className="mt-4 px-6 py-3 text-lg shadow-lg transition-all duration-300 hover:shadow-xl"
			>
				{t("error.500.retry")}
			</Button>
		</div>
	);
}
