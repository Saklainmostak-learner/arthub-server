import { APIError, BetterAuthError } from "../error/index.mjs";
import { logger } from "../env/logger.mjs";
import { getPrimaryClientId } from "../oauth2/utils.mjs";
import { createAuthorizationURL } from "../oauth2/create-authorization-url.mjs";
import { refreshAccessToken } from "../oauth2/refresh-access-token.mjs";
import { validateAuthorizationCode } from "../oauth2/validate-authorization-code.mjs";
import { decodeJwt, importJWK } from "jose";
import { betterFetch } from "@better-fetch/fetch";
//#region src/social-providers/apple.ts
const apple = (options) => {
	const tokenEndpoint = "https://appleid.apple.com/auth/token";
	return {
		id: "apple",
		name: "Apple",
		accountSubject: ({ profile }) => profile.sub,
		async createAuthorizationURL({ state, scopes, redirectURI, additionalParams, codeVerifier }) {
			if (!getPrimaryClientId(options.clientId) || !options.clientSecret) {
				logger.error("Client ID and client secret are required for Apple. Make sure to provide them in the options.");
				throw new BetterAuthError("CLIENT_ID_AND_SECRET_REQUIRED");
			}
			const _scope = options.disableDefaultScope ? [] : ["email", "name"];
			if (options.scope) _scope.push(...options.scope);
			if (scopes) _scope.push(...scopes);
			return await createAuthorizationURL({
				id: "apple",
				options,
				authorizationEndpoint: "https://appleid.apple.com/auth/authorize",
				scopes: _scope,
				state,
				redirectURI,
				codeVerifier,
				responseMode: "form_post",
				responseType: "code id_token",
				additionalParams
			});
		},
		validateAuthorizationCode: async ({ code, codeVerifier, redirectURI }) => {
			return validateAuthorizationCode({
				code,
				codeVerifier,
				redirectURI,
				options,
				tokenEndpoint
			});
		},
		idToken: {
			jwks: (header) => getApplePublicKey(header.kid),
			issuer: "https://appleid.apple.com",
			audience: options.audience && options.audience.length ? options.audience : options.appBundleIdentifier ? options.appBundleIdentifier : options.clientId,
			maxTokenAge: "1h",
			nonceComparison: "exact-or-sha256"
		},
		refreshAccessToken: options.refreshAccessToken ? options.refreshAccessToken : async (refreshToken) => {
			return refreshAccessToken({
				refreshToken,
				options,
				tokenEndpoint
			});
		},
		async getUserInfo(token) {
			if (options.getUserInfo) return options.getUserInfo(token);
			if (!token.idToken) return null;
			const profile = decodeJwt(token.idToken);
			if (!profile) return null;
			let name;
			if (token.user?.name) name = `${token.user.name.firstName || ""} ${token.user.name.lastName || ""}`.trim();
			else name = profile.name || "";
			const emailVerified = typeof profile.email_verified === "boolean" ? profile.email_verified : profile.email_verified === "true";
			const enrichedProfile = {
				...profile,
				name
			};
			const userMap = await options.mapProfileToUser?.(enrichedProfile);
			return {
				user: {
					name: enrichedProfile.name,
					emailVerified,
					email: profile.email,
					...userMap
				},
				data: enrichedProfile
			};
		},
		options
	};
};
const getApplePublicKey = async (kid) => {
	const { data } = await betterFetch(`https://appleid.apple.com/auth/keys`);
	if (!data?.keys) throw new APIError("BAD_REQUEST", { message: "Keys not found" });
	const jwk = data.keys.find((key) => key.kid === kid);
	if (!jwk) throw new Error(`JWK with kid ${kid} not found`);
	return await importJWK(jwk, jwk.alg);
};
//#endregion
export { apple, getApplePublicKey };
