import { coreSchema } from "./shared.mjs";
import * as z from "zod";
//#region src/db/schema/account.ts
const accountSchema = coreSchema.extend({
	providerId: z.string(),
	accountId: z.string(),
	userId: z.coerce.string(),
	accessToken: z.string().nullish(),
	refreshToken: z.string().nullish(),
	idToken: z.string().nullish(),
	/**
	* Access token expires at
	*/
	accessTokenExpiresAt: z.date().nullish(),
	/**
	* Refresh token expires at
	*/
	refreshTokenExpiresAt: z.date().nullish(),
	/**
	* The set of OAuth scopes the user has granted to this account, stored
	* as a comma-separated list. Represents the accumulated grant rather
	* than the latest token's `scope` claim, since per RFC 6749 Section 1.5 a
	* token's scope may be narrower than the user's grant.
	*/
	scope: z.string().nullish(),
	/**
	* Password is only stored in the credential provider
	*/
	password: z.string().nullish()
});
//#endregion
export { accountSchema };
