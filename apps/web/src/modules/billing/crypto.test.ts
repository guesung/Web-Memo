import { afterEach, describe, expect, it } from "vitest";
import { decryptBillingKey, encryptBillingKey } from "./crypto";

const ORIGINAL_ENCRYPTION_KEY = process.env.BILLING_KEY_ENCRYPTION_KEY;

afterEach(() => {
	process.env.BILLING_KEY_ENCRYPTION_KEY = ORIGINAL_ENCRYPTION_KEY;
});

describe("billing key encryption", () => {
	it("encrypts without exposing plaintext and decrypts losslessly", () => {
		process.env.BILLING_KEY_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString(
			"base64",
		);
		const ciphertext = encryptBillingKey("billing-key-secret");

		expect(ciphertext).not.toContain("billing-key-secret");
		expect(decryptBillingKey(ciphertext)).toBe("billing-key-secret");
	});

	it("fails closed when the encryption key is missing", () => {
		delete process.env.BILLING_KEY_ENCRYPTION_KEY;

		expect(() => encryptBillingKey("billing-key-secret")).toThrow(
			"BILLING_KEY_ENCRYPTION_KEY is not configured",
		);
	});
});
