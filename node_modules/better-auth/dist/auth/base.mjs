import { getBaseURL, getOrigin, isDynamicBaseURLConfig } from "../utils/url.mjs";
import { getTrustedOrigins, getTrustedProviders, resolveDynamicTrustedProxyHeaders, resolveRequestContext } from "../context/helpers.mjs";
import { getEndpoints, router } from "../api/index.mjs";
import { runWithAdapter } from "@better-auth/core/context";
import { BASE_ERROR_CODES, BetterAuthError } from "@better-auth/core/error";
import { SchemaMismatchError } from "@better-auth/core/db/internal";
//#region src/auth/base.ts
const createBetterAuth = (options, initFn) => {
	const authContext = initFn(options).then((ctx) => {
		const validateSchema = ctx.options.advanced?.database?.validateSchema;
		if (!ctx.checkSchema && validateSchema !== false) {
			const level = validateSchema === true ? "warn" : "debug";
			ctx.logger[level](`Schema validation is not available for adapter "${ctx.adapter.id}". Skipping schema validation. Database operations will proceed normally.`);
		}
		const pendingSchemaCheck = ctx.checkSchema?.();
		if (pendingSchemaCheck) pendingSchemaCheck.catch((error) => {
			ctx.logger.error(error instanceof SchemaMismatchError ? error.message : "Could not validate the database schema. Check your database connection.");
		});
		return ctx;
	});
	const { api } = getEndpoints(authContext, options);
	const errorCodes = options.plugins?.reduce((acc, plugin) => {
		if (plugin.$ERROR_CODES) return {
			...acc,
			...plugin.$ERROR_CODES
		};
		return acc;
	}, {});
	const handler = async (request) => {
		const ctx = await authContext;
		const basePath = ctx.options.basePath || "/api/auth";
		let handlerCtx;
		if (isDynamicBaseURLConfig(options.baseURL)) handlerCtx = await resolveRequestContext(ctx, request, resolveDynamicTrustedProxyHeaders(ctx.options));
		else {
			handlerCtx = Object.create(Object.getPrototypeOf(ctx), Object.getOwnPropertyDescriptors(ctx));
			let trustOptions = ctx.options;
			if (!ctx.options.baseURL) {
				const baseURL = getBaseURL(void 0, basePath, request, void 0, ctx.options.advanced?.trustedProxyHeaders);
				if (!baseURL) throw new BetterAuthError("Could not get base URL from request. Please provide a valid base URL.");
				handlerCtx.baseURL = baseURL;
				handlerCtx.options = {
					...ctx.options,
					baseURL: getOrigin(baseURL) || void 0
				};
				trustOptions = handlerCtx.options;
			}
			handlerCtx.trustedOrigins = await getTrustedOrigins(trustOptions, request);
			handlerCtx.trustedProviders = await getTrustedProviders(trustOptions, request);
		}
		const { handler } = router(handlerCtx, options);
		return runWithAdapter(handlerCtx.adapter, () => handler(request));
	};
	return {
		handler,
		fetch: handler,
		api,
		options,
		$context: authContext,
		$ERROR_CODES: {
			...errorCodes,
			...BASE_ERROR_CODES
		}
	};
};
//#endregion
export { createBetterAuth };
