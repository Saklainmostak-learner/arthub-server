import { ClientAssertionGetter, ClientAssertionGrantType } from "./client-assertion.mjs";

//#region src/oauth2/token-endpoint-auth.d.ts
type TokenEndpointAuth = {
  method: "none";
} | {
  method: "client_secret_basic";
} | {
  method: "client_secret_post";
} | {
  method: "private_key_jwt";
  getClientAssertion: ClientAssertionGetter;
} | {
  method: "custom";
  /**
   * Customize the token request after standard grant parameters are set.
   */
  customizeRequest: TokenEndpointRequestHook;
};
type TokenEndpointAuthMethod = TokenEndpointAuth["method"];
type TokenEndpointSecretAuthentication = "basic" | "post";
/**
 * Mutable token request state passed to a custom authentication strategy.
 */
interface TokenEndpointRequestContext {
  body: URLSearchParams;
  headers: Record<string, string>;
  options: TokenEndpointClientOptions;
  tokenEndpoint: string;
  grantType: ClientAssertionGrantType;
}
/**
 * Applies provider-specific authentication to a token request.
 */
type TokenEndpointRequestHook = (context: TokenEndpointRequestContext) => void | Promise<void>;
interface TokenEndpointClientOptions {
  clientId?: string | string[] | undefined;
  clientSecret?: string | undefined;
}
//#endregion
export { TokenEndpointAuth, TokenEndpointAuthMethod, TokenEndpointRequestContext, TokenEndpointRequestHook, TokenEndpointSecretAuthentication };