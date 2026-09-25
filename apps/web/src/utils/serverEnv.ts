/**
 * 서버에서만 읽는 환경변수(Vercel 프로젝트 환경변수)를 꺼냅니다.
 *
 * @description 값이 없으면 조용히 빈 문자열로 넘기지 않고 즉시 실패시킵니다.
 * 모듈 최상단이 아니라 getter 안에서 호출해야 합니다. import 시점에 던지면 env가 없는
 * 로컬 실행이나 `next build`의 page data 수집이 통째로 깨집니다.
 * `.github/scripts/env/env-manifest.mjs`가 `requireServerEnv` 호출의 첫 인자를 코드 참조로
 * 수집하므로, 이름은 반드시 문자열 리터럴로 넘깁니다.
 */
export const requireServerEnv = (name: string): string => {
	const value = process.env[name];

	if (!value) {
		throw new Error(`${name} 환경변수가 설정되지 않았습니다`);
	}

	return value;
};
