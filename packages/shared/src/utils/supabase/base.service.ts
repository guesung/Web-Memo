import type { MemoSupabaseClient } from "../../types";
import { SUPABASE } from "../../constants";

/**
 * BaseSupabaseService - Supabase 서비스의 공통 로직을 제공하는 기본 클래스
 *
 * 공통 패턴:
 * - schema + from 체이닝
 * - 에러 처리
 * - 타입 안정성
 */
export abstract class BaseSupabaseService {
	protected supabaseClient: MemoSupabaseClient;

	constructor(supabaseClient: MemoSupabaseClient) {
		this.supabaseClient = supabaseClient;
	}

	/**
	 * memo 스키마의 특정 테이블에 대한 쿼리 빌더 반환
	 */
	protected getTable<TableName extends string>(tableName: TableName) {
		return this.supabaseClient
			.schema(SUPABASE.table.memo)
			.from(tableName);
	}
}
