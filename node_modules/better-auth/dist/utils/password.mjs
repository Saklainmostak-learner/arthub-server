import { APIError, BASE_ERROR_CODES } from "@better-auth/core/error";
//#region src/utils/password.ts
function assertPasswordNotTooShort(ctx, password) {
	if (password.length < ctx.context.password.config.minPasswordLength) {
		ctx.context.logger.warn("Password is too short");
		throw APIError.from("BAD_REQUEST", BASE_ERROR_CODES.PASSWORD_TOO_SHORT);
	}
}
function assertPasswordNotTooLong(ctx, password) {
	if (password.length > ctx.context.password.config.maxPasswordLength) {
		ctx.context.logger.warn("Password is too long");
		throw APIError.from("BAD_REQUEST", BASE_ERROR_CODES.PASSWORD_TOO_LONG);
	}
}
async function validatePassword(ctx, data) {
	assertPasswordNotTooLong(ctx, data.password);
	const credentialAccount = await ctx.context.internalAdapter.findCredentialAccount(data.userId);
	const currentPassword = credentialAccount?.password;
	if (!credentialAccount || !currentPassword) return false;
	return await ctx.context.password.verify({
		hash: currentPassword,
		password: data.password
	});
}
async function checkPassword(userId, c) {
	const password = c.body.password;
	if (typeof password === "string") assertPasswordNotTooLong(c, password);
	const credentialAccount = await c.context.internalAdapter.findCredentialAccount(userId);
	const currentPassword = credentialAccount?.password;
	if (!credentialAccount || !currentPassword || !password) {
		if (password) await c.context.password.hash(password);
		throw APIError.from("BAD_REQUEST", BASE_ERROR_CODES.INVALID_PASSWORD);
	}
	if (!await c.context.password.verify({
		hash: currentPassword,
		password
	})) throw APIError.from("BAD_REQUEST", BASE_ERROR_CODES.INVALID_PASSWORD);
	return true;
}
async function shouldRequirePassword(ctx, userId, allowPasswordless) {
	if (!allowPasswordless) return true;
	const credentialAccount = await ctx.context.internalAdapter.findCredentialAccount(userId);
	return Boolean(credentialAccount?.password);
}
//#endregion
export { assertPasswordNotTooLong, assertPasswordNotTooShort, checkPassword, shouldRequirePassword, validatePassword };
