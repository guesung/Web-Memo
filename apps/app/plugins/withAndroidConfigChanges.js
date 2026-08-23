const { withAndroidManifest } = require("expo/config-plugins");

/**
 * 폴더블 기기(갤럭시 폴드 등)를 펼치거나 접을 때 Activity가 재생성되어
 * 앱이 초기 화면으로 돌아가는 문제를 막는다.
 *
 * Expo 기본 템플릿의 configChanges에는 smallestScreenSize·density가 빠져 있어
 * 화면 크기·밀도가 바뀌면 Android가 MainActivity를 파괴·재생성하고,
 * 그 결과 메모리에만 있던 expo-router 내비게이션 상태가 사라진다.
 */
const REQUIRED_CONFIG_CHANGES = ["smallestScreenSize", "density"];

function withAndroidConfigChanges(config) {
	return withAndroidManifest(config, (config) => {
		const application = config.modResults.manifest.application?.[0];
		const mainActivity = application?.activity?.find(
			(activity) => activity.$?.["android:name"] === ".MainActivity",
		);

		if (!mainActivity) {
			return config;
		}

		const current = (mainActivity.$["android:configChanges"] ?? "")
			.split("|")
			.filter(Boolean);
		const merged = [...new Set([...current, ...REQUIRED_CONFIG_CHANGES])];

		mainActivity.$["android:configChanges"] = merged.join("|");

		return config;
	});
}

module.exports = withAndroidConfigChanges;
