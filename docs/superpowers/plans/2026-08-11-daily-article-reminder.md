# 매일 아침 아티클 리마인더 푸시 알림 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 위시리스트(isWish=true) 메모 중 알림 미발송 아티클을 매일 아침 사용자 지정 시각에 1건 골라 Expo 푸시로 보내고, 탭하면 앱 내 브라우저로 연다.

**Architecture:** Supabase pg_cron이 30분마다 Edge Function `daily-article-reminder`를 호출한다. 함수는 사용자 타임존 기준 현재 30분 버킷이 설정 시각과 일치하는 유저를 골라, 위시리스트 중 `notification_log`에 없는 가장 오래된 메모 1건을 Expo Push API로 발송하고 로그를 남긴다. 앱은 토큰 등록·설정 UI·알림 탭 딥링크만 담당한다.

**Tech Stack:** Supabase (pg_cron, pg_net, Edge Functions/Deno), Expo Push API, expo-notifications, expo-device, TanStack Query, Vitest

**Spec:** `docs/superpowers/specs/2026-08-11-daily-article-reminder-design.md`

## Global Constraints

- 모든 새 테이블은 `memo` 스키마, RLS 활성화, `user_id = auth.uid()` 정책 (스펙 §3)
- 컬럼 네이밍: 기존 memo 테이블처럼 boolean/시각 설정은 quoted camelCase(`"isEnabled"`, `"notifyTime"`), 관계·타임스탬프는 snake_case(`user_id`, `memo_id`, `sent_at`)
- 알림 기본값: `isEnabled=false`(옵트인), `notifyTime='08:00'`, `timezone='Asia/Seoul'` (스펙 §3)
- 발송 로그는 **Expo API 성공 응답 후** insert (스펙 §6)
- `UNIQUE(user_id, memo_id)`로 같은 아티클 재알림 차단 (스펙 §3)
- 앱 코드 컨벤션: `export function` 선언(화살표 상수 금지), 파일명 camelCase, 아이콘은 `lucide-react-native`, 훅은 기존 `useMemoSectionSettings.ts` 패턴 (AGENTS.md)
- 커밋 메시지는 한글 (AGENTS.md)
- 검증 명령: `pnpm type-check`, `pnpm lint`, 단위 테스트는 `pnpm test:jest -- <파일경로>` (vitest, `**/*.test.ts` 자동 포함)
- 코드 밖 선행 작업(FCM 자격증명, APNs 키, CRON_SECRET 등록, 함수 배포)은 사람이 수행 — 스펙 §8. 코드 태스크는 이것 없이도 커밋 가능해야 한다.

---

### Task 1: DB 마이그레이션 — 알림 테이블 3개 + RLS

**Files:**
- Create: `packages/supabase-edge-functions/supabase/migrations/20260811_add_notification_tables.sql`

**Interfaces:**
- Produces: `memo.notification_setting(user_id, "isEnabled", "notifyTime", timezone, updated_at)`, `memo.push_token(id, user_id, token, platform, updated_at)`, `memo.notification_log(id, user_id, memo_id, sent_at)` — Task 2(타입), Task 4(Edge Function), Task 6~7(앱 훅)이 이 스키마에 의존

- [x] **Step 1: 마이그레이션 SQL 작성**

```sql
-- 매일 아침 아티클 리마인더 알림용 테이블 3개.
-- notification_setting: 유저별 알림 On/Off·시각·타임존
-- push_token: 기기별 Expo 푸시 토큰
-- notification_log: 발송 이력(같은 메모 재알림 방지의 단일 진실 원천)

CREATE TABLE IF NOT EXISTS memo.notification_setting (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  "isEnabled" boolean NOT NULL DEFAULT false,
  "notifyTime" time NOT NULL DEFAULT '08:00',
  timezone text NOT NULL DEFAULT 'Asia/Seoul',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS memo.push_token (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  platform text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_token_user_id_idx ON memo.push_token (user_id);

CREATE TABLE IF NOT EXISTS memo.notification_log (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  memo_id bigint NOT NULL REFERENCES memo.memo(id) ON DELETE CASCADE,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, memo_id)
);

CREATE INDEX IF NOT EXISTS notification_log_user_sent_idx
  ON memo.notification_log (user_id, sent_at DESC);

-- RLS: 본인 행만 접근. Edge Function은 service_role로 우회 접근한다.
ALTER TABLE memo.notification_setting ENABLE ROW LEVEL SECURITY;
ALTER TABLE memo.push_token ENABLE ROW LEVEL SECURITY;
ALTER TABLE memo.notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_setting_own_rows" ON memo.notification_setting
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "push_token_own_rows" ON memo.push_token
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notification_log_own_rows" ON memo.notification_log
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON memo.notification_setting TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON memo.push_token TO authenticated;
GRANT SELECT, INSERT, DELETE ON memo.notification_log TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE memo.push_token_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE memo.notification_log_id_seq TO authenticated;
```

- [x] **Step 2: SQL 문법 셀프 체크**

