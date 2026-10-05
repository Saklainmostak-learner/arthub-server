import { AwaitableFunction } from "../types/helper.mjs";
import { OAuth2Tokens, ProviderOptions } from "./oauth-provider.mjs";
import { TokenEndpointAuth, TokenEndpointSecretAuthentication } from "./token-endpoint-auth.mjs";

//#region src/oauth2/client-credentials-token.d.ts
interface ClientCredentialsTokenRequestInput {
  options: AwaitableFunction<ProviderOptions>;
  scope?: string | undefined;
  authentication?: TokenEndpointSecretAuthentication | undefined;
  tokenEndpointAuth?: TokenEndpointAuth | undefined;
  tokenEndpoint?: string | undefined;
  resource?: (string | string[]) | undefined;
}
interface ClientCredentialsTokenInput extends ClientCredentialsTokenRequestInput {
  tokenEndpoint: string;
  scope: string;
}
declare function clientCredentialsTokenRequest({
  options,
  scope,
  authentication,
  tokenEndpointAuth,
  tokenEndpoint,
  resource
}: ClientCredentialsTokenRequestInput): Promise<{
  body: URLSearchParams;
  headers: Record<string, string>;
}>;
declare function clientCredentialsToken({
  options,
  tokenEndpoint,
  scope,
  authentication,
  tokenEndpointAuth,
  resource
}: ClientCredentialsTokenInput): Promise<OAuth2Tokens>;
//#endregion
export { clientCredentialsToken, clientCredentialsTokenRequest };