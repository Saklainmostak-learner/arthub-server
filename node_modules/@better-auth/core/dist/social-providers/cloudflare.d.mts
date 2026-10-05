import { OAuth2Tokens, OAuth2UserInfo, OAuthAccountKeyContext, ProviderOptions } from "../oauth2/oauth-provider.mjs";
//#region src/social-providers/cloudflare.d.ts
/**
 * The user profile returned by the Cloudflare API `/user` endpoint.
 *
 * @see https://developers.cloudflare.com/api/resources/user/methods/get/
 */
interface CloudflareProfile {
  /**
   * Identifier of the user.
   */
  id: string;
  /**
   * Current email address of the user.
   */
  email: string;
  /**
   * The user's first name.
   */
  first_name?: string | null | undefined;
  /**
   * The user's last name.
   */
  last_name?: string | null | undefined;
  /**
   * The country in which the user lives.
   */
  country?: string | null | undefined;
  /**
   * The user's telephone number.
   */
  telephone?: string | null | undefined;
  /**
   * The zipcode or postal code where the user lives.
   */
  zipcode?: string | null | undefined;
  /**
   * Indicates whether two-factor authentication is enabled for the user account.
   */
  two_factor_authentication_enabled?: boolean | undefined;
  /**
   * Indicates whether the user has been suspended.
   */
  suspended?: boolean | undefined;
}
/**
 * Token endpoint authentication supported by Cloudflare OAuth clients.
 *
 * @see https://developers.cloudflare.com/fundamentals/oauth/create-an-oauth-client/#choose-a-flow
 */
type CloudflareClientAuthentication = {
  /**
   * The client secret of a confidential Cloudflare OAuth client.
   */
  clientSecret: string;
  /**
   * The authentication method configured for the token endpoint.
   *
   * @default "client_secret_basic"
   */
  tokenEndpointAuthMethod?: "client_secret_basic" | "client_secret_post" | undefined;
} | {
  /**
   * Clients that use PKCE do not have a client secret.
   */
  clientSecret?: undefined;
  /**
   * Clients without a secret do not authenticate at the token endpoint.
   *
   * @default "none"
   */
  tokenEndpointAuthMethod?: "none" | undefined;
};
interface CloudflareBaseOptions extends ProviderOptions<CloudflareProfile> {
  /**
   * The client ID of the Cloudflare OAuth client.
   */
  clientId: string;
}
/**
 * Options for configuring the Cloudflare social provider.
 */
type CloudflareOptions = CloudflareBaseOptions & CloudflareClientAuthentication;
declare const cloudflare: (options: CloudflareOptions) => {
  id: "cloudflare";
  name: string;
  accountSubject: ({
    profile
  }: OAuthAccountKeyContext<CloudflareProfile>) => string;
  createAuthorizationURL({
    state,
    scopes,
    codeVerifier,
    redirectURI
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
    data: CloudflareProfile;
  } | null>;
  options: CloudflareOptions;
};
//#endregion
export { CloudflareOptions, CloudflareProfile, cloudflare };