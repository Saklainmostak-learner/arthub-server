import { createAuthorizationURL } from "../oauth2/create-authorization-url.mjs";
import { refreshAccessToken } from "../oauth2/refresh-access-token.mjs";
import { validateAuthorizationCode } from "../oauth2/validate-authorization-code.mjs";
import { betterFetch } from "@better-fetch/fetch";
//#region src/social-providers/slack.ts
const slack = (options) => {
	const tokenEndpoint = "https://slack.com/api/openid.connect.token";
	return {
		id: "slack",
		name: "Slack",
		accountSubject: ({ profile }) => profile["https://slack.com/user_id"],
		createAuthorizationURL({ state, scopes, redirectURI, additionalParams }) {
			const _scopes = options.disableDefaultScope ? [] : [
				"openid",
				"profile",
				"email"
			];
			if (scopes) _scopes.push(...scopes);
			if (options.scope) _scopes.push(...options.scope);
			return createAuthorizationURL({
				id: "slack",
				options,
				authorizationEndpoint: "https://slack.com/openid/connect/authorize",
				scopes: _scopes,
				state,
				redirectURI,
				additionalParams
			});
		},
		validateAuthorizationCode: async ({ code, redirectURI }) => {
			return validateAuthorizationCode({
				code,
				redirectURI,
				options,
				tokenEndpoint
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
			const { data: profile, error } = await betterFetch("https://slack.com/api/openid.connect.userInfo", { headers: { authorization: `Bearer ${token.accessToken}` } });
			if (error) return null;
			const userMap = await options.mapProfileToUser?.(profile);
			return {
				user: {
					name: profile.name || "",
					email: profile.email,
					emailVerified: profile.email_verified,
					image: profile.picture || profile["https://slack.com/user_image_512"],
					...userMap
				},
				data: profile
			};
		},
		options
	};
};
//#endregion
export { slack };