로컬 Supabase가 있으면 `supabase db reset`(또는 `supabase migration up`)으로 적용 확인.
없으면 위 SQL을 눈으로 재검토(따옴표 camelCase 컬럼, FK 대상 `memo.memo(id)` 존재 확인 — `packages/shared/src/types/supabase.ts:84` 근처의 memo Row와 대조).

- [x] **Step 3: Commit**

```bash
git add packages/supabase-edge-functions/supabase/migrations/20260811_add_notification_tables.sql
git commit -m "feat: 알림 설정·푸시 토큰·발송 로그 테이블 마이그레이션 추가"
```

---

### Task 2: 공용 Supabase 타입에 새 테이블 3개 추가

**Files:**
- Modify: `packages/shared/src/types/supabase.ts` (memo.Tables 안, `memo` 테이블 정의 뒤)

**Interfaces:**
- Consumes: Task 1의 테이블 스키마
- Produces: `Database["memo"]["Tables"]["notification_setting" | "push_token" | "notification_log"]` 타입 — Task 6~7의 앱 훅이 사용

- [x] **Step 1: 타입 추가**

`memo` 테이블 블록(`Relationships: [...]` 닫힌 직후, category와 같은 들여쓰기 레벨)에 아래 3개 테이블을 추가:

```typescript
			notification_log: {
				Row: {
					id: number;
					memo_id: number;
					sent_at: string;
					user_id: string;
				};
				Insert: {
					id?: number;
					memo_id: number;
					sent_at?: string;
					user_id: string;
				};
				Update: {
					id?: number;
					memo_id?: number;
					sent_at?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "notification_log_memo_id_fkey";
						columns: ["memo_id"];
						isOneToOne: false;
						referencedRelation: "memo";
						referencedColumns: ["id"];
					},
				];
			};
			notification_setting: {
				Row: {
					isEnabled: boolean;
					notifyTime: string;
					timezone: string;
					updated_at: string;
					user_id: string;
				};
				Insert: {
					isEnabled?: boolean;
					notifyTime?: string;
					timezone?: string;
					updated_at?: string;
					user_id: string;
				};
				Update: {
					isEnabled?: boolean;
					notifyTime?: string;
					timezone?: string;
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [];
			};
			push_token: {
				Row: {
					id: number;
					platform: string;
					token: string;
					updated_at: string;
					user_id: string;
				};
				Insert: {
					id?: number;
					platform: string;
					token: string;
					updated_at?: string;
					user_id: string;
				};
				Update: {
					id?: number;
					platform?: string;
					token?: string;
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [];
			};
```

> 참고: 원칙은 `pnpm generate-supabase-type` 재생성이지만, 마이그레이션이 원격 DB에 적용되기 전이므로 수동 추가한다. 원격 적용 후 재생성하면 동일 결과가 나오도록 실제 스키마와 1:1로 맞춘다.

- [x] **Step 2: 타입 체크**

Run: `pnpm type-check`
Expected: PASS (기존 에러 0 유지)

- [x] **Step 3: Commit**

```bash
git add packages/shared/src/types/supabase.ts
git commit -m "feat: 알림 테이블 Supabase 타입 추가"
```

---

### Task 3: 시간 버킷 순수 함수 (TDD)

**Files:**
- Create: `packages/supabase-edge-functions/supabase/functions/daily-article-reminder/timeBucket.ts`
- Test: `packages/supabase-edge-functions/supabase/functions/daily-article-reminder/timeBucket.test.ts`

**Interfaces:**
- Produces:
  - `function shouldNotifyNow(notifyTime: string, timezone: string, nowUtc: Date): boolean` — `notifyTime`은 `"HH:MM"` 또는 `"HH:MM:SS"`, 현재 시각을 timezone으로 변환해 30분 버킷 floor 후 일치 여부 반환
  - `function getLocalDateString(date: Date, timezone: string): string` — `"YYYY-MM-DD"` 반환 (오늘 발송 여부 판단용)
  - Task 4의 Edge Function이 `./timeBucket.ts`로 import (Deno 스타일 확장자 포함)
- 제약: **Deno/Node 양쪽에서 동작해야 하므로 import 0개, Web 표준 API(Intl)만 사용**

- [x] **Step 1: 실패하는 테스트 작성**

`timeBucket.test.ts`:

