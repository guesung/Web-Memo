import "@src/Options.css";

import { Toaster } from "@extension/ui";

import { Header, Option, QueryProvider } from "./components";

export default function Options() {
	return (
		<QueryProvider>
			<main className="mx-auto max-w-[1000px] px-8 text-start text-base">
				<Header />
				<Option />
			</main>
			<Toaster />
		</QueryProvider>
	);
}
