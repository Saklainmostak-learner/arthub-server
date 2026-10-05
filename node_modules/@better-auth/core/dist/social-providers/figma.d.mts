import { OAuth2Tokens, OAuth2UserInfo, OAuthAccountKeyContext, ProviderOptions } from "../oauth2/oauth-provider.mjs";
//#region src/social-providers/figma.d.ts
interface FigmaProfile {
  id: string;
  email: string;
  handle: string;
  img_url: string;
}
interface FigmaOptions extends ProviderOptions<FigmaProfile> {
  clientId: string;
}
declare const figma: (options: FigmaOptions) => {
  id: "figma";
  name: string;
  accountSubject: ({
    profile
  }: OAuthAccountKeyContext<FigmaProfile>) => string;
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
    data: FigmaProfile;
  } | null>;
  options: FigmaOptions;
};
//#endregion
export { FigmaOptions, FigmaProfile, figma };