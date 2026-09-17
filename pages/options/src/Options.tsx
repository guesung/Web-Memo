import { Toaster } from "@web-memo/ui";
import { Suspense } from "react";

import { Header, MemoFieldsOption, Option, QueryProvider } from "./components";

export default function Options() {
	return (
		<QueryProvider>
			<Header />
			<main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-8 text-start text-base">
				<Suspense fallback={null}>
					<MemoFieldsOption />
				</Suspense>
				<Option />
			</main>
			<Toaster />
		</QueryProvider>
	);
}
