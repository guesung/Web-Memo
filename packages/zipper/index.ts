import fs from "node:fs";
import { resolve } from "path";

import { zipBundle } from "./lib/zip-bundle";

/** 확장 빌드 결과물이 쌓이는 디렉터리 */
const distDirectory = resolve(__dirname, "../../dist");

/**
 * 빌드된 확장의 manifest
 * @description 버전의 출처를 소스의 package.json이 아니라 빌드 결과물에 둡니다.
 * 빌드 뒤 버전이 바뀌어도 zip 이름과 zip 안에 든 값이 어긋날 수 없습니다.
 */
const manifest = JSON.parse(
	fs.readFileSync(resolve(distDirectory, "manifest.json"), "utf8"),
);

/**
 * 빌드 대상 환경
 * @description 셸에서 BUILD_ENV를 주지 않는 로컬 빌드는 development입니다.
 * packages/env와 같은 기본값입니다. CI에서는 cd-extension.yml이 잡 레벨에서 넘깁니다.
 */
const buildEnv = process.env.BUILD_ENV ?? "development";

/**
 * dist를 dist-zip 아래 zip 하나로 묶습니다.
 * @description zip 하나만 받아도 어느 환경에서 어느 버전을 구운 건지 알 수 있게
 * 이름에 환경과 버전을 박습니다. (extension-production-v1.10.14.zip)
 */
zipBundle({
	distDirectory,
	buildDirectory: resolve(__dirname, "../../dist-zip"),
	distDirectoryName: `extension-${buildEnv}-v${manifest.version}`,
});
