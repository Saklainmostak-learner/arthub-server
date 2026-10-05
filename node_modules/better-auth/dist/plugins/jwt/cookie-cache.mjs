import { SESSION_COOKIE_JWT_AUDIENCE, SESSION_COOKIE_JWT_TYPE, getSessionCookieJwtVerifyOptions, parseSessionCookieJwtPayload } from "../../cookies/jwt.mjs";
import { getJwksAdapter } from "./adapter.mjs";
import { resolveSigningKey } from "./sign.mjs";
import { BetterAuthError } from "@better-auth/core/error";
import { SignJWT, decodeProtectedHeader, importJWK, jwtVerify } from "jose";
//#region src/plugins/jwt/cookie-cache.ts
function getCookieCacheJwtIssuer(ctx) {
	const baseURL = ctx.context.options.baseURL;
	return typeof baseURL === "string" ? baseURL || "better-auth:session-cache" : ctx.context.baseURL || "better-auth:session-cache";
}
async function importLocalPublicKey(ctx, token, options) {
	const header = decodeProtectedHeader(token);
	const kid = header.kid;
	if (!kid) {
		ctx.context.logger.debug("Cookie-cache JWT missing kid in header");
		return null;
	}
	const keys = await getJwksAdapter(ctx.context.adapter, options).getAllKeys(ctx);
	if (!keys?.length) {
		ctx.context.logger.debug("No JWKS keys available for cookie-cache JWT");
		return null;
	}
	const key = keys.find((entry) => entry.id === kid);
	if (!key) {
		ctx.context.logger.debug(`No JWKS key found for cookie-cache JWT kid: ${kid}`);
		return null;
	}
	const alg = key.alg ?? options?.jwks?.keyPairConfig?.alg ?? header.alg;
	if (!alg) {
		ctx.context.logger.debug(`No JWT algorithm available for cookie-cache JWT kid: ${kid}`);
		return null;
	}
	return {
		alg,
		publicKey: await importJWK(JSON.parse(key.publicKey), alg)
	};
}
async function signCookieCacheJWT(ctx, payload, expiresIn, options) {
	const resolvedKey = await resolveSigningKey(ctx, options);
	if (!resolvedKey) throw new BetterAuthError("`jwt({ sessionCookieCache: true })` requires locally managed JWT plugin keys and does not support `jwt.sign`.");
	return await new SignJWT({
		...payload,
		sid: payload.session.token
	}).setProtectedHeader({
		alg: resolvedKey.alg,
		kid: resolvedKey.kid,
		typ: SESSION_COOKIE_JWT_TYPE
	}).setIssuedAt().setExpirationTime(Math.floor(Date.now() / 1e3) + expiresIn).setIssuer(getCookieCacheJwtIssuer(ctx)).setAudience(SESSION_COOKIE_JWT_AUDIENCE).setSubject(payload.user.id).sign(resolvedKey.privateKey);
}
async function verifyCookieCacheJWT(ctx, token, options) {
	try {
		if (decodeProtectedHeader(token).typ !== "better-auth.session-cache+jwt") return null;
		const key = await importLocalPublicKey(ctx, token, options);
		if (!key) return null;
		const { payload } = await jwtVerify(token, key.publicKey, {
			...getSessionCookieJwtVerifyOptions({ issuer: getCookieCacheJwtIssuer(ctx) }),
			algorithms: [key.alg]
		});
		const parsed = parseSessionCookieJwtPayload(payload);
		if (!parsed) return null;
		return {
			payload: parsed,
			expiresAt: parsed.exp ? parsed.exp * 1e3 : Date.now()
		};
	} catch (error) {
		ctx.context.logger.debug("Cookie-cache JWT verification failed", error);
		return null;
	}
}
function createCookieCacheSigner(options) {
	return {
		sign: (ctx, payload, expiresIn) => signCookieCacheJWT(ctx, payload, expiresIn, options),
		verify: (ctx, token) => verifyCookieCacheJWT(ctx, token, options)
	};
}
//#endregion
export { createCookieCacheSigner };
