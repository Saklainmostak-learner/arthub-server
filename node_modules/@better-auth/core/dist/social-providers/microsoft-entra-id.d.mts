import { ClientAssertionGetter } from "../oauth2/client-assertion.mjs";
import { OAuth2Tokens, OAuth2UserInfo, OAuthAccountKeyContext, ProviderOptions } from "../oauth2/oauth-provider.mjs";
import * as _$jose from "jose";

//#region src/social-providers/microsoft-entra-id.d.ts
/**
 * @see [Microsoft Identity Platform - Optional claims reference](https://learn.microsoft.com/en-us/entra/identity-platform/optional-claims-reference)
 */
interface MicrosoftEntraIDProfile extends Record<string, any> {
  /** Identifies the intended recipient of the token */
  aud: string;
  /** Identifies the issuer, or "authorization server" that constructs and returns the token */
  iss: string;
  /** Indicates when the authentication for the token occurred */
  iat: Date;
  /** Records the identity provider that authenticated the subject of the token */
  idp: string;
  /** Identifies the time before which the JWT can't be accepted for processing */
  nbf: Date;
  /** Identifies the expiration time on or after which the JWT can't be accepted for processing */
  exp: Date;
  /** Code hash included in ID tokens when issued with an OAuth 2.0 authorization code */
  c_hash: string;
  /** Access token hash included in ID tokens when issued with an OAuth 2.0 access token */
  at_hash: string;
  /** Internal claim used to record data for token reuse */
  aio: string;
  /** The primary username that represents the user */
  preferred_username: string;
  /** User's email address */
  email?: string;
  /** Human-readable value that identifies the subject of the token */
  name: string;
  /** Matches the parameter included in the original authorize request */
  nonce: string;
  /** User's profile picture */
  picture: string;
  /** Immutable identifier for the user account */
  oid: string;
  /** Set of roles assigned to the user */
  roles: string[];
  /** Internal claim used to revalidate tokens */
  rh: string;
  /** Subject identifier - unique to application ID */
  sub: string;
  /** Tenant ID the user is signing in to */
  tid: string;
  /** Unique identifier for a session */
  sid: string;
  /** Token identifier claim */
  uti: string;
  /** Indicates if user is in at least one group */
  hasgroups: boolean;
  /** User account status in tenant (0 = member, 1 = guest) */
  acct: 0 | 1;
  /** Auth Context IDs */
  acrs: string;
  /** Time when the user last authenticated */
  auth_time: Date;
  /** User's country/region */
  ctry: string;
  /** IP address of requesting client when inside VNET */
  fwd: string;
  /** Group claims */
  groups: string;
  /** Login hint for SSO */
  login_hint: string;
  /** Resource tenant's country/region */
  tenant_ctry: string;
  /** Region of the resource tenant */
  tenant_region_scope: string;
  /** UserPrincipalName */
  upn: string;
  /** User's verified primary email addresses */
  verified_primary_email: string[];
  /** User's verified secondary email addresses */
  verified_secondary_email: string[];
  /** Whether the user's email is verified (optional claim, must be configured in app registration) */
  email_verified?: boolean | undefined;
  /** VNET specifier information */
  vnet: string;
  /** Client Capabilities */
  xms_cc: string;
  /** Whether user's email domain is verified */
  xms_edov: boolean;
  /** Preferred data location for Multi-Geo tenants */
  xms_pdl: string;
  /** User preferred language */
  xms_pl: string;
  /** Tenant preferred language */
  xms_tpl: string;
  /** Zero-touch Deployment ID */
  ztdid: string;
  /** IP Address */
  ipaddr: string;
  /** On-premises Security Identifier */
  onprem_sid: string;
  /** Password Expiration Time */
  pwd_exp: number;
  /** Change Password URL */
  pwd_url: string;
  /** Inside Corporate Network flag */
  in_corp: string;
  /** User's family name/surname */
  family_name: string;
  /** User's given/first name */
  given_name: string;
}
interface MicrosoftOptions extends ProviderOptions<MicrosoftEntraIDProfile> {
  clientId: string | string[];
  /**
   * The tenant ID of the Microsoft account
   * @default "common"
   */
  tenantId?: string;
  /**
   * The authentication authority URL. Use the default "https://login.microsoftonline.com" for standard Entra ID or "https://<tenant-id>.ciamlogin.com" for CIAM scenarios.
   * @default "https://login.microsoftonline.com"
   */
  authority?: string;
  /**
   * Function that returns a JWT client assertion for token endpoint authentication.
   *
   * Use this instead of `clientSecret` when your Microsoft Entra ID app is
   * configured for client authentication with assertions (private_key_jwt or
   * workload identity federation).
   */
  clientAssertion?: ClientAssertionGetter;
  /**
   * The size of the profile photo
   * @default 48
   */
  profilePhotoSize?: 48 | 64 | 96 | 120 | 240 | 360 | 432 | 504 | 648;
  /**
   * Disable profile photo
   */
  disableProfilePhoto?: boolean;
}
declare const microsoft: (options: MicrosoftOptions) => {
  id: "microsoft";
  name: string;
  accountSubject: ({
    profile
  }: OAuthAccountKeyContext<MicrosoftEntraIDProfile>) => string;
  createAuthorizationURL(data: {
    state: string;
    codeVerifier: string;
    scopes?: string[] | undefined;
    redirectURI: string;
    display?: string | undefined;
    loginHint?: string | undefined;
    idTokenNonce?: string | undefined;
    additionalParams?: Record<string, string> | undefined;
  }): Promise<URL>;
  validateAuthorizationCode({
    code,
    codeVerifier,
    redirectURI
  }: {
    code: string;
    redirectURI: string;
    codeVerifier?: string | undefined;
    deviceId?: string | undefined;
  }): Promise<OAuth2Tokens>;
  idToken: {
    jwks: (header: _$jose.JWTHeaderParameters) => Promise<Uint8Array<ArrayBufferLike> | CryptoKey>;
    audience: string | string[];
    maxTokenAge: string;
    /**
     * Issuer varies per tenant for multi-tenant endpoints, so only validate it for
     * specific tenants.
     * @see https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols#endpoints
     */
    issuer: string | undefined;
    /**
     * The multi-tenant endpoints (common/organizations/consumers) skip the
     * issuer check above because the issuer varies per tenant, and the
     * organizations and consumers JWKS sets overlap. Enforce the tenant
     * binding explicitly so a token from a disallowed account class cannot
     * pass: the issuer must name the token's own tenant, and the account
     * class must match the configured restriction.
     * @see https://learn.microsoft.com/en-us/entra/identity-platform/id-token-claims-reference
     */
    verifyClaims: (claims: Record<string, unknown>) => boolean;
  };
  getUserInfo(token: OAuth2Tokens & {
    expectedIdTokenNonce?: string | undefined;
    user?: {
      name?: {
        firstName?: string;
        lastName?: string;
      };
      email?: string;
    } | undefined;
  }): Promise<{
    user: OAuth2UserInfo & Record<string, unknown>;
    data: MicrosoftEntraIDProfile;
  } | null>;
  refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
  options: MicrosoftOptions;
};
declare const getMicrosoftPublicKey: (kid: string, tenant: string, authority: string) => Promise<Uint8Array<ArrayBufferLike> | CryptoKey>;
//#endregion
export { MicrosoftEntraIDProfile, MicrosoftOptions, getMicrosoftPublicKey, microsoft };