```typescript
import { describe, expect, test } from "vitest";
import { getLocalDateString, shouldNotifyNow } from "./timeBucket";

describe("shouldNotifyNow", () => {
	test("서울 08:00 설정, UTC 23:00(= KST 08:00)이면 true", () => {
		const nowUtc = new Date("2026-08-10T23:00:00Z");
		expect(shouldNotifyNow("08:00", "Asia/Seoul", nowUtc)).toBe(true);
	});

	test("서울 08:00 설정, UTC 23:29(= KST 08:29, 같은 30분 버킷)이면 true", () => {
		const nowUtc = new Date("2026-08-10T23:29:59Z");
		expect(shouldNotifyNow("08:00", "Asia/Seoul", nowUtc)).toBe(true);
	});

	test("서울 08:00 설정, UTC 23:30(= KST 08:30, 다음 버킷)이면 false", () => {
		const nowUtc = new Date("2026-08-10T23:30:00Z");
		expect(shouldNotifyNow("08:00", "Asia/Seoul", nowUtc)).toBe(false);
	});

	test("notifyTime이 HH:MM:SS 형식이어도 동작한다", () => {
		const nowUtc = new Date("2026-08-10T23:00:00Z");
		expect(shouldNotifyNow("08:00:00", "Asia/Seoul", nowUtc)).toBe(true);
	});

	test("08:30 설정은 08:30~08:59 버킷에서만 true", () => {
		expect(
			shouldNotifyNow("08:30", "Asia/Seoul", new Date("2026-08-10T23:40:00Z")),
		).toBe(true);
		expect(
			shouldNotifyNow("08:30", "Asia/Seoul", new Date("2026-08-10T23:10:00Z")),
		).toBe(false);
	});

	test("다른 타임존(America/New_York, UTC-4 서머타임)도 지원한다", () => {
		// 2026-08-10 12:00 UTC = 뉴욕 08:00 (EDT)
		const nowUtc = new Date("2026-08-10T12:00:00Z");
		expect(shouldNotifyNow("08:00", "America/New_York", nowUtc)).toBe(true);
		expect(shouldNotifyNow("08:00", "Asia/Seoul", nowUtc)).toBe(false);
	});
});

describe("getLocalDateString", () => {
	test("UTC 23:00은 서울 기준 다음날이다", () => {
		const date = new Date("2026-08-10T23:00:00Z");
		expect(getLocalDateString(date, "Asia/Seoul")).toBe("2026-08-11");
	});

	test("UTC 12:00은 서울 기준 같은 날이다", () => {
		const date = new Date("2026-08-10T12:00:00Z");
		expect(getLocalDateString(date, "Asia/Seoul")).toBe("2026-08-10");
	});
});
```

- [x] **Step 2: 테스트 실패 확인**

Run: `pnpm test:jest -- packages/supabase-edge-functions/supabase/functions/daily-article-reminder/timeBucket.test.ts`
Expected: FAIL — `Cannot find module './timeBucket'` 류 에러

- [x] **Step 3: 구현**

`timeBucket.ts`:

```typescript
// Deno(Edge Function)와 Node(Vitest) 양쪽에서 실행되므로 외부 import 없이
// Web 표준 Intl API만 사용한다.

/**
 * 주어진 UTC 시각을 특정 타임존의 "HH:MM"으로 변환한다.
 */
function getLocalTimeString(date: Date, timezone: string): string {
	return new Intl.DateTimeFormat("en-GB", {
		timeZone: timezone,
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23",
	}).format(date);
}

/**
 * "HH:MM" 또는 "HH:MM:SS"를 30분 버킷의 시작 분(minute of day)으로 내림한다.
 */
function toBucketMinutes(time: string): number {
	const [hourPart, minutePart] = time.split(":");
	const totalMinutes = Number(hourPart) * 60 + Number(minutePart);

	return Math.floor(totalMinutes / 30) * 30;
}

/**
 * 사용자 타임존 기준 현재 30분 버킷이 알림 설정 시각의 버킷과 일치하는지 판단한다.
 */
export function shouldNotifyNow(
	notifyTime: string,
	timezone: string,
	nowUtc: Date,
): boolean {
	const localNow = getLocalTimeString(nowUtc, timezone);

	return toBucketMinutes(localNow) === toBucketMinutes(notifyTime);
}

/**
 * 주어진 시각을 특정 타임존의 "YYYY-MM-DD" 날짜 문자열로 변환한다.
 * "오늘 이미 발송했는지" 판단에 사용한다.
 */
export function getLocalDateString(date: Date, timezone: string): string {
	return new Intl.DateTimeFormat("en-CA", {
		timeZone: timezone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(date);
}
```

- [x] **Step 4: 테스트 통과 확인**

Run: `pnpm test:jest -- packages/supabase-edge-functions/supabase/functions/daily-article-reminder/timeBucket.test.ts`
Expected: PASS (8 tests)

- [x] **Step 5: Commit**

```bash
git add packages/supabase-edge-functions/supabase/functions/daily-article-reminder/
git commit -m "feat: 알림 시각 30분 버킷 판정 순수 함수 추가"
```

---

### Task 4: Edge Function `daily-article-reminder`

**Files:**
- Create: `packages/supabase-edge-functions/supabase/functions/daily-article-reminder/index.ts`

**Interfaces:**
- Consumes: Task 1 테이블, Task 3의 `shouldNotifyNow`/`getLocalDateString` (`./timeBucket.ts`)
- Produces: HTTP POST 엔드포인트. 요청 헤더 `x-cron-secret` 필수. 응답 `{ status: "success", notified: number, skipped: number }`
- 환경 변수: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`(Supabase가 자동 주입), `CRON_SECRET`(수동 등록)
- 푸시 페이로드 `data`: `{ url: string, memoId: number }` — Task 8의 observer가 `data.url`을 읽음

- [x] **Step 1: 구현**

```typescript
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getLocalDateString, shouldNotifyNow } from "./timeBucket.ts";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

const supabase = createClient(
	Deno.env.get("SUPABASE_URL") ?? "",
	Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
	{ db: { schema: "memo" } },
);

