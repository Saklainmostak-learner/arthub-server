import { OAuth2Tokens, OAuth2UserInfo, OAuthAccountKeyContext, ProviderOptions } from "../oauth2/oauth-provider.mjs";
//#region src/social-providers/dropbox.d.ts
interface DropboxProfile {
  account_id: string;
  name: {
    given_name: string;
    surname: string;
    familiar_name: string;
    display_name: string;
    abbreviated_name: string;
  };
  email: string;
  email_verified: boolean;
  profile_photo_url: string;
}
interface DropboxOptions extends ProviderOptions<DropboxProfile> {
  clientId: string;
  accessType?: ("offline" | "online" | "legacy") | undefined;
}
declare const dropbox: (options: DropboxOptions) => {
  id: "dropbox";
  name: string;
  accountSubject: ({
    profile
  }: OAuthAccountKeyContext<DropboxProfile>) => string;
  createAuthorizationURL: ({
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
  }) => Promise<URL>;
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
    data: DropboxProfile;
  } | null>;
  options: DropboxOptions;
};
//#endregion
export { DropboxOptions, DropboxProfile, dropbox };