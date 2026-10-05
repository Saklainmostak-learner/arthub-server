//#region src/plugins/captcha/utils.ts
const encodeToURLParams = (obj) => {
	if (typeof obj !== "object" || obj === null || Array.isArray(obj)) throw new Error("Input must be a non-null object.");
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(obj)) if (value !== void 0 && value !== null) params.append(key, String(value));
	return params.toString();
};
/**
* Rejects after `timeoutMs` without cancelling the underlying promise.
*/
const withTimeout = (promise, timeoutMs) => {
	let timer;
	const timeout = new Promise((_resolve, reject) => {
		timer = setTimeout(() => reject(/* @__PURE__ */ new Error("Operation timed out")), timeoutMs);
	});
	return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
};
//#endregion
export { encodeToURLParams, withTimeout };