interface NotificationSetting {
	user_id: string;
	isEnabled: boolean;
	notifyTime: string;
	timezone: string;
}

interface CandidateMemo {
	id: number;
	title: string;
	url: string;
}

/**
 * 유저의 위시리스트 중 발송 이력이 없는 가장 오래된 메모 1건을 고른다.
 */
async function pickCandidateMemo(userId: string): Promise<CandidateMemo | null> {
	const { data: sentLogs } = await supabase
		.from("notification_log")
		.select("memo_id")
		.eq("user_id", userId);

	const sentMemoIds = (sentLogs ?? []).map((log) => log.memo_id);

	let query = supabase
		.from("memo")
		.select("id, title, url")
		.eq("user_id", userId)
		.eq("isWish", true)
		.order("created_at", { ascending: true })
		.limit(1);

	if (sentMemoIds.length > 0) {
		query = query.not("id", "in", `(${sentMemoIds.join(",")})`);
	}

	const { data } = await query;

	return data?.[0] ?? null;
}

/**
 * 오늘(유저 타임존 기준) 이미 발송했는지 확인한다.
 */
async function hasSentToday(userId: string, timezone: string): Promise<boolean> {
	const { data } = await supabase
		.from("notification_log")
		.select("sent_at")
		.eq("user_id", userId)
		.order("sent_at", { ascending: false })
		.limit(1);

	const lastSentAt = data?.[0]?.sent_at;
	if (!lastSentAt) return false;

	const now = new Date();

	return (
		getLocalDateString(new Date(lastSentAt), timezone) ===
		getLocalDateString(now, timezone)
	);
}

/**
 * Expo Push API로 알림을 보내고, 죽은 토큰(DeviceNotRegistered)을 정리한다.
 * 하나 이상의 토큰으로 발송 성공하면 true.
 */
async function sendPush(
	tokens: { token: string }[],
	memo: CandidateMemo,
): Promise<boolean> {
	const messages = tokens.map(({ token }) => ({
		to: token,
		title: "오늘의 읽을거리 📖",
		body: memo.title,
		data: { url: memo.url, memoId: memo.id },
	}));

	const response = await fetch(EXPO_PUSH_URL, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(messages),
	});

	if (!response.ok) {
		console.error("Expo Push API 오류:", response.status, await response.text());
		return false;
	}

	const { data: tickets } = await response.json();
	let hasSuccess = false;

	for (let i = 0; i < tickets.length; i++) {
		const ticket = tickets[i];
		if (ticket.status === "ok") {
			hasSuccess = true;
			continue;
		}
		if (ticket.details?.error === "DeviceNotRegistered") {
			await supabase.from("push_token").delete().eq("token", tokens[i].token);
		}
		console.error("푸시 티켓 오류:", JSON.stringify(ticket));
	}

	return hasSuccess;
}

