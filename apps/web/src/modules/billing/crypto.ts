import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";

const getEncryptionKey = (): Buffer => {
	const encodedKey = process.env.BILLING_KEY_ENCRYPTION_KEY;

	if (!encodedKey) {
		throw new Error("BILLING_KEY_ENCRYPTION_KEY is not configured");
	}

	const key = Buffer.from(encodedKey, "base64");

	if (key.length !== 32) {
		throw new Error("BILLING_KEY_ENCRYPTION_KEY must be 32 bytes in base64");
	}

	return key;
};

/** 빌링키를 AES-256-GCM으로 암호화합니다. */
export const encryptBillingKey = (billingKey: string): string => {
	const initializationVector = randomBytes(12);
	const cipher = createCipheriv(
		ALGORITHM,
		getEncryptionKey(),
		initializationVector,
	);
	const encrypted = Buffer.concat([
		cipher.update(billingKey, "utf8"),
		cipher.final(),
	]);

	return [
		initializationVector.toString("base64"),
		cipher.getAuthTag().toString("base64"),
		encrypted.toString("base64"),
	].join(".");
};

/** 서버 비밀 테이블에 저장된 빌링키를 복호화합니다. */
export const decryptBillingKey = (ciphertext: string): string => {
	const [initializationVector, authenticationTag, encrypted] =
		ciphertext.split(".");

	if (!initializationVector || !authenticationTag || !encrypted) {
		throw new Error("Encrypted billing key has an invalid format");
	}

	const decipher = createDecipheriv(
		ALGORITHM,
		getEncryptionKey(),
		Buffer.from(initializationVector, "base64"),
	);
	decipher.setAuthTag(Buffer.from(authenticationTag, "base64"));

	return Buffer.concat([
		decipher.update(Buffer.from(encrypted, "base64")),
		decipher.final(),
	]).toString("utf8");
};
