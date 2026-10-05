import { wildcardMatch } from "../../utils/wildcard.mjs";
import { PACKAGE_VERSION } from "../../version.mjs";
import { middlewareResponse } from "../../utils/middleware-response.mjs";
import { Providers, defaultEndpoints, siteVerifyMap } from "./constants.mjs";
import { EXTERNAL_ERROR_CODES, INTERNAL_ERROR_CODES } from "./error-codes.mjs";
import { captchaFox } from "./verify-handlers/captchafox.mjs";
import { cloudflareTurnstile } from "./verify-handlers/cloudflare-turnstile.mjs";
import { googleRecaptcha } from "./verify-handlers/google-recaptcha.mjs";
import { hCaptcha } from "./verify-handlers/h-captcha.mjs";
import { vercelBotId } from "./verify-handlers/vercel-botid.mjs";
import { getIP } from "@better-auth/core/utils/ip";
//#region src/plugins/captcha/index.ts
const normalizeEndpointPath = (pathname, basePath) => {
	let normalizedPathname = (pathname.startsWith(basePath) ? pathname.slice(basePath.length) : pathname).replace(/\/{2,}/g, "/");
	if (!normalizedPathname.startsWith("/")) normalizedPathname = `/${normalizedPathname}`;
	if (normalizedPathname.length > 1 && normalizedPathname.endsWith("/")) normalizedPathname = normalizedPathname.slice(0, -1);
	return normalizedPathname;
};
const captcha = (options) => ({
	id: "captcha",
	version: PACKAGE_VERSION,
	$ERROR_CODES: EXTERNAL_ERROR_CODES,
	onRequest: async (request, ctx) => {
		try {
			const endpoints = options.endpoints?.length ? options.endpoints : defaultEndpoints;
			const url = new URL(request.url);
			const basePath = ctx.options.basePath ?? "/api/auth";
			const pathname = normalizeEndpointPath(url.pathname, basePath);
			if (!endpoints.some((endpoint) => endpoint.includes("*") ? wildcardMatch(endpoint)(pathname) : endpoint === pathname)) return;
			if (options.provider === Providers.VERCEL_BOTID) return await vercelBotId({
				request,
				checkBotId: options.checkBotId,
				validateRequest: options.validateRequest
			});
			if (!options.secretKey) throw new Error(INTERNAL_ERROR_CODES.MISSING_SECRET_KEY.message);
			const captchaResponse = request.headers.get("x-captcha-response");
			const remoteUserIP = getIP(request, ctx.options) ?? void 0;
			if (!captchaResponse) return middlewareResponse({
				message: EXTERNAL_ERROR_CODES.MISSING_RESPONSE.message,
				code: EXTERNAL_ERROR_CODES.MISSING_RESPONSE.code,
				status: 400
			});
			const handlerParams = {
				siteVerifyURL: options.siteVerifyURLOverride || siteVerifyMap[options.provider],
				captchaResponse,
				secretKey: options.secretKey,
				remoteIP: remoteUserIP
			};
			if (options.provider === Providers.CLOUDFLARE_TURNSTILE) return await cloudflareTurnstile({
				...handlerParams,
				logger: ctx.logger,
				expectedAction: options.expectedAction,
				allowedHostnames: options.allowedHostnames
			});
			if (options.provider === Providers.GOOGLE_RECAPTCHA) return await googleRecaptcha({
				...handlerParams,
				minScore: options.minScore,
				expectedAction: options.expectedAction,
				allowedHostnames: options.allowedHostnames
			});
			if (options.provider === Providers.HCAPTCHA) return await hCaptcha({
				...handlerParams,
				siteKey: options.siteKey
			});
			if (options.provider === Providers.CAPTCHAFOX) return await captchaFox({
				...handlerParams,
				siteKey: options.siteKey
			});
		} catch (_error) {
			const errorMessage = _error instanceof Error ? _error.message : void 0;
			ctx.logger.error(errorMessage ?? "Unknown error", {
				endpoint: request.url,
				message: _error
			});
			return middlewareResponse({
				message: EXTERNAL_ERROR_CODES.UNKNOWN_ERROR.message,
				code: EXTERNAL_ERROR_CODES.UNKNOWN_ERROR.code,
				status: 500
			});
		}
	},
	options
});
//#endregion
export { captcha };