serve(async (req) => {
	if (req.headers.get("x-cron-secret") !== Deno.env.get("CRON_SECRET")) {
		return new Response(JSON.stringify({ status: "unauthorized" }), {
			status: 401,
			headers: { "Content-Type": "application/json" },
		});
	}

	const now = new Date();
	let notified = 0;
	let skipped = 0;

	const { data: settings, error } = await supabase
		.from("notification_setting")
		.select("user_id, isEnabled, notifyTime, timezone")
		.eq("isEnabled", true);

	if (error) {
		console.error("설정 조회 실패:", error.message);
		return new Response(
			JSON.stringify({ status: "error", message: error.message }),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}

	for (const setting of (settings ?? []) as NotificationSetting[]) {
		if (!shouldNotifyNow(setting.notifyTime, setting.timezone, now)) {
			continue;
		}

		if (await hasSentToday(setting.user_id, setting.timezone)) {
			skipped++;
			continue;
		}

		const memo = await pickCandidateMemo(setting.user_id);
		if (!memo) {
			skipped++;
			continue;
		}

		const { data: tokens } = await supabase
			.from("push_token")
			.select("token")
			.eq("user_id", setting.user_id);

		if (!tokens || tokens.length === 0) {
			skipped++;
			continue;
		}

		const isSent = await sendPush(tokens, memo);
		if (!isSent) {
			skipped++;
			continue;
		}

		// 발송 성공 후에만 로그를 남긴다. UNIQUE(user_id, memo_id) 충돌은 이미
		// 발송된 것이므로 무시한다. (스펙 §6)
		const { error: logError } = await supabase.from("notification_log").insert({
			user_id: setting.user_id,
			memo_id: memo.id,
		});

		if (logError && !logError.message.includes("duplicate")) {
			console.error("발송 로그 기록 실패:", logError.message);
		}

		notified++;
	}

	return new Response(JSON.stringify({ status: "success", notified, skipped }), {
		headers: { "Content-Type": "application/json" },
	});
});
```

- [x] **Step 2: 로컬 수동 검증 (가능한 경우)**

로컬 Supabase가 구동 중이면:

```bash
cd packages/supabase-edge-functions
supabase functions serve daily-article-reminder --env-file <(echo "CRON_SECRET=test-secret")
# 다른 터미널에서
curl -i -X POST http://127.0.0.1:54321/functions/v1/daily-article-reminder \
  -H "x-cron-secret: wrong" # → 401 기대
curl -i -X POST http://127.0.0.1:54321/functions/v1/daily-article-reminder \
  -H "x-cron-secret: test-secret" # → 200 {"status":"success",...} 기대
```

로컬 환경이 없으면 코드 리뷰로 대체하고 배포 후 검증(Task 9 체크리스트)로 미룬다.

- [x] **Step 3: Commit**

```bash
git add packages/supabase-edge-functions/supabase/functions/daily-article-reminder/index.ts
git commit -m "feat: 매일 아침 아티클 리마인더 Edge Function 추가"
```

---

### Task 5: pg_cron 등록 마이그레이션

**Files:**
- Create: `packages/supabase-edge-functions/supabase/migrations/20260812_schedule_article_reminder_cron.sql`

**Interfaces:**
- Consumes: Task 4의 Edge Function 엔드포인트
- Produces: 30분마다 함수를 호출하는 cron job `daily-article-reminder`
- 전제: Supabase Vault에 `project_url`, `cron_secret` 시크릿이 등록돼 있어야 함(사람 작업, Task 9)

- [x] **Step 1: cron 마이그레이션 작성**

```sql
-- 30분마다 daily-article-reminder Edge Function을 호출한다.
-- URL과 시크릿은 하드코딩하지 않고 Vault에서 읽는다.
-- 선행 조건(사람 작업): Vault에 project_url, cron_secret 등록.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 재실행 안전: 같은 이름의 잡이 있으면 먼저 제거
DO $$
BEGIN
  PERFORM cron.unschedule('daily-article-reminder');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'daily-article-reminder',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
           || '/functions/v1/daily-article-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
```

- [x] **Step 2: Commit**

```bash
git add packages/supabase-edge-functions/supabase/migrations/20260812_schedule_article_reminder_cron.sql
git commit -m "feat: 아티클 리마인더 30분 주기 pg_cron 잡 등록"
```

---

### Task 6: 앱 — expo-notifications 설치 + 푸시 토큰 등록 모듈

**Files:**
- Modify: `apps/app/package.json` (pnpm으로 설치), `apps/app/app.json` (plugins 배열)
- Create: `apps/app/lib/notifications/registerPushToken.ts`

**Interfaces:**
- Consumes: Task 2 타입(`push_token` upsert), `supabase` 클라이언트(`@/lib/supabase/client`)
- Produces: `async function registerPushToken(): Promise<boolean>` — 권한 요청→토큰 발급→upsert. 성공 시 true. Task 7의 설정 훅과 Task 8의 앱 시작 로직이 호출

- [x] **Step 1: 의존성 설치**

```bash
cd apps/app
pnpm add expo-notifications expo-device
```

Expected: package.json dependencies에 두 패키지 추가됨 (expo SDK 54 호환 버전)

- [x] **Step 2: app.json plugins에 expo-notifications 추가**

`apps/app/app.json`의 `plugins` 배열에서 `"expo-sqlite"` 항목 뒤에 추가:

```json
			[
				"expo-notifications",
				{
					"icon": "./assets/icon.png",
					"color": "#5b93f0"
				}
			],
```

- [x] **Step 3: registerPushToken.ts 작성**

```typescript
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { supabase } from "@/lib/supabase/client";

/**
 * 푸시 알림 권한을 요청하고 Expo 푸시 토큰을 발급받아 Supabase에 upsert한다.
 * @returns 토큰 등록까지 성공하면 true, 권한 거부·시뮬레이터·미로그인 등은 false
 */
export async function registerPushToken(): Promise<boolean> {
	if (!Device.isDevice) return false;

	const { data: sessionData } = await supabase.auth.getSession();
	const userId = sessionData.session?.user.id;
	if (!userId) return false;

	const { status: existingStatus } = await Notifications.getPermissionsAsync();
	let finalStatus = existingStatus;

	if (existingStatus !== "granted") {
		const { status } = await Notifications.requestPermissionsAsync();
		finalStatus = status;
	}
	if (finalStatus !== "granted") return false;

	if (Platform.OS === "android") {
		await Notifications.setNotificationChannelAsync("default", {
			name: "기본",
			importance: Notifications.AndroidImportance.DEFAULT,
		});
	}

	const projectId = Constants.expoConfig?.extra?.eas?.projectId;
	if (!projectId) return false;

	try {
		const { data: token } = await Notifications.getExpoPushTokenAsync({
			projectId,
		});

		const { error } = await supabase.from("push_token").upsert(
			{
				user_id: userId,
				token,
				platform: Platform.OS,
				updated_at: new Date().toISOString(),
			},
			{ onConflict: "token" },
		);

		return !error;
	} catch {
		// 토큰 발급 실패는 조용히 무시 — 다음 앱 시작 시 재시도 (스펙 §6)
		return false;
	}
}
```

- [x] **Step 4: 타입 체크**

Run: `pnpm type-check`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add apps/app/package.json apps/app/app.json apps/app/lib/notifications/registerPushToken.ts pnpm-lock.yaml
git commit -m "feat: expo-notifications 도입 및 푸시 토큰 등록 모듈 추가"
```

---

### Task 7: 앱 — 알림 설정 훅 + 설정 화면 UI

**Files:**
- Create: `apps/app/lib/hooks/useNotificationSetting.ts`
- Create: `apps/app/app/(main)/settings/_components/NotificationTimePicker.tsx`
- Modify: `apps/app/app/(main)/settings/index.tsx` ("메모 작성" 섹션 뒤에 "알림" 섹션 추가)

**Interfaces:**
- Consumes: Task 2 타입, Task 6의 `registerPushToken`
- Produces:
  - `function useNotificationSetting(): { setting: IFNotificationSetting; isLoading: boolean }`
  - `function useNotificationSettingSave(): UseMutationResult<...>` — `mutate({ isEnabled, notifyTime })`
  - `interface IFNotificationSetting { isEnabled: boolean; notifyTime: string }` (notifyTime은 `"HH:MM"`)
  - `function NotificationTimePicker({ value, onTimeChange }: IFNotificationTimePickerProps)` — 30분 단위 시간 선택 모달

- [x] **Step 1: useNotificationSetting.ts 작성**

```typescript
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth/AuthProvider";
import { supabase } from "@/lib/supabase/client";

const NOTIFICATION_SETTING_KEY = ["notification-setting"];

export interface IFNotificationSetting {
	isEnabled: boolean;
	notifyTime: string;
}

export const DEFAULT_NOTIFICATION_SETTING: IFNotificationSetting = {
	isEnabled: false,
	notifyTime: "08:00",
};

/**
 * "HH:MM:SS" | "HH:MM" → "HH:MM"으로 정규화한다.
 */
function toHourMinute(time: string): string {
	return time.slice(0, 5);
}

/**
 * 알림 설정(On/Off·시각)을 Supabase에서 읽는 훅.
 * 행이 없으면 기본값(Off, 08:00)을 돌려준다.
 */
export function useNotificationSetting() {
	const { session } = useAuth();

	const { data, isLoading } = useQuery({
		queryKey: NOTIFICATION_SETTING_KEY,
		enabled: !!session,
		queryFn: async (): Promise<IFNotificationSetting> => {
			const { data: row } = await supabase
				.from("notification_setting")
				.select("isEnabled, notifyTime")
				.maybeSingle();

			if (!row) return DEFAULT_NOTIFICATION_SETTING;

			return {
				isEnabled: row.isEnabled,
				notifyTime: toHourMinute(row.notifyTime),
			};
		},
	});

	return { setting: data ?? DEFAULT_NOTIFICATION_SETTING, isLoading };
}

/**
 * 알림 설정을 저장(upsert)하는 훅. 타임존은 기기 값을 함께 저장한다.
 */
export function useNotificationSettingSave() {
	const queryClient = useQueryClient();
	const { session } = useAuth();

	return useMutation({
		mutationFn: async (setting: IFNotificationSetting) => {
			const userId = session?.user.id;
			if (!userId) throw new Error("로그인이 필요합니다.");

			const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

			const { error } = await supabase.from("notification_setting").upsert(
				{
					user_id: userId,
					isEnabled: setting.isEnabled,
					notifyTime: setting.notifyTime,
					timezone,
					updated_at: new Date().toISOString(),
				},
				{ onConflict: "user_id" },
			);

			if (error) throw error;
		},
		onMutate: (setting: IFNotificationSetting) => {
			queryClient.setQueryData(NOTIFICATION_SETTING_KEY, setting);
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: NOTIFICATION_SETTING_KEY });
		},
	});
}
```

- [x] **Step 2: NotificationTimePicker.tsx 작성**

30분 단위 48개 옵션을 모달 FlatList로 보여주는 단순 피커:

```tsx
import { useState } from "react";
import {
	FlatList,
	Modal,
	Pressable,
	Text,
	TouchableOpacity,
	View,
} from "react-native";

const TIME_OPTIONS: string[] = Array.from({ length: 48 }, (_, index) => {
	const hour = String(Math.floor(index / 2)).padStart(2, "0");
	const minute = index % 2 === 0 ? "00" : "30";

	return `${hour}:${minute}`;
});

interface IFNotificationTimePickerProps {
	value: string;
	onTimeChange: (time: string) => void;
}

/**
 * 알림 시각을 30분 단위로 고르는 피커.
 * 현재 값을 누르면 모달 목록이 열리고, 선택 시 onTimeChange를 호출한다.
 */
export function NotificationTimePicker({
	value,
	onTimeChange,
}: IFNotificationTimePickerProps) {
	const [isPickerOpen, setIsPickerOpen] = useState(false);

	const handleTimeSelect = (time: string) => {
		onTimeChange(time);
		setIsPickerOpen(false);
	};

	return (
		<>
			<TouchableOpacity
				className="px-3 py-1.5 rounded-lg bg-muted"
				onPress={() => setIsPickerOpen(true)}
			>
				<Text className="text-[15px] font-semibold text-foreground">
					{value}
				</Text>
			</TouchableOpacity>

			<Modal
				visible={isPickerOpen}
				transparent
				animationType="fade"
				onRequestClose={() => setIsPickerOpen(false)}
			>
				<Pressable
					className="flex-1 bg-black/40 justify-center px-10"
					onPress={() => setIsPickerOpen(false)}
				>
					<View className="bg-white rounded-2xl max-h-[60%] overflow-hidden">
						<FlatList
							data={TIME_OPTIONS}
							keyExtractor={(item) => item}
							initialScrollIndex={TIME_OPTIONS.indexOf(value)}
							getItemLayout={(_, index) => ({
								length: 48,
								offset: 48 * index,
								index,
							})}
							renderItem={({ item }) => (
								<TouchableOpacity
									className={`h-12 justify-center items-center ${
										item === value ? "bg-muted" : ""
									}`}
									onPress={() => handleTimeSelect(item)}
								>
									<Text
										className={`text-base ${
											item === value
												? "font-bold text-foreground"
												: "text-secondary-foreground"
										}`}
									>
										{item}
									</Text>
								</TouchableOpacity>
							)}
						/>
					</View>
				</Pressable>
			</Modal>
		</>
	);
}
```

- [x] **Step 3: 설정 화면에 "알림" 섹션 추가**

`apps/app/app/(main)/settings/index.tsx` 수정:

import 추가:

```typescript
import { registerPushToken } from "@/lib/notifications/registerPushToken";
import {
	useNotificationSetting,
	useNotificationSettingSave,
} from "@/lib/hooks/useNotificationSetting";
import { NotificationTimePicker } from "./_components/NotificationTimePicker";
```

컴포넌트 본문에 훅과 핸들러 추가:

```typescript
	const { setting: notificationSetting } = useNotificationSetting();
	const { mutate: saveNotificationSetting } = useNotificationSettingSave();

	const handleNotificationToggle = async (isEnabled: boolean) => {
		if (!isEnabled) {
			saveNotificationSetting({ ...notificationSetting, isEnabled: false });
			return;
		}

		const isRegistered = await registerPushToken();
		if (!isRegistered) {
			Alert.alert(
				"알림 권한 필요",
				"설정 앱에서 웹 메모의 알림을 허용해주세요.",
				[
					{ text: "취소", style: "cancel" },
					{ text: "설정 열기", onPress: () => Linking.openSettings() },
				],
			);
			return;
		}

		saveNotificationSetting({ ...notificationSetting, isEnabled: true });
	};

	const handleNotifyTimeChange = (notifyTime: string) => {
		saveNotificationSetting({ ...notificationSetting, notifyTime });
	};
```

JSX — "메모 작성" 섹션(`{/* Memo Section Visibility */}` 블록) 다음에 추가. 로그인 상태에서만 노출:

```tsx
				{/* Notification Section */}
				{isLoggedIn && (
					<View className="mb-7">
						<Text className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">
							알림
						</Text>
						<View className="bg-card rounded-[14px] p-4 border border-muted">
							<View className="flex-row justify-between items-center py-2">
								<View className="flex-1 mr-3">
									<Text className="text-[15px] text-secondary-foreground">
										매일 아침 읽을거리 알림
									</Text>
									<Text className="text-[13px] text-muted-foreground mt-0.5">
										위시리스트에서 하나씩 골라 알려드려요
									</Text>
								</View>
								<Switch
									value={notificationSetting.isEnabled}
									onValueChange={handleNotificationToggle}
								/>
							</View>
							{notificationSetting.isEnabled && (
								<View className="flex-row justify-between items-center py-2">
									<Text className="text-[15px] text-secondary-foreground">
										알림 시간
									</Text>
									<NotificationTimePicker
										value={notificationSetting.notifyTime}
										onTimeChange={handleNotifyTimeChange}
									/>
								</View>
							)}
						</View>
					</View>
				)}
```

- [x] **Step 4: 타입 체크 + 린트**

Run: `pnpm type-check && pnpm lint`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add apps/app/lib/hooks/useNotificationSetting.ts "apps/app/app/(main)/settings/_components/NotificationTimePicker.tsx" "apps/app/app/(main)/settings/index.tsx"
git commit -m "feat: 앱 설정에 매일 아침 알림 토글·시간 설정 추가"
```

---

### Task 8: 앱 — 알림 수신 핸들러 + 탭 딥링크

**Files:**
- Create: `apps/app/lib/notifications/useNotificationObserver.ts`
- Modify: `apps/app/app/_layout.tsx`

**Interfaces:**
- Consumes: Task 4가 보내는 페이로드 `data: { url, memoId }`, Task 6의 `registerPushToken`
- Produces: 알림 탭 시 `/(main)/browser?url=<url>&t=<ts>` 라우팅 (브라우저 화면은 이미 `url`/`t` 파라미터를 처리함 — `useBrowserState.ts:55`)

- [x] **Step 1: useNotificationObserver.ts 작성**

```typescript
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect } from "react";

