import { GenericEndpointContext } from "../types/context.mjs";
import { OAuthProvider } from "./oauth-provider.mjs";

//#region src/oauth2/verify-id-token.d.ts
type ProviderWithIdTokenConfig = Pick<OAuthProvider, "idToken" | "options">;
/**
 * Whether a provider can verify a client-submitted id_token.
 *
 * A provider supports id_token sign-in when it declares an {@link OAuthProvider.idToken}
 * verification config, or when the integrator supplies a `verifyIdToken` override on the
 * provider options. A provider whose options set `disableIdTokenSignIn`, or that declares
 * neither, rejects the client id_token sign-in path with `ID_TOKEN_NOT_SUPPORTED`.
 */
declare function supportsIdTokenSignIn(provider: ProviderWithIdTokenConfig): boolean;
/**
 * Verify a client-submitted id_token against a provider's verification config.
 *
 * This is the single id_token verifier for every social provider. Providers no longer
 * implement their own boolean `verifyIdToken`; they declare an {@link OAuthProvider.idToken}
 * config and this function performs the cryptographic check. The contract is fail-closed: a
 * provider without a config (and without an integrator `verifyIdToken` override) returns
 * `false`, so a forged token can never be accepted by omission.
 *
 * @returns `true` only when the token is authentic for the provider.
 */
declare function verifyProviderIdToken(provider: ProviderWithIdTokenConfig, token: string, nonce?: string, ctx?: GenericEndpointContext): Promise<boolean>;
//#endregion
export { supportsIdTokenSignIn, verifyProviderIdToken };