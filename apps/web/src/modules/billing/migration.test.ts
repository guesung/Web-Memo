import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const MIGRATION = readFileSync(
	new URL(
		"../../../../../packages/supabase-edge-functions/supabase/migrations/20260913160000_add_billing_and_usage_limits.sql",
		import.meta.url,
	),
	"utf8",
);

describe("billing database guard definitions", () => {
	it("locks the memo owner before checking existing rows and the free quota", () => {
		const memoGuard = MIGRATION.slice(
			MIGRATION.indexOf("function billing.enforce_memo_limit()"),
			MIGRATION.indexOf("drop trigger if exists enforce_free_memo_limit"),
		);
		expect(memoGuard).toContain(
			"pg_advisory_xact_lock(hashtextextended('memo-limit:' || new.user_id::text, 0))",
		);
		expect(memoGuard.indexOf("pg_advisory_xact_lock")).toBeLessThan(
			memoGuard.indexOf("select count(*)"),
		);
		expect(memoGuard).toContain("where id = new.id and user_id = new.user_id");
		expect(memoGuard.indexOf("where id = new.id")).toBeLessThan(
			memoGuard.indexOf("select count(*)"),
		);
	});
	it("prevents concurrent unresolved charges with different idempotency keys", () => {
		expect(MIGRATION).toContain(
			"create unique index charges_one_unresolved_per_user_idx on billing.charges (user_id) where status in ('pending', 'unknown')",
		);
		expect(MIGRATION).toContain(
			"create trigger enforce_charge_start before insert on billing.charges",
		);
		expect(MIGRATION).toContain("message = 'ACTIVE_SUBSCRIPTION_EXISTS'");
	});
	it("serializes atomic completion with new charge insertion", () => {
		const complete = MIGRATION.slice(
			MIGRATION.indexOf("function billing.complete_subscription_charge("),
			MIGRATION.indexOf("function billing.enforce_memo_limit()"),
		);
		expect(complete).toContain(
			"pg_advisory_xact_lock(hashtextextended('billing-charge:' || target_user_id::text, 0))",
		);
		expect(complete.indexOf("insert into billing.subscriptions")).toBeLessThan(
			complete.indexOf("update billing.charges set status = 'succeeded'"),
		);
		expect(complete).toContain(
			"cancel_at_period_end = billing.subscriptions.cancel_at_period_end",
		);
	});
});
