const { withGradleProperties } = require("@expo/config-plugins");

function withAndroidGradleMemory(config) {
	return withGradleProperties(config, (config) => {
		const props = config.modResults;

		const jvmArgsIndex = props.findIndex(
			(item) => item.type === "property" && item.key === "org.gradle.jvmargs",
		);

		const newJvmArgs = "-Xmx4096m -XX:MaxMetaspaceSize=1024m";

		if (jvmArgsIndex >= 0) {
			props[jvmArgsIndex].value = newJvmArgs;
		} else {
			props.push({
				type: "property",
				key: "org.gradle.jvmargs",
				value: newJvmArgs,
			});
		}

		return config;
	});
}

module.exports = withAndroidGradleMemory;
