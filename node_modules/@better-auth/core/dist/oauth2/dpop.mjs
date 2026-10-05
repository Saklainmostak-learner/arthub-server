import { base64url, calculateJwkThumbprint, decodeProtectedHeader, importJWK, jwtVerify } from "jose";
//#region src/oauth2/dpop.ts
const DPOP_AUTHORIZATION_SCHEME = "DPoP";
const BEARER_AUTHORIZATION_SCHEME = "Bearer";
const DPOP_PROOF_TYPE = "dpop+jwt";
const DPOP_SIGNING_ALGORITHMS = [
	"EdDSA",
	"ES256",
	"ES512",
	"PS256",
	"RS256"
];
const DEFAULT_DPOP_PROOF_MAX_AGE_SECONDS = 300;
const MAX_DPOP_JTI_LENGTH = 512;
const JWK_PRIVATE_FIELDS = new Set([
	"d",
	"p",
	"q",
	"dp",
	"dq",
	"qi",
	"oth",
	"k"
]);
function createInMemoryDpopReplayStore() {
	const reservations = /* @__PURE__ */ new Map();
	return { reserve({ key, expiresAt, now }) {
		const nowMs = now.getTime();
		for (const [storedKey, expiresAtMs] of reservations) if (expiresAtMs <= nowMs) reservations.delete(storedKey);
		if (reservations.has(key)) return false;
		reservations.set(key, expiresAt.getTime());
		return true;
	} };
}
/**
* Database-backed DPoP proof replay store built on the auth context's
* verification reservation primitive (`internalAdapter.reserveVerificationValue`),
* the same atomic single-use mechanism that guards SAML assertion ids and other
* one-time tokens. A replayed proof collides on the deterministic reservation id
* so `reserve` returns `false`, giving cross-instance anti-replay. Prefer this
* over {@link createInMemoryDpopReplayStore} for any multi-instance or serverless
* resource server. Requires database-backed verification storage; a
* secondary-storage-only deployment rejects the proof (fails closed).
*/
function createDpopReplayStore(reservations) {
	return { reserve: ({ key, expiresAt }) => reservations.reserveVerificationValue({
		identifier: `dpop-proof:${key}`,
		value: key,
		expiresAt
	}) };
}
function createDpopProofError(code, message) {
	return Object.assign(new Error(message), { code });
}
function isDpopProofError(error) {
	return error instanceof Error && "code" in error && error.code === "invalid_dpop_proof";
}
function parseAccessTokenAuthorization(authorization) {
	if (!authorization) return void 0;
	const value = authorization.trim();
	if (!value) return void 0;
	const match = /^([A-Za-z][A-Za-z0-9!#$%&'*+.^_`|~-]*)\s+(.+)$/.exec(value);
	if (!match) return {
		scheme: "Unknown",
		token: value
	};
	const scheme = match[1] ?? "";
	const token = match[2]?.trim() ?? "";
	if (scheme.toLowerCase() === "bearer") return {
		scheme: "Bearer",
		token
	};
	if (scheme.toLowerCase() === "dpop") return {
		scheme: "DPoP",
		token
	};
	return {
		scheme: "Unknown",
		token: value
	};
}
function stripAccessTokenAuthorizationScheme(token) {
	return parseAccessTokenAuthorization(token)?.token ?? token;
}
function normalizeDpopHtu(url) {
	const parsed = new URL(url);
	if (parsed.hash) throw new Error("DPoP proof htu must not contain a fragment");
	return `${parsed.origin}${parsed.pathname}`;
}
async function deriveDpopAth(accessToken) {
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(accessToken));
	return base64url.encode(new Uint8Array(digest));
}
async function deriveDpopJkt(jwk) {
	return calculateJwkThumbprint(jwk, "sha256");
}
/**
* Extracts the DPoP key thumbprint from an RFC 7800 `cnf` confirmation. The
* input is untrusted (a JWT claim, a JSON column), so any shape other than an
* object carrying a non-empty string `jkt` (a primitive, an array, a different
* confirmation method such as mTLS `x5t#S256`) yields `undefined` instead of
* throwing.
*/
function getConfirmationJkt(confirmation) {
	if (!confirmation || typeof confirmation !== "object" || Array.isArray(confirmation)) return;
	const jkt = confirmation.jkt;
	return typeof jkt === "string" && jkt.length > 0 ? jkt : void 0;
}
function getDpopJktFromPayload(payload) {
	return getConfirmationJkt(payload.cnf);
}
function getStringClaim(payload, claim) {
	const value = payload[claim];
	return typeof value === "string" && value.length > 0 ? value : void 0;
}
function getNumberClaim(payload, claim) {
	const value = payload[claim];
	return typeof value === "number" && Number.isFinite(value) ? value : void 0;
}
function assertSupportedDpopAlgorithm(alg, signingAlgorithms) {
	if (!alg || alg === "none" || alg.startsWith("HS")) throw createDpopProofError("invalid_dpop_proof", "DPoP proof must use an asymmetric JWS algorithm");
	if (!signingAlgorithms.includes(alg)) throw createDpopProofError("invalid_dpop_proof", "DPoP proof uses an unsupported JWS algorithm");
}
function assertPublicJwk(jwk) {
	if (!jwk || typeof jwk !== "object" || Array.isArray(jwk)) throw createDpopProofError("invalid_dpop_proof", "DPoP proof header must include a public jwk");
	if (jwk.kty === "oct") throw createDpopProofError("invalid_dpop_proof", "DPoP proof jwk must be asymmetric");
	for (const field of JWK_PRIVATE_FIELDS) if (field in jwk) throw createDpopProofError("invalid_dpop_proof", "DPoP proof jwk must not contain private key material");
}
async function deriveDpopReplayKey(params) {
	const input = `${params.jkt}\n${params.htm}\n${params.htu}\n${params.jti}`;
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
	return base64url.encode(new Uint8Array(digest));
}
async function reserveDpopReplay(replayStore, reservation) {
	if (!replayStore) return;
	if (!await replayStore.reserve(reservation)) throw createDpopProofError("invalid_dpop_proof", "DPoP proof jti has already been used");
}
async function verifyDpopProof({ proofJwt, method, url, accessToken, expectedJkt, requireAth = false, nowSeconds = Math.floor(Date.now() / 1e3), proofMaxAgeSeconds = DEFAULT_DPOP_PROOF_MAX_AGE_SECONDS, signingAlgorithms = DPOP_SIGNING_ALGORITHMS, replayStore }) {
	if (!proofJwt || proofJwt.split(".").length !== 3) throw createDpopProofError("invalid_dpop_proof", "DPoP proof must be a compact JWT");
	let protectedHeader;
	try {
		protectedHeader = decodeProtectedHeader(proofJwt);
	} catch (error) {
		throw createDpopProofError("invalid_dpop_proof", error instanceof Error ? error.message : "DPoP proof header is invalid");
	}
	if (protectedHeader.typ !== "dpop+jwt") throw createDpopProofError("invalid_dpop_proof", "DPoP proof typ must be \"dpop+jwt\"");
	assertSupportedDpopAlgorithm(protectedHeader.alg, signingAlgorithms);
	assertPublicJwk(protectedHeader.jwk);
	let payload;
	try {
		payload = (await jwtVerify(proofJwt, await importJWK(protectedHeader.jwk, protectedHeader.alg), { typ: DPOP_PROOF_TYPE })).payload;
	} catch (error) {
		throw createDpopProofError("invalid_dpop_proof", error instanceof Error ? error.message : "DPoP proof signature is invalid");
	}
	const htm = getStringClaim(payload, "htm");
	const htu = getStringClaim(payload, "htu");
	const jti = getStringClaim(payload, "jti");
	const iat = getNumberClaim(payload, "iat");
	if (!htm || !htu || !jti || iat === void 0) throw createDpopProofError("invalid_dpop_proof", "DPoP proof must include htm, htu, jti, and iat claims");
	if (jti.length > MAX_DPOP_JTI_LENGTH) throw createDpopProofError("invalid_dpop_proof", "DPoP proof jti is too large");
	if (htm.toUpperCase() !== method.toUpperCase()) throw createDpopProofError("invalid_dpop_proof", "DPoP proof htm does not match the request method");
	let normalizedHtu;
	let proofHtu;
	try {
		normalizedHtu = normalizeDpopHtu(url);
		proofHtu = normalizeDpopHtu(htu);
	} catch (error) {
		throw createDpopProofError("invalid_dpop_proof", error instanceof Error ? error.message : "DPoP proof htu is invalid");
	}
	if (proofHtu !== normalizedHtu) throw createDpopProofError("invalid_dpop_proof", "DPoP proof htu does not match the request URL");
	if (iat > nowSeconds + 5 || nowSeconds - iat > proofMaxAgeSeconds) throw createDpopProofError("invalid_dpop_proof", "DPoP proof iat is outside the accepted window");
	const ath = getStringClaim(payload, "ath");
	if (requireAth && !ath) throw createDpopProofError("invalid_dpop_proof", "DPoP proof must include an ath claim");
	if (accessToken !== void 0) {
		if (ath !== await deriveDpopAth(accessToken)) throw createDpopProofError("invalid_dpop_proof", "DPoP proof ath does not match the access token");
	}
	const jkt = await deriveDpopJkt(protectedHeader.jwk);
	if (expectedJkt !== void 0 && jkt !== expectedJkt) throw createDpopProofError("invalid_dpop_proof", "DPoP proof key does not match the bound token");
	const replayKey = await deriveDpopReplayKey({
		jkt,
		htm: htm.toUpperCase(),
		htu: normalizedHtu,
		jti
	});
	const expiresAt = /* @__PURE__ */ new Date((iat + proofMaxAgeSeconds) * 1e3);
	await reserveDpopReplay(replayStore, {
		key: replayKey,
		expiresAt,
		now: /* @__PURE__ */ new Date(nowSeconds * 1e3)
	});
	return {
		jwk: protectedHeader.jwk,
		jkt,
		jti,
		htm,
		htu: normalizedHtu,
		iat,
		ath,
		replayKey,
		expiresAt
	};
}
function createDpopBindingError(code, message) {
	return Object.assign(new Error(message), { code });
}
function isDpopBindingError(error) {
	return error instanceof Error && "code" in error && (error.code === "invalid_token" || error.code === "invalid_dpop_proof");
}
/**
* Enforces the RFC 9449 §7.1 sender-constraint check for a resource request,
* given an access-token payload that has already been validated (by JWKS or
* introspection). This is the single source of truth for the
* "is the token DPoP-bound? then require the DPoP scheme, a proof, and a
* matching key" decision, shared by every resource-server entry point.
*
* Throws a {@link DpopBindingError} on any mismatch so callers map the
* `invalid_token` / `invalid_dpop_proof` code into their own transport. Returns
* normally for a valid bearer token (no `cnf.jkt`, no DPoP scheme).
*/
async function enforceDpopBinding({ payload, authorization, proofJwt, method, url, replayStore, proofMaxAgeSeconds, signingAlgorithms }) {
	const dpopJkt = getDpopJktFromPayload(payload);
	if (!dpopJkt) {
		if (authorization.scheme === "DPoP") throw createDpopBindingError("invalid_token", "DPoP authorization requires a DPoP-bound access token");
		return;
	}
	if (authorization.scheme !== "DPoP") throw createDpopBindingError("invalid_token", "DPoP-bound access token requires the DPoP authorization scheme");
	if (!proofJwt) throw createDpopBindingError("invalid_dpop_proof", "DPoP proof header is required");
	try {
		await verifyDpopProof({
			proofJwt,
			method,
			url,
			accessToken: authorization.token,
			expectedJkt: dpopJkt,
			requireAth: true,
			proofMaxAgeSeconds,
			signingAlgorithms,
			replayStore
		});
	} catch (error) {
		if (isDpopProofError(error)) throw createDpopBindingError("invalid_dpop_proof", error.message);
		throw error;
	}
}
//#endregion
export { BEARER_AUTHORIZATION_SCHEME, DPOP_AUTHORIZATION_SCHEME, DPOP_PROOF_TYPE, DPOP_SIGNING_ALGORITHMS, createDpopBindingError, createDpopProofError, createDpopReplayStore, createInMemoryDpopReplayStore, deriveDpopAth, deriveDpopJkt, enforceDpopBinding, getConfirmationJkt, getDpopJktFromPayload, isDpopBindingError, isDpopProofError, normalizeDpopHtu, parseAccessTokenAuthorization, stripAccessTokenAuthorizationScheme, verifyDpopProof };
