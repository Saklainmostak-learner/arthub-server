import { decodeJwt } from "jose";
import { betterFetch } from "@better-fetch/fetch";
import { createPlaceholderEmail } from "@better-auth/core/utils/email";
//#region src/plugins/generic-oauth/providers/microsoft-entra-id.ts
function getMicrosoftProfileName(profile) {
	return profile.name ?? (`${profile.given_name ?? profile.givenname ?? ""} ${profile.family_name ?? profile.familyname ?? ""}`.trim() || void 0);
}
/**
* Microsoft Entra ID (Azure AD) OAuth provider helper
*
* @example
* ```ts
* import { genericOAuth, microsoftEntraId } from "better-auth/plugins/generic-oauth";
*
* export const auth = betterAuth({
*   plugins: [
*     genericOAuth({
*       config: [
*         microsoftEntraId({
*           clientId: process.env.MS_APP_ID,
*           clientSecret: process.env.MS_CLIENT_SECRET,
*           tenantId: process.env.MS_TENANT_ID,
*         }),
*       ],
*     }),
*   ],
* });
* ```
*/
function microsoftEntraId(options) {
	const defaultScopes = [
		"openid",
		"profile",
		"email"
	];
	const tenantId = typeof options.tenantId === "string" ? options.tenantId.toLowerCase() : "";
	if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(tenantId)) throw new Error("The generic microsoftEntraId helper requires a concrete Microsoft Entra tenant GUID. Use the built-in Microsoft provider for common, organizations, or consumers.");
	const authorizationUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`;
	const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
	const discoveryUrl = `https://login.microsoftonline.com/${tenantId}/v2.0/.well-known/openid-configuration`;
	const userInfoUrl = "https://graph.microsoft.com/oidc/userinfo";
	const getUserInfo = async (tokens) => {
		if (!tokens.idToken) return null;
		let tokenProfile;
		try {
			tokenProfile = decodeJwt(tokens.idToken);
		} catch {
			return null;
		}
		const oid = typeof tokenProfile.oid === "string" && tokenProfile.oid.trim().length > 0 ? tokenProfile.oid : void 0;
		if (!oid) return null;
		const tokenEmail = tokenProfile.email;
		const tokenUserInfo = {
			...tokenProfile,
			name: getMicrosoftProfileName(tokenProfile),
			email: tokenEmail ?? createPlaceholderEmail({
				identifier: oid,
				namespace: "microsoft-entra-id"
			}),
			image: tokenProfile.picture,
			emailVerified: tokenEmail ? tokenProfile.email_verified ?? false : false
		};
		if (!tokens.accessToken) return tokenUserInfo;
		const { data: profile, error } = await betterFetch(userInfoUrl, { headers: { Authorization: `Bearer ${tokens.accessToken}` } });
		if (error || !profile) return tokenUserInfo;
		if (typeof tokenProfile.sub !== "string" || profile.sub !== tokenProfile.sub) return tokenUserInfo;
		const emailClaim = tokenProfile.email ?? profile.email;
		return {
			...profile,
			...tokenProfile,
			name: getMicrosoftProfileName(tokenProfile) ?? getMicrosoftProfileName(profile),
			email: emailClaim ?? createPlaceholderEmail({
				identifier: oid,
				namespace: "microsoft-entra-id"
			}),
			image: tokenProfile.picture ?? profile.picture,
			emailVerified: emailClaim != null ? tokenProfile.email_verified ?? profile.email_verified ?? false : false
		};
	};
	return {
		providerId: "microsoft-entra-id",
		accountSubject: ({ profile }) => typeof profile.oid === "string" ? profile.oid : "",
		discoveryUrl,
		requireIdTokenVerification: true,
		authorizationUrl,
		tokenUrl,
		userInfoUrl,
		clientId: options.clientId,
		clientSecret: options.clientSecret,
		tokenEndpointAuth: options.tokenEndpointAuth,
		scopes: options.scopes ?? defaultScopes,
		redirectURI: options.redirectURI,
		endSessionEndpoint: options.endSessionEndpoint,
		postLogoutRedirectURI: options.postLogoutRedirectURI,
		disableProviderLogout: options.disableProviderLogout,
		pkce: options.pkce,
		disableImplicitSignUp: options.disableImplicitSignUp,
		disableSignUp: options.disableSignUp,
		overrideUserInfo: options.overrideUserInfo,
		getUserInfo
	};
}
//#endregion
export { microsoftEntraId };
