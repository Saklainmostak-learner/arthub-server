import { OAuth2Tokens, OAuth2UserInfo, OAuthAccountKeyContext, ProviderOptions } from "../oauth2/oauth-provider.mjs";
//#region src/social-providers/twitch.d.ts
/**
 * @see https://dev.twitch.tv/docs/authentication/getting-tokens-oidc/#requesting-claims
 */
interface TwitchProfile {
  /**
   * The sub of the user
   */
  sub: string;
  /**
   * The preferred username of the user
   */
  preferred_username: string;
  /**
   * The email of the user
   */
  email: string;
  /**
   * Indicate if this user has a verified email.
   */
  email_verified: boolean;
  /**
   * The picture of the user
   */
  picture: string;
}
interface TwitchOptions extends ProviderOptions<TwitchProfile> {
  clientId: string;
  claims?: string[] | undefined;
}
declare const twitch: (options: TwitchOptions) => {
  id: "twitch";
  name: string;
  accountSubject: ({
    profile
  }: OAuthAccountKeyContext<TwitchProfile>) => string;
  createAuthorizationURL({
    state,
    scopes,
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
    data: TwitchProfile;
  } | null>;
  options: TwitchOptions;
};
//#endregion
export { TwitchOptions, TwitchProfile, twitch };