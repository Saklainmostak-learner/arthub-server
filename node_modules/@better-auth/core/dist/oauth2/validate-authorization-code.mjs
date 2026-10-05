import { getOAuth2Tokens } from "./utils.mjs";
import { assertResponseNotRedirect, fetchRefusingRedirects, noFollowRedirect } from "./reject-redirects.mjs";
import { applyTokenEndpointAuth } from "./token-endpoint-auth.mjs";
import { createRemoteJWKSet, customFetch, jwtVerify } from "jose";
//#region src/oauth2/validate-authorization-code.ts
async function authorizationCodeRequest({ code, codeVerifier, redirectURI, options, authentication, tokenEndpointAuth, tokenEndpoint, deviceId, headers, additionalParams = {}, resource }) {
	options = typeof options === "function" ? await options() : options;
	const request = buildAuthorizationCodeRequest({
		code,
		codeVerifier,
		redirectURI,
		options,
		deviceId,
		headers,
		additionalParams,
		resource
	});
	await applyTokenEndpointAuth({
		body: request.body,
		headers: request.headers,
		options,
		tokenEndpoint: tokenEndpoint ?? "",
		grantType: "authorization_code",
		tokenEndpointAuth,
		authentication
	});
	return request;
}
function buildAuthorizationCodeRequest({ code, codeVerifier, redirectURI, options, deviceId, headers, additionalParams = {}, resource }) {
	const body = new URLSearchParams();
	const requestHeaders = {
		"content-type": "application/x-www-form-urlencoded",
		accept: "application/json",
		...headers
	};
	body.set("grant_type", "authorization_code");
	body.set("code", code);
	codeVerifier && body.set("code_verifier", codeVerifier);
	options.clientKey && body.set("client_key", options.clientKey);
	deviceId && body.set("device_id", deviceId);
	body.set("redirect_uri", options.redirectURI || redirectURI);
	if (resource) if (typeof resource === "string") body.append("resource", resource);
	else for (const _resource of resource) body.append("resource", _resource);
	for (const [key, value] of Object.entries(additionalParams)) if (!body.has(key)) body.append(key, value);
	return {
		body,
		headers: requestHeaders
	};
}
async function validateAuthorizationCode({ code, codeVerifier, redirectURI, options, tokenEndpoint, authentication, tokenEndpointAuth, deviceId, headers, additionalParams = {}, resource }) {
	const { body, headers: requestHeaders } = await authorizationCodeRequest({
		code,
		codeVerifier,
		redirectURI,
		options,
		authentication,
		tokenEndpointAuth,
		tokenEndpoint,
		deviceId,
		headers,
		additionalParams,
		resource
	});
	const { data, error } = await fetchRefusingRedirects(tokenEndpoint, {
		method: "POST",
		body,
		headers: requestHeaders
	});
	if (error) throw error;
	return getOAuth2Tokens(data);
}
async function validateToken(token, jwksEndpoint, options) {
	return await jwtVerify(token, createRemoteJWKSet(new URL(jwksEndpoint), { [customFetch]: async (url, init) => {
		const response = await fetch(url, {
			...init,
			...noFollowRedirect
		});
		assertResponseNotRedirect(String(url), response);
		return response;
	} }), {
		audience: options?.audience,
		issuer: options?.issuer
	});
}
//#endregion
export { authorizationCodeRequest, validateAuthorizationCode, validateToken };
