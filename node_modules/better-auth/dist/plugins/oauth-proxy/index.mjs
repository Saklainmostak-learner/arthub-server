import { isAPIError } from "../../utils/is-api-error.mjs";
import { getOrigin } from "../../utils/url.mjs";
import { originCheck } from "../../api/middlewares/origin-check.mjs";
import { parseSetCookieHeader } from "../../cookies/cookie-utils.mjs";
import { symmetricDecrypt, symmetricEncrypt } from "../../crypto/index.mjs";
import { setSessionCookie } from "../../cookies/index.mjs";
import { resolveOAuthAccountKey, toOAuthProfileRecord } from "../../oauth2/account-key.mjs";
import { redirectOnError } from "../../oauth2/errors.mjs";
import { getOAuthCallbackPath } from "../../oauth2/utils.mjs";
import { handleOAuthUserInfo, linkOAuthAccount } from "../../oauth2/link-account.mjs";
import { setOAuthState } from "../../api/state/oauth.mjs";
import { derivePurposeKey } from "../../crypto/purpose.mjs";
import { getAuthStateVerificationIdentifier, parseGenericState } from "../../state.mjs";
import { PACKAGE_VERSION } from "../../version.mjs";
import { parseJSON } from "../../client/parser.mjs";
import { checkSkipProxy, resolveCurrentURL, stripTrailingSlash } from "./utils.mjs";
import { accountSchema, userSchema } from "@better-auth/core/db";
import { safeJSONParse } from "@better-auth/core/utils/json";
import { defu } from "defu";
import { createAuthEndpoint, createAuthMiddleware } from "@better-auth/core/api";
import * as z from "zod";
//#region src/plugins/oauth-proxy/index.ts
/**
* Passthrough payload containing OAuth profile data.
* Used to transfer OAuth credentials from production to preview
* without creating user/session on production.
* @internal
*/
const passthroughPayloadSchema = z.looseObject({
	userInfo: z.looseObject(userSchema.omit({
		createdAt: true,
		updatedAt: true
	}).shape),
	account: z.looseObject(accountSchema.omit({
		id: true,
		userId: true,
		createdAt: true,
		updatedAt: true
	}).shape),
	profile: z.record(z.string(), z.unknown()).optional(),
	scopes: z.array(z.string()).optional(),
	state: z.string().min(1),
	callbackURL: z.string().min(1),
	newUserURL: z.string().optional(),
	errorURL: z.string().optional(),
	disableSignUp: z.boolean().optional(),
	timestamp: z.number()
});
const restoreOAuthProxyState = async (ctx, state) => {
	try {
		const stateData = await parseGenericState(ctx, state, { skipStateCookieCheck: true });
		await setOAuthState(stateData);
		return stateData;
	} catch (e) {
		ctx.context.logger.warn("OAuth proxy state missing or invalid", e);
		return null;
	}
};
const oauthProxyQuerySchema = z.object({
	callbackURL: z.string().meta({ description: "The URL to redirect to after the proxy" }),
	profile: z.string().optional().meta({ description: "Encrypted OAuth profile data" })
});
const oauthCallbackQuerySchema = z.object({
	code: z.string().optional(),
	error: z.string().optional(),
	user: z.string().optional()
});
const oAuthProxy = (opts) => {
	const maxAge = opts?.maxAge ?? 60;
	const getEncryptionKey = (ctx, purpose) => derivePurposeKey(opts?.secret ?? ctx.context.secretConfig, purpose);
	const oauthProxyCompletion = createAuthEndpoint("/callback/:id/oauth-proxy", {
		method: "GET",
		operationId: "oauthProxyCompletion",
		query: oauthProxyQuerySchema,
		use: [originCheck((ctx) => ctx.query.callbackURL)],
		metadata: { scope: "http" }
	}, async (ctx) => {
		const baseURLStr = typeof ctx.context.options.baseURL === "string" ? ctx.context.options.baseURL : getOrigin(ctx.context.baseURL) || "";
		const defaultErrorURL = ctx.context.options.onAPIError?.errorURL || `${stripTrailingSlash(baseURLStr)}/api/auth/error`;
		const encryptedProfile = ctx.query.profile;
		if (!encryptedProfile) {
			ctx.context.logger.error("OAuth proxy callback missing profile data");
			throw redirectOnError(ctx, defaultErrorURL, "missing_profile");
		}
		let decryptedPayload;
		try {
			decryptedPayload = await symmetricDecrypt({
				key: getEncryptionKey(ctx, "oauth-proxy-profile"),
				data: encryptedProfile
			});
		} catch (e) {
			ctx.context.logger.error("Failed to decrypt OAuth proxy profile", e);
			throw redirectOnError(ctx, defaultErrorURL, "invalid_profile");
		}
		let payload;
		try {
			payload = passthroughPayloadSchema.parse(parseJSON(decryptedPayload));
		} catch (e) {
			ctx.context.logger.error("Failed to parse OAuth proxy payload", e);
			throw redirectOnError(ctx, defaultErrorURL, "invalid_payload");
		}
		const errorURL = payload.errorURL || defaultErrorURL;
		if (ctx.path?.startsWith("/callback/") && ctx.params.id !== payload.account.providerId) {
			ctx.context.logger.warn("OAuth proxy callback provider mismatch");
			throw redirectOnError(ctx, errorURL, "provider_mismatch");
		}
		const age = (Date.now() - payload.timestamp) / 1e3;
		if (age > maxAge || age < -10) {
			ctx.context.logger.error(`OAuth proxy payload expired or invalid (age: ${age}s, maxAge: ${maxAge}s)`);
			throw redirectOnError(ctx, errorURL, "payload_expired");
		}
		const stateData = await restoreOAuthProxyState(ctx, payload.state);
		if (!stateData) throw redirectOnError(ctx, errorURL, "state_mismatch");
		if (stateData.link) {
			const linkResult = await linkOAuthAccount(ctx, {
				link: stateData.link,
				userInfo: payload.userInfo,
				account: payload.account,
				profile: payload.profile ?? {},
				scopes: payload.scopes ?? payload.account.scope?.split(",")
			});
			if (!linkResult.linked) throw redirectOnError(ctx, errorURL, linkResult.error.code, linkResult.error.message);
			throw ctx.redirect(payload.callbackURL);
		}
		let result;
		try {
			result = await handleOAuthUserInfo(ctx, {
				userInfo: payload.userInfo,
				account: payload.account,
				callbackURL: payload.callbackURL,
				disableSignUp: payload.disableSignUp,
				source: {
					method: "oauth",
					oauth: {
						providerId: payload.account.providerId,
						profile: payload.profile
					}
				}
			});
		} catch (e) {
			if (isAPIError(e) && e.body?.code) throw redirectOnError(ctx, errorURL, e.body.code, e.body.message);
			throw e;
		}
		if (result.error) {
			ctx.context.logger.error("OAuth proxy callback error", result.error);
			throw redirectOnError(ctx, errorURL, result.error.split(" ").join("_"));
		}
		if (!result.data) {
			ctx.context.logger.error("OAuth proxy callback missing session data");
			throw redirectOnError(ctx, errorURL, "user_creation_failed");
		}
		await setSessionCookie(ctx, result.data);
		const finalURL = result.isRegister ? payload.newUserURL || payload.callbackURL : payload.callbackURL;
		throw ctx.redirect(finalURL);
	});
	return {
		id: "oauth-proxy",
		version: PACKAGE_VERSION,
		options: opts,
		endpoints: {
			/**
			* @deprecated OAuth proxy callbacks now use `/callback/:id/oauth-proxy`.
			* This endpoint will be removed in the next minor release.
			*/
			oAuthProxy: createAuthEndpoint("/oauth-proxy-callback", {
				method: "GET",
				operationId: "oauthProxyCallback",
				query: oauthProxyQuerySchema,
				use: [originCheck((ctx) => ctx.query.callbackURL)],
				metadata: { openapi: {
					operationId: "oauthProxyCallback",
					deprecated: true,
					description: "OAuth Proxy Callback",
					parameters: [{
						in: "query",
						name: "callbackURL",
						required: true,
						description: "The URL to redirect to after the proxy"
					}, {
						in: "query",
						name: "profile",
						required: false,
						description: "Encrypted OAuth profile data"
					}],
					responses: { 302: {
						description: "Redirect",
						headers: { Location: {
							description: "The URL to redirect to",
							schema: { type: "string" }
						} }
					} }
				} }
			}, async (ctx) => oauthProxyCompletion({
				...ctx,
				params: { id: "oauth-proxy" }
			})),
			oAuthProxyCompletion: oauthProxyCompletion
		},
		hooks: {
			before: [{
				matcher(context) {
					return !!context.path?.startsWith("/sign-in/social") || context.path === "/link-social";
				},
				handler: createAuthMiddleware(async (ctx) => {
					if (checkSkipProxy(ctx, opts)) return;
					const providerId = ctx.body?.provider;
					if (!providerId) return;
					const currentURL = resolveCurrentURL(ctx, opts);
					const productionURL = opts?.productionURL;
					const originalCallbackURL = ctx.body?.callbackURL || ctx.context.baseURL;
					if (productionURL) {
						const productionBaseURL = `${stripTrailingSlash(productionURL)}${ctx.context.options.basePath || "/api/auth"}`;
						ctx.context.baseURL = productionBaseURL;
					}
					const newCallbackURL = `${stripTrailingSlash(currentURL.origin)}${ctx.context.options.basePath || "/api/auth"}/callback/${providerId}/oauth-proxy?callbackURL=${encodeURIComponent(originalCallbackURL)}`;
					ctx.body.callbackURL = newCallbackURL;
				})
			}, {
				matcher(context) {
					return context.path === "/callback/:id";
				},
				handler: createAuthMiddleware(async (ctx) => {
					const callbackParams = defu(ctx.query, ctx.body);
					const state = callbackParams.state;
					if (!state || typeof state !== "string") return;
					let statePackage;
					try {
						statePackage = parseJSON(await symmetricDecrypt({
							key: getEncryptionKey(ctx, "oauth-proxy-package"),
							data: state
						}));
					} catch {
						ctx.context.logger.debug("OAuth proxy: could not decrypt state package, falling back to regular callback");
						return;
					}
					if (!statePackage.isOAuthProxy || !statePackage.state || !statePackage.stateCookie) {
						ctx.context.logger.warn("Invalid OAuth proxy state package");
						return;
					}
					const query = oauthCallbackQuerySchema.safeParse(callbackParams);
					if (!query.success) {
						ctx.context.logger.warn("Invalid OAuth callback query", query.error);
						return;
					}
					const { code, error, user: userData } = query.data;
					let stateData;
					try {
						stateData = parseJSON(await symmetricDecrypt({
							key: getEncryptionKey(ctx, "oauth-proxy-state"),
							data: statePackage.stateCookie
						}));
					} catch (e) {
						ctx.context.logger.error("Failed to decrypt OAuth proxy state cookie:", e);
						return;
					}
					const errorURL = stateData.errorURL || ctx.context.options.onAPIError?.errorURL || `${ctx.context.baseURL}/error`;
					if (stateData.oauthState !== void 0 && stateData.oauthState !== statePackage.state) {
						ctx.context.logger.error("OAuth proxy state binding mismatch");
						throw redirectOnError(ctx, errorURL, "state_mismatch");
					}
					if (error) throw redirectOnError(ctx, errorURL, error);
					if (!code) {
						ctx.context.logger.warn("OAuth callback missing authorization code");
						throw redirectOnError(ctx, errorURL, "no_code");
					}
					const providerId = ctx.params?.id;
					const provider = ctx.context.socialProviders.find((p) => p.id === providerId);
					if (!provider) {
						ctx.context.logger.warn("OAuth provider not found", { providerId });
						throw redirectOnError(ctx, errorURL, "oauth_provider_not_found");
					}
					let tokens;
					try {
						tokens = await provider.validateAuthorizationCode({
							code,
							codeVerifier: stateData.codeVerifier,
							redirectURI: `${ctx.context.baseURL}${getOAuthCallbackPath(provider)}`
						});
					} catch (e) {
						ctx.context.logger.error("Failed to validate authorization code", e);
						throw redirectOnError(ctx, errorURL, "invalid_code");
					}
					if (!tokens) throw redirectOnError(ctx, errorURL, "invalid_code");
					const parsedUserData = userData ? safeJSONParse(userData) : null;
					const userInfoResult = await provider.getUserInfo({
						...tokens,
						/**
						* The user object from the provider
						* This is only available for some providers like Apple
						*/
						user: parsedUserData ?? void 0
					});
					const userInfo = userInfoResult?.user;
					if (!userInfo) {
						ctx.context.logger.error("Unable to get user info from provider");
						throw redirectOnError(ctx, errorURL, "unable_to_get_user_info");
					}
					if (!userInfo.email) {
						ctx.context.logger.error("Provider did not return email");
						throw redirectOnError(ctx, errorURL, "email_not_found");
					}
					let accountKey;
					try {
						accountKey = await resolveOAuthAccountKey(provider, tokens, userInfoResult.data);
					} catch (error) {
						ctx.context.logger.error("Unable to derive provider account identity", {
							providerId: provider.id,
							error
						});
						throw redirectOnError(ctx, errorURL, "unable_to_get_user_info");
					}
					const providerProfile = toOAuthProfileRecord(userInfoResult.data);
					const proxyCallbackURL = new URL(stateData.callbackURL);
					const finalCallbackURL = proxyCallbackURL.searchParams.get("callbackURL") || stateData.callbackURL;
					const payload = {
						userInfo: {
							id: accountKey.accountId,
							email: userInfo.email,
							name: userInfo.name || "",
							image: userInfo.image,
							emailVerified: userInfo.emailVerified
						},
						profile: providerProfile,
						scopes: tokens.scopes,
						account: {
							...accountKey,
							accessToken: tokens.accessToken,
							refreshToken: tokens.refreshToken,
							idToken: tokens.idToken,
							accessTokenExpiresAt: tokens.accessTokenExpiresAt,
							refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
							scope: tokens.scopes?.join(",")
						},
						state: statePackage.state,
						callbackURL: finalCallbackURL,
						newUserURL: stateData.newUserURL,
						errorURL: stateData.errorURL,
						disableSignUp: provider.disableImplicitSignUp && !stateData.requestSignUp || provider.options?.disableSignUp,
						timestamp: Date.now()
					};
					const encryptedPayload = await symmetricEncrypt({
						key: getEncryptionKey(ctx, "oauth-proxy-profile"),
						data: JSON.stringify(payload)
					});
					proxyCallbackURL.searchParams.set("profile", encryptedPayload);
					throw ctx.redirect(proxyCallbackURL.toString());
				})
			}],
			after: [{
				matcher(context) {
					return !!context.path?.startsWith("/sign-in/social") || context.path === "/link-social";
				},
				handler: createAuthMiddleware(async (ctx) => {
					if (checkSkipProxy(ctx, opts)) return;
					const signInResponse = ctx.context.returned;
					if (!signInResponse || typeof signInResponse !== "object" || !("url" in signInResponse)) return;
					const { url: providerURL } = signInResponse;
					if (typeof providerURL !== "string" || providerURL.length === 0) return;
					const oauthURL = new URL(providerURL);
					const originalState = oauthURL.searchParams.get("state");
					if (!originalState) return;
					try {
						let plaintextState;
						if (ctx.context.oauthConfig.storeStateStrategy === "cookie") {
							const setCookieHeader = ctx.context.responseHeaders?.get("set-cookie");
							if (setCookieHeader) {
								const oauthStateCookie = ctx.context.createAuthCookie("oauth_state");
								const encryptedCookieValue = parseSetCookieHeader(setCookieHeader).get(oauthStateCookie.name)?.value;
								if (encryptedCookieValue) plaintextState = await symmetricDecrypt({
									key: derivePurposeKey(ctx.context.secretConfig, "oauth-state-cookie"),
									data: encryptedCookieValue
								});
							}
						} else plaintextState = (await ctx.context.internalAdapter.findVerificationValue(getAuthStateVerificationIdentifier(originalState)))?.value;
						if (!plaintextState) {
							ctx.context.logger.warn("No OAuth state found for proxy");
							return;
						}
						const statePackage = {
							state: originalState,
							stateCookie: await symmetricEncrypt({
								key: getEncryptionKey(ctx, "oauth-proxy-state"),
								data: plaintextState
							}),
							isOAuthProxy: true
						};
						const encryptedPackage = await symmetricEncrypt({
							key: getEncryptionKey(ctx, "oauth-proxy-package"),
							data: JSON.stringify(statePackage)
						});
						oauthURL.searchParams.set("state", encryptedPackage);
						ctx.context.returned = {
							...signInResponse,
							url: oauthURL.toString()
						};
					} catch (e) {
						ctx.context.logger.error("Failed to prepare OAuth proxy state:", e);
					}
				})
			}, {
				matcher(context) {
					return context.path === "/callback/:id";
				},
				handler: createAuthMiddleware(async (ctx) => {
					const location = ctx.context.responseHeaders?.get("location");
					if (!location?.includes("/oauth-proxy?callbackURL") && !location?.includes("/oauth-proxy-callback?callbackURL") || !location.startsWith("http")) return;
					const productionOrigin = getOrigin(opts?.productionURL || (typeof ctx.context.options.baseURL === "string" ? ctx.context.options.baseURL : void 0) || ctx.context.baseURL);
					const locationURL = new URL(location);
					if (locationURL.origin === productionOrigin) {
						const newLocation = locationURL.searchParams.get("callbackURL");
						if (!newLocation) return;
						ctx.setHeader("location", newLocation);
						return;
					}
					ctx.context.logger.warn("OAuth proxy: cross-origin callback reached after hook unexpectedly");
				})
			}]
		}
	};
};
//#endregion
export { oAuthProxy };
