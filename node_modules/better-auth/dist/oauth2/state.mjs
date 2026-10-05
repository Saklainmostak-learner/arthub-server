import { generateRandomString } from "../crypto/random.mjs";
import { redirectOnError } from "./errors.mjs";
import { getOAuthServerContext, setOAuthState } from "../api/state/oauth.mjs";
import { StateError, generateGenericState, parseGenericState } from "../state.mjs";
import { APIError, BASE_ERROR_CODES } from "@better-auth/core/error";
//#region src/oauth2/state.ts
/**
* Mint the OIDC `nonce` for the redirect flow, or `undefined` when the provider
* does not require ID-token nonce binding. Every redirect entrypoint (social
* sign-in, account linking, IDP-initiated bounce, and the OAuth popup) mints
* through this helper, so the value sent on the authorization URL and the value
* persisted in state are produced one way and cannot drift apart.
*/
function generateIdTokenNonce(provider) {
	return provider.requiresIdTokenNonce ? generateRandomString(32) : void 0;
}
async function generateState(c, options) {
	const callbackURL = c.body?.callbackURL || c.context.options.baseURL;
	if (!callbackURL) throw APIError.from("BAD_REQUEST", BASE_ERROR_CODES.CALLBACK_URL_REQUIRED);
	const codeVerifier = options?.codeVerifier ?? generateRandomString(128);
	const pendingServerContext = await getOAuthServerContext();
	const serverContext = pendingServerContext && Object.keys(pendingServerContext).length ? pendingServerContext : void 0;
	const stateData = {
		...options?.additionalData ? options.additionalData : {},
		callbackURL,
		codeVerifier,
		errorURL: c.body?.errorCallbackURL,
		newUserURL: c.body?.newUserCallbackURL,
		link: options?.link,
		serverContext,
		expiresAt: Date.now() + 600 * 1e3,
		requestSignUp: c.body?.requestSignUp,
		idTokenNonce: options?.idTokenNonce
	};
	await setOAuthState(stateData);
	try {
		return generateGenericState(c, stateData);
	} catch (error) {
		c.context.logger.error("Failed to create verification", error);
		throw new APIError("INTERNAL_SERVER_ERROR", {
			message: "Unable to create verification",
			cause: error
		});
	}
}
async function parseState(c) {
	const state = c.query.state || c.body?.state;
	const errorURL = c.context.options.onAPIError?.errorURL || `${c.context.baseURL}/error`;
	let parsedData;
	try {
		parsedData = await parseGenericState(c, state);
	} catch (error) {
		c.context.logger.error("Failed to parse state", error);
		let code = "internal_server_error";
		let redirectErrorURL = errorURL;
		if (error instanceof StateError) {
			code = error.code === "state_security_mismatch" ? "state_mismatch" : error.code;
			redirectErrorURL = error.errorURL || errorURL;
		}
		redirectOnError(c, redirectErrorURL, code);
	}
	if (!parsedData.errorURL) parsedData.errorURL = errorURL;
	if (parsedData) await setOAuthState(parsedData);
	return parsedData;
}
//#endregion
export { generateIdTokenNonce, generateState, parseState };
