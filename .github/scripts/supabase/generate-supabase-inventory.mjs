#!/usr/bin/env node
/**
 * 운영 Supabase를 읽기 전용으로 조회해 docs/supabase-inventory.md를 다시 씁니다.
 * 조회가 하나라도 실패하면 파일을 건드리지 않고 1로 끝납니다 — 기존 문서와 열린 PR을 보존하기 위해서입니다.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { collectSupabaseInventory, renderInventoryMarkdown } from "./supabase-inventory.mjs";

const DOCUMENT_URL = new URL("../../../docs/supabase-inventory.md", import.meta.url);

const readCurrentDocument = () => {
	try {
		return readFileSync(DOCUMENT_URL, "utf8");
	} catch {
		return null;
	}
};

const main = async () => {
	const inventory = await collectSupabaseInventory({ token: process.env.SUPABASE_ACCESS_TOKEN });
	const markdown = renderInventoryMarkdown(inventory);

	if (markdown === readCurrentDocument()) {
		console.log("docs/supabase-inventory.md가 운영 상태와 같습니다");

		return;
	}

	writeFileSync(DOCUMENT_URL, markdown);
	console.log("docs/supabase-inventory.md를 운영 상태에 맞춰 다시 썼습니다");
};

try {
	await main();
} catch (error) {
	// 메시지에는 HTTP 상태와 조회 대상만 담기므로 토큰이 새지 않습니다.
	console.error(`Supabase 인벤토리 생성 실패: ${error instanceof Error ? error.message : "알 수 없는 오류"}`);
	process.exitCode = 1;
}
