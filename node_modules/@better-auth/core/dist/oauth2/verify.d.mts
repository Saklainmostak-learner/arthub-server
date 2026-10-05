import { DpopReplayStore } from "./dpop.mjs";
import { APIError } from "better-call";
import { JSONWebKeySet, JWTPayload, JWTVerifyOptions } from "jose";

//#region src/oauth2/verify.d.ts
type JwksFetchOptions = {
  /** Jwks url or promise of a Jwks */jwksFetch: string | (() => Promise<JSONWebKeySet | undefined>);
  /**
   * Stable object to cache the result of a function `jwksFetch` under,
   * with the same TTL and kid-miss refetch rules as string sources.
   * Without it, a function source is fetched on every verification.
   */
  jwksCacheKey?: object;
};
/**
 * @internal
 */
interface VerifyAccessTokenRemote {
  /** Full url of the introspect endpoint. Should end with `/oauth2/introspect` */
  introspectUrl: string;
  /** Client Secret */
  clientId: string;
  /** Client Secret */
  clientSecret: string;
  /**
   * Forces remote verification of a token.
   * This ensures attached session (if applicable)
   * is also still active.
   */
  force?: boolean;
  /**
   * Accept introspection responses that omit the `aud` claim even when a
   * required `audience` is configured in `verifyOptions`.
   *
   * By default verification fails closed: if you configure an `audience` and
   * the introspection response has no `aud` (or a mismatching one), the token
   * is rejected. Some authorization servers legitimately omit `aud` from
   * introspection responses (it is OPTIONAL per RFC 7662 §2.2); only enable
   * this if you trust the issuer to bind the token to this resource through
   * another mechanism, as it skips the audience check in that case.
   *
   * @default false
   */
  allowMissingAudience?: boolean;
}
interface VerifyAccessTokenOptions {
  /** Verify options */
  verifyOptions: JWTVerifyOptions & Required<Pick<JWTVerifyOptions, "audience" | "issuer">>;
  /** Scopes the token must satisfy. */
  requiredScopes?: readonly string[];
  /**
   * Determines whether a required scope is satisfied by the granted scope
   * set. Defaults to exact set membership.
   */
  isScopeSatisfied?: (requiredScope: string, grantedScopes: ReadonlySet<string>) => boolean;
  /** Required to verify access token locally */
  jwksUrl?: string;
  /** If provided, can verify a token remotely */
  remoteVerify?: VerifyAccessTokenRemote;
}
interface VerifyAccessTokenRequestOptions extends VerifyAccessTokenOptions {
  dpop?: {
    proofMaxAgeSeconds?: number;
    /**
     * Store used to reject replayed DPoP proof `jti` values.
     *
     * Defaults to a process-local in-memory store, which is only safe for a
     * single-instance deployment: it shares no state across instances and
     * resets on cold start, so a captured proof can be replayed against
     * another instance within the proof's lifetime. Supply a shared,
     * persistent store (for example one backed by your database) for any
     * multi-instance or serverless resource server.
     */
    replayStore?: DpopReplayStore;
    signingAlgorithms?: readonly string[];
  };
}
interface ResourceRequestInput {
  authorizationHeader: string | null | undefined;
  dpopProofJwt?: string | null | undefined;
  method: string;
  url: string;
}
/**
 * Builds a {@link ResourceRequestInput} from a standard `Request`, reading the
 * `Authorization` and `DPoP` headers and the request method and URL. Resource
 * servers share this so every entry point maps the wire request the same way.
 */
declare function requestToResourceInput(request: Request): ResourceRequestInput;
/**
 * Performs local verification of an access token for your APIs.
 *
 * Can also be configured for remote verification.
 */
declare function verifyJwsAccessToken(token: string, opts: JwksFetchOptions & {
  /** Verify options */verifyOptions: JWTVerifyOptions & Required<Pick<JWTVerifyOptions, "audience" | "issuer">>;
}): Promise<JWTPayload>;
declare function getJwks(token: string, opts: JwksFetchOptions): Promise<JSONWebKeySet>;
declare function createInsufficientScopeError(requiredScopes: readonly string[], description?: string): APIError;
/**
 * Returns whether an error is a typed RFC 6750 insufficient-scope failure.
 */
declare function isInsufficientScopeError(error: unknown): error is APIError;
/**
 * Performs local verification of a bearer access token for your API.
 *
 * Can also be configured for remote verification. DPoP-bound access tokens
 * require {@link verifyAccessTokenRequest}, because sender-constraining cannot
 * be verified without the HTTP method, URL, Authorization scheme, DPoP proof,
 * and access-token hash. This function rejects DPoP-bound tokens; reach for it
 * only when you hold a raw token string and intentionally accept bearer tokens
 * alone.
 */
declare function verifyBearerToken(token: string, opts: VerifyAccessTokenOptions): Promise<JWTPayload>;
/**
 * Verifies an HTTP resource request carrying an OAuth access token. This is the
 * recommended resource-server entry point: it handles both bearer and
 * DPoP-bound tokens, the bearer case being the request with no DPoP proof.
 *
 * It performs the same token validation as {@link verifyBearerToken}, then adds
 * the RFC 9449 sender-constraint checks that need request context: authorization
 * scheme, method, URL, DPoP proof, `ath`, and `cnf.jkt` binding.
 */
declare function verifyAccessTokenRequest(request: ResourceRequestInput, opts: VerifyAccessTokenRequestOptions): Promise<JWTPayload>;
//#endregion
export { ResourceRequestInput, VerifyAccessTokenOptions, VerifyAccessTokenRequestOptions, createInsufficientScopeError, getJwks, isInsufficientScopeError, requestToResourceInput, verifyAccessTokenRequest, verifyBearerToken, verifyJwsAccessToken };