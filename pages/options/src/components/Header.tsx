import { I18n } from "@web-memo/shared/utils/extension";

export default function Header() {
	return (
		<header className="border-border bg-background/80 sticky top-0 z-10 border-b backdrop-blur">
			<div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-4">
				<img src="/icon-48.png" alt="" className="h-8 w-8" />
				<h1 className="text-foreground text-xl font-semibold">
					{I18n.get("extensionName")}
				</h1>
			</div>
		</header>
	);
}
