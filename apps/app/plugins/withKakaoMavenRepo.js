const { withProjectBuildGradle } = require("@expo/config-plugins");

const KAKAO_MAVEN_REPO =
	"maven { url 'https://devrepo.kakao.com/nexus/content/groups/public/' }";

function withKakaoMavenRepo(config) {
	return withProjectBuildGradle(config, (config) => {
		if (!config.modResults.contents.includes("devrepo.kakao.com")) {
			config.modResults.contents = config.modResults.contents.replace(
				/allprojects\s*\{\s*\n\s*repositories\s*\{/,
				`allprojects {\n  repositories {\n    ${KAKAO_MAVEN_REPO}`,
			);
		}
		return config;
	});
}

module.exports = withKakaoMavenRepo;
