import { Awaitable } from "../types/helper.mjs";
//#region src/oauth2/client-assertion.d.ts
/** Asymmetric signing algorithms compatible with private_key_jwt (RFC 7523). */
declare const PRIVATE_KEY_JWT_SIGNING_ALGORITHMS: readonly ["RS256", "RS384", "RS512", "PS256", "PS384", "PS512", "ES256", "ES384", "ES512", "EdDSA"];
type PrivateKeyJwtSigningAlgorithm = (typeof PRIVATE_KEY_JWT_SIGNING_ALGORITHMS)[number];
declare const CLIENT_ASSERTION_TYPE = "urn:ietf:params:oauth:client-assertion-type:jwt-bearer";
type ClientAssertionGrantType = "authorization_code" | "refresh_token" | "client_credentials";
interface ClientAssertionContext {
  clientId: string;
  tokenEndpoint: string;
  grantType: ClientAssertionGrantType;
}
type ClientAssertionGetter = (context: ClientAssertionContext) => Awaitable<string>;
interface PrivateKeyJwtClientAssertionGetterOptions {
  /** Private key in JWK format for signing. */
  privateKeyJwk?: JsonWebKey;
  /** Private key in PKCS#8 PEM format for signing. */
  privateKeyPem?: string;
  /** Key ID to include in the JWT header. */
  kid?: string;
  /** Asymmetric signing algorithm. Symmetric algorithms (HS256) and "none" are not allowed. @default "RS256" */
  algorithm?: PrivateKeyJwtSigningAlgorithm;
  /** Assertion lifetime in seconds. @default 120 */
  expiresIn?: number;
}
/**
 * Signs an RFC 7523 client assertion JWT for `private_key_jwt` authentication.
 *
 * The JWT contains these claims:
 *
 * - iss=clientId
 * - sub=clientId
 * - aud=tokenEndpoint
 * - exp=now + 120s
 * - jti=unique
 * - iat=now
 */
declare function signPrivateKeyJwtClientAssertion({
  clientId,
  tokenEndpoint,
  privateKeyJwk,
  privateKeyPem,
  kid,
  algorithm,
  expiresIn
}: {
  clientId: string;
  tokenEndpoint: string;
  privateKeyJwk?: JsonWebKey;
  privateKeyPem?: string;
  kid?: string;
  algorithm?: PrivateKeyJwtSigningAlgorithm;
  expiresIn?: number;
}): Promise<string>;
/**
 * Creates a client assertion getter for `private_key_jwt` authentication.
 *
 * Validates options eagerly (key material, supported algorithm, JWK alg
 * agreement) so misconfiguration surfaces at construction rather than on the
 * first token request. The returned function signs a fresh RFC 7523 JWT
 * assertion for every token endpoint request.
 */
declare function createPrivateKeyJwtClientAssertionGetter(options: PrivateKeyJwtClientAssertionGetterOptions): ClientAssertionGetter;
/**
 * Resolves a client assertion getter into `client_assertion` + `client_assertion_type` params for injection into a token request body.
 */
declare function resolveClientAssertionParams({
  getClientAssertion,
  context
}: {
  getClientAssertion: ClientAssertionGetter;
  context: ClientAssertionContext;
}): Promise<Record<string, string>>;
//#endregion
export { CLIENT_ASSERTION_TYPE, ClientAssertionContext, ClientAssertionGetter, ClientAssertionGrantType, PRIVATE_KEY_JWT_SIGNING_ALGORITHMS, PrivateKeyJwtClientAssertionGetterOptions, PrivateKeyJwtSigningAlgorithm, createPrivateKeyJwtClientAssertionGetter, resolveClientAssertionParams, signPrivateKeyJwtClientAssertion };