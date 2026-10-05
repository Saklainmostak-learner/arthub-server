import { generateCodeChallenge, getPrimaryClientId } from "./utils.mjs";
//#region src/oauth2/create-authorization-url.ts
/**
* Query-parameter names that are populated by the framework as part of the
* authorization request and must not be overridden by caller-supplied
* `additionalParams`. Overriding `state`, PKCE, or `redirect_uri` would
* break the callback correlation and session pinning guarantees.
*/
const RESERVED_AUTHORIZATION_PARAMS = [
	"state",
	"client_id",
	"redirect_uri",
	"response_type",
	"code_challenge",
	"code_challenge_method",
	"nonce",
	"scope"
];
const RESERVED_AUTHORIZATION_PARAMS_SET = new Set(RESERVED_AUTHORIZATION_PARAMS);
async function createAuthorizationURL({ id, options, authorizationEndpoint, state, codeVerifier, scopes, claims, redirectURI, duration, prompt, accessType, responseType, display, loginHint, nonce, hd, responseMode, additionalParams, scopeJoiner }) {
	options = typeof options === "function" ? await options() : options;
	const url = new URL(options.authorizationEndpoint || authorizationEndpoint);
	url.searchParams.set("response_type", responseType || "code");
	const primaryClientId = getPrimaryClientId(options.clientId);
	if (!primaryClientId) throw new Error("OAuth provider requires clientId");
	url.searchParams.set("client_id", primaryClientId);
	url.searchParams.set("state", state);
	if (scopes?.length) url.searchParams.set("scope", scopes.join(scopeJoiner || " "));
	url.searchParams.set("redirect_uri", options.redirectURI || redirectURI);
	duration && url.searchParams.set("duration", duration);
	display && url.searchParams.set("display", display);
	loginHint && url.searchParams.set("login_hint", loginHint);
	nonce && url.searchParams.set("nonce", nonce);
	prompt && url.searchParams.set("prompt", prompt);
	hd && url.searchParams.set("hd", hd);
	accessType && url.searchParams.set("access_type", accessType);
	responseMode && url.searchParams.set("response_mode", responseMode);
	if (codeVerifier) {
		const codeChallenge = await generateCodeChallenge(codeVerifier);
		url.searchParams.set("code_challenge_method", "S256");
		url.searchParams.set("code_challenge", codeChallenge);
	}
	if (claims) {
		const claimsObj = claims.reduce((acc, claim) => {
			acc[claim] = null;
			return acc;
		}, {});
		url.searchParams.set("claims", JSON.stringify({ id_token: {
			email: null,
			email_verified: null,
			...claimsObj
		} }));
	}
	if (additionalParams) for (const [key, value] of Object.entries(additionalParams)) {
		if (RESERVED_AUTHORIZATION_PARAMS_SET.has(key)) continue;
		url.searchParams.set(key, value);
	}
	return url;
}
//#endregion
export { RESERVED_AUTHORIZATION_PARAMS, RESERVED_AUTHORIZATION_PARAMS_SET, createAuthorizationURL };
