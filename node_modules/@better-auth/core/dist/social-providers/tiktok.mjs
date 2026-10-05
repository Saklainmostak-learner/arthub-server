import { RESERVED_AUTHORIZATION_PARAMS_SET } from "../oauth2/create-authorization-url.mjs";
import { refreshAccessToken } from "../oauth2/refresh-access-token.mjs";
import { validateAuthorizationCode } from "../oauth2/validate-authorization-code.mjs";
import { createPlaceholderEmail } from "../utils/email.mjs";
import { betterFetch } from "@better-fetch/fetch";
//#region src/social-providers/tiktok.ts
const tiktok = (options) => {
	const tokenEndpoint = "https://open.tiktokapis.com/v2/oauth/token/";
	const tokenEndpointAuth = {
		method: "custom",
		customizeRequest({ body }) {
			body.set("client_key", options.clientKey);
			body.set("client_secret", options.clientSecret);
		}
	};
	return {
		id: "tiktok",
		name: "TikTok",
		accountSubject: ({ profile }) => profile.data.user.open_id,
		createAuthorizationURL({ state, scopes, redirectURI, additionalParams }) {
			const _scopes = options.disableDefaultScope ? [] : ["user.info.profile"];
			if (options.scope) _scopes.push(...options.scope);
			if (scopes) _scopes.push(...scopes);
			const url = new URL("https://www.tiktok.com/v2/auth/authorize");
			url.searchParams.set("scope", _scopes.join(","));
			url.searchParams.set("response_type", "code");
			url.searchParams.set("client_key", options.clientKey);
			url.searchParams.set("redirect_uri", options.redirectURI || redirectURI);
			url.searchParams.set("state", state);
			if (additionalParams) for (const [key, value] of Object.entries(additionalParams)) {
				if (RESERVED_AUTHORIZATION_PARAMS_SET.has(key)) continue;
				if (key === "client_key") continue;
				url.searchParams.set(key, value);
			}
			return url;
		},
		validateAuthorizationCode: async ({ code, codeVerifier, redirectURI }) => {
			return validateAuthorizationCode({
				code,
				codeVerifier,
				redirectURI: options.redirectURI || redirectURI,
				options: {},
				tokenEndpoint,
				tokenEndpointAuth
			});
		},
		refreshAccessToken: options.refreshAccessToken ? options.refreshAccessToken : async (refreshToken) => {
			return refreshAccessToken({
				refreshToken,
				options: {},
				tokenEndpoint,
				tokenEndpointAuth
			});
		},
		async getUserInfo(token) {
			if (options.getUserInfo) return options.getUserInfo(token);
			const { data: profile, error } = await betterFetch(`https://open.tiktokapis.com/v2/user/info/?fields=${[
				"open_id",
				"avatar_large_url",
				"display_name",
				"username"
			].join(",")}`, { headers: { authorization: `Bearer ${token.accessToken}` } });
			if (error) return null;
			return {
				user: {
					email: profile.data.user.email || createPlaceholderEmail({
						identifier: profile.data.user.open_id,
						namespace: "tiktok"
					}),
					name: profile.data.user.display_name || profile.data.user.username || "",
					image: profile.data.user.avatar_large_url,
					emailVerified: false
				},
				data: profile
			};
		},
		options
	};
};
//#endregion
export { tiktok };
