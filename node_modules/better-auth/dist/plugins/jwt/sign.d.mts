import { JWSAlgorithms, JwtOptions, ResolvedSigningKey } from "./types.mjs";
import { GenericEndpointContext } from "@better-auth/core";

//#region src/plugins/jwt/sign.d.ts
type JWTPayloadWithOptional = {
  /**
   * JWT Issuer
   *
   * @see {@link https://www.rfc-editor.org/rfc/rfc7519#section-4.1.1 RFC7519#section-4.1.1}
   */
  iss?: string | undefined;
  /**
   * JWT Subject
   *
   * @see {@link https://www.rfc-editor.org/rfc/rfc7519#section-4.1.2 RFC7519#section-4.1.2}
   */
  sub?: string | undefined;
  /**
   * JWT Audience
   *
   * @see {@link https://www.rfc-editor.org/rfc/rfc7519#section-4.1.3 RFC7519#section-4.1.3}
   */
  aud?: string | string[] | undefined;
  /**
   * JWT ID
   *
   * @see {@link https://www.rfc-editor.org/rfc/rfc7519#section-4.1.7 RFC7519#section-4.1.7}
   */
  jti?: string | undefined;
  /**
   * JWT Not Before
   *
   * @see {@link https://www.rfc-editor.org/rfc/rfc7519#section-4.1.5 RFC7519#section-4.1.5}
   */
  nbf?: number | undefined;
  /**
   * JWT Expiration Time
   *
   * @see {@link https://www.rfc-editor.org/rfc/rfc7519#section-4.1.4 RFC7519#section-4.1.4}
   */
  exp?: number | undefined;
  /**
   * JWT Issued At
   *
   * @see {@link https://www.rfc-editor.org/rfc/rfc7519#section-4.1.6 RFC7519#section-4.1.6}
   */
  iat?: number | undefined; /** Any other JWT Claim Set member. */
  [propName: string]: unknown | undefined;
};
/**
 * Per-call signing overrides shared by `resolveSigningKey()` and `signJWT()`.
 *
 * Both fields are optional. When set, they shift key selection away from the
 * default "most recently created live key" behavior:
 *
 * - `signingKeyId` — load the exact JWKS row whose `id` equals this value
 *   (matches the JWS `kid` header). Throws if not found; never auto-mints
 *   a replacement (admin-provisioned key is the contract).
 * - `signingAlgorithm` — load the most recent live key with that `alg`. If
 *   none exists AND the algorithm is declared in `options.jwks.keyPairConfigs`
 *   (or equals the primary `keyPairConfig.alg`), the key is lazy-minted on
 *   demand. Otherwise throws with a descriptive error naming what IS
 *   provisioned.
 *
 * Used by the OAuth provider plugin to honor per-resource `signingAlgorithm` /
 * `signingKeyId` overrides without re-implementing key resolution.
 */
interface SigningKeyOverrides {
  signingKeyId?: string | undefined;
  signingAlgorithm?: JWSAlgorithms | undefined;
}
/**
 * Resolves the JWKS signing key, decrypts it, and imports it
 * for use with jose's SignJWT. Returns null when signing is
 * delegated to a custom jwt.sign callback.
 *
 * Callers that need the signing algorithm before constructing
 * the JWT payload (e.g. for OIDC at_hash) should call this
 * first, read `.alg`, then pass the result to `signJWT` via
 * the `resolvedKey` option to avoid a redundant DB lookup.
 *
 * When `overrides.signingKeyId` or `overrides.signingAlgorithm` is set, key
 * selection follows the contract documented on {@link SigningKeyOverrides};
 * without overrides this returns the most recently created live key, falling
 * back to the primary `keyPairConfig.alg` when even that's absent so unpinned
 * tokens stay on the configured default algorithm even after extra algorithms
 * have been lazy-minted for audience pinning.
 */
declare function resolveSigningKey(ctx: GenericEndpointContext, options?: JwtOptions, overrides?: SigningKeyOverrides): Promise<ResolvedSigningKey | null>;
declare function signJWT(ctx: GenericEndpointContext, config: {
  options?: JwtOptions | undefined;
  payload: JWTPayloadWithOptional; /** Pre-resolved key from resolveSigningKey. Skips redundant DB lookup. */
  resolvedKey?: ResolvedSigningKey;
  /**
   * Extra JWS Protected Header parameters to merge with the defaults
   * (`alg` and `kid`). Used by token profiles that require an explicit
   * media type, such as OIDC Back-Channel Logout's `typ: "logout+jwt"`.
   *
   * @see https://www.rfc-editor.org/rfc/rfc8725#section-3.11
   */
  header?: {
    typ?: string;
    cty?: string;
  };
  /**
   * Optional override for the signing key. When set, looks up the key
   * by its `id` (matches the JWS `kid` header) via the JWKS adapter.
   * Throws if no key with that id exists.
   *
   * When unset, falls back to the most recently created key with the
   * primary `keyPairConfig.alg` (the historical default).
   */
  signingKeyId?: string | undefined;
  /**
   * Optional override for the signing algorithm. Selects the most
   * recent key with this algorithm. When neither this nor
   * `signingKeyId` is set, the most recent key matching
   * `keyPairConfig.alg` is used (historical default).
   *
   * If both `signingKeyId` and `signingAlgorithm` are set, `signingKeyId`
   * wins; the algorithm is validated to match the resolved key and
   * the call throws on mismatch.
   */
  signingAlgorithm?: JWSAlgorithms | undefined;
}): Promise<string>;
declare function getJwtToken(ctx: GenericEndpointContext, options?: JwtOptions | undefined): Promise<string>;
//#endregion
export { getJwtToken, resolveSigningKey, signJWT };