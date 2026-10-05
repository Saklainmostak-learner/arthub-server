import { GenericOAuthConfig } from "../types.mjs";
import { BaseOAuthProviderOptions } from "../index.mjs";

//#region src/plugins/generic-oauth/providers/microsoft-entra-id.d.ts
interface MicrosoftEntraIdOptions extends BaseOAuthProviderOptions {
  /**
   * Concrete Microsoft Entra ID tenant GUID.
   *
   * Use Better Auth's built-in Microsoft provider for the multi-tenant
   * `common`, `organizations`, or `consumers` authorities. Those authorities
   * require ID-token claim validation to derive the account's actual issuer.
   */
  tenantId: string;
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
declare function microsoftEntraId(options: MicrosoftEntraIdOptions): GenericOAuthConfig<"microsoft-entra-id">;
//#endregion
export { MicrosoftEntraIdOptions, microsoftEntraId };