import { SessionQueryParams } from "../client/types.mjs";
import { Auth } from "../types/auth.mjs";
import { setCookieToHeader } from "../cookies/cookie-utils.mjs";
import { getTestInstance } from "./test-instance.mjs";
import * as _$_better_auth_core0 from "@better-auth/core";
import { BetterAuthClientOptions, BetterAuthOptions } from "@better-auth/core";
import * as _$_better_auth_core_db_adapter0 from "@better-auth/core/db/adapter";
import * as _$nanostores from "nanostores";
import * as _$_better_fetch_fetch0 from "@better-fetch/fetch";
import { IncomingMessage, ServerResponse, createServer } from "node:http";
import { AddressInfo } from "node:net";

//#region src/test-utils/http-test-instance.d.ts
/** A Node request handler that can be installed on an HTTP test listener. */
type HttpTestRequestHandler = (req: IncomingMessage, res: ServerResponse) => unknown | Promise<unknown>;
/** A bound HTTP test listener whose request handler can be installed later. */
type HttpTestServer = {
  url: string;
  address: AddressInfo;
  server: ReturnType<typeof createServer>;
  setRequestHandler: (handler: HttpTestRequestHandler) => void;
  close: () => Promise<void>;
};
type GetTestInstanceConfig = NonNullable<Parameters<typeof getTestInstance>[1]>;
type HttpTestInstanceConfig<C extends BetterAuthClientOptions> = Omit<GetTestInstanceConfig, "port" | "clientOptions"> & {
  clientOptions?: C;
  /**
   * Customizes the HTTP request listener. Receives the bound auth instance
   * and returns a Node request handler. Defaults to
   * `toNodeHandler(auth.handler)`.
   *
   * Use this when the test needs to expose extra routes alongside the auth
   * handler (e.g. a `.well-known/openid-configuration` shim that calls
   * `auth.api.getOpenIdConfig()`).
   */
  handler?: (auth: Awaited<ReturnType<typeof getTestInstance>>["auth"]) => HttpTestRequestHandler;
};
/**
 * Binds an HTTP listener to an OS-assigned port before the final request
 * handler exists. This lets tests construct URL-sensitive applications only
 * after the listener owns its port, then install the application handler.
 */
declare function createHttpTestServer(): Promise<HttpTestServer>;
/**
 * Like `getTestInstance`, but bound to an actual HTTP listener on an
 * OS-assigned port (`port: 0`). The discovered URL is fed back into the auth
 * instance so its `baseURL` matches the listener.
 *
 * This removes the race window that the temp-server-then-rebind pattern
 * introduces. The listener is bound once, holds the port for its lifetime,
 * and only swaps in the real request handler after the auth instance is
 * fully constructed.
 *
 * The caller is responsible for calling `server.close()` in `afterAll`. Any
 * `baseURL` passed in `options` is ignored — the URL must match the
 * listener.
 */
