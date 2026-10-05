import { Session, User } from "../types/models.mjs";
import { CookieAttributes, HOST_COOKIE_PREFIX, SECURE_COOKIE_PREFIX, applySetCookies, cookieNameRegex, parseCookies, parseSetCookieHeader, setCookieToHeader, setRequestCookie, splitSetCookieHeader, stripSecureCookiePrefix, toCookieOptions } from "./cookie-utils.mjs";
import { createSessionStore, getAccountCookie, getChunkedCookie, setAccountCookie } from "./session-store.mjs";
import { Awaitable, BetterAuthCookie, BetterAuthCookies, BetterAuthOptions, CookieCachePayload, GenericEndpointContext } from "@better-auth/core";
import * as _$better_call0 from "better-call";
import { CookieOptions } from "better-call";
import { JSONWebKeySet } from "jose";

//#region src/cookies/index.d.ts
declare function createCookieGetter(options: BetterAuthOptions): (cookieName: string, overrideAttributes?: Partial<CookieOptions>) => {
  name: string;
  attributes: {
    domain?: string;
    expires?: Date;
    httpOnly: boolean;
    maxAge?: number;
    path: string;
    secure: boolean;
    sameSite: "Strict" | "Lax" | "None" | "strict" | "lax" | "none";
    partitioned?: boolean;
    prefix?: _$better_call0.CookiePrefixOptions;
  };
};
declare function getCookies(options: BetterAuthOptions): {
  sessionToken: {
    name: string;
    attributes: {
      domain?: string;
      expires?: Date;
      httpOnly: boolean;
      maxAge?: number;
      path: string;
      secure: boolean;
      sameSite: "Strict" | "Lax" | "None" | "strict" | "lax" | "none";
      partitioned?: boolean;
      prefix?: _$better_call0.CookiePrefixOptions;
    };
  };
  /**
   * This cookie is used to store the session data in the cookie
   * This is useful for when you want to cache the session in the cookie
   */
  sessionData: {
    name: string;
    attributes: {
      domain?: string;
      expires?: Date;
      httpOnly: boolean;
      maxAge?: number;
      path: string;
      secure: boolean;
      sameSite: "Strict" | "Lax" | "None" | "strict" | "lax" | "none";
      partitioned?: boolean;
      prefix?: _$better_call0.CookiePrefixOptions;
    };
  };
  dontRememberToken: {
    name: string;
    attributes: {
      domain?: string;
      expires?: Date;
      httpOnly: boolean;
      maxAge?: number;
      path: string;
      secure: boolean;
      sameSite: "Strict" | "Lax" | "None" | "strict" | "lax" | "none";
      partitioned?: boolean;
      prefix?: _$better_call0.CookiePrefixOptions;
    };
  };
  accountData: {
    name: string;
    attributes: {
      domain?: string;
      expires?: Date;
      httpOnly: boolean;
      maxAge?: number;
      path: string;
      secure: boolean;
      sameSite: "Strict" | "Lax" | "None" | "strict" | "lax" | "none";
      partitioned?: boolean;
      prefix?: _$better_call0.CookiePrefixOptions;
    };
  };
};
declare function setCookieCache(ctx: GenericEndpointContext, session: {
  session: Session & Record<string, unknown>;
  user: User;
}, dontRememberMe: boolean): Promise<void>;
declare function decodeCookieCache(ctx: GenericEndpointContext, value: string): Promise<{
  session: CookieCachePayload;
  expiresAt: number;
} | null>;
declare function setSessionCookie(ctx: GenericEndpointContext, session: {
  session: Session & Record<string, unknown>;
  user: User;
}, dontRememberMe?: boolean | undefined, overrides?: Partial<CookieOptions> | undefined): Promise<void>;
/**
 * Expires a cookie by setting `maxAge: 0` while preserving its attributes
 */
declare function expireCookie(ctx: GenericEndpointContext, cookie: BetterAuthCookie): void;
declare function deleteSessionCookie(ctx: GenericEndpointContext, skipDontRememberMe?: boolean | undefined): void;
type EligibleCookies = (string & {}) | (keyof BetterAuthCookies & {});
declare const getSessionCookie: (request: Request | Headers, config?: {
  cookiePrefix?: string;
  cookieName?: string;
  path?: string;
} | undefined) => string | null;
type CookieCacheVersion = string | ((session: CookieCachePayload["session"], user: CookieCachePayload["user"]) => Awaitable<string>);
declare const getCookieCache: <S extends CookieCachePayload = CookieCachePayload>(request: Request | Headers, config?: {
  cookiePrefix?: string;
  cookieName?: string;
  isSecure?: boolean;
  secret?: string;
  strategy?: "compact" | "jwt" | "jwe";
  jwt?: {
    jwks?: JSONWebKeySet;
    issuer?: string;
    audience?: string;
  } | undefined;
  version?: CookieCacheVersion;
} | undefined) => Promise<S | null>;
//#endregion
export { CookieAttributes, EligibleCookies, HOST_COOKIE_PREFIX, SECURE_COOKIE_PREFIX, applySetCookies, cookieNameRegex, createCookieGetter, createSessionStore, decodeCookieCache, deleteSessionCookie, expireCookie, getAccountCookie, getChunkedCookie, getCookieCache, getCookies, getSessionCookie, parseCookies, parseSetCookieHeader, setAccountCookie, setCookieCache, setCookieToHeader, setRequestCookie, setSessionCookie, splitSetCookieHeader, stripSecureCookiePrefix, toCookieOptions };