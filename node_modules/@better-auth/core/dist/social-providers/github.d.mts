import { OAuth2Tokens, OAuth2UserInfo, OAuthAccountKeyContext, ProviderOptions } from "../oauth2/oauth-provider.mjs";
//#region src/social-providers/github.d.ts
interface GithubProfile {
  login: string;
  id: string;
  node_id: string;
  avatar_url: string;
  gravatar_id: string;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  type: string;
  site_admin: boolean;
  name: string;
  company: string;
  blog: string;
  location: string;
  email: string | null;
  hireable: boolean;
  bio: string;
  twitter_username: string;
  public_repos: string;
  public_gists: string;
  followers: string;
  following: string;
  created_at: string;
  updated_at: string;
  private_gists: string;
  total_private_repos: string;
  owned_private_repos: string;
  disk_usage: string;
  collaborators: string;
  two_factor_authentication: boolean;
  plan: {
    name: string;
    space: string;
    private_repos: string;
    collaborators: string;
  };
}
interface GithubOptions extends ProviderOptions<GithubProfile> {
  clientId: string;
}
declare const github: (options: GithubOptions) => {
  id: "github";
  name: string;
  accountSubject: ({
    profile
  }: OAuthAccountKeyContext<GithubProfile>) => string;
  createAuthorizationURL({
    state,
    scopes,
    loginHint,
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
  }) => Promise<OAuth2Tokens | null>;
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
    data: GithubProfile;
  } | null>;
  options: GithubOptions;
};
//#endregion
export { GithubOptions, GithubProfile, github };