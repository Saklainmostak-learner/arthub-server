import { OAuth2Tokens, OAuth2UserInfo, OAuthAccountKeyContext, ProviderOptions } from "../oauth2/oauth-provider.mjs";
//#region src/social-providers/huggingface.d.ts
interface HuggingFaceProfile {
  sub: string;
  name: string;
  preferred_username: string;
  profile: string;
  picture: string;
  website?: string | undefined;
  email?: string | undefined;
  email_verified?: boolean | undefined;
  isPro: boolean;
  canPay?: boolean | undefined;
  orgs?: {
    sub: string;
    name: string;
    picture: string;
    preferred_username: string;
    isEnterprise: boolean | "plus";
    canPay?: boolean;
    roleInOrg?: "admin" | "write" | "contributor" | "read";
    pendingSSO?: boolean;
    missingMFA?: boolean;
    resourceGroups?: {
      sub: string;
      name: string;
      role: "admin" | "write" | "contributor" | "read";
    }[];
  } | undefined;
}
interface HuggingFaceOptions extends ProviderOptions<HuggingFaceProfile> {
  clientId: string;
}
declare const huggingface: (options: HuggingFaceOptions) => {
  id: "huggingface";
  name: string;
  accountSubject: ({
    profile
  }: OAuthAccountKeyContext<HuggingFaceProfile>) => string;
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
    data: HuggingFaceProfile;
  } | null>;
  options: HuggingFaceOptions;
};
//#endregion
export { HuggingFaceOptions, HuggingFaceProfile, huggingface };