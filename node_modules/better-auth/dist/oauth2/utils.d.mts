import { AuthContext, LiteralString } from "@better-auth/core";

//#region src/oauth2/utils.d.ts
declare function decryptOAuthToken(token: string, ctx: AuthContext): string | Promise<string>;
declare function setTokenUtil(token: string | null | undefined, ctx: AuthContext): string | Promise<string> | null | undefined;
declare function getOAuthCallbackPath(provider: {
  id: LiteralString;
  callbackPath?: string | undefined;
}): string;
//#endregion
export { decryptOAuthToken, getOAuthCallbackPath, setTokenUtil };