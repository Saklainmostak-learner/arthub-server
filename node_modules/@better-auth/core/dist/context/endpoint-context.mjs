import { __getBetterAuthGlobal, __getCurrentEndpointContext } from "./global.mjs";
import { getAsyncLocalStorage } from "@better-auth/core/async_hooks";
//#region src/context/endpoint-context.ts
const getExistingEndpointContextStorage = () => {
	return __getBetterAuthGlobal().context.endpointContextAsyncStorage;
};
const getOrCreateEndpointContextStorage = async () => {
	const existing = getExistingEndpointContextStorage();
	if (existing) return existing;
	const AsyncLocalStorage = await getAsyncLocalStorage();
	const globalContext = __getBetterAuthGlobal().context;
	return globalContext.endpointContextAsyncStorage ??= new AsyncLocalStorage();
};
/**
* @deprecated Use `getCurrentAuthEndpointContext`,
* `tryGetCurrentAuthEndpointContext`, or `runWithEndpointContext` instead.
*/
async function getCurrentAuthContextAsyncLocalStorage() {
	return getOrCreateEndpointContextStorage();
}
/**
* Returns the current auth endpoint context, or `undefined` when called outside
* of `runWithEndpointContext`.
*/
function tryGetCurrentAuthEndpointContext() {
	return __getCurrentEndpointContext();
}
/**
* Returns the current auth endpoint context.
*
* @throws When called outside of `runWithEndpointContext`.
*/
function getCurrentAuthEndpointContext() {
	const authEndpointContext = tryGetCurrentAuthEndpointContext();
	if (!authEndpointContext) throw new Error("No auth context found. Please make sure you are calling this function within a `runWithEndpointContext` callback.");
	return authEndpointContext;
}
/**
* @deprecated Use `getCurrentAuthEndpointContext` instead.
*/
async function getCurrentAuthContext() {
	return getCurrentAuthEndpointContext();
}
async function runWithEndpointContext(authEndpointContext, fn) {
	return (await getOrCreateEndpointContextStorage()).run(authEndpointContext, fn);
}
//#endregion
export { getCurrentAuthContext, getCurrentAuthContextAsyncLocalStorage, getCurrentAuthEndpointContext, runWithEndpointContext, tryGetCurrentAuthEndpointContext };
