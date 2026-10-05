import { decodeProtectedHeader, jwtVerify } from "jose";
//#region src/oauth2/verify-id-token.ts
async function sha256Hex(value) {
	const data = new TextEncoder().encode(value);
	const digest = await crypto.subtle.digest("SHA-256", data);
	return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
async function nonceMatches(claimNonce, nonce, comparison = "exact") {
	if (typeof claimNonce !== "string") return false;
	if (claimNonce === nonce) return true;
	if (comparison === "exact-or-sha256") return claimNonce === await sha256Hex(nonce);
	return false;
}
/**
* Whether a provider can verify a client-submitted id_token.
*
* A provider supports id_token sign-in when it declares an {@link OAuthProvider.idToken}
* verification config, or when the integrator supplies a `verifyIdToken` override on the
* provider options. A provider whose options set `disableIdTokenSignIn`, or that declares
* neither, rejects the client id_token sign-in path with `ID_TOKEN_NOT_SUPPORTED`.
*/
function supportsIdTokenSignIn(provider) {
	const options = provider.options ?? {};
	if (options.disableIdTokenSignIn) return false;
	return Boolean(provider.idToken || options.verifyIdToken);
}
/**
* Verify a client-submitted id_token against a provider's verification config.
*
* This is the single id_token verifier for every social provider. Providers no longer
* implement their own boolean `verifyIdToken`; they declare an {@link OAuthProvider.idToken}
* config and this function performs the cryptographic check. The contract is fail-closed: a
* provider without a config (and without an integrator `verifyIdToken` override) returns
* `false`, so a forged token can never be accepted by omission.
*
* @returns `true` only when the token is authentic for the provider.
*/
async function verifyProviderIdToken(provider, token, nonce, ctx) {
	const options = provider.options ?? {};
	if (options.disableIdTokenSignIn) return false;
	try {
		if (options.verifyIdToken) return await options.verifyIdToken(token, nonce, ctx);
		const config = provider.idToken;
		if (!config) return false;
		if ("verify" in config) return await config.verify(token, nonce, ctx);
		if (token.split(".").length !== 3) return config.allowOpaqueToken === true;
		const { alg } = decodeProtectedHeader(token);
		const { payload } = await jwtVerify(token, config.jwks, {
			issuer: config.issuer,
			audience: config.audience,
			algorithms: config.algorithms ?? (alg ? [alg] : void 0),
			maxTokenAge: config.maxTokenAge
		});
		if (nonce && !await nonceMatches(payload.nonce, nonce, config.nonceComparison)) return false;
		if (config.verifyClaims && !config.verifyClaims(payload)) return false;
		return true;
	} catch {
		return false;
	}
}
//#endregion
export { supportsIdTokenSignIn, verifyProviderIdToken };
