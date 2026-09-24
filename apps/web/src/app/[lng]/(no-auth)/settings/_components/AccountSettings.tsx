"use client";

import SettingCategoryForm from "@src/app/[lng]/(auth)/(sidebar)/memos/setting/_components/Setting/SettingCategoryForm";
import SettingExport from "@src/app/[lng]/(auth)/(sidebar)/memos/setting/_components/Setting/SettingExport";
import SettingGuide from "@src/app/[lng]/(auth)/(sidebar)/memos/setting/_components/Setting/SettingGuide";
import SettingMemoFields from "@src/app/[lng]/(auth)/(sidebar)/memos/setting/_components/Setting/SettingMemoFields";
import SettingRow from "@src/app/[lng]/(auth)/(sidebar)/memos/setting/_components/Setting/SettingRow";
import SettingSection from "@src/app/[lng]/(auth)/(sidebar)/memos/setting/_components/Setting/SettingSection";
import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { useSupabaseUserQuery } from "@web-memo/shared/hooks";
import { isLoggedOutError } from "@web-memo/shared/utils";
import { Button } from "@web-memo/ui";
import Link from "next/link";
import { useEffect, useState } from "react";

import { SettingsBoundary, SettingsSkeleton } from "./SettingsBoundary";

/** 인증 조회가 일반·확장 설정을 막지 않도록 계정 영역 안에서만 처리합니다. */
export const AccountSettings = (props: LanguageType) => {
	const isHydrated = useIsHydrated();
	if (!isHydrated) {
		return <SettingsSkeleton lng={props.lng} />;
	}

	return (
		<SettingsBoundary lng={props.lng}>
			<AccountSettingsContent lng={props.lng} />
		</SettingsBoundary>
	);
};

/** 비로그인 상태에서는 가이드를 실행하지 않고 설정으로 돌아오는 로그인 링크를 제공합니다. */
export const AccountGuide = (props: LanguageType) => {
	const isHydrated = useIsHydrated();
	if (!isHydrated) {
		return <SettingsSkeleton lng={props.lng} />;
	}

	return (
		<SettingsBoundary lng={props.lng}>
			<AccountGuideContent lng={props.lng} />
		</SettingsBoundary>
	);
};

/** 가이드 실행은 로그인한 사용자에게만 제공합니다. */
const AccountGuideContent = (props: LanguageType) => {
	const { t } = useTranslation(props.lng);
	const account = useSupabaseUserQuery();
	const loginHref = useSettingsLoginHref(props.lng);

	if (account.data.error && !isLoggedOutError(account.data.error)) {
		throw account.data.error;
	}

	if (!account.data.data.user) {
		return (
			<SettingRow
				label={t("setting.guide")}
				description={t("setting.unified.guideLogin")}
			>
				<Button asChild variant="outline" className="max-sm:w-full">
					<Link href={loginHref}>{t("setting.unified.login")}</Link>
				</Button>
			</SettingRow>
		);
	}

	return <SettingGuide lng={props.lng} />;
};

/** 로그인한 사용자에게만 계정 데이터를 조회하는 설정을 마운트합니다. */
const AccountSettingsContent = (props: LanguageType) => {
	const { t } = useTranslation(props.lng);
	const account = useSupabaseUserQuery();
	const loginHref = useSettingsLoginHref(props.lng);

	if (account.data.error && !isLoggedOutError(account.data.error)) {
		throw account.data.error;
	}

	if (!account.data.data.user) {
		return (
			<SettingSection
				title={t("setting.unified.accountTitle")}
				description={t("setting.unified.loginDescription")}
			>
				<Button asChild className="self-start">
					<Link href={loginHref}>{t("setting.unified.login")}</Link>
				</Button>
			</SettingSection>
		);
	}

	return (
		<>
			<SettingSection
				title={t("setting.sectionMemoWriting")}
				description={t("setting.unified.accountScope")}
			>
				<SettingsBoundary lng={props.lng}>
					<SettingMemoFields lng={props.lng} />
				</SettingsBoundary>
			</SettingSection>
			<SettingSection
				title={t("setting.category")}
				description={t("setting.unified.accountScope")}
			>
				<SettingsBoundary lng={props.lng}>
					<SettingCategoryForm lng={props.lng} />
				</SettingsBoundary>
			</SettingSection>
			<SettingSection
				title={t("setting.sectionData")}
				description={t("setting.unified.dataScope")}
			>
				<SettingExport lng={props.lng} />
			</SettingSection>
		</>
	);
};

/** 확장 구역에서 시작한 로그인은 같은 구역으로 돌아오도록 앵커를 보존합니다. */
const useSettingsLoginHref = (lng: LanguageType["lng"]) => {
	const [extensionAnchor, setExtensionAnchor] = useState("");

	useEffect(() => {
		if (window.location.hash === "#extension") {
			setExtensionAnchor("#extension");
		}
	}, []);

	return `/${lng}/login?next=${encodeURIComponent(`/${lng}/settings${extensionAnchor}`)}`;
};

/** 서버 렌더와 첫 클라이언트 렌더에 같은 로딩 상태를 표시합니다. */
const useIsHydrated = () => {
	const [isHydrated, setIsHydrated] = useState(false);

	useEffect(() => {
		setIsHydrated(true);
	}, []);

	return isHydrated;
};
