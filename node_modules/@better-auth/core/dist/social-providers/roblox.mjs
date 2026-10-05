import { createAuthorizationURL } from "../oauth2/create-authorization-url.mjs";
import { refreshAccessToken } from "../oauth2/refresh-access-token.mjs";
import { validateAuthorizationCode } from "../oauth2/validate-authorization-code.mjs";
import { createPlaceholderEmail } from "../utils/email.mjs";
import { betterFetch } from "@better-fetch/fetch";
//#region src/social-providers/roblox.ts
const roblox = (options) => {
	const tokenEndpoint = "https://apis.roblox.com/oauth/v1/token";
	return {
		id: "roblox",
		name: "Roblox",
		accountSubject: ({ profile }) => profile.sub,
		createAuthorizationURL({ state, scopes, redirectURI, additionalParams }) {
			const _scopes = options.disableDefaultScope ? [] : ["openid", "profile"];
			if (options.scope) _scopes.push(...options.scope);
			if (scopes) _scopes.push(...scopes);
			return createAuthorizationURL({
				id: "roblox",
				options,
				authorizationEndpoint: "https://apis.roblox.com/oauth/v1/authorize",
				scopes: _scopes,
				state,
				redirectURI,
				prompt: options.prompt || "select_account consent",
				additionalParams
			});
		},
		validateAuthorizationCode: async ({ code, redirectURI }) => {
			return validateAuthorizationCode({
				code,
				redirectURI: options.redirectURI || redirectURI,
				options,
				tokenEndpoint,
				authentication: "post"
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
				tokenEndpoint
			});
		},
		async getUserInfo(token) {
			if (options.getUserInfo) return options.getUserInfo(token);
			const { data: profile, error } = await betterFetch("https://apis.roblox.com/oauth/v1/userinfo", { headers: { authorization: `Bearer ${token.accessToken}` } });
			if (error) return null;
			const userMap = await options.mapProfileToUser?.(profile);
			return {
				user: {
					name: profile.nickname || profile.preferred_username || "",
					image: profile.picture,
					email: createPlaceholderEmail({
						identifier: profile.sub,
						namespace: "roblox"
					}),
					emailVerified: false,
					...userMap
				},
				data: { ...profile }
			};
		},
		options
	};
};
//#endregion
export { roblox };
