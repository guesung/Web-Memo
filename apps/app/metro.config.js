const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const { withShareExtension } = require("expo-share-extension/metro");

// expo/metro-config가 pnpm 워크스페이스를 자동 감지합니다.
// watchFolders는 워크스페이스 패키지들이, nodeModulesPaths는
// [apps/app/node_modules, <레포 루트>/node_modules]가 이미 채워지므로
// 직접 덮어쓰지 않습니다. 덮어쓰면 Expo 기본값이 사라집니다.
const config = getDefaultConfig(__dirname);

// withShareExtension은 index.share.js를 iOS 공유 확장 전용 번들(index.share.bundle)로
// 따로 묶도록 resolver·server 설정을 더한다.
module.exports = withShareExtension(
	withNativeWind(config, { input: "./global.css" }),
);
