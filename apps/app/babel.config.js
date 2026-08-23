// build-app 라벨 opt-in 검증용 임시 변경 (검증 후 되돌립니다)
module.exports = (api) => {
	api.cache(true);
	return {
		presets: [
			["babel-preset-expo", { jsxImportSource: "nativewind" }],
			"nativewind/babel",
		],
	};
};
