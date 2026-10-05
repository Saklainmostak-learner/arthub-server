import { OAuth2Tokens, OAuth2UserInfo, OAuthAccountKeyContext, ProviderOptions } from "../oauth2/oauth-provider.mjs";
//#region src/social-providers/linear.d.ts
interface LinearUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | undefined;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
interface LinearProfile {
  data: {
    viewer: LinearUser;
  };
}
interface LinearOptions extends ProviderOptions<LinearUser> {
  clientId: string;
}
declare const linear: (options: LinearOptions) => {
  id: "linear";
  name: string;
  accountSubject: ({
    profile
  }: OAuthAccountKeyContext<LinearUser>) => string;
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
    data: LinearUser;
  } | null>;
  options: LinearOptions;
};
//#endregion
export { LinearOptions, LinearProfile, LinearUser, linear };