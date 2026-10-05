import { OAuth2Tokens, OAuth2UserInfo, OAuthAccountKeyContext, ProviderOptions } from "../oauth2/oauth-provider.mjs";
//#region src/social-providers/paypal.d.ts
interface PayPalProfile {
  sub?: string | undefined;
  user_id: string;
  name: string;
  given_name: string;
  family_name: string;
  middle_name?: string | undefined;
  picture?: string | undefined;
  email: string;
  email_verified: boolean;
  gender?: string | undefined;
  birthdate?: string | undefined;
  zoneinfo?: string | undefined;
  locale?: string | undefined;
  phone_number?: string | undefined;
  address?: {
    street_address?: string;
    locality?: string;
    region?: string;
    postal_code?: string;
    country?: string;
  } | undefined;
  verified_account?: boolean | undefined;
  account_type?: string | undefined;
  age_range?: string | undefined;
  payer_id?: string | undefined;
}
interface PayPalTokenResponse {
  scope?: string | undefined;
  access_token: string;
  refresh_token?: string | undefined;
  token_type: "Bearer";
  id_token?: string | undefined;
  expires_in: number;
  nonce?: string | undefined;
}
interface PayPalOptions extends ProviderOptions<PayPalProfile> {
  clientId: string;
  /**
   * PayPal environment - 'sandbox' for testing, 'live' for production
   * @default 'sandbox'
   */
  environment?: ("sandbox" | "live") | undefined;
  /**
   * Whether to request shipping address information
   * @default false
   */
  requestShippingAddress?: boolean | undefined;
}
declare const paypal: (options: PayPalOptions) => {
  id: "paypal";
  name: string;
  accountSubject: ({
    profile
  }: OAuthAccountKeyContext<PayPalProfile>) => string;
  createAuthorizationURL({
    state,
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
    data: PayPalProfile;
  } | {
    user: {
      id?: never;
      name: string;
      email: string | null;
      image: string;
      emailVerified: boolean;
    };
    data: PayPalProfile;
  } | null>;
  options: PayPalOptions;
};
//#endregion
export { PayPalOptions, PayPalProfile, PayPalTokenResponse, paypal };