import { createCookieHeaders, createTestCookie } from "./cookie-builder.mjs";
import { sessionSchema } from "@better-auth/core/db";
//#region src/plugins/test-utils/auth-helpers.ts
function createSession(ctx, opts) {
	const additionalFields = Object.fromEntries(Object.entries(opts.session ?? {}).filter(([key]) => !Object.hasOwn(sessionSchema.shape, key)));
	return ctx.internalAdapter.createSession(opts.userId, false, additionalFields, true);
}
function createLogin(ctx) {
	return async (opts) => {
		const user = await ctx.internalAdapter.findUserById(opts.userId);
		if (!user) throw new Error(`User not found: ${opts.userId}`);
		const session = await createSession(ctx, opts);
		return {
			session,
			user,
			headers: await createCookieHeaders(ctx, session.token),
			cookies: await createTestCookie(ctx, session.token),
			token: session.token
		};
	};
}
function createGetAuthHeaders(ctx) {
	return async (opts) => {
		return createCookieHeaders(ctx, (await createSession(ctx, opts)).token);
	};
}
function createGetCookies(ctx) {
	return async (opts) => {
		return createTestCookie(ctx, (await createSession(ctx, opts)).token, opts.domain);
	};
}
//#endregion
export { createGetAuthHeaders, createGetCookies, createLogin };
