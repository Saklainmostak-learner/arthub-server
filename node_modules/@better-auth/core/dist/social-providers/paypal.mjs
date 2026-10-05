import { BetterAuthError } from "../error/index.mjs";
import { logger } from "../env/logger.mjs";
import { createAuthorizationURL } from "../oauth2/create-authorization-url.mjs";
import { refreshAccessToken } from "../oauth2/refresh-access-token.mjs";
import { validateAuthorizationCode } from "../oauth2/validate-authorization-code.mjs";
import { decodeJwt } from "jose";
import { betterFetch } from "@better-fetch/fetch";
//#region src/social-providers/paypal.ts
const paypal = (options) => {
	const isSandbox = (options.environment || "sandbox") === "sandbox";
	const authorizationEndpoint = isSandbox ? "https://www.sandbox.paypal.com/signin/authorize" : "https://www.paypal.com/signin/authorize";
	const tokenEndpoint = isSandbox ? "https://api-m.sandbox.paypal.com/v1/oauth2/token" : "https://api-m.paypal.com/v1/oauth2/token";
	const userInfoEndpoint = isSandbox ? "https://api-m.sandbox.paypal.com/v1/identity/oauth2/userinfo" : "https://api-m.paypal.com/v1/identity/oauth2/userinfo";
	const tokenRequestOptions = {
		clientId: options.clientId,
		clientSecret: options.clientSecret
	};
	const tokenEndpointAuth = { method: "client_secret_basic" };
	return {
		id: "paypal",
		name: "PayPal",
		accountSubject: ({ profile }) => profile.user_id,
		async createAuthorizationURL({ state, codeVerifier, redirectURI, additionalParams }) {
			if (!options.clientId || !options.clientSecret) {
				logger.error("Client Id and Client Secret is required for PayPal. Make sure to provide them in the options.");
				throw new BetterAuthError("CLIENT_ID_AND_SECRET_REQUIRED");
			}
			return await createAuthorizationURL({
				id: "paypal",
				options,
				authorizationEndpoint,
				scopes: [],
				state,
				codeVerifier,
				redirectURI,
				prompt: options.prompt,
				additionalParams
			});
		},
		validateAuthorizationCode: async ({ code, codeVerifier, redirectURI }) => {
			try {
				return await validateAuthorizationCode({
					code,
					codeVerifier,
					redirectURI: options.redirectURI || redirectURI,
					options: tokenRequestOptions,
					tokenEndpoint,
					tokenEndpointAuth
				});
			} catch (error) {
				logger.error("PayPal token exchange failed:", error);
				throw new BetterAuthError("FAILED_TO_GET_ACCESS_TOKEN");
			}
		},
		refreshAccessToken: options.refreshAccessToken ? options.refreshAccessToken : async (refreshToken) => {
			try {
				return await refreshAccessToken({
					refreshToken,
					options: tokenRequestOptions,
					tokenEndpoint,
					tokenEndpointAuth
				});
			} catch (error) {
				logger.error("PayPal token refresh failed:", error);
				throw new BetterAuthError("FAILED_TO_REFRESH_ACCESS_TOKEN");
			}
		},
		async getUserInfo(token) {
			if (options.getUserInfo) return options.getUserInfo(token);
			if (!token.accessToken) {
				logger.error("Access token is required to fetch PayPal user info");
				return null;
			}
			try {
				const response = await betterFetch(`${userInfoEndpoint}?schema=paypalv1.1`, { headers: {
					Authorization: `Bearer ${token.accessToken}`,
					Accept: "application/json"
				} });
				if (!response.data) {
					logger.error("Failed to fetch user info from PayPal");
					return null;
				}
				const userInfo = response.data;
				if (token.idToken) {
					let idTokenSubject;
					try {
						idTokenSubject = decodeJwt(token.idToken).sub;
					} catch (error) {
						logger.error("Failed to decode PayPal ID token:", error);
						return null;
					}
					const userInfoSubject = userInfo.sub ?? userInfo.user_id;
					if (!idTokenSubject || userInfoSubject !== idTokenSubject) {
						logger.error("PayPal user info subject does not match ID token subject");
						return null;
					}
				}
				const userMap = await options.mapProfileToUser?.(userInfo);
				return {
					user: {
						name: userInfo.name,
						email: userInfo.email,
						image: userInfo.picture,
						emailVerified: userInfo.email_verified,
						...userMap
					},
					data: userInfo
				};
			} catch (error) {
				logger.error("Failed to fetch user info from PayPal:", error);
				return null;
			}
		},
		options
	};
};
//#endregion
export { paypal };
