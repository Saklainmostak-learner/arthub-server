import { OAuth2Tokens, OAuth2UserInfo, OAuthAccountKeyContext, ProviderOptions } from "../oauth2/oauth-provider.mjs";
import * as _$jose from "jose";

//#region src/social-providers/facebook.d.ts
interface FacebookGraphProfile {
  id: string;
  name: string;
  email?: string;
  email_verified?: boolean;
  picture: {
    data: {
      height: number;
      is_silhouette: boolean;
      url: string;
      width: number;
    };
  };
}
interface FacebookLimitedLoginProfile {
  sub: string;
  email: string;
  name: string;
  picture: string;
}
type FacebookProfile = FacebookGraphProfile | FacebookLimitedLoginProfile;
interface FacebookOptions extends ProviderOptions<FacebookProfile> {
  clientId: string | string[];
  /**
   * Extend list of fields to retrieve from the Facebook user profile.
   *
   * @default ["id", "name", "email", "picture"]
   */
  fields?: string[] | undefined;
  /**
   * The config id to use when undergoing oauth
   */
  configId?: string | undefined;
}
declare const facebook: (options: FacebookOptions) => {
  id: "facebook";
  name: string;
  accountSubject: ({
    profile
  }: OAuthAccountKeyContext<FacebookProfile>) => string;
  createAuthorizationURL({
    state,
    scopes,
    redirectURI,
    loginHint,
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
    redirectURI
  }: {
    code: string;
    redirectURI: string;
    codeVerifier?: string | undefined;
    deviceId?: string | undefined;
  }) => Promise<OAuth2Tokens>;
  idToken: {
    jwks: {
      (protectedHeader?: _$jose.JWSHeaderParameters, token?: _$jose.FlattenedJWSInput): Promise<_$jose.CryptoKey>;
      coolingDown: boolean;
      fresh: boolean;
      reloading: boolean;
      reload: () => Promise<void>;
      jwks: () => _$jose.JSONWebKeySet | undefined;
    };
    issuer: string;
    audience: string | string[];
    algorithms: string[];
    allowOpaqueToken: true;
  };
  refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
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
    data: FacebookProfile;
  } | null>;
  options: FacebookOptions;
};
//#endregion
export { FacebookGraphProfile, FacebookLimitedLoginProfile, FacebookOptions, FacebookProfile, facebook };