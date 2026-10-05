import { OAuth2Tokens, OAuth2UserInfo, OAuthAccountKeyContext, ProviderOptions } from "../oauth2/oauth-provider.mjs";
//#region src/social-providers/reddit.d.ts
interface RedditProfile {
  id: string;
  name: string;
  icon_img: string | null;
  has_verified_email: boolean;
  oauth_client_id: string;
  verified: boolean;
}
interface RedditOptions extends ProviderOptions<RedditProfile> {
  clientId: string;
  duration?: string | undefined;
}
declare const reddit: (options: RedditOptions) => {
  id: "reddit";
  name: string;
  accountSubject: ({
    profile
  }: OAuthAccountKeyContext<RedditProfile>) => string;
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
    data: RedditProfile;
  } | null>;
  options: RedditOptions;
};
//#endregion
export { RedditOptions, RedditProfile, reddit };