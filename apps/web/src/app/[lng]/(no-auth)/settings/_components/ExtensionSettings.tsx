"use client";

import SettingRow from "@src/app/[lng]/(auth)/(sidebar)/memos/setting/_components/Setting/SettingRow";
import SettingSection from "@src/app/[lng]/(auth)/(sidebar)/memos/setting/_components/Setting/SettingSection";
import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import {
	Button,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Switch,
} from "@web-memo/ui";

import { useExtensionSettings } from "../_hooks";
import { SettingSaveStatus } from "./SettingSaveStatus";
import { SettingsSkeleton } from "./SettingsBoundary";

/** Chrome 프로필 설정 다섯 개와 연결·저장 결과를 표시합니다. */
export const ExtensionSettings = (props: LanguageType) => {
	const { t } = useTranslation(props.lng);
	const extension = useExtensionSettings();
	const settings = extension.settings;
	const isReady = extension.connection === "ready";
	const isDisabled = (key: keyof NonNullable<typeof settings>) =>
		!isReady || extension.saves[key]?.status === "saving";
	const renderSaveStatus = (key: keyof NonNullable<typeof settings>) => (
		<SettingSaveStatus
			lng={props.lng}
			status={extension.saves[key]?.status ?? "idle"}
			isRetryDisabled={!isReady}
			onRetryClick={() => extension.handleSaveRetryClick(key)}
		/>
	);

	return (
		<section
			id="extension"
			aria-labelledby="extension-settings-title"
			className="scroll-mt-20 space-y-4"
		>
			<div className="space-y-1 pt-4">
				<h2 id="extension-settings-title" className="text-lg font-semibold">
					{t("setting.extension.title")}
				</h2>
				<p className="text-sm text-muted-foreground">
					{t("setting.extension.scope")}
				</p>
				<p className="text-xs text-muted-foreground">
					{t("setting.extension.syncScope")}
				</p>
			</div>
			<output className="block rounded-lg border p-4" aria-live="polite">
				{extension.connection === "ready" && (
					<p className="text-sm">{t("setting.extension.connected")}</p>
				)}
				{extension.connection === "loading" && (
					<p className="text-sm">{t("setting.extension.connecting")}</p>
				)}
				{extension.connection === "unavailable" && (
					<p className="text-sm">{t("setting.extension.unavailable")}</p>
				)}
				{extension.connection === "unsupported" && (
					<p className="text-sm">{t("setting.extension.unsupported")}</p>
				)}
				{extension.connection === "read-error" && (
					<p className="text-sm">{t("setting.extension.readError")}</p>
				)}
				{extension.connection === "forbidden" && (
					<p className="text-sm">{t("setting.extension.forbidden")}</p>
				)}
				{!isReady && extension.connection !== "loading" && (
					<Button
						variant="outline"
						className="mt-3"
						onClick={extension.handleConnectionRetryClick}
					>
						{t("setting.extension.reconnect")}
					</Button>
				)}
			</output>
			{!settings && extension.connection === "loading" && (
				<SettingsSkeleton lng={props.lng} />
			)}
			{settings && (
				<>
					<SettingSection
						headingLevel="h3"
						title={t("setting.extension.highlightTitle")}
					>
						<SettingRow
							label={t("setting.extension.popup")}
							description={t("setting.extension.popupDescription")}
							htmlFor="highlight-popup"
						>
							<div className="space-y-2">
								<Switch
									id="highlight-popup"
									checked={settings.highlightBubbleEnabled}
									disabled={isDisabled("highlightBubbleEnabled")}
									onCheckedChange={(value) =>
										extension.handleSettingChange({
											key: "highlightBubbleEnabled",
											value,
										})
									}
								/>
								{renderSaveStatus("highlightBubbleEnabled")}
							</div>
						</SettingRow>
						<SettingRow
							label={t("setting.extension.position")}
							htmlFor="highlight-position"
						>
							<div className="space-y-2">
								<Select
									value={settings.highlightBubblePosition}
									disabled={isDisabled("highlightBubblePosition")}
									onValueChange={(value) => {
										if (value === "above" || value === "below") {
											void extension.handleSettingChange({
												key: "highlightBubblePosition",
												value,
											});
										}
									}}
								>
									<SelectTrigger
										id="highlight-position"
										className="w-full sm:w-48"
									>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="below">
											{t("setting.extension.below")}
										</SelectItem>
										<SelectItem value="above">
											{t("setting.extension.above")}
										</SelectItem>
									</SelectContent>
								</Select>
								{renderSaveStatus("highlightBubblePosition")}
							</div>
						</SettingRow>
						<div className="space-y-2">
							<h4 className="text-sm font-medium">
								{t("setting.extension.excludedSites")}
							</h4>
							{settings.highlightDisabledSites.length === 0 && (
								<p className="text-sm text-muted-foreground">
									{t("setting.extension.noExcludedSites")}
								</p>
							)}
							<ul className="space-y-2">
								{settings.highlightDisabledSites.map((hostname) => (
									<li
										key={hostname}
										className="flex items-center justify-between gap-3"
									>
										<span className="min-w-0 break-all text-sm">
											{hostname}
										</span>
										<Button
											variant="outline"
											size="sm"
											className="shrink-0"
											disabled={isDisabled("highlightDisabledSites")}
											aria-label={t("setting.extension.enableSiteLabel", {
												hostname,
											})}
											onClick={() =>
												extension.handleSettingChange({
													key: "highlightDisabledSites",
													value: settings.highlightDisabledSites.filter(
														(site) => site !== hostname,
													),
												})
											}
										>
											{t("setting.extension.enableSite")}
										</Button>
									</li>
								))}
							</ul>
							{renderSaveStatus("highlightDisabledSites")}
						</div>
					</SettingSection>
					<SettingSection
						headingLevel="h3"
						title={t("setting.extension.aiTitle")}
					>
						<SettingRow
							label={t("setting.extension.language")}
							description={t("setting.extension.languageDescription")}
							htmlFor="ai-language"
						>
							<div className="space-y-2">
								<Select
									value={settings.language || "__existing_empty__"}
									disabled={isDisabled("language")}
									onValueChange={(value) => {
										if (value === "ko" || value === "en-US") {
											void extension.handleSettingChange({
												key: "language",
												value,
											});
										}
									}}
								>
									<SelectTrigger id="ai-language" className="w-full sm:w-48">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="ko">한국어</SelectItem>
										<SelectItem value="en-US">English</SelectItem>
										{settings.language !== "ko" &&
											settings.language !== "en-US" && (
												<SelectItem
													disabled
													value={settings.language || "__existing_empty__"}
												>
													{t("setting.extension.existingLanguage", {
														language:
															settings.language ||
															t("setting.extension.emptyLanguage"),
													})}
												</SelectItem>
											)}
									</SelectContent>
								</Select>
								{renderSaveStatus("language")}
							</div>
						</SettingRow>
						<SettingRow
							label={t("setting.extension.autoCategory")}
							description={t("setting.extension.autoCategoryDescription")}
							htmlFor="auto-category"
						>
							<div className="space-y-2">
								<Switch
									id="auto-category"
									checked={settings.autoApplyCategory}
									disabled={isDisabled("autoApplyCategory")}
									onCheckedChange={(value) =>
										extension.handleSettingChange({
											key: "autoApplyCategory",
											value,
										})
									}
								/>
								{renderSaveStatus("autoApplyCategory")}
							</div>
						</SettingRow>
					</SettingSection>
				</>
			)}
		</section>
	);
};
