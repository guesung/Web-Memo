import fs from "node:fs";
import { resolve } from "path";

import { zipBundle } from "./lib/zip-bundle";

const distDirectory = resolve(__dirname, "../../dist");

// zip 하나만 받아도 어느 환경에서 어느 버전을 구웠는지 알 수 있게 파일 이름에 박습니다.
// 버전의 출처는 빌드 결과물인 dist/manifest.json입니다. 소스의 package.json을 읽으면
// 빌드 후 버전이 바뀌었을 때 이름과 내용물이 어긋날 수 있습니다.
const { version } = JSON.parse(
	fs.readFileSync(resolve(distDirectory, "manifest.json"), "utf8"),
);

// 셸에서 BUILD_ENV를 안 주는 로컬 빌드는 development입니다. packages/env와 같은 기본값입니다.
const buildEnv = process.env.BUILD_ENV ?? "development";

// package the root dist file
zipBundle({
	distDirectory,
	buildDirectory: resolve(__dirname, "../../dist-zip"),
	distDirectoryName: `extension-${buildEnv}-v${version}`,
});
