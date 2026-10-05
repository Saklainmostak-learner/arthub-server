import { base64Url } from "@better-auth/utils/base64";
//#region src/oauth2/utils.ts
/**
* Parse a provider's `scope` token-response field into a string array.
*
* RFC 6749 Section 3.3 defines `scope` as a space-delimited string, but
* providers vary: some return an already-split array. Accept both forms and
* drop empty or non-string entries.
*
* @see https://github.com/better-auth/better-auth/issues/9076
*/
function parseScopeField(scope) {
	if (Array.isArray(scope)) return scope.map((s) => typeof s === "string" ? s.trim() : "").filter(Boolean);
	if (typeof scope === "string") return scope.trim().split(/\s+/).filter(Boolean);
	return [];
}
function getOAuth2Tokens(data) {
	const getDate = (seconds) => {
		return new Date((/* @__PURE__ */ new Date()).getTime() + seconds * 1e3);
	};
	return {
		tokenType: data.token_type,
		accessToken: data.access_token,
		refreshToken: data.refresh_token,
		accessTokenExpiresAt: data.expires_in ? getDate(data.expires_in) : void 0,
		refreshTokenExpiresAt: data.refresh_token_expires_in ? getDate(data.refresh_token_expires_in) : void 0,
		scopes: parseScopeField(data.scope),
		idToken: data.id_token,
		raw: data
	};
}
/**
* Fill in `accessTokenExpiresAt` from the provider's configured
* `accessTokenExpiresIn` when the token response omitted `expires_in`. Without a
* known expiry, `getAccessToken` cannot tell the token is expired and never
* refreshes it. No-op when the provider already supplied an expiry or no
* fallback is configured.
*/
function applyDefaultAccessTokenExpiry(tokens, accessTokenExpiresIn) {
	if (!tokens.accessTokenExpiresAt && accessTokenExpiresIn) tokens.accessTokenExpiresAt = new Date(Date.now() + accessTokenExpiresIn * 1e3);
	return tokens;
}
/**
* Compute the union of stored and incoming OAuth scopes, preserving
* stored insertion order and dropping duplicates.
*/
function mergeScopes(stored, incoming) {
	const existing = stored ? stored.split(",").map((scope) => scope.trim()).filter(Boolean) : [];
	const next = (incoming ?? []).map((scope) => scope.trim()).filter(Boolean);
	return [...new Set([...existing, ...next])].join(",");
}
/**
* Return the provider's primary Client ID: the single string, or the entry at
* array index 0 for the cross-platform form used by ID token audience
* verification. Index 0 is the designated primary and pairs with
* `clientSecret` for the authorization code flow; later array entries are
* only used as additional accepted audiences. Returns `undefined` when the
* primary value is missing or an empty string.
*/
function getPrimaryClientId(clientId) {
	const value = Array.isArray(clientId) ? clientId[0] : clientId;
	return typeof value === "string" && value.length > 0 ? value : void 0;
}
async function generateCodeChallenge(codeVerifier) {
	const data = new TextEncoder().encode(codeVerifier);
	const hash = await crypto.subtle.digest("SHA-256", data);
	return base64Url.encode(new Uint8Array(hash), { padding: false });
}
//#endregion
export { applyDefaultAccessTokenExpiry, generateCodeChallenge, getOAuth2Tokens, getPrimaryClientId, mergeScopes, parseScopeField };
