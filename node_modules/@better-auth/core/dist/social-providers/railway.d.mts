import { OAuth2Tokens, OAuth2UserInfo, OAuthAccountKeyContext, ProviderOptions } from "../oauth2/oauth-provider.mjs";
//#region src/social-providers/railway.d.ts
interface RailwayProfile {
  /** The user's unique ID (OAuth `sub` claim). */
  sub: string;
  /** The user's email address. */
  email: string;
  /** The user's display name. */
  name: string;
  /** URL of the user's profile picture. */
  picture: string;
}
interface RailwayOptions extends ProviderOptions<RailwayProfile> {
  clientId: string;
}
declare const railway: (options: RailwayOptions) => {
  id: "railway";
  name: string;
  accountSubject: ({
    profile
  }: OAuthAccountKeyContext<RailwayProfile>) => string;
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
    data: RailwayProfile;
  } | null>;
  options: RailwayOptions;
};
//#endregion
export { RailwayOptions, RailwayProfile, railway };