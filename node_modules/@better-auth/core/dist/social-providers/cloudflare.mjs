import { logger } from "../env/logger.mjs";
import { createAuthorizationURL } from "../oauth2/create-authorization-url.mjs";
import { refreshAccessToken } from "../oauth2/refresh-access-token.mjs";
import { validateAuthorizationCode } from "../oauth2/validate-authorization-code.mjs";
import { betterFetch } from "@better-fetch/fetch";
//#region src/social-providers/cloudflare.ts
const authorizationEndpoint = "https://dash.cloudflare.com/oauth2/auth";
const tokenEndpoint = "https://dash.cloudflare.com/oauth2/token";
/**
* Cloudflare's OIDC `userinfo` endpoint only returns the `sub` claim, so it
* cannot be used to build a user. The user's profile (email, name, ...) is
* read from the Cloudflare API `/user` endpoint instead, which the access
* token can call when the `user-details.read` scope is granted.
*/
const userEndpoint = "https://api.cloudflare.com/client/v4/user";
const getTokenEndpointAuth = (options) => {
	const defaultMethod = options.clientSecret ? "client_secret_basic" : "none";
	return { method: options.tokenEndpointAuthMethod ?? defaultMethod };
};
const cloudflare = (options) => {
	return {
		id: "cloudflare",
		name: "Cloudflare",
		accountSubject: ({ profile }) => profile.id,
		createAuthorizationURL({ state, scopes, codeVerifier, redirectURI }) {
			const _scopes = options.disableDefaultScope ? [] : ["user-details.read"];
			if (options.scope?.length) _scopes.push(...options.scope);
			if (scopes?.length) _scopes.push(...scopes);
			return createAuthorizationURL({
				id: "cloudflare",
				options,
				authorizationEndpoint,
				scopes: _scopes.length ? [...new Set(_scopes)] : void 0,
				state,
				codeVerifier,
				redirectURI
			});
		},
		validateAuthorizationCode: async ({ code, codeVerifier, redirectURI }) => {
			return validateAuthorizationCode({
				code,
				codeVerifier,
				redirectURI,
				options,
				tokenEndpoint,
				tokenEndpointAuth: getTokenEndpointAuth(options)
			});
		},
		refreshAccessToken: options.refreshAccessToken ? options.refreshAccessToken : async (refreshToken) => {
			return refreshAccessToken({
				refreshToken,
				options: {
					clientId: options.clientId,
					clientKey: options.clientKey,
					clientSecret: options.clientSecret
				},
				tokenEndpoint,
				tokenEndpointAuth: getTokenEndpointAuth(options)
			});
		},
		async getUserInfo(token) {
			if (options.getUserInfo) return options.getUserInfo(token);
			const { data, error } = await betterFetch(userEndpoint, { headers: { authorization: `Bearer ${token.accessToken}` } });
			if (error || !data?.success || !data.result) {
				logger.error("Failed to fetch user info from Cloudflare:", error ?? data?.errors);
				return null;
			}
			const profile = data.result;
			const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.email;
			const userMap = await options.mapProfileToUser?.(profile);
			return {
				user: {
					name,
					email: profile.email,
					emailVerified: false,
					...userMap
				},
				data: profile
			};
		},
		options
	};
};
//#endregion
export { cloudflare };
