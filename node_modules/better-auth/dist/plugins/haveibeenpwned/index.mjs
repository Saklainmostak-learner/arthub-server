import { isAPIError } from "../../utils/is-api-error.mjs";
import { APIError } from "../../api/index.mjs";
import { PACKAGE_VERSION } from "../../version.mjs";
import { getCurrentAuthEndpointContext } from "@better-auth/core/context";
import { defineErrorCodes } from "@better-auth/core/utils/error-codes";
import { createHash } from "@better-auth/utils/hash";
import { betterFetch } from "@better-fetch/fetch";
//#region src/plugins/haveibeenpwned/index.ts
const ERROR_CODES = defineErrorCodes({ PASSWORD_COMPROMISED: "The password you entered has been compromised. Please choose a different password." });
function getPasswordCompromiseCount(response, hashSuffix) {
	const matchingEntryPrefix = `${hashSuffix.toUpperCase()}:`;
	for (const line of response.split(/\r?\n/)) {
		if (line.slice(0, matchingEntryPrefix.length).toUpperCase() !== matchingEntryPrefix) continue;
		const compromiseCountText = line.slice(matchingEntryPrefix.length);
		const compromiseCount = Number(compromiseCountText);
		if (!(Number.isSafeInteger(compromiseCount) && compromiseCount >= 0 && String(compromiseCount) === compromiseCountText)) throw new Error("Invalid password compromise count");
		return compromiseCount;
	}
	return 0;
}
/**
* Checks whether a password appears in the Have I Been Pwned password corpus.
* Only the first five characters of its SHA-1 hash are sent to the service.
*
* @returns Whether the password has been compromised.
* @throws {APIError} When the password could not be checked.
*/
async function isPasswordCompromised(password) {
	try {
		const sha1Hash = (await createHash("SHA-1", "hex").digest(password)).toUpperCase();
		const prefix = sha1Hash.substring(0, 5);
		const suffix = sha1Hash.substring(5);
		const { data, error } = await betterFetch(`https://api.pwnedpasswords.com/range/${prefix}`, { headers: {
			"Add-Padding": "true",
			"User-Agent": "BetterAuth Password Checker"
		} });
		if (error) throw new APIError("INTERNAL_SERVER_ERROR", { message: `Failed to check password. Status: ${error.status}` });
		return getPasswordCompromiseCount(data, suffix) > 0;
	} catch (error) {
		if (isAPIError(error)) throw error;
		throw new APIError("INTERNAL_SERVER_ERROR", { message: "Failed to check password. Please try again later." });
	}
}
async function rejectCompromisedPassword(password, customMessage) {
	if (await isPasswordCompromised(password)) throw APIError.from("BAD_REQUEST", {
		message: customMessage || ERROR_CODES.PASSWORD_COMPROMISED.message,
		code: ERROR_CODES.PASSWORD_COMPROMISED.code
	});
}
const haveIBeenPwned = (options) => {
	const paths = options?.paths || [
		"/sign-up/email",
		"/change-password",
		"/reset-password",
		"/email-otp/reset-password",
		"/phone-number/reset-password",
		"/admin/create-user",
		"/admin/set-user-password"
	];
	return {
		id: "have-i-been-pwned",
		version: PACKAGE_VERSION,
		init(ctx) {
			const originalHash = ctx.password.hash;
			return { context: { password: {
				...ctx.password,
				async hash(password) {
					if (options?.enabled === false) return originalHash(password);
					const c = getCurrentAuthEndpointContext();
					if (!c.path || !paths.includes(c.path)) return originalHash(password);
					await rejectCompromisedPassword(password, options?.customPasswordCompromisedMessage);
					return originalHash(password);
				}
			} } };
		},
		options,
		$ERROR_CODES: ERROR_CODES
	};
};
//#endregion
export { haveIBeenPwned, isPasswordCompromised };
