import { AwaitableFunction } from "../types/helper.mjs";
import { ProviderOptions } from "./oauth-provider.mjs";
//#region src/oauth2/create-authorization-url.d.ts
/**
 * Query-parameter names that are populated by the framework as part of the
 * authorization request and must not be overridden by caller-supplied
 * `additionalParams`. Overriding `state`, PKCE, or `redirect_uri` would
 * break the callback correlation and session pinning guarantees.
 */
declare const RESERVED_AUTHORIZATION_PARAMS: readonly ["state", "client_id", "redirect_uri", "response_type", "code_challenge", "code_challenge_method", "nonce", "scope"];
declare const RESERVED_AUTHORIZATION_PARAMS_SET: ReadonlySet<string>;
declare function createAuthorizationURL({
  id,
  options,
  authorizationEndpoint,
  state,
  codeVerifier,
  scopes,
  claims,
  redirectURI,
  duration,
  prompt,
  accessType,
  responseType,
  display,
  loginHint,
  nonce,
  hd,
  responseMode,
  additionalParams,
  scopeJoiner
}: {
  id: string;
  options: AwaitableFunction<ProviderOptions>;
  redirectURI: string;
  authorizationEndpoint: string;
  state: string;
  codeVerifier?: string | undefined;
  scopes?: string[] | undefined;
  claims?: string[] | undefined;
  duration?: string | undefined;
  prompt?: string | undefined;
  accessType?: string | undefined;
  responseType?: string | undefined;
  display?: string | undefined;
  loginHint?: string | undefined;
  nonce?: string | undefined;
  hd?: string | undefined;
  responseMode?: string | undefined;
  additionalParams?: Record<string, string> | undefined;
  scopeJoiner?: string | undefined;
}): Promise<URL>;
//#endregion
export { RESERVED_AUTHORIZATION_PARAMS, RESERVED_AUTHORIZATION_PARAMS_SET, createAuthorizationURL };