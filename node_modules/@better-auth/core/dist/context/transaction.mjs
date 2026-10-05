import { __getBetterAuthGlobal } from "./global.mjs";
import { runtimeSchemaCheckFor } from "../db/schema-check.mjs";
import { getAsyncLocalStorage } from "@better-auth/core/async_hooks";
//#region src/context/transaction.ts
const ensureAsyncStorage = async () => {
	const betterAuthGlobal = __getBetterAuthGlobal();
	const existing = betterAuthGlobal.context.adapterAsyncStorage;
	if (existing) return existing;
	const AsyncLocalStorage = await getAsyncLocalStorage();
	betterAuthGlobal.context.adapterAsyncStorage ??= new AsyncLocalStorage();
	return betterAuthGlobal.context.adapterAsyncStorage;
};
/**
* This is for internal use only. Most users should use `getCurrentAdapter` instead.
*
* It is exposed for advanced use cases where you need direct access to the AsyncLocalStorage instance.
*/
const getCurrentDBAdapterAsyncLocalStorage = async () => {
	return ensureAsyncStorage();
};
const getCurrentAdapter = async (fallback) => {
	return ensureAsyncStorage().then((als) => {
		return als.getStore()?.adapter || fallback;
	}).catch(() => {
		return fallback;
	});
};
const runWithAdapter = async (adapter, fn) => {
	let called = false;
	return ensureAsyncStorage().then(async (als) => {
		called = true;
		const pendingHooks = [];
		let result;
		let error;
		let hasError = false;
		try {
			result = await als.run({
				adapter,
				pendingHooks,
				isTransactionActive: false
			}, fn);
		} catch (err) {
			error = err;
			hasError = true;
		}
		for (const hook of pendingHooks) await hook();
		if (hasError) throw error;
		return result;
	}).catch((err) => {
		if (!called) return fn();
		throw err;
	});
};
const runWithTransaction = async (adapter, fn, options) => {
	let called = false;
	return ensureAsyncStorage().then(async (als) => {
		called = true;
		if (als.getStore()?.isTransactionActive) return fn();
		const pendingSchemaCheck = runtimeSchemaCheckFor(adapter)?.();
		if (pendingSchemaCheck) await pendingSchemaCheck;
		const pendingHooks = [];
		let result;
		let error;
		let hasError = false;
		try {
			result = await adapter.transaction(async (trx) => {
				return als.run({
					adapter: trx,
					pendingHooks,
					isTransactionActive: true
				}, fn);
			});
		} catch (e) {
			hasError = true;
			error = e;
		}
		if (hasError) throw error;
		for (const hook of pendingHooks) try {
			await hook();
		} catch (error) {
			if (!options?.onAfterCommitHookError) throw error;
			try {
				await options.onAfterCommitHookError(error);
			} catch {}
		}
		return result;
	}).catch((err) => {
		if (!called) return fn();
		throw err;
	});
};
/**
* Queue a hook to be executed after the current transaction commits.
* If not in a transaction, the hook will execute immediately.
*/
const queueAfterTransactionHook = async (hook, options) => {
	const executeHook = async () => {
		try {
			await hook();
		} catch (error) {
			if (!options?.onError) throw error;
			await options.onError(error);
		}
	};
	let storage;
	try {
		storage = await ensureAsyncStorage();
	} catch {
		return executeHook();
	}
	const store = storage.getStore();
	if (!store?.isTransactionActive) return executeHook();
	store.pendingHooks.push(executeHook);
};
//#endregion
export { getCurrentAdapter, getCurrentDBAdapterAsyncLocalStorage, queueAfterTransactionHook, runWithAdapter, runWithTransaction };
