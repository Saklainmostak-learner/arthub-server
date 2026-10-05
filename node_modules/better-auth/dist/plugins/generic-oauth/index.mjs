import { PACKAGE_VERSION } from "../../version.mjs";
import { GENERIC_OAUTH_ERROR_CODES } from "./error-codes.mjs";
import { auth0 } from "./providers/auth0.mjs";
import { gumroad } from "./providers/gumroad.mjs";
import { hubspot } from "./providers/hubspot.mjs";
import { keycloak } from "./providers/keycloak.mjs";
import { line } from "./providers/line.mjs";
import { microsoftEntraId } from "./providers/microsoft-entra-id.mjs";
import { okta } from "./providers/okta.mjs";
import { patreon } from "./providers/patreon.mjs";
import { slack } from "./providers/slack.mjs";
import { yandex } from "./providers/yandex.mjs";
import { APIError } from "@better-auth/core/error";
import { applyDefaultAccessTokenExpiry, createAuthorizationURL, refreshAccessToken, validateAuthorizationCode, verifyProviderIdToken } from "@better-auth/core/oauth2";
import { createRemoteJWKSet, decodeJwt } from "jose";
import { betterFetch } from "@better-fetch/fetch";
//#region src/plugins/generic-oauth/index.ts
function isSecretlessTokenEndpointAuth(tokenEndpointAuth) {
	return tokenEndpointAuth?.method === "private_key_jwt" || tokenEndpointAuth?.method === "none";
}
function isClientSecretTokenEndpointAuth(tokenEndpointAuth) {
	return tokenEndpointAuth?.method === "client_secret_basic" || tokenEndpointAuth?.method === "client_secret_post";
}
async function fetchDiscovery(url, headers) {
	const result = await betterFetch(url, {
		method: "GET",
		headers
	});
	if (result.error || !result.data) return null;
	if (result.data.issuer) try {
		new URL(result.data.issuer);
	} catch {
		return null;
	}
	return result.data;
}
async function fetchUserInfo(tokens, userInfoUrl) {
	if (tokens.idToken) try {
		const decoded = decodeJwt(tokens.idToken);
		if (decoded?.sub && decoded?.email) return {
			id: decoded.sub,
			emailVerified: decoded.email_verified,
			image: decoded.picture,
			...decoded
		};
	} catch {}
	if (!userInfoUrl) return null;
	const userInfo = await betterFetch(userInfoUrl, {
		method: "GET",
		headers: { Authorization: `Bearer ${tokens.accessToken}` }
	});
	if (userInfo.error || !userInfo.data) return null;
	return {
		...userInfo.data,
		email: userInfo.data.email,
		emailVerified: userInfo.data.email_verified ?? false,
		image: userInfo.data.picture,
		name: userInfo.data.name
	};
}
/**
* A generic OAuth plugin that registers any OAuth/OIDC provider
* as a first-class social provider.
*
* Providers are used through the standard `signIn.social` and
* `callback/:id` core endpoints — no plugin-specific endpoints needed.
*/
const genericOAuth = (options) => {
	const seenIds = /* @__PURE__ */ new Set();
	const nonUniqueIds = /* @__PURE__ */ new Set();
	for (const config of options.config) {
		const id = config.providerId;
		if (seenIds.has(id)) nonUniqueIds.add(id);
		seenIds.add(id);
	}
	if (nonUniqueIds.size > 0) console.warn(`Duplicate provider IDs found: ${Array.from(nonUniqueIds).join(", ")}`);
	return {
		id: "generic-oauth",
		version: PACKAGE_VERSION,
		init: async (ctx) => {
			const genericProviders = [];
			for (const c of options.config) {
				let authorizationUrl = c.authorizationUrl;
				let tokenUrl = c.tokenUrl;
				let userInfoUrl = c.userInfoUrl;
				let endSessionEndpoint = c.endSessionEndpoint;
				let issuer;
				let isOidc = false;
				let idTokenConfig;
				if (c.discoveryUrl) {
					const discovered = await fetchDiscovery(c.discoveryUrl, c.discoveryHeaders).catch((err) => {
						ctx.logger.error(`Discovery fetch failed for "${c.providerId}": ${err}`);
						return null;
					});
					if (discovered) {
						authorizationUrl ??= discovered.authorization_endpoint;
						tokenUrl ??= discovered.token_endpoint;
						userInfoUrl ??= discovered.userinfo_endpoint;
						endSessionEndpoint ??= discovered.end_session_endpoint;
						issuer = discovered.issuer;
						const signingAlgs = discovered.id_token_signing_alg_values_supported;
						isOidc = Array.isArray(signingAlgs) && signingAlgs.length > 0;
						if (discovered.jwks_uri && discovered.issuer) {
							let jwksUrl;
							try {
								jwksUrl = new URL(discovered.jwks_uri, c.discoveryUrl);
							} catch {
								ctx.logger.error(`Provider "${c.providerId}": invalid jwks_uri "${discovered.jwks_uri}" in discovery document. Provider skipped.`);
								continue;
							}
							idTokenConfig = {
								jwks: createRemoteJWKSet(jwksUrl),
								issuer: discovered.issuer,
								audience: c.clientId,
								algorithms: isOidc ? signingAlgs : void 0
							};
						}
					}
					if (!authorizationUrl || !tokenUrl && !c.getToken) {
						ctx.logger.error(`Provider "${c.providerId}": discovery left no usable authorization endpoint or token exchange. Provider skipped.`);
						continue;
					}
				}
				if (c.requireIdTokenVerification && !idTokenConfig) {
					if (c.discoveryUrl) {
						ctx.logger.error(`Provider "${c.providerId}": requires verified ID tokens, but discovery did not provide a usable issuer and jwks_uri. Provider skipped.`);
						continue;
					}
					throw new Error(`Provider "${c.providerId}": requires verified ID tokens, but discovery did not provide a usable issuer and jwks_uri.`);
				}
				const tokenEndpointAuth = c.tokenEndpointAuth;
				if (c.clientSecret && isSecretlessTokenEndpointAuth(tokenEndpointAuth)) throw new Error(`Provider "${c.providerId}": tokenEndpointAuth.method "${tokenEndpointAuth?.method}" cannot be combined with clientSecret`);
				if (!c.clientSecret && isClientSecretTokenEndpointAuth(tokenEndpointAuth)) throw new Error(`Provider "${c.providerId}": tokenEndpointAuth.method "${tokenEndpointAuth?.method}" requires clientSecret`);
				if (!c.clientSecret && !tokenEndpointAuth && c.authentication === "basic") throw new Error(`Provider "${c.providerId}": authentication "basic" requires clientSecret`);
				const accountSubject = c.accountSubject;
				const provider = {
					id: c.providerId,
					name: c.name ?? c.providerId,
					issuer,
					accountSubject: ({ tokens, profile }) => {
						const genericProfile = profile;
						if (accountSubject) return accountSubject({
							tokens,
							profile: genericProfile
						});
						return isOidc ? genericProfile.sub ?? "" : genericProfile.id ?? "";
					},
					idToken: idTokenConfig,
					requiresIdTokenNonce: idTokenConfig !== void 0 && c.disableIdTokenNonceBinding !== true,
					allowIdpInitiated: c.allowIdpInitiated,
					async createEndSessionURL(data) {
						if (c.disableProviderLogout) return null;
						if (!endSessionEndpoint) return null;
						let url;
						try {
							url = new URL(endSessionEndpoint);
						} catch {
							return null;
						}
						if (data.idToken) url.searchParams.set("id_token_hint", data.idToken);
						const configuredRedirectURI = data.postLogoutRedirectURI ?? c.postLogoutRedirectURI;
						const postLogoutRedirectURI = configuredRedirectURI ? new URL(configuredRedirectURI, ctx.baseURL).toString() : void 0;
						if (postLogoutRedirectURI) {
							url.searchParams.set("post_logout_redirect_uri", postLogoutRedirectURI);
							url.searchParams.set("client_id", c.clientId);
							if (data.state) url.searchParams.set("state", data.state);
						} else if (!data.idToken) url.searchParams.set("client_id", c.clientId);
						return url;
					},
					createAuthorizationURL(data) {
						if (!authorizationUrl) throw APIError.from("BAD_REQUEST", GENERIC_OAUTH_ERROR_CODES.INVALID_OAUTH_CONFIGURATION);
						return createAuthorizationURL({
							id: c.providerId,
							options: {
								clientId: c.clientId,
								clientSecret: c.clientSecret,
								redirectURI: c.redirectURI
							},
							authorizationEndpoint: authorizationUrl,
							state: data.state,
							codeVerifier: c.pkce ?? true ? data.codeVerifier : void 0,
							scopes: (() => {
								const merged = [...data.scopes ?? [], ...c.scopes ?? []];
								if (isOidc && !merged.includes("openid")) merged.unshift("openid");
								return merged;
							})(),
							redirectURI: data.redirectURI,
							prompt: c.prompt,
							accessType: c.accessType,
							responseType: c.responseType,
							responseMode: c.responseMode,
							nonce: data.idTokenNonce,
							additionalParams: {
								...c.authorizationUrlParams ?? {},
								...data.additionalParams ?? {}
							},
							loginHint: data.loginHint
						});
					},
					async validateAuthorizationCode(data) {
						if (c.getToken) return applyDefaultAccessTokenExpiry(await c.getToken(data), c.accessTokenExpiresIn);
						if (!tokenUrl) throw APIError.from("BAD_REQUEST", GENERIC_OAUTH_ERROR_CODES.TOKEN_URL_NOT_FOUND);
						return applyDefaultAccessTokenExpiry(await validateAuthorizationCode({
							headers: c.authorizationHeaders,
							code: data.code,
							codeVerifier: c.pkce ?? true ? data.codeVerifier : void 0,
							redirectURI: data.redirectURI,
							options: {
								clientId: c.clientId,
								clientSecret: c.clientSecret,
								redirectURI: c.redirectURI
							},
							tokenEndpoint: tokenUrl,
							authentication: c.authentication,
							tokenEndpointAuth,
							additionalParams: c.tokenUrlParams
						}), c.accessTokenExpiresIn);
					},
					async getUserInfo(tokens) {
						const { expectedIdTokenNonce, ...oauthTokens } = tokens;
						if (oauthTokens.idToken && provider.idToken) {
							if (!await verifyProviderIdToken(provider, oauthTokens.idToken, expectedIdTokenNonce)) {
								ctx.logger.error(`Provider "${c.providerId}": id_token failed verification against the discovery JWKS or expected nonce`);
								return null;
							}
						}
						const raw = c.getUserInfo ? await c.getUserInfo(oauthTokens) : await fetchUserInfo(oauthTokens, userInfoUrl);
						if (!raw) return null;
						const mapped = c.mapProfileToUser ? await c.mapProfileToUser(raw) : {};
						const user = {
							email: raw.email,
							emailVerified: raw.emailVerified,
							image: raw.image,
							name: raw.name,
							...mapped
						};
						return {
							user: {
								...user,
								image: user.image ?? void 0
							},
							data: raw
						};
					},
					async refreshAccessToken(refreshToken, refreshCtx) {
						if (!tokenUrl) throw APIError.from("BAD_REQUEST", GENERIC_OAUTH_ERROR_CODES.TOKEN_URL_NOT_FOUND);
						const resolvedRefreshParams = typeof c.refreshTokenParams === "function" ? await c.refreshTokenParams(refreshCtx) : c.refreshTokenParams;
						return applyDefaultAccessTokenExpiry(await refreshAccessToken({
							refreshToken,
							options: {
								clientId: c.clientId,
								clientSecret: c.clientSecret
							},
							authentication: c.authentication,
							tokenEndpointAuth,
							tokenEndpoint: tokenUrl,
							extraParams: resolvedRefreshParams
						}), c.accessTokenExpiresIn);
					},
					disableImplicitSignUp: c.disableImplicitSignUp,
					disableSignUp: c.disableSignUp,
					options: {
						disableSignUp: c.disableSignUp,
						overrideUserInfoOnSignIn: c.overrideUserInfo,
						requireEmailVerification: c.requireEmailVerification
					}
				};
				genericProviders.push(provider);
			}
			const existingIds = new Set(ctx.socialProviders.map((p) => p.id));
			for (const gp of genericProviders) if (existingIds.has(gp.id)) ctx.logger.warn(`Generic OAuth provider "${gp.id}" shadows a built-in social provider with the same ID`);
			return { context: { socialProviders: genericProviders.concat(ctx.socialProviders) } };
		},
		options,
		$ERROR_CODES: GENERIC_OAUTH_ERROR_CODES
	};
};
//#endregion
export { auth0, genericOAuth, gumroad, hubspot, keycloak, line, microsoftEntraId, okta, patreon, slack, yandex };
