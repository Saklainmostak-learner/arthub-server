import { isAPIError } from "../../utils/is-api-error.mjs";
import { setSessionCookie } from "../../cookies/index.mjs";
import { getAwaitableValue } from "../../context/helpers.mjs";
import { resolveOAuthAccountKey, toOAuthProfileRecord } from "../../oauth2/account-key.mjs";
import { OAUTH_CALLBACK_ERROR_CODES, missingEmailLogMessage } from "../../oauth2/errors.mjs";
import { getOAuthCallbackPath } from "../../oauth2/utils.mjs";
import { handleOAuthUserInfo, linkOAuthAccount } from "../../oauth2/link-account.mjs";
import { generateIdTokenNonce, generateState, parseState } from "../../oauth2/state.mjs";
import { HIDE_METADATA } from "../../utils/hide-metadata.mjs";
import { safeJSONParse } from "@better-auth/core/utils/json";
import { appendQueryParams } from "@better-auth/core/utils/url";
import { createAuthEndpoint } from "@better-auth/core/api";
import * as z from "zod";
//#region src/api/routes/callback.ts
const schema = z.object({
	code: z.string().optional(),
	error: z.string().optional(),
	device_id: z.string().optional(),
	error_description: z.string().optional(),
	state: z.string().optional(),
	user: z.string().optional(),
	iss: z.string().optional()
});
const callbackOAuth = createAuthEndpoint("/callback/:id", {
	method: ["GET", "POST"],
	operationId: "handleOAuthCallback",
	body: schema.optional(),
	query: schema.optional(),
	metadata: {
		...HIDE_METADATA,
		allowedMediaTypes: ["application/x-www-form-urlencoded", "application/json"]
	}
}, async (c) => {
	let queryOrBody;
	const defaultErrorURL = c.context.options.onAPIError?.errorURL || `${c.context.baseURL}/error`;
	if (c.method === "POST") {
		const postData = c.body ? schema.parse(c.body) : {};
		const queryData = c.query ? schema.parse(c.query) : {};
		const mergedData = schema.parse({
			...postData,
			...queryData
		});
		const params = new URLSearchParams();
		for (const [key, value] of Object.entries(mergedData)) if (value !== void 0 && value !== null) params.set(key, String(value));
		const redirectURL = `${c.context.baseURL}/callback/${c.params.id}?${params.toString()}`;
		throw c.redirect(redirectURL);
	}
	try {
		if (c.method === "GET") queryOrBody = schema.parse(c.query);
		else if (c.method === "POST") queryOrBody = schema.parse(c.body);
		else throw new Error("Unsupported method");
	} catch (e) {
		c.context.logger.error("INVALID_CALLBACK_REQUEST", e);
		const redirectURL = appendQueryParams(defaultErrorURL, new URLSearchParams({ error: "invalid_callback_request" }));
		throw c.redirect(redirectURL);
	}
	const { code, error, state, error_description, device_id, user: userData, iss } = queryOrBody;
	if (state === void 0 && code) {
		const provider = await getAwaitableValue(c.context.socialProviders, { value: c.params.id });
		if (provider?.allowIdpInitiated) {
			const idTokenNonce = generateIdTokenNonce(provider);
			const { state: freshState, codeVerifier } = await generateState(c, { idTokenNonce });
			const authUrl = await provider.createAuthorizationURL({
				state: freshState,
				codeVerifier,
				idTokenNonce,
				redirectURI: `${c.context.baseURL}${getOAuthCallbackPath(provider)}`
			});
			throw c.redirect(authUrl.toString());
		}
	}
	if (!state) {
		c.context.logger.error("State not found", error);
		const redirectURL = appendQueryParams(defaultErrorURL, new URLSearchParams({ error: "state_not_found" }));
		throw c.redirect(redirectURL);
	}
	const { codeVerifier, callbackURL, link, errorURL, newUserURL, requestSignUp, idTokenNonce } = await parseState(c);
	function redirectOnError(error, description) {
		const baseURL = errorURL ?? defaultErrorURL;
		const params = new URLSearchParams({ error });
		if (description) params.set("error_description", description);
		const redirectURL = appendQueryParams(baseURL, params);
		throw c.redirect(redirectURL);
	}
	if (error) redirectOnError(error, error_description);
	if (!code) {
		c.context.logger.warn("Code not found");
		throw redirectOnError(OAUTH_CALLBACK_ERROR_CODES.NO_CODE);
	}
	const provider = await getAwaitableValue(c.context.socialProviders, { value: c.params.id });
	if (!provider) {
		c.context.logger.warn("OAuth provider not found", { providerId: c.params.id });
		throw redirectOnError(OAUTH_CALLBACK_ERROR_CODES.PROVIDER_NOT_FOUND);
	}
	if (iss && provider.issuer && iss !== provider.issuer) {
		c.context.logger.error("OAuth issuer mismatch", {
			expected: provider.issuer,
			received: iss
		});
		throw redirectOnError(OAUTH_CALLBACK_ERROR_CODES.ISSUER_MISMATCH);
	}
	if (provider.requiresIdTokenNonce && !idTokenNonce) {
		c.context.logger.error("OAuth id_token nonce binding required but no expected nonce was found in state", { providerId: provider.id });
		throw redirectOnError(OAUTH_CALLBACK_ERROR_CODES.NONCE_BINDING_MISSING);
	}
	let tokens;
	try {
		tokens = await provider.validateAuthorizationCode({
			code,
			codeVerifier,
			deviceId: device_id,
			redirectURI: `${c.context.baseURL}${getOAuthCallbackPath(provider)}`
		});
	} catch (e) {
		c.context.logger.error("", e);
		throw redirectOnError(OAUTH_CALLBACK_ERROR_CODES.INVALID_CODE);
	}
	if (!tokens) throw redirectOnError(OAUTH_CALLBACK_ERROR_CODES.INVALID_CODE);
	const parsedUserData = userData ? safeJSONParse(userData) : null;
	const providerResult = await provider.getUserInfo({
		...tokens,
		...idTokenNonce ? { expectedIdTokenNonce: idTokenNonce } : {},
		/**
		* The user object from the provider
		* This is only available for some providers like Apple
		*/
		user: parsedUserData ?? void 0
	});
	if (!providerResult?.user) {
		c.context.logger.error("Unable to get user info");
		return redirectOnError(OAUTH_CALLBACK_ERROR_CODES.UNABLE_TO_GET_USER_INFO);
	}
	const userInfo = providerResult.user;
	const providerProfile = toOAuthProfileRecord(providerResult.data);
	let accountKey;
	try {
		accountKey = await resolveOAuthAccountKey(provider, tokens, providerResult.data);
	} catch (error) {
		c.context.logger.error("Unable to derive provider account identity", {
			providerId: provider.id,
			error
		});
		return redirectOnError(OAUTH_CALLBACK_ERROR_CODES.UNABLE_TO_GET_USER_INFO);
	}
	const { accountId } = accountKey;
	if (!callbackURL) {
		c.context.logger.error("No callback URL found");
		throw redirectOnError(OAUTH_CALLBACK_ERROR_CODES.NO_CALLBACK_URL);
	}
	const accountData = {
		...accountKey,
		...tokens,
		scope: tokens.scopes?.join(",")
	};
	if (link) {
		const linkResult = await linkOAuthAccount(c, {
			link,
			userInfo,
			account: accountData,
			profile: providerProfile,
			scopes: tokens.scopes
		});
		if (!linkResult.linked) return redirectOnError(linkResult.error.code, linkResult.error.message);
		throw c.redirect(callbackURL);
	}
	if (!userInfo.email) {
		c.context.logger.error(missingEmailLogMessage(provider.id));
		return redirectOnError(OAUTH_CALLBACK_ERROR_CODES.EMAIL_NOT_FOUND);
	}
	let result;
	try {
		result = await handleOAuthUserInfo(c, {
			userInfo: {
				...userInfo,
				id: accountId,
				email: userInfo.email,
				name: userInfo.name || ""
			},
			account: accountData,
			callbackURL,
			disableSignUp: provider.disableImplicitSignUp && !requestSignUp || provider.options?.disableSignUp,
			overrideUserInfo: provider.options?.overrideUserInfoOnSignIn,
			source: {
				method: "oauth",
				oauth: {
					providerId: provider.id,
					profile: providerProfile
				}
			}
		});
	} catch (e) {
		if (isAPIError(e) && e.body?.code) redirectOnError(e.body.code, e.body.message);
		throw e;
	}
	if (result.error) {
		c.context.logger.error(result.error.split(" ").join("_"));
		return redirectOnError(result.error.split(" ").join("_"));
	}
	const { session, user } = result.data;
	await setSessionCookie(c, {
		session,
		user
	});
	let toRedirectTo;
	try {
		toRedirectTo = (result.isRegister ? newUserURL || callbackURL : callbackURL).toString();
	} catch {
		toRedirectTo = result.isRegister ? newUserURL || callbackURL : callbackURL;
	}
	throw c.redirect(toRedirectTo);
});
//#endregion
export { callbackOAuth };
