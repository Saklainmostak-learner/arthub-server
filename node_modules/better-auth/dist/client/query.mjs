import { isJsonEqual, withEquality } from "./equality.mjs";
import { createAuthQueryAtom } from "./query-atom.mjs";
import { onMount } from "nanostores";
//#region src/client/query.ts
const isServer = () => typeof window === "undefined";
function isAuthQueryStateEqual(a, b) {
	return isJsonEqual(a.data, b.data) && a.error === b.error && a.isPending === b.isPending && a.isRefetching === b.isRefetching && a.refetch === b.refetch;
}
const useAuthQuery = (initializedAtom, path, $fetch, options) => {
	const value = createAuthQueryAtom({
		data: null,
		error: null,
		isPending: true,
		isRefetching: false,
		refetch: (queryParams) => fn(queryParams)
	});
	onMount(value, () => withEquality(value, isAuthQueryStateEqual));
	let latestRequestId = 0;
	const fn = async (queryParams) => {
		const requestId = ++latestRequestId;
		return new Promise((resolve) => {
			const opts = typeof options === "function" ? options({
				data: value.get().data,
				error: value.get().error,
				isPending: value.get().isPending
			}) : options;
			$fetch(path, {
				...opts,
				query: {
					...opts?.query,
					...queryParams?.query
				},
				async onSuccess(context) {
					if (requestId === latestRequestId) {
						const current = value.get();
						const stableData = current.data != null && context.data != null && isJsonEqual(current.data, context.data) ? current.data : context.data;
						value.set({
							data: stableData,
							error: null,
							isPending: false,
							isRefetching: false,
							refetch: value.value.refetch
						});
					}
					await opts?.onSuccess?.(context);
				},
				async onError(context) {
					const { request } = context;
					const retryAttempts = typeof request.retry === "number" ? request.retry : request.retry?.attempts;
					const retryAttempt = request.retryAttempt || 0;
					if (retryAttempts && retryAttempt < retryAttempts) return;
					if (requestId === latestRequestId) {
						const isUnauthorized = context.error.status === 401;
						value.set({
							error: context.error,
							data: isUnauthorized ? null : value.get().data,
							isPending: false,
							isRefetching: false,
							refetch: value.value.refetch
						});
					}
					await opts?.onError?.(context);
				},
				async onRequest(context) {
					if (requestId === latestRequestId) {
						const currentValue = value.get();
						value.set({
							isPending: currentValue.data === null,
							data: currentValue.data,
							error: null,
							isRefetching: true,
							refetch: value.value.refetch
						});
					}
					await opts?.onRequest?.(context);
				}
			}).catch((error) => {
				if (requestId !== latestRequestId) return;
				value.set({
					error,
					data: value.get().data,
					isPending: false,
					isRefetching: false,
					refetch: value.value.refetch
				});
			}).finally(() => {
				resolve(void 0);
			});
		});
	};
	initializedAtom = Array.isArray(initializedAtom) ? initializedAtom : [initializedAtom];
	let isMountFetchPending = false;
	let isMounted = false;
	let shouldRefetchAfterPending = false;
	const fetchOnMount = () => {
		if (isMountFetchPending) {
			shouldRefetchAfterPending = true;
			return;
		}
		isMountFetchPending = true;
		fn().finally(() => {
			isMountFetchPending = false;
			const shouldRefetch = shouldRefetchAfterPending && isMounted;
			shouldRefetchAfterPending = false;
			if (shouldRefetch) fetchOnMount();
		});
	};
	onMount(value, () => {
		if (isServer()) return;
		isMounted = true;
		let isInitialized = false;
		let timeoutId;
		const cleanups = initializedAtom.map((initAtom) => initAtom.listen(() => {
			if (isInitialized) fn();
			else {
				isInitialized = true;
				clearTimeout(timeoutId);
				fetchOnMount();
			}
		}));
		timeoutId = setTimeout(() => {
			isInitialized = true;
			fetchOnMount();
		}, 0);
		return () => {
			isMounted = false;
			for (const cleanup of cleanups) cleanup();
			clearTimeout(timeoutId);
		};
	});
	return value;
};
//#endregion
export { useAuthQuery };
