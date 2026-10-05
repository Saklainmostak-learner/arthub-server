import { defineErrorCodes } from "@better-auth/core/utils/error-codes";
//#region src/plugins/generic-oauth/error-codes.ts
const GENERIC_OAUTH_ERROR_CODES = defineErrorCodes({
	INVALID_OAUTH_CONFIGURATION: "Invalid OAuth configuration",
	TOKEN_URL_NOT_FOUND: "Invalid OAuth configuration. Token URL not found."
});
//#endregion
export { GENERIC_OAUTH_ERROR_CODES };
