import { sessionSchema, userSchema } from "@better-auth/core/db";
import { logger } from "@better-auth/core/env";
import { safeJSONParse } from "@better-auth/core/utils/json";
import * as z from "zod";
//#region src/cookies/cache.ts
const cookieCachePayloadSchema = z.looseObject({
	session: sessionSchema.loose(),
	user: userSchema.loose(),
	updatedAt: z.number(),
	version: z.string().optional()
});
const compactCookieCacheSchema = z.object({
	session: z.record(z.string(), z.unknown()),
	expiresAt: z.number(),
	signature: z.string()
});
function parseCookieCachePayload(value) {
	const parsed = safeJSONParse(value);
	if (parsed === null) return null;
	const result = cookieCachePayloadSchema.safeParse(parsed);
	if (result.success) return result.data;
	logger.warn("Cookie cache payload failed schema validation", { issues: result.error.issues.map(({ code, path }) => ({
		code,
		path
	})) });
	return null;
}
function parseCompactCookieCache(value) {
	const result = compactCookieCacheSchema.safeParse(value);
	return result.success ? result.data : null;
}
//#endregion
export { parseCompactCookieCache, parseCookieCachePayload };
