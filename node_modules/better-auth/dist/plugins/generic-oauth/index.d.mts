import { GenericOAuthConfig, GenericOAuthOptions, GenericOAuthUserInfo } from "./types.mjs";
import { Auth0Options, auth0 } from "./providers/auth0.mjs";
import { GumroadOptions, gumroad } from "./providers/gumroad.mjs";
import { HubSpotOptions, hubspot } from "./providers/hubspot.mjs";
import { KeycloakOptions, keycloak } from "./providers/keycloak.mjs";
import { LineOptions, line } from "./providers/line.mjs";
import { MicrosoftEntraIdOptions, microsoftEntraId } from "./providers/microsoft-entra-id.mjs";
import { OktaOptions, okta } from "./providers/okta.mjs";
import { PatreonOptions, patreon } from "./providers/patreon.mjs";
import { SlackOptions, slack } from "./providers/slack.mjs";
import { YandexOptions, yandex } from "./providers/yandex.mjs";
import { AuthContext } from "@better-auth/core";
import * as _$_better_auth_core_oauth20 from "@better-auth/core/oauth2";
import { OAuthProvider } from "@better-auth/core/oauth2";
import * as _$_better_auth_core_utils_error_codes0 from "@better-auth/core/utils/error-codes";

//#region src/plugins/generic-oauth/index.d.ts
declare module "@better-auth/core" {
  interface BetterAuthPluginRegistry<AuthOptions, Options> {
    "generic-oauth": {
      creator: typeof genericOAuth;
    };
  }
}
/**
 * Base type for OAuth provider options.
 * Extracts common fields from GenericOAuthConfig for provider helpers.
 */
type BaseOAuthProviderOptions = Pick<GenericOAuthConfig, "clientId" | "clientSecret" | "tokenEndpointAuth" | "scopes" | "redirectURI" | "endSessionEndpoint" | "postLogoutRedirectURI" | "disableProviderLogout" | "pkce" | "disableImplicitSignUp" | "disableSignUp" | "overrideUserInfo">;
/**
 * A generic OAuth plugin that registers any OAuth/OIDC provider
 * as a first-class social provider.
 *
 * Providers are used through the standard `signIn.social` and
 * `callback/:id` core endpoints — no plugin-specific endpoints needed.
 */
declare const genericOAuth: <const ID extends string>(options: GenericOAuthOptions<ID>) => {
  id: "generic-oauth";
  version: string;
  init: (ctx: AuthContext) => Promise<{
    context: {
      socialProviders: OAuthProvider<object, Partial<_$_better_auth_core_oauth20.ProviderOptions<object>>>[];
    };
  }>;
  options: GenericOAuthOptions<ID>;
  $ERROR_CODES: {
    INVALID_OAUTH_CONFIGURATION: _$_better_auth_core_utils_error_codes0.RawError<"INVALID_OAUTH_CONFIGURATION">;
    TOKEN_URL_NOT_FOUND: _$_better_auth_core_utils_error_codes0.RawError<"TOKEN_URL_NOT_FOUND">;
  };
};
//#endregion
export { Auth0Options, BaseOAuthProviderOptions, type GenericOAuthConfig, type GenericOAuthOptions, type GenericOAuthUserInfo, GumroadOptions, HubSpotOptions, KeycloakOptions, LineOptions, MicrosoftEntraIdOptions, OktaOptions, PatreonOptions, SlackOptions, YandexOptions, auth0, genericOAuth, gumroad, hubspot, keycloak, line, microsoftEntraId, okta, patreon, slack, yandex };