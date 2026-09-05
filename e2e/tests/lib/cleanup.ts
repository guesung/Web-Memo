import { createClient } from "@supabase/supabase-js";
import { SUPABASE } from "@web-memo/shared/constants";
import type { Database } from "@web-memo/shared/types";

/**
 * E2E가 만드는 메모의 URL 접두사.
 * @description 통합 테스트는 전부 이 접두사 아래 고유 URL에서 메모를 쓴다.
 * 테스트 계정의 진짜 메모에는 example.com이 없어, 이 한 줄로 잔여물이 갈린다.
 */
export const E2E_MEMO_URL_PREFIX = "https://example.com/test-";

/**
 * 사이드 패널을 여는 메모 목록 페이지의 URL.
 * @description 패널은 열릴 때의 탭 URL에 메모를 붙인다. 통합 테스트는 로그인 직후
 * 이 페이지에서 패널을 열므로, 테스트가 쓴 메모가 여기 남는다. 테스트 전용 계정이라
 * 이 URL의 메모는 전부 테스트 산물이다.
 */
export const E2E_SIDE_PANEL_HOST_URL = "http://localhost:3000/en/memos";

/**
 * E2E가 만드는 카테고리 이름의 접두사 목록.
 * @description 카테고리 추천 테스트가 `<접두사> <timestamp>` 꼴로 이름을 짓는다.
 */
export const E2E_CATEGORY_NAME_PREFIXES = ["E2E Category", "Badge Test"];

/**
 * 테스트 계정으로 로그인한 Supabase 클라이언트를 만든다.
 * @description anon key + 테스트 계정 JWT로 간다. 자기 행만 지우므로 RLS로 충분하고,
 * service_role 키를 레포에 두지 않는다.
 */
export const createCleanupClient = async () => {
	const client = createClient<Database, "memo">(
		SUPABASE.url,
		SUPABASE.anonKey,
		{
			db: { schema: "memo" },
			auth: { persistSession: false, autoRefreshToken: false },
		},
	);

	const { error } = await client.auth.signInWithPassword({
		email: SUPABASE.testEmail,
		password: SUPABASE.testPassword,
	});

	if (error) {
		throw new Error(`정리용 로그인 실패: ${error.message}`);
	}

	return client;
};

interface IFCleanupTestDataParams {
	/** 지울 메모의 URL 목록. 테스트가 방문한 고유 URL을 그대로 넘긴다 */
	memoUrls: string[];
	/** 지울 카테고리 이름 목록. 없으면 카테고리는 건드리지 않는다 */
	categoryNames?: string[];
}

/**
 * 한 테스트가 만든 메모·카테고리를 영구 삭제한다. 되돌릴 수 없다.
 * @description 휴지통(`deleted_at`)으로 보내면 행이 남아 다음 실행에도 계속 쌓이므로
 * hard delete로 간다. 메모를 먼저 지우는 이유는 `memo.category_id`가 `category.id`를
 * 참조하는 FK이기 때문이다. 정리 실패가 테스트 결과를 뒤집지 않도록 에러는 삼키고
 * 콘솔에만 남긴다.
 */
export const cleanupTestData = async ({
	memoUrls,
	categoryNames = [],
}: IFCleanupTestDataParams) => {
	const targetMemoUrls = memoUrls.filter(Boolean);
	const targetCategoryNames = categoryNames.filter(Boolean);

	if (targetMemoUrls.length === 0 && targetCategoryNames.length === 0) {
		return;
	}

	try {
		const client = await createCleanupClient();

		if (targetMemoUrls.length > 0) {
			const { error } = await client
				.from("memo")
				.delete()
				.in("url", targetMemoUrls);

			if (error) {
				throw new Error(`메모 삭제 실패: ${error.message}`);
			}
		}

		if (targetCategoryNames.length > 0) {
			const { error } = await client
				.from("category")
				.delete()
				.in("name", targetCategoryNames);

			if (error) {
				throw new Error(`카테고리 삭제 실패: ${error.message}`);
			}
		}
	} catch (error) {
		console.warn("[e2e cleanup] 테스트 데이터 정리 실패", error);
	}
};

/**
 * 테스트 계정에 남은 E2E 잔여물을 전부 영구 삭제한다. 되돌릴 수 없다.
 * @description 테스트가 중간에 죽으면 `afterEach`가 돌지 않아 행이 남는다.
 * 모든 worker가 끝난 뒤 `globalTeardown`에서 한 번 더 쓸어담는 자리다.
 */
export const cleanupE2EResidue = async () => {
	try {
		const client = await createCleanupClient();

		const { error: prefixError } = await client
			.from("memo")
			.delete()
			.like("url", `${E2E_MEMO_URL_PREFIX}%`);

		if (prefixError) {
			throw new Error(`잔여 메모 삭제 실패: ${prefixError.message}`);
		}

		const { error: hostError } = await client
			.from("memo")
			.delete()
			.eq("url", E2E_SIDE_PANEL_HOST_URL);

		if (hostError) {
			throw new Error(`잔여 메모 삭제 실패: ${hostError.message}`);
		}

		for (const prefix of E2E_CATEGORY_NAME_PREFIXES) {
			const { error: categoryError } = await client
				.from("category")
				.delete()
				.like("name", `${prefix} %`);

			if (categoryError) {
				throw new Error(`잔여 카테고리 삭제 실패: ${categoryError.message}`);
			}
		}
	} catch (error) {
		console.warn("[e2e cleanup] 잔여물 정리 실패", error);
	}
};
