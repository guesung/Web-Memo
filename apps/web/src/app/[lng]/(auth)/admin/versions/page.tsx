"use server";

import versionStatus from "@src/constants/versionStatus.json";
import type { LanguageParams } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.server";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@web-memo/ui";

/** props 타입 */
interface IFPageProps extends LanguageParams {}

/** 버전 트랙 이름별 라벨 i18n 키 */
const TRACK_LABEL_KEYS: Record<string, string> = {
	extension: "admin.versions.track_extension",
	app: "admin.versions.track_app",
	"release-notes": "admin.versions.track_release_notes",
};

/**
 * 확장·앱·릴리스 노트 세 버전 트랙의 현재 버전과 마지막 변경일을 모아 보는 관리자 화면
 * @description 데이터는 빌드 시점에 `scripts/generate-version-status.mjs`가 생성한
 * `versionStatus.json` 스냅샷이다. 런타임에 형제 앱 폴더를 직접 읽지 않는다.
 */
export default async function VersionsPage({ params: { lng } }: IFPageProps) {
	const { t } = await useTranslation(lng);
	const locale = lng === "ko" ? "ko-KR" : "en-US";

	return (
		<>
			<h1 className="text-2xl font-bold mb-2">{t("admin.versions.title")}</h1>
			<p className="text-sm text-muted-foreground mb-8">
				{t("admin.versions.description")}
			</p>

			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>{t("admin.versions.track")}</TableHead>
							<TableHead>{t("admin.versions.version")}</TableHead>
							<TableHead>{t("admin.versions.last_changed")}</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{versionStatus.tracks.map((track) => (
							<TableRow key={track.track}>
								<TableCell>
									{t(TRACK_LABEL_KEYS[track.track] ?? track.track)}
								</TableCell>
								<TableCell className="font-mono">
									{track.version ?? t("admin.versions.unknown")}
								</TableCell>
								<TableCell className="text-sm text-muted-foreground">
									{track.lastChangedAt ?? t("admin.versions.unknown")}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>

			<p className="mt-4 text-xs text-muted-foreground">
				{t("admin.versions.generated_at", {
					date: new Date(versionStatus.generatedAt).toLocaleString(locale),
				})}
			</p>
		</>
	);
}