/**
 * 알림 탭 응답을 구독해 페이로드의 url로 앱 내 브라우저를 연다.
 * 콜드 스타트(앱이 꺼진 상태에서 알림 탭)도 처리한다.
 */
export function useNotificationObserver() {
	const router = useRouter();

	useEffect(() => {
		function openArticle(response: Notifications.NotificationResponse) {
			const url = response.notification.request.content.data?.url;
			if (typeof url !== "string") return;

			router.push({
				pathname: "/(main)/browser",
				params: { url, t: String(Date.now()) },
			});
		}

		Notifications.getLastNotificationResponseAsync().then((response) => {
			if (response) openArticle(response);
		});

		const subscription =
			Notifications.addNotificationResponseReceivedListener(openArticle);

		return () => subscription.remove();
	}, [router]);
}
```

- [x] **Step 2: _layout.tsx에 핸들러·옵저버·토큰 재등록 연결**

`apps/app/app/_layout.tsx` 수정:

import 추가:

```typescript
import * as Notifications from "expo-notifications";
import { registerPushToken } from "@/lib/notifications/registerPushToken";
import { useNotificationObserver } from "@/lib/notifications/useNotificationObserver";
```

모듈 레벨(컴포넌트 밖, `SplashScreen.preventAutoHideAsync();` 근처)에 포그라운드 표시 정책 추가:

```typescript
Notifications.setNotificationHandler({
	handleNotification: async () => ({
		// SDK 54의 expo-notifications는 shouldShowAlert 대신 Banner/List를 사용한다.
		shouldShowBanner: true,
		shouldShowList: true,
		shouldPlaySound: false,
		shouldSetBadge: false,
	}),
});
```

새 내부 컴포넌트 추가(`SyncOnAuth` 아래에 배치):

```tsx
function NotificationBridge() {
	const { session } = useAuth();
	useNotificationObserver();

	useEffect(() => {
		if (!session) return;
		// 토큰이 바뀌었을 수 있으므로 앱 시작마다 재등록을 시도한다.
		// 권한이 없거나 실패해도 조용히 무시된다. (스펙 §6)
		registerPushToken().catch(() => {});
	}, [session]);

	return null;
}
```

`RootLayout`의 JSX에서 `<SyncOnAuth />` 옆에 `<NotificationBridge />` 추가:

```tsx
				<SyncOnAuth />
				<NotificationBridge />
				<ShareIntentHandler />
