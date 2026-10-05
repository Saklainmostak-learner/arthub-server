import { JWK, JWTPayload } from "jose";

//#region src/oauth2/dpop.d.ts
declare const DPOP_AUTHORIZATION_SCHEME = "DPoP";
declare const BEARER_AUTHORIZATION_SCHEME = "Bearer";
declare const DPOP_PROOF_TYPE = "dpop+jwt";
declare const DPOP_SIGNING_ALGORITHMS: readonly ["EdDSA", "ES256", "ES512", "PS256", "RS256"];
type DpopSigningAlgorithm = (typeof DPOP_SIGNING_ALGORITHMS)[number];
type AccessTokenAuthorizationScheme = "Bearer" | "DPoP" | "Unknown";
interface AccessTokenAuthorization {
  scheme: AccessTokenAuthorizationScheme;
  token: string;
}
type DpopProofErrorCode = "invalid_dpop_proof";
type DpopProofError = Error & {
  code: DpopProofErrorCode;
};
interface DpopReplayReservation {
  key: string;
  expiresAt: Date;
  now: Date;
}
interface DpopReplayStore {
  reserve: (reservation: DpopReplayReservation) => Promise<boolean> | boolean;
}
declare function createInMemoryDpopReplayStore(): DpopReplayStore;
/**
 * The single-use reservation capability a {@link createDpopReplayStore} needs:
 * the auth context's `internalAdapter.reserveVerificationValue`. Kept structural
 * so core does not depend on the adapter implementation.
 */
interface DpopReplayReservations {
  reserveVerificationValue: (data: {
    identifier: string;
    value: string;
    expiresAt: Date;
  }) => Promise<boolean>;
}
/**
 * Database-backed DPoP proof replay store built on the auth context's
 * verification reservation primitive (`internalAdapter.reserveVerificationValue`),
 * the same atomic single-use mechanism that guards SAML assertion ids and other
 * one-time tokens. A replayed proof collides on the deterministic reservation id
 * so `reserve` returns `false`, giving cross-instance anti-replay. Prefer this
 * over {@link createInMemoryDpopReplayStore} for any multi-instance or serverless
 * resource server. Requires database-backed verification storage; a
 * secondary-storage-only deployment rejects the proof (fails closed).
 */
declare function createDpopReplayStore(reservations: DpopReplayReservations): DpopReplayStore;
interface VerifyDpopProofOptions {
  proofJwt: string;
  method: string;
  url: string;
  accessToken?: string;
  expectedJkt?: string;
  requireAth?: boolean;
  nowSeconds?: number;
  proofMaxAgeSeconds?: number;
  signingAlgorithms?: readonly string[];
  replayStore?: DpopReplayStore;
}
interface VerifiedDpopProof {
  jwk: JWK;
  jkt: string;
  jti: string;
  htm: string;
  htu: string;
  iat: number;
  ath?: string;
  replayKey: string;
  expiresAt: Date;
}
declare function createDpopProofError(code: DpopProofErrorCode, message: string): DpopProofError;
declare function isDpopProofError(error: unknown): error is DpopProofError;
declare function parseAccessTokenAuthorization(authorization: string | null | undefined): AccessTokenAuthorization | undefined;
declare function stripAccessTokenAuthorizationScheme(token: string): string;
declare function normalizeDpopHtu(url: string): string;
declare function deriveDpopAth(accessToken: string): Promise<string>;
declare function deriveDpopJkt(jwk: JWK): Promise<string>;
/**
 * Extracts the DPoP key thumbprint from an RFC 7800 `cnf` confirmation. The
 * input is untrusted (a JWT claim, a JSON column), so any shape other than an
 * object carrying a non-empty string `jkt` (a primitive, an array, a different
 * confirmation method such as mTLS `x5t#S256`) yields `undefined` instead of
 * throwing.
 */
declare function getConfirmationJkt(confirmation: unknown): string | undefined;
declare function getDpopJktFromPayload(payload: JWTPayload): string | undefined;
declare function verifyDpopProof({
  proofJwt,
  method,
  url,
  accessToken,
  expectedJkt,
  requireAth,
  nowSeconds,
  proofMaxAgeSeconds,
  signingAlgorithms,
  replayStore
}: VerifyDpopProofOptions): Promise<VerifiedDpopProof>;
type DpopBindingErrorCode = "invalid_token" | "invalid_dpop_proof";
type DpopBindingError = Error & {
  code: DpopBindingErrorCode;
};
declare function createDpopBindingError(code: DpopBindingErrorCode, message: string): DpopBindingError;
declare function isDpopBindingError(error: unknown): error is DpopBindingError;
interface EnforceDpopBindingParams {
  /** The already-verified access-token payload (from JWKS or introspection). */
  payload: JWTPayload;
  /** The parsed `Authorization` header (scheme + token). */
  authorization: AccessTokenAuthorization;
  /** The `DPoP` proof header value, if any. */
  proofJwt: string | null | undefined;
  method: string;
  url: string;
  replayStore?: DpopReplayStore;
  proofMaxAgeSeconds?: number;
  signingAlgorithms?: readonly string[];
}
/**
 * Enforces the RFC 9449 §7.1 sender-constraint check for a resource request,
 * given an access-token payload that has already been validated (by JWKS or
 * introspection). This is the single source of truth for the
 * "is the token DPoP-bound? then require the DPoP scheme, a proof, and a
 * matching key" decision, shared by every resource-server entry point.
 *
 * Throws a {@link DpopBindingError} on any mismatch so callers map the
 * `invalid_token` / `invalid_dpop_proof` code into their own transport. Returns
 * normally for a valid bearer token (no `cnf.jkt`, no DPoP scheme).
 */
declare function enforceDpopBinding({
  payload,
  authorization,
  proofJwt,
  method,
  url,
  replayStore,
  proofMaxAgeSeconds,
  signingAlgorithms
}: EnforceDpopBindingParams): Promise<void>;
//#endregion
export { AccessTokenAuthorization, AccessTokenAuthorizationScheme, BEARER_AUTHORIZATION_SCHEME, DPOP_AUTHORIZATION_SCHEME, DPOP_PROOF_TYPE, DPOP_SIGNING_ALGORITHMS, DpopBindingError, DpopBindingErrorCode, DpopProofError, DpopProofErrorCode, DpopReplayReservation, DpopReplayReservations, DpopReplayStore, DpopSigningAlgorithm, EnforceDpopBindingParams, VerifiedDpopProof, VerifyDpopProofOptions, createDpopBindingError, createDpopProofError, createDpopReplayStore, createInMemoryDpopReplayStore, deriveDpopAth, deriveDpopJkt, enforceDpopBinding, getConfirmationJkt, getDpopJktFromPayload, isDpopBindingError, isDpopProofError, normalizeDpopHtu, parseAccessTokenAuthorization, stripAccessTokenAuthorizationScheme, verifyDpopProof };