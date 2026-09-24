import { createClient } from "@supabase/supabase-js";
import { SUPABASE } from "@web-memo/shared/constants";
import type { Database } from "@web-memo/shared/types";
import {
	E2E_CATEGORY_NAME_PREFIXES,
	E2E_MEMO_URL_PREFIXES,
	isCleanupTarget,
	LEGACY_E2E_MEMO_URLS,
} from "./namespace";

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

type TCleanupClient = Awaited<ReturnType<typeof createCleanupClient>>;

/** 정리 후보 행. 메모는 url, 카테고리는 name을 `value`로 담는다. */
interface IFCleanupCandidate {
	/** 행 id */
	id: number;
	/** 메모 URL 또는 카테고리 이름 */
	value: string;
	/** 행이 만들어진 시각(ISO) */
	createdAt: string | null;
}

/**
 * E2E 접두어가 붙은 메모를 정리 후보로 읽는다.
 * @description 접두어마다 `like`로, 옛 사이드 패널 URL은 `in`으로 좁혀 테스트 계정의 진짜 메모는 읽지 않는다.
 */
const fetchMemoCandidates = async (
	client: TCleanupClient,
): Promise<IFCleanupCandidate[]> => {
	const queries = [
		...E2E_MEMO_URL_PREFIXES.map((prefix) =>
			client
				.from("memo")
				.select("id, url, created_at")
				.like("url", `${prefix}%`),
		),
		client
			.from("memo")
			.select("id, url, created_at")
			.in("url", LEGACY_E2E_MEMO_URLS),
	];
	const results = await Promise.all(queries);

	return results.flatMap(({ data, error }) => {
		if (error) {
			throw new Error(`잔여 메모 조회 실패: ${error.message}`);
		}

		return data.map((memo) => ({
			id: memo.id,
			value: memo.url,
			createdAt: memo.created_at,
		}));
	});
};

/** E2E 접두어가 붙은 카테고리를 정리 후보로 읽는다. */
const fetchCategoryCandidates = async (
	client: TCleanupClient,
): Promise<IFCleanupCandidate[]> => {
	const results = await Promise.all(
		E2E_CATEGORY_NAME_PREFIXES.map((prefix) =>
			client
				.from("category")
				.select("id, name, created_at")
				.like("name", `${prefix}%`),
		),
	);

	return results.flatMap(({ data, error }) => {
		if (error) {
			throw new Error(`잔여 카테고리 조회 실패: ${error.message}`);
		}

		return data.map((category) => ({
			id: category.id,
			value: category.name,
			createdAt: category.created_at,
		}));
	});
};

/** 후보 중 정리 대상의 id만 중복 없이 고른다. 접두어 조회끼리 같은 행을 두 번 읽을 수 있다. */
const selectCleanupTargetIds = ({
	candidates,
	runId,
	now,
}: {
	candidates: IFCleanupCandidate[];
	runId: string;
	now: Date;
}) => {
	const targetIds = candidates
		.filter((candidate) =>
			isCleanupTarget({
				value: candidate.value,
				createdAt: candidate.createdAt,
				runId,
				now,
			}),
		)
		.map((candidate) => candidate.id);

	return Array.from(new Set(targetIds));
};

interface IFCleanupE2EResidueParams {
	/** 이번 실행의 ID. 이 접두어의 행은 시각과 무관하게 지운다 */
	runId: string;
	/** 24시간 경과를 재는 기준 시각 */
	now: Date;
}

/**
 * 이번 실행이 남긴 E2E 데이터와, 다른 실행이 24시간 넘게 남긴 E2E 잔여물을 영구 삭제한다. 되돌릴 수 없다.
 * @description 테스트가 중간에 죽으면 `afterEach`가 돌지 않아 행이 남는다. 모든 worker가 끝난 뒤
 * `globalTeardown`에서 한 번 더 쓸어담는 자리다. 무엇을 지울지는 {@link isCleanupTarget}이 정한다.
 * 동시에 도는 다른 실행의 행은 24시간 안에는 건드리지 않는다. 메모를 먼저 지우는 이유는
 * `memo.category_id`가 `category.id`를 참조하는 FK이기 때문이다.
 * @throws 조회·삭제가 실패하면 던진다. 삼키면 잔여물이 쌓여도 아무도 모른다.
 */
export const cleanupE2EResidue = async ({
	runId,
	now,
}: IFCleanupE2EResidueParams) => {
	const client = await createCleanupClient();

	const memoIds = selectCleanupTargetIds({
		candidates: await fetchMemoCandidates(client),
		runId,
		now,
	});
	if (memoIds.length > 0) {
		const { error } = await client.from("memo").delete().in("id", memoIds);
		if (error) {
			throw new Error(`잔여 메모 삭제 실패: ${error.message}`);
		}
	}

	const categoryIds = selectCleanupTargetIds({
		candidates: await fetchCategoryCandidates(client),
		runId,
		now,
	});
	if (categoryIds.length > 0) {
		const { error } = await client
			.from("category")
			.delete()
			.in("id", categoryIds);
		if (error) {
			throw new Error(`잔여 카테고리 삭제 실패: ${error.message}`);
		}
	}
};
