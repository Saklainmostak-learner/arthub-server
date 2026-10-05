import { OAuth2Tokens, OAuth2UserInfo, OAuthAccountKeyContext, ProviderOptions } from "../oauth2/oauth-provider.mjs";
import * as _$jose from "jose";

//#region src/social-providers/cognito.d.ts
interface CognitoProfile {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  given_name?: string | undefined;
  family_name?: string | undefined;
  picture?: string | undefined;
  username?: string | undefined;
  locale?: string | undefined;
  phone_number?: string | undefined;
  phone_number_verified?: boolean | undefined;
  aud: string;
  iss: string;
  exp: number;
  iat: number;
  [key: string]: any;
}
interface CognitoOptions extends ProviderOptions<CognitoProfile> {
  clientId: string | string[];
  /**
   * The Cognito domain (e.g., "your-app.auth.us-east-1.amazoncognito.com")
   */
  domain: string;
  /**
   * AWS region where User Pool is hosted (e.g., "us-east-1")
   */
  region: string;
  userPoolId: string;
  requireClientSecret?: boolean | undefined;
  /**
   * Skip the Cognito hosted-UI identity-provider picker by preselecting an
   * IdP (maps to the `identity_provider` query parameter on the authorize
   * request). Accepts `"COGNITO"`, a SAML/OIDC provider name configured on
   * the User Pool, or one of the social providers (`"Google"`, `"Facebook"`,
   * `"LoginWithAmazon"`, `"SignInWithApple"`).
   *
   * Per-request overrides via `signIn.social({ additionalParams: { identity_provider } })`
   * take precedence over this value.
   *
   * @see https://docs.aws.amazon.com/cognito/latest/developerguide/authorization-endpoint.html
   */
  identityProvider?: string | undefined;
}
declare const cognito: (options: CognitoOptions) => {
  id: "cognito";
  name: string;
  accountSubject: ({
    profile
  }: OAuthAccountKeyContext<CognitoProfile>) => string;
  createAuthorizationURL({
    state,
    scopes,
    codeVerifier,
    redirectURI,
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
    issuer: string;
    audience: string | string[];
    maxTokenAge: string;
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
    data: CognitoProfile;
  } | {
    user: {
      id?: never;
      name: string;
      email: string | null;
      image: string;
      emailVerified: boolean;
    };
    data: {
      name: string;
      sub: string;
      email: string;
      email_verified: boolean;
      given_name?: string | undefined;
      family_name?: string | undefined;
      picture?: string | undefined;
      username?: string | undefined;
      locale?: string | undefined;
      phone_number?: string | undefined;
      phone_number_verified?: boolean | undefined;
      aud: string | (string & string[]);
      iss: string;
      exp: number;
      iat: number;
      jti?: string;
      nbf?: number;
    };
  } | null>;
  options: CognitoOptions;
};
declare const getCognitoPublicKey: (kid: string, region: string, userPoolId: string) => Promise<Uint8Array<ArrayBufferLike> | CryptoKey>;
//#endregion
export { CognitoOptions, CognitoProfile, cognito, getCognitoPublicKey };