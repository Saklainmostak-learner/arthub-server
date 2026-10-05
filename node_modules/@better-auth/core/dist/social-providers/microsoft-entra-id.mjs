import { APIError, BetterAuthError } from "../error/index.mjs";
import { logger } from "../env/logger.mjs";
import { getPrimaryClientId } from "../oauth2/utils.mjs";
import { createAuthorizationURL } from "../oauth2/create-authorization-url.mjs";
import { refreshAccessToken } from "../oauth2/refresh-access-token.mjs";
import { validateAuthorizationCode } from "../oauth2/validate-authorization-code.mjs";
import { base64 } from "@better-auth/utils/base64";
import { decodeJwt, importJWK } from "jose";
import { betterFetch } from "@better-fetch/fetch";
//#region src/social-providers/microsoft-entra-id.ts
/**
* Microsoft's fixed tenant id for personal (consumer) Microsoft accounts. Every
* personal-account token carries it as the `tid` claim, so it distinguishes the
* consumer account class from work/school tenants.
* @see https://learn.microsoft.com/en-us/entra/identity-platform/id-token-claims-reference
*/
const MICROSOFT_CONSUMER_TENANT_ID = "9188040d-6c67-4c5b-b112-36a304b66dad";
const microsoft = (options) => {
	const tenant = options.tenantId || "common";
	let authority = options.authority || "https://login.microsoftonline.com";
	while (authority.endsWith("/")) authority = authority.slice(0, -1);
	const authorizationEndpoint = `${authority}/${tenant}/oauth2/v2.0/authorize`;
	const tokenEndpoint = `${authority}/${tenant}/oauth2/v2.0/token`;
	if (options.clientSecret && options.clientAssertion) throw new BetterAuthError("Microsoft Entra ID clientAssertion cannot be combined with clientSecret");
	const tokenEndpointAuth = options.clientAssertion ? {
		method: "private_key_jwt",
		getClientAssertion: options.clientAssertion
	} : void 0;
	return {
		id: "microsoft",
		name: "Microsoft EntraID",
		accountSubject: ({ profile }) => profile.oid,
		createAuthorizationURL(data) {
			if (!getPrimaryClientId(options.clientId)) {
				logger.error("Client Id is required for Microsoft Entra ID. Make sure to provide it in the options.");
				throw new BetterAuthError("CLIENT_ID_AND_SECRET_REQUIRED");
			}
			const scopes = options.disableDefaultScope ? [] : [
				"openid",
				"profile",
				"email",
				"User.Read",
				"offline_access"
			];
			if (options.scope) scopes.push(...options.scope);
			if (data.scopes) scopes.push(...data.scopes);
			return createAuthorizationURL({
				id: "microsoft",
				options,
				authorizationEndpoint,
				state: data.state,
				codeVerifier: data.codeVerifier,
				scopes,
				redirectURI: data.redirectURI,
				prompt: options.prompt,
				loginHint: data.loginHint,
				additionalParams: data.additionalParams
			});
		},
		validateAuthorizationCode({ code, codeVerifier, redirectURI }) {
			return validateAuthorizationCode({
				code,
				codeVerifier,
				redirectURI,
				options,
				tokenEndpoint,
				tokenEndpointAuth
			});
		},
		idToken: {
			jwks: (header) => getMicrosoftPublicKey(header.kid, tenant, authority),
			audience: options.clientId,
			maxTokenAge: "1h",
			/**
			* Issuer varies per tenant for multi-tenant endpoints, so only validate it for
			* specific tenants.
			* @see https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols#endpoints
			*/
			issuer: tenant !== "common" && tenant !== "organizations" && tenant !== "consumers" ? `${authority}/${tenant}/v2.0` : void 0,
			/**
			* The multi-tenant endpoints (common/organizations/consumers) skip the
			* issuer check above because the issuer varies per tenant, and the
			* organizations and consumers JWKS sets overlap. Enforce the tenant
			* binding explicitly so a token from a disallowed account class cannot
			* pass: the issuer must name the token's own tenant, and the account
			* class must match the configured restriction.
			* @see https://learn.microsoft.com/en-us/entra/identity-platform/id-token-claims-reference
			*/
			verifyClaims: (claims) => {
				const tid = claims.tid;
				if (typeof tid !== "string" || claims.iss !== `${authority}/${tid}/v2.0`) return false;
				if (tenant === "organizations" && tid === MICROSOFT_CONSUMER_TENANT_ID) return false;
				if (tenant === "consumers" && tid !== MICROSOFT_CONSUMER_TENANT_ID) return false;
				return true;
			}
		},
		async getUserInfo(token) {
			if (options.getUserInfo) return options.getUserInfo(token);
			if (!token.idToken) return null;
			const user = decodeJwt(token.idToken);
			if (typeof user.oid !== "string" || user.oid.trim().length === 0) {
				logger.error("Microsoft Entra ID token did not include a valid oid claim; unable to resolve a stable account identifier.");
				return null;
			}
			const profilePhotoSize = options.profilePhotoSize || 48;
			if (!options.disableProfilePhoto && token.accessToken) await betterFetch(`https://graph.microsoft.com/v1.0/me/photos/${profilePhotoSize}x${profilePhotoSize}/$value`, {
				headers: { Authorization: `Bearer ${token.accessToken}` },
				async onResponse(context) {
					if (!context.response.ok) return;
					try {
						const pictureBuffer = await context.response.clone().arrayBuffer();
						user.picture = `data:image/jpeg;base64, ${base64.encode(pictureBuffer)}`;
					} catch (e) {
						logger.error(e && typeof e === "object" && "name" in e ? e.name : "", e);
					}
				}
			});
			const userMap = await options.mapProfileToUser?.(user);
			const emailVerified = user.email_verified !== void 0 ? user.email_verified : user.email && (user.verified_primary_email?.includes(user.email) || user.verified_secondary_email?.includes(user.email)) ? true : false;
			return {
				user: {
					name: user.name,
					email: user.email,
					image: user.picture,
					emailVerified,
					...userMap
				},
				data: user
			};
		},
		refreshAccessToken: options.refreshAccessToken ? options.refreshAccessToken : async (refreshToken) => {
			const scopes = options.disableDefaultScope ? [] : [
				"openid",
				"profile",
				"email",
				"User.Read",
				"offline_access"
			];
			if (options.scope) scopes.push(...options.scope);
			return refreshAccessToken({
				refreshToken,
				options: {
					clientId: options.clientId,
					clientSecret: options.clientSecret
				},
				extraParams: { scope: scopes.join(" ") },
				tokenEndpoint,
				tokenEndpointAuth
			});
		},
		options
	};
};
const getMicrosoftPublicKey = async (kid, tenant, authority) => {
	const { data } = await betterFetch(`${authority}/${tenant}/discovery/v2.0/keys`);
	if (!data?.keys) throw new APIError("BAD_REQUEST", { message: "Keys not found" });
	const jwk = data.keys.find((key) => key.kid === kid);
	if (!jwk) throw new Error(`JWK with kid ${kid} not found`);
	return await importJWK(jwk, jwk.alg);
};
//#endregion
export { getMicrosoftPublicKey, microsoft };
