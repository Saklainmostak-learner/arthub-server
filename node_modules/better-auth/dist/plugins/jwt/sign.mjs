import { symmetricDecrypt } from "../../crypto/index.mjs";
import { getJwksAdapter } from "./adapter.mjs";
import { createJwk, toExpJWT } from "./utils.mjs";
import { BetterAuthError } from "@better-auth/core/error";
import { SignJWT, importJWK } from "jose";
//#region src/plugins/jwt/sign.ts
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
async function resolveSigningKey(ctx, options, overrides) {
	if (options?.jwt?.sign) return null;
	const adapter = getJwksAdapter(ctx.context.adapter, options);
	let key;
	if (overrides?.signingKeyId !== void 0) {
		key = await adapter.getKeyById(ctx, overrides.signingKeyId);
		if (!key) throw new BetterAuthError(`signJWT: signingKeyId "${overrides.signingKeyId}" not found in JWKS. The key must be provisioned before it can be referenced.`);
		if (overrides.signingAlgorithm !== void 0) {
			const configAlg = options?.jwks?.keyPairConfig?.alg ?? "EdDSA";
			if ((key.alg ?? configAlg) !== overrides.signingAlgorithm) throw new BetterAuthError(`signJWT: signingKeyId "${overrides.signingKeyId}" has alg "${key.alg ?? `unset (inherits keyPairConfig.alg "${configAlg}")`}" but signingAlgorithm was set to "${overrides.signingAlgorithm}".`);
		}
	} else if (overrides?.signingAlgorithm !== void 0) {
		key = await adapter.getLatestKeyByAlg(ctx, overrides.signingAlgorithm);
		if (!key) {
			const primaryAlg = options?.jwks?.keyPairConfig?.alg ?? "EdDSA";
			const preconfig = options?.jwks?.keyPairConfigs?.find((c) => c.alg === overrides.signingAlgorithm);
			const isPrimary = primaryAlg === overrides.signingAlgorithm;
			if (preconfig || isPrimary) key = await createJwk(ctx, {
				...options,
				jwks: {
					...options?.jwks,
					keyPairConfig: preconfig ?? options?.jwks?.keyPairConfig
				}
			});
			else {
				const advertisedExtra = options?.jwks?.keyPairConfigs?.map((c) => c.alg).join(", ") || "none";
				throw new BetterAuthError(`signJWT: no key with alg "${overrides.signingAlgorithm}" found in JWKS. The plugin auto-mints only one key matching keyPairConfig.alg="${primaryAlg}"; additional algs configured via keyPairConfigs: ${advertisedExtra}. Add "${overrides.signingAlgorithm}" to jwks.keyPairConfigs so the plugin provisions it on first use, or mint the key explicitly via createJwk().`);
			}
		}
	} else {
		const primaryAlg = options?.jwks?.keyPairConfig?.alg ?? "EdDSA";
		key = await adapter.getLatestKeyByAlg(ctx, primaryAlg) ?? await adapter.getLatestKey(ctx);
	}
	if (!key || key.expiresAt && key.expiresAt < /* @__PURE__ */ new Date()) {
		if (overrides?.signingKeyId !== void 0 || overrides?.signingAlgorithm !== void 0) throw new BetterAuthError("signJWT: requested signing key is expired and an explicit kid/alg was provided; not auto-minting a replacement. Rotate the key explicitly.");
		key = await createJwk(ctx, options);
	}
	const privateWebKey = !options?.jwks?.disablePrivateKeyEncryption ? await symmetricDecrypt({
		key: ctx.context.secretConfig,
		data: JSON.parse(key.privateKey)
	}).catch(() => {
		throw new BetterAuthError("Failed to decrypt private key. Make sure the secret currently in use is the same as the one used to encrypt the private key. If you are using a different secret, either clean up your JWKS or disable private key encryption.");
	}) : key.privateKey;
	const alg = key.alg ?? options?.jwks?.keyPairConfig?.alg ?? "EdDSA";
	const privateKey = await importJWK(JSON.parse(privateWebKey), alg);
	return {
		alg,
		kid: key.id,
		privateKey
	};
}
async function signJWT(ctx, config) {
	const { options } = config;
	const payload = config.payload;
	const nowSeconds = Math.floor(Date.now() / 1e3);
	const iat = payload.iat;
	let exp = payload.exp;
	const defaultExp = toExpJWT(options?.jwt?.expirationTime ?? "15m", iat ?? nowSeconds);
	exp = exp ?? defaultExp;
	const nbf = payload.nbf;
	const baseURLOrigin = typeof ctx.context.options.baseURL === "string" ? ctx.context.options.baseURL : "";
	const iss = payload.iss;
	const defaultIss = options?.jwt?.issuer ?? baseURLOrigin;
	const aud = payload.aud;
	const defaultAud = options?.jwt?.audience ?? baseURLOrigin;
	if (options?.jwt?.sign) {
		const jwtPayload = {
			...payload,
			iat,
			exp,
			nbf,
			iss: iss ?? defaultIss,
			aud: aud ?? defaultAud
		};
		return options.jwt.sign(jwtPayload, config.header, {
			signingKeyId: config.signingKeyId,
			signingAlgorithm: config.signingAlgorithm
		});
	}
	const { alg, kid, privateKey } = config.resolvedKey ?? await resolveSigningKey(ctx, options, {
		signingKeyId: config.signingKeyId,
		signingAlgorithm: config.signingAlgorithm
	});
	const jwt = new SignJWT(payload).setProtectedHeader({
		...config.header,
		alg,
		kid
	}).setExpirationTime(exp).setIssuer(iss ?? defaultIss).setAudience(aud ?? defaultAud);
	if (iat) jwt.setIssuedAt(iat);
	if (payload.sub) jwt.setSubject(payload.sub);
	if (payload.nbf) jwt.setNotBefore(payload.nbf);
	if (payload.jti) jwt.setJti(payload.jti);
	return await jwt.sign(privateKey);
}
async function getJwtToken(ctx, options) {
	const payload = !options?.jwt?.definePayload ? ctx.context.session.user : await options.jwt.definePayload(ctx.context.session);
	return await signJWT(ctx, {
		options,
		payload: {
			iat: Math.floor(Date.now() / 1e3),
			...payload,
			sub: await options?.jwt?.getSubject?.(ctx.context.session) ?? ctx.context.session.user.id
		}
	});
}
//#endregion
export { getJwtToken, resolveSigningKey, signJWT };
