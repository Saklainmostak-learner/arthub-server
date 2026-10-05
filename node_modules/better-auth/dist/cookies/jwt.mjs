import { parseCookieCachePayload } from "./cache.mjs";
import { decodeProtectedHeader, importJWK, jwtVerify } from "jose";
//#region src/cookies/jwt.ts
const SESSION_COOKIE_JWT_TYPE = "better-auth.session-cache+jwt";
const SESSION_COOKIE_JWT_AUDIENCE = "better-auth:session-cache";
const SESSION_COOKIE_JWT_ISSUER = "better-auth:session-cache";
function getSessionCookieJwtVerifyOptions(options) {
	const verifyOptions = {
		clockTolerance: 15,
		audience: options?.audience ?? "better-auth:session-cache"
	};
	if (options?.issuer) verifyOptions.issuer = options.issuer;
	return verifyOptions;
}
function parseSessionCookieJwtPayload(payload) {
	const data = parseCookieCachePayload(payload);
	if (!data || typeof payload.iss !== "string" || !payload.iss) return null;
	if (payload.sub !== data.user.id || payload.sid !== data.session.token) return null;
	return {
		...payload,
		...data
	};
}
async function verifySessionCookieJwtWithJwks(token, jwks, options) {
	try {
		const header = decodeProtectedHeader(token);
		if (header.typ !== "better-auth.session-cache+jwt") return null;
		const kid = header.kid;
		if (!kid) return null;
		const key = jwks.keys.find((entry) => entry.kid === kid);
		if (!key) return null;
		const alg = key.alg ?? header.alg;
		if (!alg) return null;
		const { payload } = await jwtVerify(token, await importJWK(key, alg), {
			...getSessionCookieJwtVerifyOptions(options),
			algorithms: [alg]
		});
		return parseSessionCookieJwtPayload(payload);
	} catch {
		return null;
	}
}
//#endregion
export { SESSION_COOKIE_JWT_AUDIENCE, SESSION_COOKIE_JWT_ISSUER, SESSION_COOKIE_JWT_TYPE, getSessionCookieJwtVerifyOptions, parseSessionCookieJwtPayload, verifySessionCookieJwtWithJwks };