```

- [x] **Step 3: 타입 체크 + 린트**

Run: `pnpm type-check && pnpm lint`
Expected: PASS

- [x] **Step 4: Commit**

```bash
git add apps/app/lib/notifications/useNotificationObserver.ts apps/app/app/_layout.tsx
git commit -m "feat: 알림 탭 시 앱 내 브라우저로 아티클 여는 딥링크 처리"
```

---

### Task 9: 작업 문서화 + 배포 체크리스트

**Files:**
- Create: `claudedocs/2026-08-11-daily-article-reminder.md`

**Interfaces:**
- Consumes: Task 1~8 전체
- Produces: AGENTS.md 규칙에 따른 작업 문서 + 사람이 해야 하는 배포 절차 체크리스트

- [x] **Step 1: 문서 작성**

AGENTS.md 템플릿(Summary/Changes Made/Technical Details/Related Issues/Notes)에 맞춰 작성.
Notes 절에 **사람이 해야 하는 배포 체크리스트**를 반드시 포함:

```markdown
## Notes — 배포 전 수동 작업 체크리스트

- [ ] Firebase 프로젝트 생성 → `google-services.json`을 `apps/app/`에 추가
- [ ] `eas credentials`로 FCM V1 서비스 계정 키(Android)·APNs 키(iOS) 등록
- [ ] Supabase 대시보드: Vault에 `project_url`(https://<ref>.supabase.co), `cron_secret`(랜덤 문자열) 등록
- [ ] Edge Function 환경 변수 `CRON_SECRET`을 같은 값으로 등록
- [ ] `supabase db push`로 마이그레이션 2개 적용 (pg_cron/pg_net 확장 활성화 포함)
- [ ] `supabase functions deploy daily-article-reminder`
- [ ] `pnpm generate-supabase-type` 재실행해 수동 타입과 일치 확인
- [ ] 개발 빌드 재생성(`expo prebuild --clean` 포함된 `pnpm android`/`pnpm ios`)
- [ ] 실기기에서: 설정 토글 On → 권한 허용 → https://expo.dev/notifications 로 테스트 푸시 수신·탭 딥링크 확인
- [ ] cron 검증: 설정 시각을 다음 30분 버킷으로 맞추고 실제 푸시 도착 확인
```

- [x] **Step 2: 최종 전체 검증**

Run: `pnpm type-check && pnpm lint && pnpm test:jest`
Expected: 모두 PASS

- [x] **Step 3: Commit**

```bash
git add claudedocs/2026-08-11-daily-article-reminder.md
git commit -m "docs: 아티클 리마인더 작업 문서 및 배포 체크리스트 추가"
```

---

### Task 10: PR 생성

- [ ] **Step 1: /pr 스킬 실행**

CLAUDE.md 규칙에 따라 `/pr` 커맨드로 PR 생성 (한글 제목·본문, PULL_REQUEST_TEMPLATE.md 준수).
현재 브랜치가 `feat/eas-update`이므로 브랜치 정리 필요 여부를 사용자에게 먼저 확인한다
(설계 스펙 커밋 `f66d6bd9`가 이 브랜치에 있음).
