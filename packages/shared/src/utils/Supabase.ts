/**
 * Supabase Services - Re-export
 *
 * 이 파일은 하위 호환성을 위해 유지됩니다.
 * 새로운 코드에서는 './supabase' 디렉토리에서 직접 import하는 것을 권장합니다.
 *
 * @deprecated Import from './supabase' instead
 *
 * Before:
 * import { MemoService } from './Supabase'
 *
 * After:
 * import { MemoService } from './supabase'
 */

export {
	BaseSupabaseService,
	MemoService,
	CategoryService,
	AuthService,
	FeedbackService,
} from "./supabase";
