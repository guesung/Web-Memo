import "@src/Options.css";

import { Toaster } from "@web-memo/ui";
import { Suspense } from "react";

import { Header, MemoFieldsOption, Option, QueryProvider } from "./components";

export default function Options() {
	return (
		<QueryProvider>
			<main className="mx-auto max-w-[1000px] px-8 text-start text-base">
				<Header />
				<Suspense fallback={null}>
					<MemoFieldsOption />
				</Suspense>
				<Option />
			</main>
			<Toaster />
		</QueryProvider>
	);
}
