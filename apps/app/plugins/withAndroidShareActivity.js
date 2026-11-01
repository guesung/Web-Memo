const fs = require("node:fs");
const path = require("node:path");
const {
	withAndroidManifest,
	withAndroidStyles,
	withDangerousMod,
} = require("expo/config-plugins");

const SHARE_ACTIVITY_NAME = ".ShareActivity";
const SHARE_THEME_NAME = "Theme.App.Share";
/**
 * withAndroidConfigChanges.js가 MainActivity에 병합하는 값과 같다(폴더블 대응 포함).
 * ShareActivity도 같은 이유로 화면 크기·밀도 변경에 재생성되지 않아야 한다.
 */
const SHARE_CONFIG_CHANGES =
	"keyboard|keyboardHidden|orientation|screenSize|screenLayout|uiMode|smallestScreenSize|density";

/** ShareActivity.kt 소스 코드를 만든다. */
function buildShareActivityKotlin(packageName) {
	return `package ${packageName}

import android.content.Intent
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import expo.modules.ReactActivityDelegateWrapper

/**
 * Android 공유 시트에서 뜨는 전용 액티비티.
 * SEND 인텐트의 EXTRA_TEXT/EXTRA_SUBJECT를 JS 초기 props로 넘기고, 본 앱 JS 번들이
 * "shareExtension" 이름으로 등록한 컴포넌트를 그린다(index.js 참고). MainActivity와는
 * 별개의 태스크로 떠서 보던 앱 위에 시트처럼 보이고, 최근 앱 목록에는 나타나지 않는다.
 */
class ShareActivity : ReactActivity() {
  override fun getMainComponentName(): String = "shareExtension"

  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
        this,
        BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
        object : DefaultReactActivityDelegate(
            this,
            mainComponentName,
            fabricEnabled
        ) {
          override fun getLaunchOptions(): Bundle {
            val bundle = Bundle()
            bundle.putString("text", intent.getStringExtra(Intent.EXTRA_TEXT))
            bundle.putString("subject", intent.getStringExtra(Intent.EXTRA_SUBJECT))
            return bundle
          }
        })
  }
}
`;
}

/** ShareActivity.kt 파일을 패키지 경로에 만든다. */
function withShareActivitySource(config) {
	return withDangerousMod(config, [
		"android",
		(config) => {
			const packageName = config.android?.package;
			if (!packageName) {
				throw new Error(
					"withAndroidShareActivity: app.json의 android.package가 필요합니다.",
				);
			}
			const dir = path.join(
				config.modRequest.platformProjectRoot,
				"app/src/main/java",
				...packageName.split("."),
			);
			fs.mkdirSync(dir, { recursive: true });
			fs.writeFileSync(
				path.join(dir, "ShareActivity.kt"),
				buildShareActivityKotlin(packageName),
			);
			return config;
		},
	]);
}

/** 배경이 투명하고 애니메이션이 없는 시트용 테마를 styles.xml에 추가한다. */
function withShareActivityTheme(config) {
	return withAndroidStyles(config, (config) => {
		const styles = config.modResults.resources.style ?? [];
		const alreadyExists = styles.some(
			(style) => style.$?.name === SHARE_THEME_NAME,
		);

		if (!alreadyExists) {
			styles.push({
				$: {
					name: SHARE_THEME_NAME,
					parent: "Theme.AppCompat.DayNight.NoActionBar",
				},
				item: [
					{ $: { name: "android:windowIsTranslucent" }, _: "true" },
					{
						$: { name: "android:windowBackground" },
						_: "@android:color/transparent",
					},
					{ $: { name: "android:windowContentOverlay" }, _: "@null" },
					{ $: { name: "android:windowAnimationStyle" }, _: "@null" },
					{ $: { name: "android:backgroundDimEnabled" }, _: "true" },
					{ $: { name: "android:windowNoTitle" }, _: "true" },
				],
			});
		}

		config.modResults.resources.style = styles;
		return config;
	});
}

/** ShareActivity를 매니페스트에 등록하고 SEND 인텐트 필터를 건다. */
function withShareActivityManifest(config) {
	return withAndroidManifest(config, (config) => {
		const application = config.modResults.manifest.application?.[0];
		if (!application) {
			return config;
		}

		application.activity = application.activity ?? [];
		const alreadyExists = application.activity.some(
			(activity) => activity.$?.["android:name"] === SHARE_ACTIVITY_NAME,
		);
		if (alreadyExists) {
			return config;
		}

		application.activity.push({
			$: {
				"android:name": SHARE_ACTIVITY_NAME,
				"android:theme": `@style/${SHARE_THEME_NAME}`,
				"android:excludeFromRecents": "true",
				"android:taskAffinity": `${config.android?.package}.share`,
				"android:exported": "true",
				"android:configChanges": SHARE_CONFIG_CHANGES,
				"android:windowSoftInputMode": "adjustResize",
			},
			"intent-filter": [
				{
					action: [{ $: { "android:name": "android.intent.action.SEND" } }],
					category: [
						{ $: { "android:name": "android.intent.category.DEFAULT" } },
					],
					data: [{ $: { "android:mimeType": "text/plain" } }],
				},
			],
		});

		return config;
	});
}

/**
 * Android에서도 iOS 공유 확장과 같은 전용 시트 화면을 띄우기 위한 설정 플러그인.
 * @description prebuild 시점에 ShareActivity.kt를 만들고, 투명 테마와 SEND 인텐트
 * 필터(text/plain)를 매니페스트에 등록한다. MainActivity의 launcher/딥링크 인텐트
 * 필터에는 손대지 않는다.
 */
function withAndroidShareActivity(config) {
	config = withShareActivitySource(config);
	config = withShareActivityTheme(config);
	config = withShareActivityManifest(config);
	return config;
}

module.exports = withAndroidShareActivity;
