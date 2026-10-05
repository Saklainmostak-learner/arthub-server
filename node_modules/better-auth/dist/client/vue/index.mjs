import { getClientConfig } from "../config.mjs";
import { createDynamicPathProxy } from "../proxy.mjs";
import { useStore } from "./vue-store.mjs";
import { capitalizeFirstLetter } from "@better-auth/core/utils/string";
//#region src/client/vue/index.ts
function getAtomKey(str) {
	return `use${capitalizeFirstLetter(str)}`;
}
/** Preserves standard `HeadersInit` values and removes undefined record entries. */
function toHeadersInit(headers) {
	if (!headers) return void 0;
	if (headers instanceof Headers || Array.isArray(headers)) return headers;
	const normalizedHeaders = {};
	for (const [name, value] of Object.entries(headers)) if (value !== void 0) normalizedHeaders[name] = value;
	return normalizedHeaders;
}
function createAuthClient(options) {
	const { baseURL, pluginPathMethods, pluginsActions, pluginsAtoms, hydrateSession, $sessionSignal, $fetch, $store, atomListeners } = getClientConfig(options, false);
	const sessionCacheKey = [
		"better-auth",
		"session",
		options?.baseURL || "inferred",
		options?.basePath ?? "/api/auth"
	].join(":");
	const resolvedHooks = {};
	for (const [key, value] of Object.entries(pluginsAtoms)) resolvedHooks[getAtomKey(key)] = () => useStore(value);
	function useSession(useFetch) {
		if (useFetch) {
			const sessionSignal = useStore($sessionSignal);
			return useFetch(`${baseURL}/get-session`, {
				headers: toHeadersInit(options?.fetchOptions?.headers),
				key: sessionCacheKey,
				watch: [sessionSignal]
			}).then((result) => {
				return {
					data: result.data,
					isPending: false,
					error: result.error
				};
			});
		}
		return resolvedHooks.useSession();
	}
	return createDynamicPathProxy({
		...pluginsActions,
		...resolvedHooks,
		hydrateSession,
		useSession,
		$fetch,
		$store
	}, $fetch, pluginPathMethods, pluginsAtoms, atomListeners);
}
//#endregion
export { createAuthClient };
