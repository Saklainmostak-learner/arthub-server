import * as z from "zod";

//#region src/oauth2/authorization-params.d.ts
/**
 * Zod schema for the `additionalParams` field on social sign-in and
 * account-linking request bodies. Rejects any key reserved by the
 * authorization-URL builder (see `RESERVED_AUTHORIZATION_PARAMS`), so
 * a caller cannot overwrite `state`, PKCE, `redirect_uri`, etc.
 */
declare const additionalAuthorizationParamsSchema: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
//#endregion
export { additionalAuthorizationParamsSchema };