import { GenericEndpointContext } from "@better-auth/core";

//#region src/oauth2/state.d.ts
/**
 * Mint the OIDC `nonce` for the redirect flow, or `undefined` when the provider
 * does not require ID-token nonce binding. Every redirect entrypoint (social
 * sign-in, account linking, IDP-initiated bounce, and the OAuth popup) mints
 * through this helper, so the value sent on the authorization URL and the value
 * persisted in state are produced one way and cannot drift apart.
 */
declare function generateIdTokenNonce(provider: {
  requiresIdTokenNonce?: boolean | undefined;
}): string | undefined;
/**
 * Inputs for {@link generateState}. Grouped into one object so call sites read
 * by name instead of by position.
 */
interface GenerateStateOptions {
  /** Link target when this flow links a provider identity to an existing user. */
  link?: {
    email: string;
    userId: string;
  } | undefined;
  /** Extra data to round-trip through state; `false` writes none. */
  additionalData?: Record<string, any> | false | undefined;
  /** The `state` nonce already used to build the authorization URL. Minted when omitted. */
  state?: string | undefined;
  /** The PKCE `codeVerifier` already used to build the authorization URL. Minted when omitted. */
  codeVerifier?: string | undefined;
  /** The OIDC nonce already sent as the authorization URL `nonce` parameter. */
  idTokenNonce?: string | undefined;
}
declare function generateState(c: GenericEndpointContext, options?: GenerateStateOptions): Promise<{
  state: string;
  codeVerifier: string;
}>;
declare function parseState(c: GenericEndpointContext): Promise<{
  [x: string]: unknown;
  callbackURL: string;
  codeVerifier: string;
  expiresAt: number;
  errorURL?: string | undefined;
  newUserURL?: string | undefined;
  oauthState?: string | undefined;
  link?: {
    email: string;
    userId: string;
  } | undefined;
  requestSignUp?: boolean | undefined;
  idTokenNonce?: string | undefined;
  serverContext?: Record<string, unknown> | undefined;
}>;
//#endregion
export { GenerateStateOptions, generateIdTokenNonce, generateState, parseState };