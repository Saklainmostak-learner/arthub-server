import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";
//#region src/crypto/purpose.ts
const salt = utf8ToBytes("better-auth:oauth-encryption:v1");
function deriveSecret(secret, purpose) {
	return bytesToHex(hkdf(sha256, utf8ToBytes(secret), salt, utf8ToBytes(`better-auth:${purpose}:v1`), 32));
}
/** Derive an isolated key for one OAuth ciphertext purpose, retaining rotation versions. */
function derivePurposeKey(secret, purpose) {
	if (typeof secret === "string") return deriveSecret(secret, purpose);
	return {
		keys: new Map(Array.from(secret.keys, ([version, value]) => [version, deriveSecret(value, purpose)])),
		currentVersion: secret.currentVersion,
		...secret.legacySecret && { legacySecret: deriveSecret(secret.legacySecret, purpose) }
	};
}
//#endregion
export { derivePurposeKey };
