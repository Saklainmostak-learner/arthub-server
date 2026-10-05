import { OAuth2Tokens, OAuth2UserInfo, OAuthAccountKeyContext, ProviderOptions } from "../oauth2/oauth-provider.mjs";
import * as _$jose from "jose";
import { JWTPayload } from "jose";

//#region src/social-providers/google.d.ts
interface GoogleProfile {
  aud: string;
  azp: string;
  email: string;
  email_verified: boolean;
  exp: number;
  /**
   * The family name of the user, or last name in most
   * Western languages.
   */
  family_name: string;
  /**
   * The given name of the user, or first name in most
   * Western languages.
   */
  given_name: string;
  hd?: string | undefined;
  iat: number;
  iss: string;
  jti?: string | undefined;
  locale?: string | undefined;
  name: string;
  nbf?: number | undefined;
  picture: string;
  sub: string;
}
interface GoogleOptions extends ProviderOptions<GoogleProfile> {
  clientId: string | string[];
  /**
   * The access type to use for the authorization code request
   */
  accessType?: ("offline" | "online") | undefined;
  /**
   * The display mode to use for the authorization code request
   */
  display?: ("page" | "popup" | "touch" | "wap") | undefined;
  /**
   * The hosted domain (Google Workspace) the user must belong to.
   *
   * This is sent to Google as the `hd` authorization hint and, when set, is
   * also enforced against the `hd` claim of the returned id token/profile.
   * Set `hd: "*"` to require any Workspace hosted-domain claim. Sign-in is
   * rejected when the claim is missing or does not satisfy this restriction.
   */
  hd?: string | undefined;
  /**
   * Whether to send `include_granted_scopes=true` to Google's authorization
   * endpoint, which lets new access tokens cover scopes from prior grants
   * in addition to the ones requested for this flow. Set to `false` when
   * each OAuth flow should request only its own scopes.
   *
   * Defaults to `true`.
   *
   * @see https://developers.google.com/identity/protocols/oauth2/web-server#incrementalAuth
   */
  includeGrantedScopes?: boolean | undefined;
}
interface VerifyGoogleIdTokenOptions {
  token: string;
  audience: string | string[];
  nonce?: string | undefined;
}
/**
 * Verifies a Google ID token against Google's issuer, audience, signature,
 * expiry, and maximum token age.
 */
declare const verifyGoogleIdToken: ({
  token,
  audience,
  nonce
}: VerifyGoogleIdTokenOptions) => Promise<JWTPayload | null>;
/**
 * Checks whether Google's verified `hd` claim satisfies the configured hosted
 * domain restriction. `hd: "*"` accepts any Google Workspace hosted domain.
 */
declare const isGoogleHostedDomainAllowed: (configuredHostedDomain: string | undefined, tokenHostedDomain: unknown) => boolean;
declare const google: (options: GoogleOptions) => {
  id: "google";
  name: string;
  accountSubject: ({
    profile
  }: OAuthAccountKeyContext<GoogleProfile>) => string;
  createAuthorizationURL({
    state,
    scopes,
    codeVerifier,
    redirectURI,
    loginHint,
    display,
    additionalParams
  }: {
    state: string;
    codeVerifier: string;
    scopes?: string[] | undefined;
    redirectURI: string;
    display?: string | undefined;
    loginHint?: string | undefined;
    idTokenNonce?: string | undefined;
    additionalParams?: Record<string, string> | undefined;
  }): Promise<URL>;
  validateAuthorizationCode: ({
    code,
    codeVerifier,
    redirectURI
  }: {
    code: string;
    redirectURI: string;
    codeVerifier?: string | undefined;
    deviceId?: string | undefined;
  }) => Promise<OAuth2Tokens>;
  refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
  idToken: {
    jwks: (header: _$jose.JWTHeaderParameters) => Promise<Uint8Array<ArrayBufferLike> | CryptoKey>;
    issuer: string[];
    audience: string | string[];
    maxTokenAge: string;
    verifyClaims: ((claims: Record<string, unknown>) => boolean) | undefined;
  };
  getUserInfo(token: OAuth2Tokens & {
    expectedIdTokenNonce?: string | undefined;
    user?: {
      name?: {
        firstName?: string;
        lastName?: string;
      };
      email?: string;
    } | undefined;
  }): Promise<{
    user: OAuth2UserInfo & Record<string, unknown>;
    data: GoogleProfile;
  } | null>;
  options: GoogleOptions;
};
declare const getGooglePublicKey: (kid: string) => Promise<Uint8Array<ArrayBufferLike> | CryptoKey>;
//#endregion
export { GoogleOptions, GoogleProfile, VerifyGoogleIdTokenOptions, getGooglePublicKey, google, isGoogleHostedDomainAllowed, verifyGoogleIdToken };