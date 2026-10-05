import { decodeJwt } from "jose";
import { betterFetch } from "@better-fetch/fetch";
//#region src/plugins/generic-oauth/providers/line.ts
/**
* LINE OAuth provider helper
*
* LINE requires separate channels for different countries (Japan, Thailand, Taiwan, etc.).
* Each channel has its own clientId and clientSecret. To support multiple countries,
* call this function multiple times with different providerIds and credentials.
*
* @example
* ```ts
* import { genericOAuth, line } from "better-auth/plugins/generic-oauth";
*
* export const auth = betterAuth({
*   plugins: [
*     genericOAuth({
*       config: [
*         // Japan channel
*         line({
*           providerId: "line-jp",
*           clientId: process.env.LINE_JP_CLIENT_ID,
*           clientSecret: process.env.LINE_JP_CLIENT_SECRET,
*         }),
*         // Thailand channel
*         line({
*           providerId: "line-th",
*           clientId: process.env.LINE_TH_CLIENT_ID,
*           clientSecret: process.env.LINE_TH_CLIENT_SECRET,
*         }),
*         // Taiwan channel
*         line({
*           providerId: "line-tw",
*           clientId: process.env.LINE_TW_CLIENT_ID,
*           clientSecret: process.env.LINE_TW_CLIENT_SECRET,
*         }),
*       ],
*     }),
*   ],
* });
* ```
*/
function line(options) {
	const defaultScopes = [
		"openid",
		"profile",
		"email"
	];
	const authorizationUrl = "https://access.line.me/oauth2/v2.1/authorize";
	const tokenUrl = "https://api.line.me/oauth2/v2.1/token";
	const userInfoUrl = "https://api.line.me/oauth2/v2.1/userinfo";
	const getUserInfo = async (tokens) => {
		let profile = null;
		if (tokens.idToken) try {
			profile = decodeJwt(tokens.idToken);
		} catch {}
		if (!profile) {
			const { data, error } = await betterFetch(userInfoUrl, { headers: { Authorization: `Bearer ${tokens.accessToken}` } });
			if (error || !data) return null;
			profile = data;
		}
		if (!profile) return null;
		return {
			sub: profile.sub,
			name: profile.name,
			email: profile.email,
			image: profile.picture,
			emailVerified: false
		};
	};
	return {
		providerId: options.providerId ?? "line",
		accountSubject: ({ profile }) => profile.sub ?? "",
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
export { line };
