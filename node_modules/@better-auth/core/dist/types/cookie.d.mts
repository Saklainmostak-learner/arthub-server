import { Session } from "../db/schema/session.mjs";
import { User } from "../db/schema/user.mjs";
import { CookieOptions } from "better-call";

//#region src/types/cookie.d.ts
type BetterAuthCookie = {
  name: string;
  attributes: CookieOptions;
};
type BetterAuthCookies = {
  sessionToken: BetterAuthCookie;
  sessionData: BetterAuthCookie;
  accountData: BetterAuthCookie;
  dontRememberToken: BetterAuthCookie;
};
/**
 * A validated cookie-cache payload, including legacy payloads without a version.
 */
type CookieCachePayload = {
  session: Session & Record<string, unknown>;
  user: User & Record<string, unknown>;
  updatedAt: number;
  version?: string | undefined;
};
//#endregion
export { BetterAuthCookie, BetterAuthCookies, CookieCachePayload };