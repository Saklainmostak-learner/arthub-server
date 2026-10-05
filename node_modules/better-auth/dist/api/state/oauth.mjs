import { defineRequestState } from "@better-auth/core/context";
//#region src/api/state/oauth.ts
const { get: getRawOAuthState, set: setOAuthState } = defineRequestState(() => null);
/**
* Reads the OAuth state for the current request. During a callback it holds the
* state parsed from the provider redirect; during sign-in it holds the state
* just generated.
*
* Top-level keys beyond the documented fields are client-supplied
* (`additionalData`) and must not be trusted. Server-trusted values live under
* {@link OAuthState.serverContext}.
*/
const getOAuthState = async () => {
	return await getRawOAuthState();
};
/**
* @internal Read accumulated server context to embed during state generation.
*/
const { get: getOAuthServerContext, set: setOAuthServerContext } = defineRequestState(() => null);
/**
* Attaches server-trusted data to the current OAuth flow so it survives the
* provider redirect. Call this from a `before` hook on an OAuth sign-in path
* (for example `/sign-in/social` or `/sign-in/oauth2`). `generateState` embeds
* the accumulated values into the state, and they become readable on the
* callback via `getOAuthState().serverContext`.
*
* Unlike the request body's `additionalData`, values set here cannot be spoofed
* by the client. Multiple callers merge: each call adds its own keys. Values are
* stored as `unknown`, so narrow their shape when reading them back.
*/
const addOAuthServerContext = async (values) => {
	await setOAuthServerContext({
		...await getOAuthServerContext() ?? {},
		...values
	});
};
//#endregion
export { addOAuthServerContext, getOAuthServerContext, getOAuthState, setOAuthState };
