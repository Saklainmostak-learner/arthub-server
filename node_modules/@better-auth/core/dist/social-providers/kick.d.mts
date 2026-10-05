import { OAuth2Tokens, OAuth2UserInfo, OAuthAccountKeyContext, ProviderOptions } from "../oauth2/oauth-provider.mjs";
//#region src/social-providers/kick.d.ts
interface KickProfile {
  /**
   * The user id of the user
   */
  user_id: string;
  /**
   * The name of the user
   */
  name: string;
  /**
   * The email of the user
   */
  email: string;
  /**
   * The picture of the user
   */
  profile_picture: string;
}
interface KickOptions extends ProviderOptions<KickProfile> {
  clientId: string;
}
declare const kick: (options: KickOptions) => {
  id: "kick";
  name: string;
  accountSubject: ({
    profile
  }: OAuthAccountKeyContext<KickProfile>) => string;
  createAuthorizationURL({
    state,
    scopes,
    redirectURI,
    codeVerifier,
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
  validateAuthorizationCode({
    code,
    redirectURI,
    codeVerifier
  }: {
    code: string;
    redirectURI: string;
    codeVerifier?: string | undefined;
    deviceId?: string | undefined;
  }): Promise<OAuth2Tokens>;
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
    data: KickProfile;
  } | null>;
  options: KickOptions;
};
//#endregion
export { KickOptions, KickProfile, kick };