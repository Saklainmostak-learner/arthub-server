import { AwaitableFunction } from "../types/helper.mjs";
import { OAuth2Tokens, ProviderOptions } from "./oauth-provider.mjs";
import { TokenEndpointAuth, TokenEndpointSecretAuthentication } from "./token-endpoint-auth.mjs";
import * as _$jose from "jose";

//#region src/oauth2/validate-authorization-code.d.ts
interface AuthorizationCodeRequestInput {
  code: string;
  redirectURI: string;
  options: AwaitableFunction<Partial<ProviderOptions>>;
  codeVerifier?: string | undefined;
  deviceId?: string | undefined;
  authentication?: TokenEndpointSecretAuthentication | undefined;
  tokenEndpointAuth?: TokenEndpointAuth | undefined;
  tokenEndpoint?: string | undefined;
  headers?: Record<string, string> | undefined;
  additionalParams?: Record<string, string> | undefined;
  resource?: (string | string[]) | undefined;
}
interface ValidateAuthorizationCodeInput extends AuthorizationCodeRequestInput {
  tokenEndpoint: string;
}
declare function authorizationCodeRequest({
  code,
  codeVerifier,
  redirectURI,
  options,
  authentication,
  tokenEndpointAuth,
  tokenEndpoint,
  deviceId,
  headers,
  additionalParams,
  resource
}: AuthorizationCodeRequestInput): Promise<{
  body: URLSearchParams;
  headers: Record<string, string>;
}>;
declare function validateAuthorizationCode({
  code,
  codeVerifier,
  redirectURI,
  options,
  tokenEndpoint,
  authentication,
  tokenEndpointAuth,
  deviceId,
  headers,
  additionalParams,
  resource
}: ValidateAuthorizationCodeInput): Promise<OAuth2Tokens>;
declare function validateToken(token: string, jwksEndpoint: string, options?: {
  audience?: string | string[];
  issuer?: string | string[];
}): Promise<_$jose.JWTVerifyResult<_$jose.JWTPayload> & _$jose.ResolvedKey>;
//#endregion
export { authorizationCodeRequest, validateAuthorizationCode, validateToken };