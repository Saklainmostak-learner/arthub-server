import { parseScopeField } from "./utils.mjs";
import { fetchRefusingRedirects } from "./reject-redirects.mjs";
import { applyTokenEndpointAuth } from "./token-endpoint-auth.mjs";
//#region src/oauth2/refresh-access-token.ts
const BLOCKED_REFRESH_TOKEN_PARAMS_SET = new Set([
	"grant_type",
	"refresh_token",
	"__proto__",
	"constructor",
	"prototype"
]);
async function refreshAccessTokenRequest({ refreshToken, options, authentication, tokenEndpointAuth, tokenEndpoint, extraParams, resource }) {
	options = typeof options === "function" ? await options() : options;
	const request = buildRefreshAccessTokenRequest({
		refreshToken,
		options,
		extraParams,
		resource
	});
	await applyTokenEndpointAuth({
		body: request.body,
		headers: request.headers,
		options,
		tokenEndpoint: tokenEndpoint ?? "",
		grantType: "refresh_token",
		tokenEndpointAuth,
		authentication
	});
	return request;
}
function applyRefreshExtraParams(body, extraParams) {
	if (!extraParams) return;
	for (const [key, value] of Object.entries(extraParams)) {
		if (BLOCKED_REFRESH_TOKEN_PARAMS_SET.has(key)) continue;
		body.set(key, value);
	}
}
function buildRefreshAccessTokenRequest({ refreshToken, options, extraParams, resource }) {
	const body = new URLSearchParams();
	const headers = {
		"content-type": "application/x-www-form-urlencoded",
		accept: "application/json"
	};
	body.set("grant_type", "refresh_token");
	body.set("refresh_token", refreshToken);
	if (resource) if (typeof resource === "string") body.append("resource", resource);
	else for (const _resource of resource) body.append("resource", _resource);
	if (extraParams) applyRefreshExtraParams(body, extraParams);
	return {
		body,
		headers
	};
}
async function refreshAccessToken({ refreshToken, options, tokenEndpoint, authentication, tokenEndpointAuth, extraParams, resource }) {
	const { body, headers } = await refreshAccessTokenRequest({
		refreshToken,
		options,
		authentication,
		tokenEndpointAuth,
		tokenEndpoint,
		extraParams,
		resource
	});
	const { data, error } = await fetchRefusingRedirects(tokenEndpoint, {
		method: "POST",
		body,
		headers
	});
	if (error) throw error;
	const tokens = {
		accessToken: data.access_token,
		refreshToken: data.refresh_token,
		tokenType: data.token_type,
		scopes: parseScopeField(data.scope),
		idToken: data.id_token
	};
	if (data.expires_in) tokens.accessTokenExpiresAt = new Date((/* @__PURE__ */ new Date()).getTime() + data.expires_in * 1e3);
	if (data.refresh_token_expires_in) tokens.refreshTokenExpiresAt = new Date((/* @__PURE__ */ new Date()).getTime() + data.refresh_token_expires_in * 1e3);
	return tokens;
}
//#endregion
export { refreshAccessToken, refreshAccessTokenRequest };
