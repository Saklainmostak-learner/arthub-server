import { SignJWT, importJWK, importPKCS8 } from "jose";
//#region src/oauth2/client-assertion.ts
/** Asymmetric signing algorithms compatible with private_key_jwt (RFC 7523). */
const PRIVATE_KEY_JWT_SIGNING_ALGORITHMS = [
	"RS256",
	"RS384",
	"RS512",
	"PS256",
	"PS384",
	"PS512",
	"ES256",
	"ES384",
	"ES512",
	"EdDSA"
];
function assertSupportedPrivateKeyJwtAlgorithm(candidate) {
	if (!PRIVATE_KEY_JWT_SIGNING_ALGORITHMS.includes(candidate)) throw new Error(`Unsupported private_key_jwt signing algorithm: ${candidate}. Use one of ${PRIVATE_KEY_JWT_SIGNING_ALGORITHMS.join(", ")}.`);
}
/**
* Validates `private_key_jwt` options eagerly and returns the algorithm to
* use for signing.
*
* Asserts that key material is configured, that any explicit `algorithm` is
* supported, that any JWK-embedded `alg` is supported, and that the two
* agree when both are set.
*/
function resolveValidPrivateKeyJwtOptions(options) {
	if (!options.privateKeyJwk && !options.privateKeyPem) throw new Error("private_key_jwt requires either privateKeyJwk or privateKeyPem");
	if (options.algorithm) assertSupportedPrivateKeyJwtAlgorithm(options.algorithm);
	const jwkAlg = options.privateKeyJwk?.alg;
	if (typeof jwkAlg === "string") assertSupportedPrivateKeyJwtAlgorithm(jwkAlg);
	if (options.algorithm && typeof jwkAlg === "string" && options.algorithm !== jwkAlg) throw new Error(`JWK alg "${jwkAlg}" does not match configured algorithm "${options.algorithm}". Remove the JWK alg field, or pass an algorithm that matches the JWK.`);
	return options.algorithm ?? (typeof jwkAlg === "string" ? jwkAlg : "RS256");
}
const CLIENT_ASSERTION_TYPE = "urn:ietf:params:oauth:client-assertion-type:jwt-bearer";
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
async function signPrivateKeyJwtClientAssertion({ clientId, tokenEndpoint, privateKeyJwk, privateKeyPem, kid, algorithm, expiresIn = 120 }) {
	const resolvedAlg = resolveValidPrivateKeyJwtOptions({
		privateKeyJwk,
		privateKeyPem,
		algorithm
	});
	const resolvedKid = kid ?? privateKeyJwk?.kid;
	const key = privateKeyJwk ? await importJWK(privateKeyJwk, resolvedAlg) : await importPKCS8(privateKeyPem, resolvedAlg);
	const now = Math.floor(Date.now() / 1e3);
	const jti = crypto.randomUUID();
	const header = {
		alg: resolvedAlg,
		typ: "JWT"
	};
	if (resolvedKid) header.kid = resolvedKid;
	return new SignJWT({}).setProtectedHeader(header).setIssuer(clientId).setSubject(clientId).setAudience(tokenEndpoint).setIssuedAt(now).setExpirationTime(now + expiresIn).setJti(jti).sign(key);
}
/**
* Creates a client assertion getter for `private_key_jwt` authentication.
*
* Validates options eagerly (key material, supported algorithm, JWK alg
* agreement) so misconfiguration surfaces at construction rather than on the
* first token request. The returned function signs a fresh RFC 7523 JWT
* assertion for every token endpoint request.
*/
function createPrivateKeyJwtClientAssertionGetter(options) {
	resolveValidPrivateKeyJwtOptions({
		privateKeyJwk: options.privateKeyJwk,
		privateKeyPem: options.privateKeyPem,
		algorithm: options.algorithm
	});
	return ({ clientId, tokenEndpoint }) => signPrivateKeyJwtClientAssertion({
		clientId,
		tokenEndpoint,
		privateKeyJwk: options.privateKeyJwk,
		privateKeyPem: options.privateKeyPem,
		kid: options.kid,
		algorithm: options.algorithm,
		expiresIn: options.expiresIn
	});
}
/**
* Resolves a client assertion getter into `client_assertion` + `client_assertion_type` params for injection into a token request body.
*/
async function resolveClientAssertionParams({ getClientAssertion, context }) {
	return {
		client_assertion: await getClientAssertion(context),
		client_assertion_type: CLIENT_ASSERTION_TYPE
	};
}
//#endregion
export { CLIENT_ASSERTION_TYPE, PRIVATE_KEY_JWT_SIGNING_ALGORITHMS, createPrivateKeyJwtClientAssertionGetter, resolveClientAssertionParams, signPrivateKeyJwtClientAssertion };
