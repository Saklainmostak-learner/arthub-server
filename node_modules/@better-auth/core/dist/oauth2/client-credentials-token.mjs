import { fetchRefusingRedirects } from "./reject-redirects.mjs";
import { applyTokenEndpointAuth } from "./token-endpoint-auth.mjs";
//#region src/oauth2/client-credentials-token.ts
async function clientCredentialsTokenRequest({ options, scope, authentication, tokenEndpointAuth, tokenEndpoint, resource }) {
	options = typeof options === "function" ? await options() : options;
	const request = buildClientCredentialsTokenRequest({
		options,
		scope,
		resource
	});
	await applyTokenEndpointAuth({
		body: request.body,
		headers: request.headers,
		options,
		tokenEndpoint: tokenEndpoint ?? "",
		grantType: "client_credentials",
		tokenEndpointAuth,
		authentication
	});
	return request;
}
function buildClientCredentialsTokenRequest({ options, scope, resource, extraParams }) {
	const body = new URLSearchParams();
	const headers = {
		"content-type": "application/x-www-form-urlencoded",
		accept: "application/json"
	};
	body.set("grant_type", "client_credentials");
	scope && body.set("scope", scope);
	if (resource) if (typeof resource === "string") body.append("resource", resource);
	else for (const _resource of resource) body.append("resource", _resource);
	if (extraParams) {
		for (const [key, value] of Object.entries(extraParams)) if (!body.has(key)) body.append(key, value);
	}
	return {
		body,
		headers
	};
}
async function clientCredentialsToken({ options, tokenEndpoint, scope, authentication, tokenEndpointAuth, resource }) {
	const { body, headers } = await clientCredentialsTokenRequest({
		options,
		scope,
		authentication,
		tokenEndpointAuth,
		tokenEndpoint,
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
		tokenType: data.token_type,
		scopes: data.scope?.split(" ")
	};
	if (data.expires_in) tokens.accessTokenExpiresAt = new Date((/* @__PURE__ */ new Date()).getTime() + data.expires_in * 1e3);
	return tokens;
}
//#endregion
export { clientCredentialsToken, clientCredentialsTokenRequest };
