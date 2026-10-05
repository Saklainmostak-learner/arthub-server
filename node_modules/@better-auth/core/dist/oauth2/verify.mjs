import { logger } from "../env/logger.mjs";
import { fetchRefusingRedirects } from "./reject-redirects.mjs";
import { createInMemoryDpopReplayStore, enforceDpopBinding, getDpopJktFromPayload, isDpopBindingError, parseAccessTokenAuthorization } from "./dpop.mjs";
import { APIError } from "better-call";
import { UnsecuredJWT, createLocalJWKSet, decodeProtectedHeader, errors, jwtVerify } from "jose";
//#region src/oauth2/verify.ts
const joseInfrastructureErrorCodes = new Set([
	errors.JWKSTimeout.code,
	errors.JWKSInvalid.code,
	errors.JWKSMultipleMatchingKeys.code
]);
function isJoseInfrastructureError(error) {
	return joseInfrastructureErrorCodes.has(error.code);
}
/**
* @internal
*/
const jwksCache = /* @__PURE__ */ new Map();
/**
* Cache for function jwks sources, keyed by a caller-provided stable object.
* Entries are released with their key, so per-request keys cannot accumulate.
*/
const functionJwksCache = /* @__PURE__ */ new WeakMap();
/**
* How long a cached JWKS is trusted before it is refetched
*
* @internal
*/
const JWKS_CACHE_TTL_MS = 300 * 1e3;
const JWKS_NO_KID_REFETCH_COOLDOWN_MS = 30 * 1e3;
/**
* Returns the cached key set when it is within the TTL. When the token carries
* `kid`, the cached set must contain that key id; without `kid`, key selection
* is deferred to JOSE because RFC 7515 makes the header parameter optional.
*/
function getFreshJwksWithKid(cached, kid) {
	if (!cached) return void 0;
	if (Date.now() - cached.fetchedAt >= JWKS_CACHE_TTL_MS) return void 0;
	if (kid && !cached.jwks.keys.some((jwk) => jwk.kid === kid)) return;
	return cached.jwks;
}
function shouldRefetchCachedJwksWithoutKid(error, resolved) {
	if (!(resolved.fromCache && !resolved.kid && (error instanceof errors.JWKSNoMatchingKey || error instanceof errors.JWSSignatureVerificationFailed))) return false;
	if (!resolved.noKidRefetchedAt) return true;
	return Date.now() - resolved.noKidRefetchedAt >= JWKS_NO_KID_REFETCH_COOLDOWN_MS;
}
async function fetchJwks(jwksFetch) {
	const jwks = typeof jwksFetch === "string" ? await fetchRefusingRedirects(jwksFetch, { headers: { Accept: "application/json" } }).then(async (res) => {
		if (res.error) throw new Error(`Jwks failed: ${res.error.message ?? res.error.statusText}`);
		return res.data;
	}) : await jwksFetch();
	if (!jwks) throw new Error("No jwks found");
	return jwks;
}
/**
* Builds a {@link ResourceRequestInput} from a standard `Request`, reading the
* `Authorization` and `DPoP` headers and the request method and URL. Resource
* servers share this so every entry point maps the wire request the same way.
*/
function requestToResourceInput(request) {
	return {
		authorizationHeader: request.headers.get("authorization"),
		dpopProofJwt: request.headers.get("dpop"),
		method: request.method,
		url: request.url
	};
}
/**
* Process-local, single-instance replay store. See the warning on
* {@link VerifyAccessTokenRequestOptions.dpop.replayStore}; multi-instance
* resource servers must pass their own shared store.
*/
const defaultDpopReplayStore = createInMemoryDpopReplayStore();
/**
* Performs local verification of an access token for your APIs.
*
* Can also be configured for remote verification.
*/
async function verifyJwsAccessToken(token, opts) {
	try {
		const resolved = await getJwksForVerification(token, opts);
		let jwt;
		try {
			jwt = await jwtVerify(token, createLocalJWKSet(resolved.jwks), opts.verifyOptions);
		} catch (error) {
			if (shouldRefetchCachedJwksWithoutKid(error, resolved)) jwt = await jwtVerify(token, createLocalJWKSet((await getJwksForVerification(token, {
				...opts,
				forceRefresh: true
			})).jwks), opts.verifyOptions);
			else throw error;
		}
		if (jwt.payload.azp) jwt.payload.client_id = jwt.payload.azp;
		return jwt.payload;
	} catch (error) {
		if (error instanceof Error) throw error;
		throw new Error(error);
	}
}
async function getJwks(token, opts) {
	return (await getJwksForVerification(token, opts)).jwks;
}
async function getJwksForVerification(token, opts) {
	let jwtHeaders;
	try {
		jwtHeaders = decodeProtectedHeader(token);
	} catch (error) {
		if (error instanceof Error) throw error;
		throw new Error(error);
	}
	const kid = jwtHeaders.kid;
	if (typeof opts.jwksFetch !== "string") {
		const cacheKey = opts.jwksCacheKey;
		if (!cacheKey) {
			const jwks = await opts.jwksFetch();
			if (!jwks) throw new Error("No jwks found");
			return {
				jwks,
				fromCache: false,
				kid
			};
		}
		const cached = functionJwksCache.get(cacheKey);
		const cachedJwks = opts.forceRefresh ? void 0 : getFreshJwksWithKid(cached, kid);
		if (cachedJwks) return {
			jwks: cachedJwks,
			fromCache: true,
			kid,
			noKidRefetchedAt: cached?.noKidRefetchedAt
		};
		const jwks = await opts.jwksFetch();
		if (!jwks) throw new Error("No jwks found");
		const fetchedAt = Date.now();
		functionJwksCache.set(cacheKey, {
			jwks,
			fetchedAt,
			...opts.forceRefresh && !kid ? { noKidRefetchedAt: fetchedAt } : {}
		});
		return {
			jwks,
			fromCache: false,
			kid
		};
	}
	const cacheKey = opts.jwksFetch;
	const cached = jwksCache.get(cacheKey);
	const cachedJwks = opts.forceRefresh ? void 0 : getFreshJwksWithKid(cached, kid);
	if (!cachedJwks) {
		const jwks = await fetchJwks(opts.jwksFetch);
		const fetchedAt = Date.now();
		jwksCache.set(cacheKey, {
			jwks,
			fetchedAt,
			...opts.forceRefresh && !kid ? { noKidRefetchedAt: fetchedAt } : {}
		});
		return {
			jwks,
			fromCache: false,
			kid
		};
	}
	return {
		jwks: cachedJwks,
		fromCache: true,
		kid,
		noKidRefetchedAt: cached?.noKidRefetchedAt
	};
}
async function verifyAccessTokenPayload(token, opts) {
	let payload;
	if (opts.jwksUrl && !opts?.remoteVerify?.force) try {
		payload = await verifyJwsAccessToken(token, {
			jwksFetch: opts.jwksUrl,
			verifyOptions: opts.verifyOptions
		});
	} catch (error) {
		if (error instanceof Error) if (error.name === "TypeError" || error.name === "JWSInvalid") {} else if (error instanceof errors.JWTExpired) throw new APIError("UNAUTHORIZED", { message: "token expired" });
		else if (error instanceof errors.JOSEError) {
			if (isJoseInfrastructureError(error)) throw error;
			throw new APIError("UNAUTHORIZED", { message: "invalid access token" });
		} else throw error;
		else throw new Error(error);
	}
	if (opts?.remoteVerify) {
		const { data: introspect, error: introspectError } = await fetchRefusingRedirects(opts.remoteVerify.introspectUrl, {
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/x-www-form-urlencoded"
			},
			body: new URLSearchParams({
				client_id: opts.remoteVerify.clientId,
				client_secret: opts.remoteVerify.clientSecret,
				token,
				token_type_hint: "access_token"
			}).toString()
		});
		if (introspectError) logger.error(`Introspection failed: ${introspectError.message ?? introspectError.statusText}`);
		if (!introspect) throw new APIError("INTERNAL_SERVER_ERROR", { message: "introspection failed" });
		if (!introspect.active) throw new APIError("UNAUTHORIZED", { message: "token inactive" });
		try {
			const unsecuredJwt = new UnsecuredJWT(introspect).encode();
			const { audience: _audience, ...verifyOptionsNoAudience } = opts.verifyOptions;
			const skipAudience = !introspect.aud && opts.remoteVerify.allowMissingAudience === true;
			payload = UnsecuredJWT.decode(unsecuredJwt, skipAudience ? verifyOptionsNoAudience : opts.verifyOptions).payload;
		} catch (error) {
			throw new Error(error);
		}
	}
	if (!payload) throw new APIError("UNAUTHORIZED", { message: `no token payload` });
	const grantedScopes = parseGrantedScopes(payload.scope);
	if (opts.requiredScopes) {
		const isScopeSatisfied = opts.isScopeSatisfied ?? ((requiredScope, scopes) => scopes.has(requiredScope));
		const missingScopes = opts.requiredScopes.filter((scope) => !isScopeSatisfied(scope, grantedScopes));
		if (missingScopes.length > 0) throw createInsufficientScopeError(missingScopes);
	}
	return payload;
}
/**
* Build the RFC 6750 §3.1 insufficient-scope failure: the access token is valid
* but lacks scopes the operation needs.
*
* Resource-server challenge builders turn this into a `403` carrying a
* `WWW-Authenticate: Bearer error="insufficient_scope"` challenge that names
* `scopes`, so the client knows what to request when it re-authorizes. Throw it
* from a route handler to challenge for scopes only that operation needs; a
* plain `FORBIDDEN` stays a plain `403`, since a permission denial the client
* cannot fix by re-authorizing must not send the user through consent again.
*
* @param requiredScopes - Every scope the operation requires but the token lacks.
* @param description - RFC 6750 `error_description` text. It must use the
* printable ASCII character set allowed by the specification.
*/
const OAUTH_SCOPE_TOKEN_PATTERN = /^[\x21\x23-\x5b\x5d-\x7e]+$/;
const OAUTH_ERROR_DESCRIPTION_PATTERN = /^[\x20-\x21\x23-\x5b\x5d-\x7e]+$/;
const insufficientScopeErrors = /* @__PURE__ */ new WeakSet();
function isOAuthScopeToken(value) {
	return OAUTH_SCOPE_TOKEN_PATTERN.test(value);
}
function validateScopeTokens(scopes, label) {
	for (const scope of scopes) if (!isOAuthScopeToken(scope)) throw new TypeError(`invalid ${label}: ${JSON.stringify(scope)}`);
}
function validateRequiredScopes(opts) {
	if (opts.requiredScopes) validateScopeTokens(opts.requiredScopes, "required scope");
}
function parseGrantedScopes(scope) {
	if (scope === void 0) return /* @__PURE__ */ new Set();
	if (typeof scope !== "string" || scope.length === 0 || scope.split(" ").some((token) => !isOAuthScopeToken(token))) throw new APIError("UNAUTHORIZED", {
		message: "access token scope claim is invalid",
		error: "invalid_token",
		error_description: "access token scope claim is invalid"
	});
	return new Set(scope.split(" "));
}
function createInsufficientScopeError(requiredScopes, description = `access token is missing required scope: ${requiredScopes.join(" ")}`) {
	if (requiredScopes.length === 0) throw new TypeError("requiredScopes must contain at least one scope");
	validateScopeTokens(requiredScopes, "required scope");
	if (typeof description !== "string" || !OAUTH_ERROR_DESCRIPTION_PATTERN.test(description)) throw new TypeError("invalid error_description");
	const error = new APIError("FORBIDDEN", {
		message: description,
		error: "insufficient_scope",
		error_description: description,
		scope: [...new Set(requiredScopes)].join(" ")
	});
	insufficientScopeErrors.add(error);
	return error;
}
/**
* Returns whether an error is a typed RFC 6750 insufficient-scope failure.
*/
function isInsufficientScopeError(error) {
	if (!(error instanceof APIError) || !insufficientScopeErrors.has(error) || error.status !== "FORBIDDEN") return false;
	const body = error.body;
	if (body?.error !== "insufficient_scope" || typeof body.scope !== "string") return false;
	const scopes = body.scope.split(" ");
	return scopes.length > 0 && scopes.every(isOAuthScopeToken);
}
function throwDpopUnauthorized(message, error) {
	throw new APIError("UNAUTHORIZED", error ? {
		message,
		error,
		error_description: message
	} : { message });
}
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
async function verifyBearerToken(token, opts) {
	validateRequiredScopes(opts);
	const payload = await verifyAccessTokenPayload(token, opts);
	if (getDpopJktFromPayload(payload)) throwDpopUnauthorized("DPoP-bound access token requires verifyAccessTokenRequest", "invalid_token");
	return payload;
}
/**
* Verifies an HTTP resource request carrying an OAuth access token. This is the
* recommended resource-server entry point: it handles both bearer and
* DPoP-bound tokens, the bearer case being the request with no DPoP proof.
*
* It performs the same token validation as {@link verifyBearerToken}, then adds
* the RFC 9449 sender-constraint checks that need request context: authorization
* scheme, method, URL, DPoP proof, `ath`, and `cnf.jkt` binding.
*/
async function verifyAccessTokenRequest(request, opts) {
	validateRequiredScopes(opts);
	const authorization = parseAccessTokenAuthorization(request.authorizationHeader);
	if (!authorization?.token) throwDpopUnauthorized("missing authorization header");
	if (authorization.scheme === "Unknown") throwDpopUnauthorized("authorization scheme must be Bearer or DPoP", "invalid_token");
	const payload = await verifyAccessTokenPayload(authorization.token, opts);
	try {
		await enforceDpopBinding({
			payload,
			authorization,
			proofJwt: request.dpopProofJwt,
			method: request.method,
			url: request.url,
			replayStore: opts.dpop?.replayStore ?? defaultDpopReplayStore,
			proofMaxAgeSeconds: opts.dpop?.proofMaxAgeSeconds,
			signingAlgorithms: opts.dpop?.signingAlgorithms
		});
	} catch (error) {
		if (isDpopBindingError(error)) throwDpopUnauthorized(error.message, error.code);
		throw error;
	}
	return payload;
}
//#endregion
export { createInsufficientScopeError, getJwks, isInsufficientScopeError, requestToResourceInput, verifyAccessTokenRequest, verifyBearerToken, verifyJwsAccessToken };
