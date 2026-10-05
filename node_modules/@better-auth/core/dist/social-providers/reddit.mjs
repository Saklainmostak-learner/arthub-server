import { createAuthorizationURL } from "../oauth2/create-authorization-url.mjs";
import { refreshAccessToken } from "../oauth2/refresh-access-token.mjs";
import { validateAuthorizationCode } from "../oauth2/validate-authorization-code.mjs";
import { createPlaceholderEmail } from "../utils/email.mjs";
import { betterFetch } from "@better-fetch/fetch";
//#region src/social-providers/reddit.ts
const reddit = (options) => {
	const tokenEndpoint = "https://www.reddit.com/api/v1/access_token";
	const tokenRequestOptions = {
		clientId: options.clientId,
		clientSecret: options.clientSecret
	};
	const tokenEndpointAuth = { method: "client_secret_basic" };
	return {
		id: "reddit",
		name: "Reddit",
		accountSubject: ({ profile }) => profile.id,
		createAuthorizationURL({ state, scopes, redirectURI, additionalParams }) {
			const _scopes = options.disableDefaultScope ? [] : ["identity"];
			if (options.scope) _scopes.push(...options.scope);
			if (scopes) _scopes.push(...scopes);
			return createAuthorizationURL({
				id: "reddit",
				options,
				authorizationEndpoint: "https://www.reddit.com/api/v1/authorize",
				scopes: _scopes,
				state,
				redirectURI,
				duration: options.duration,
				additionalParams
			});
		},
		validateAuthorizationCode: async ({ code, redirectURI }) => {
			return validateAuthorizationCode({
				code,
				redirectURI: options.redirectURI || redirectURI,
				options: tokenRequestOptions,
				tokenEndpoint,
				tokenEndpointAuth,
				headers: {
					accept: "text/plain",
					"user-agent": "better-auth"
				}
			});
		},
		refreshAccessToken: options.refreshAccessToken ? options.refreshAccessToken : async (refreshToken) => {
			return refreshAccessToken({
				refreshToken,
				options: tokenRequestOptions,
				tokenEndpoint,
				tokenEndpointAuth
			});
		},
		async getUserInfo(token) {
			if (options.getUserInfo) return options.getUserInfo(token);
			const { data: profile, error } = await betterFetch("https://oauth.reddit.com/api/v1/me", { headers: {
				Authorization: `Bearer ${token.accessToken}`,
				"User-Agent": "better-auth"
			} });
			if (error) return null;
			const userMap = await options.mapProfileToUser?.(profile);
			const email = userMap?.email || createPlaceholderEmail({
				identifier: profile.id,
				namespace: "reddit"
			});
			return {
				user: {
					name: profile.name,
					image: profile.icon_img?.split("?")[0],
					...userMap,
					email,
					emailVerified: userMap?.emailVerified ?? false
				},
				data: profile
			};
		},
		options
	};
};
//#endregion
export { reddit };
