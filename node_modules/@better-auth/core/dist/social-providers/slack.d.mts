import { OAuth2Tokens, OAuth2UserInfo, OAuthAccountKeyContext, ProviderOptions } from "../oauth2/oauth-provider.mjs";
//#region src/social-providers/slack.d.ts
interface SlackProfile extends Record<string, any> {
  ok: boolean;
  sub: string;
  "https://slack.com/user_id": string;
  "https://slack.com/team_id": string;
  email: string;
  email_verified: boolean;
  date_email_verified: number;
  name: string;
  picture: string;
  given_name: string;
  family_name: string;
  locale: string;
  "https://slack.com/team_name": string;
  "https://slack.com/team_domain": string;
  "https://slack.com/user_image_24": string;
  "https://slack.com/user_image_32": string;
  "https://slack.com/user_image_48": string;
  "https://slack.com/user_image_72": string;
  "https://slack.com/user_image_192": string;
  "https://slack.com/user_image_512": string;
  "https://slack.com/team_image_34": string;
  "https://slack.com/team_image_44": string;
  "https://slack.com/team_image_68": string;
  "https://slack.com/team_image_88": string;
  "https://slack.com/team_image_102": string;
  "https://slack.com/team_image_132": string;
  "https://slack.com/team_image_230": string;
  "https://slack.com/team_image_default": boolean;
}
interface SlackOptions extends ProviderOptions<SlackProfile> {
  clientId: string;
}
declare const slack: (options: SlackOptions) => {
  id: "slack";
  name: string;
  accountSubject: ({
    profile
  }: OAuthAccountKeyContext<SlackProfile>) => string;
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
    data: SlackProfile;
  } | null>;
  options: SlackOptions;
};
//#endregion
export { SlackOptions, SlackProfile, slack };