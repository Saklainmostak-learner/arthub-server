import { OAuth2Tokens, OAuth2UserInfo, OAuthAccountKeyContext, ProviderOptions } from "../oauth2/oauth-provider.mjs";
//#region src/social-providers/notion.d.ts
interface NotionProfile {
  object: "user";
  id: string;
  type: "person" | "bot";
  name?: string | undefined;
  avatar_url?: string | undefined;
  person?: {
    email?: string;
  } | undefined;
}
interface NotionOptions extends ProviderOptions<NotionProfile> {
  clientId: string;
}
declare const notion: (options: NotionOptions) => {
  id: "notion";
  name: string;
  accountSubject: ({
    profile
  }: OAuthAccountKeyContext<NotionProfile>) => string;
  createAuthorizationURL({
    state,
    scopes,
    loginHint,
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
    data: NotionProfile;
  } | null>;
  options: NotionOptions;
};
//#endregion
export { NotionOptions, NotionProfile, notion };