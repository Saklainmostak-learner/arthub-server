import { AwaitableFunction } from "../types/helper.mjs";
import { OAuth2Tokens, ProviderOptions } from "./oauth-provider.mjs";
import { TokenEndpointAuth, TokenEndpointSecretAuthentication } from "./token-endpoint-auth.mjs";

//#region src/oauth2/refresh-access-token.d.ts
interface RefreshAccessTokenRequestInput {
  refreshToken: string;
  options: AwaitableFunction<Partial<ProviderOptions>>;
  authentication?: TokenEndpointSecretAuthentication | undefined;
  tokenEndpointAuth?: TokenEndpointAuth | undefined;
  tokenEndpoint?: string | undefined;
  extraParams?: Record<string, string> | undefined;
  resource?: (string | string[]) | undefined;
}
interface RefreshAccessTokenInput extends RefreshAccessTokenRequestInput {
  options: Partial<ProviderOptions>;
  tokenEndpoint: string;
}
declare function refreshAccessTokenRequest({
  refreshToken,
  options,
  authentication,
  tokenEndpointAuth,
  tokenEndpoint,
  extraParams,
  resource
}: RefreshAccessTokenRequestInput): Promise<{
  body: URLSearchParams;
  headers: Record<string, string>;
}>;
declare function refreshAccessToken({
  refreshToken,
  options,
  tokenEndpoint,
  authentication,
  tokenEndpointAuth,
  extraParams,
  resource
}: RefreshAccessTokenInput): Promise<OAuth2Tokens>;
//#endregion
export { refreshAccessToken, refreshAccessTokenRequest };