declare function getHttpTestInstance<O extends Partial<BetterAuthOptions>, C extends BetterAuthClientOptions>(options?: O, config?: HttpTestInstanceConfig<C>): Promise<{
  server: HttpTestServer;
  baseURL: string;
  port: number;
  auth: Auth<O>;
  client: {
    hydrateSession(session: null): void;
    useSession: _$nanostores.Atom<{
      data: never;
      error: _$_better_fetch_fetch0.BetterFetchError | null;
      isPending: boolean;
      isRefetching: boolean;
      refetch: (queryParams?: {
        query?: SessionQueryParams;
      } | undefined) => Promise<void>;
    }>;
    $fetch: _$_better_fetch_fetch0.BetterFetch<{
      plugins: (_$_better_fetch_fetch0.BetterFetchPlugin<Record<string, any>> | {
        id: string;
        name: string;
        hooks: {
          onSuccess(context: _$_better_fetch_fetch0.SuccessContext<any>): void;
        };
      } | {
        id: string;
        name: string;
        hooks: {
          onSuccess: ((context: _$_better_fetch_fetch0.SuccessContext<any>) => Promise<void> | void) | undefined;
          onError: ((context: _$_better_fetch_fetch0.ErrorContext) => Promise<void> | void) | undefined;
          onRequest: (<T extends Record<string, any>>(context: _$_better_fetch_fetch0.RequestContext<T>) => Promise<_$_better_fetch_fetch0.RequestContext | void> | _$_better_fetch_fetch0.RequestContext | void) | undefined;
          onResponse: ((context: _$_better_fetch_fetch0.ResponseContext) => Promise<Response | void | _$_better_fetch_fetch0.ResponseContext> | Response | _$_better_fetch_fetch0.ResponseContext | void) | undefined;
        };
      })[];
      cache?: RequestCache | undefined;
      credentials?: RequestCredentials;
      integrity?: string | undefined;
      keepalive?: boolean | undefined;
      method: string;
      mode?: RequestMode | undefined;
      priority?: RequestPriority | undefined;
      redirect?: RequestRedirect | undefined;
      referrer?: string | undefined;
      referrerPolicy?: ReferrerPolicy | undefined;
      signal?: AbortSignal | null;
      window?: null | undefined;
      onRetry?: ((response: _$_better_fetch_fetch0.ResponseContext) => Promise<void> | void) | undefined;
      hookOptions?: {
        cloneResponse?: boolean;
      } | undefined;
      timeout?: number | undefined;
      customFetchImpl: _$_better_fetch_fetch0.FetchEsque;
      baseURL: string;
      throw?: boolean | undefined;
      auth?: ({
        type: "Bearer";
        token: string | Promise<string | undefined> | (() => string | Promise<string | undefined> | undefined) | undefined;
      } | {
        type: "Basic";
        username: string | (() => string | undefined) | undefined;
        password: string | (() => string | undefined) | undefined;
      } | {
        type: "Custom";
        prefix: string | (() => string | undefined) | undefined;
        value: string | (() => string | undefined) | undefined;
      }) | undefined;
      headers?: {} | {
        [x: string]: string | undefined;
        accept?: ((string & {}) | "application/json" | "text/plain" | "application/octet-stream") | undefined;
        "content-type"?: ((string & {}) | "application/x-www-form-urlencoded" | "application/json" | "text/plain" | "application/octet-stream" | "multipart/form-data") | undefined;
        authorization?: ((string & {}) | `Bearer ${string}` | `Basic ${string}`) | undefined;
      } | undefined;
      body?: any;
      query?: any;
      params?: any;
      duplex?: "full" | "half" | undefined;
      jsonParser: (text: string) => Promise<any> | any;
      retry?: _$_better_fetch_fetch0.RetryOptions | undefined;
      retryAttempt?: number | undefined;
      output?: (_$_better_fetch_fetch0.StandardSchemaV1 | typeof Blob | typeof File) | undefined;
      errorSchema?: _$_better_fetch_fetch0.StandardSchemaV1 | undefined;
      disableValidation?: boolean | undefined;
      disableSignal?: boolean | undefined;
    }, unknown, unknown, {}>;
    $store: {
      notify: (signal?: (Omit<string, "$sessionSignal"> | "$sessionSignal") | undefined) => void;
      listen: (signal: Omit<string, "$sessionSignal"> | "$sessionSignal", listener: (value: boolean, oldValue?: boolean | undefined) => void) => void;
      atoms: Record<string, _$nanostores.WritableAtom<any>>;
    };
    $Infer: {
      Session: never;
    };
    $ERROR_CODES: {
      USER_NOT_FOUND: {
        readonly code: "USER_NOT_FOUND";
        message: string;
      };
      FAILED_TO_CREATE_USER: {
        readonly code: "FAILED_TO_CREATE_USER";
        message: string;
      };
      FAILED_TO_CREATE_SESSION: {
        readonly code: "FAILED_TO_CREATE_SESSION";
        message: string;
      };
      FAILED_TO_UPDATE_USER: {
        readonly code: "FAILED_TO_UPDATE_USER";
        message: string;
      };
      FAILED_TO_GET_SESSION: {
        readonly code: "FAILED_TO_GET_SESSION";
        message: string;
      };
      INVALID_PASSWORD: {
        readonly code: "INVALID_PASSWORD";
        message: string;
      };
      INVALID_EMAIL: {
        readonly code: "INVALID_EMAIL";
        message: string;
      };
      INVALID_EMAIL_OR_PASSWORD: {
        readonly code: "INVALID_EMAIL_OR_PASSWORD";
        message: string;
      };
      INVALID_USER: {
        readonly code: "INVALID_USER";
        message: string;
      };
      SOCIAL_ACCOUNT_ALREADY_LINKED: {
        readonly code: "SOCIAL_ACCOUNT_ALREADY_LINKED";
        message: string;
      };
      PROVIDER_NOT_FOUND: {
        readonly code: "PROVIDER_NOT_FOUND";
        message: string;
      };
      INVALID_TOKEN: {
        readonly code: "INVALID_TOKEN";
        message: string;
      };
      TOKEN_EXPIRED: {
        readonly code: "TOKEN_EXPIRED";
        message: string;
      };
      ID_TOKEN_NOT_SUPPORTED: {
        readonly code: "ID_TOKEN_NOT_SUPPORTED";
        message: string;
      };
      FAILED_TO_GET_USER_INFO: {
        readonly code: "FAILED_TO_GET_USER_INFO";
        message: string;
      };
      USER_EMAIL_NOT_FOUND: {
        readonly code: "USER_EMAIL_NOT_FOUND";
        message: string;
      };
      EMAIL_NOT_VERIFIED: {
        readonly code: "EMAIL_NOT_VERIFIED";
        message: string;
      };
      PASSWORD_TOO_SHORT: {
        readonly code: "PASSWORD_TOO_SHORT";
        message: string;
      };
      PASSWORD_TOO_LONG: {
        readonly code: "PASSWORD_TOO_LONG";
        message: string;
      };
      USER_ALREADY_EXISTS: {
        readonly code: "USER_ALREADY_EXISTS";
        message: string;
      };
      USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: {
        readonly code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL";
        message: string;
      };
      EMAIL_CAN_NOT_BE_UPDATED: {
        readonly code: "EMAIL_CAN_NOT_BE_UPDATED";
        message: string;
      };
      CHANGE_EMAIL_DISABLED: {
        readonly code: "CHANGE_EMAIL_DISABLED";
        message: string;
      };
      CREDENTIAL_ACCOUNT_NOT_FOUND: {
        readonly code: "CREDENTIAL_ACCOUNT_NOT_FOUND";
        message: string;
      };
      ACCOUNT_NOT_FOUND: {
        readonly code: "ACCOUNT_NOT_FOUND";
        message: string;
      };
      SESSION_EXPIRED: {
        readonly code: "SESSION_EXPIRED";
        message: string;
      };
      FAILED_TO_UNLINK_LAST_ACCOUNT: {
        readonly code: "FAILED_TO_UNLINK_LAST_ACCOUNT";
        message: string;
      };
      USER_ALREADY_HAS_PASSWORD: {
        readonly code: "USER_ALREADY_HAS_PASSWORD";
        message: string;
      };
      CROSS_SITE_NAVIGATION_LOGIN_BLOCKED: {
        readonly code: "CROSS_SITE_NAVIGATION_LOGIN_BLOCKED";
        message: string;
      };
      VERIFICATION_EMAIL_NOT_ENABLED: {
        readonly code: "VERIFICATION_EMAIL_NOT_ENABLED";
        message: string;
      };
      EMAIL_ALREADY_VERIFIED: {
        readonly code: "EMAIL_ALREADY_VERIFIED";
        message: string;
      };
      EMAIL_MISMATCH: {
        readonly code: "EMAIL_MISMATCH";
        message: string;
      };
      SESSION_NOT_FRESH: {
        readonly code: "SESSION_NOT_FRESH";
        message: string;
      };
      LINKED_ACCOUNT_ALREADY_EXISTS: {
        readonly code: "LINKED_ACCOUNT_ALREADY_EXISTS";
        message: string;
      };
      INVALID_ORIGIN: {
        readonly code: "INVALID_ORIGIN";
        message: string;
      };
      INVALID_CALLBACK_URL: {
        readonly code: "INVALID_CALLBACK_URL";
        message: string;
      };
      INVALID_REDIRECT_URL: {
        readonly code: "INVALID_REDIRECT_URL";
        message: string;
      };
      INVALID_ERROR_CALLBACK_URL: {
        readonly code: "INVALID_ERROR_CALLBACK_URL";
        message: string;
      };
      INVALID_NEW_USER_CALLBACK_URL: {
        readonly code: "INVALID_NEW_USER_CALLBACK_URL";
        message: string;
      };
      MISSING_OR_NULL_ORIGIN: {
        readonly code: "MISSING_OR_NULL_ORIGIN";
        message: string;
      };
      CALLBACK_URL_REQUIRED: {
        readonly code: "CALLBACK_URL_REQUIRED";
        message: string;
      };
      FAILED_TO_CREATE_VERIFICATION: {
        readonly code: "FAILED_TO_CREATE_VERIFICATION";
        message: string;
      };
      FIELD_NOT_ALLOWED: {
        readonly code: "FIELD_NOT_ALLOWED";
        message: string;
      };
      ASYNC_VALIDATION_NOT_SUPPORTED: {
        readonly code: "ASYNC_VALIDATION_NOT_SUPPORTED";
        message: string;
      };
      VALIDATION_ERROR: {
        readonly code: "VALIDATION_ERROR";
        message: string;
      };
      MISSING_FIELD: {
        readonly code: "MISSING_FIELD";
        message: string;
      };
      METHOD_NOT_ALLOWED_DEFER_SESSION_REQUIRED: {
        readonly code: "METHOD_NOT_ALLOWED_DEFER_SESSION_REQUIRED";
        message: string;
      };
      BODY_MUST_BE_AN_OBJECT: {
        readonly code: "BODY_MUST_BE_AN_OBJECT";
        message: string;
      };
      PASSWORD_ALREADY_SET: {
        readonly code: "PASSWORD_ALREADY_SET";
        message: string;
      };
    };
  };
  testUser: {
    id?: string | undefined;
    createdAt?: Date | undefined;
    updatedAt?: Date | undefined;
    email: string;
    emailVerified?: boolean | undefined;
    name: string;
    image?: string | null | undefined;
    password: string;
  };
  signInWithTestUser: () => Promise<{
    session: {
      id: string;
      createdAt: Date;
      updatedAt: Date;
      userId: string;
      expiresAt: Date;
      token: string;
      ipAddress?: string | null | undefined;
      userAgent?: string | null | undefined;
    };
    user: {
      id: string;
      createdAt: Date;
      updatedAt: Date;
      email: string;
      emailVerified: boolean;
      name: string;
      image?: string | null | undefined;
    };
    headers: Headers;
    setCookie: (name: string, value: string) => void;
    runWithUser: (fn: (headers: Headers) => Promise<void>) => Promise<void>;
  }>;
  signInWithUser: (email: string, password: string) => Promise<{
    res: {
      user: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        emailVerified: boolean;
        name: string;
        image?: string | null | undefined;
      };
      session: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        expiresAt: Date;
        token: string;
        ipAddress?: string | null | undefined;
        userAgent?: string | null | undefined;
      };
    };
    headers: Headers;
  }>;
  cookieSetter: typeof setCookieToHeader;
  customFetchImpl: (url: string | URL | Request, init?: RequestInit | undefined) => Promise<Response>;
  sessionSetter: (headers: Headers) => (context: _$_better_fetch_fetch0.SuccessContext) => void;
  db: _$_better_auth_core_db_adapter0.DBAdapter<BetterAuthOptions>;
  runWithUser: (email: string, password: string, fn: (headers: Headers) => _$_better_auth_core0.Awaitable<void>) => Promise<void>;
}>;
//#endregion
export { HttpTestInstanceConfig, HttpTestRequestHandler, HttpTestServer, createHttpTestServer, getHttpTestInstance };