import { APIError, BASE_ERROR_CODES, BetterAuthError } from "@better-auth/core/error";
//#region src/oauth2/account-key.ts
/**
* Exposes a provider-declared profile as the raw claim record used by
* provisioning hooks. Provider profile interfaces are object-shaped but do
* not need an index signature solely to satisfy this erased boundary.
*/
function toOAuthProfileRecord(profile) {
	return profile;
}
/**
* Resolves the stable account key established by an OAuth provider response.
*/
async function resolveOAuthAccountKey(provider, tokens, profile) {
	const accountKeyContext = {
		tokens,
		profile
	};
	const accountSubject = provider.accountSubject;
	const resolvedSubject = await accountSubject(accountKeyContext);
	const accountId = String(resolvedSubject);
	if (typeof resolvedSubject === "number" && !Number.isFinite(resolvedSubject) || accountId.trim().length === 0 || accountId === "undefined" || accountId === "null") throw new BetterAuthError("OAUTH_ACCOUNT_SUBJECT_INVALID");
	return {
		providerId: provider.id,
		accountId
	};
}
/**
* Resolves an OAuth account key at a direct HTTP authentication boundary.
*
* Provider resolvers are application code and can reject or return malformed
* values. Direct sign-in and linking expose all such failures as one stable
* authentication error instead of leaking implementation details or a 500.
*/
async function resolveOAuthAccountKeyForAPI(provider, tokens, profile) {
	try {
		return await resolveOAuthAccountKey(provider, tokens, profile);
	} catch {
		throw APIError.from("UNAUTHORIZED", BASE_ERROR_CODES.FAILED_TO_GET_USER_INFO);
	}
}
//#endregion
export { resolveOAuthAccountKey, resolveOAuthAccountKeyForAPI, toOAuthProfileRecord };
