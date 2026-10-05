import { OAuth2Tokens, OAuth2UserInfo, OAuthAccountKeyContext, ProviderOptions } from "../oauth2/oauth-provider.mjs";
//#region src/social-providers/linkedin.d.ts
interface LinkedInProfile {
  sub: string;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale: {
    country: string;
    language: string;
  };
  email?: string;
  email_verified?: boolean;
}
interface LinkedInOptions extends ProviderOptions<LinkedInProfile> {
  clientId: string;
}
declare const linkedin: (options: LinkedInOptions) => {
  id: "linkedin";
  name: string;
  accountSubject: ({
    profile
  }: OAuthAccountKeyContext<LinkedInProfile>) => string;
  createAuthorizationURL: ({
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
  }) => Promise<URL>;
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
    data: LinkedInProfile;
  } | null>;
  options: LinkedInOptions;
};
//#endregion
export { LinkedInOptions, LinkedInProfile, linkedin };