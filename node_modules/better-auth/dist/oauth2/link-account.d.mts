import { Account, User } from "../types/models.mjs";
import { GenericEndpointContext, UserProvisioningSource } from "@better-auth/core";

//#region src/oauth2/link-account.d.ts
type OAuthAccountData = Omit<Account, "id" | "userId" | "createdAt" | "updatedAt">;
/**
 * Provider profile a freshly linked account may copy onto the local user.
 * `email` and `emailVerified` are identity anchors and are stripped before
 * the remaining fields are written. Provider identity is resolved separately
 * from the raw profile through the provider's account-key contract.
 */
type LinkedProviderProfile = {
  name?: string | undefined;
  email?: string | null | undefined;
  emailVerified?: boolean | undefined;
  image?: string | null | undefined;
};
interface LinkOAuthAccountOptions {
  link: {
    userId: string;
    email: string;
  };
  userInfo: LinkedProviderProfile;
  account: OAuthAccountData;
  profile: Record<string, unknown>;
  scopes?: string[] | undefined;
}
interface LinkOAuthAccountFailure {
  linked: false;
  error: {
    code: string;
    message?: string | undefined;
  };
}
type LinkOAuthAccountResult = {
  linked: true;
} | LinkOAuthAccountFailure;
declare function linkOAuthAccount(c: GenericEndpointContext, {
  link,
  userInfo,
  account,
  profile,
  scopes
}: LinkOAuthAccountOptions): Promise<LinkOAuthAccountResult>;
declare function handleOAuthUserInfo(c: GenericEndpointContext, opts: {
  userInfo: Omit<User, "createdAt" | "updatedAt">;
  account: OAuthAccountData;
  callbackURL?: string | undefined;
  disableSignUp?: boolean | undefined;
  overrideUserInfo?: boolean | undefined;
  isTrustedProvider?: boolean | undefined;
  trustProviderByName?: boolean | undefined;
  source?: UserProvisioningSource | undefined;
  selectedUser?: {
    userId: string;
    profile: "preserve" | "update";
  } | undefined;
  deferNonDatabaseWrites?: boolean | undefined;
  requireExactAccountBinding?: boolean | undefined;
}): Promise<{
  error: string;
  data: null;
  isRegister: boolean;
  accountCookie?: undefined;
} | {
  error: string;
  data: null;
  isRegister?: undefined;
  accountCookie?: undefined;
} | {
  data: {
    session: {
      id: string;
      createdAt: Date;
      updatedAt: Date;
      userId: string;
      expiresAt: Date;
      token: string;
      ipAddress?: string | null | undefined;
      userAgent?: string | null | undefined;
    };
    user: {
      id: string;
      createdAt: Date;
      updatedAt: Date;
      email: string;
      emailVerified: boolean;
      name: string;
      image?: string | null | undefined;
    };
  };
  error: null;
  isRegister: boolean;
  accountCookie: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    providerId: string;
    accountId: string;
    userId: string;
    accessToken?: string | null | undefined;
    refreshToken?: string | null | undefined;
    idToken?: string | null | undefined;
    accessTokenExpiresAt?: Date | null | undefined;
    refreshTokenExpiresAt?: Date | null | undefined;
    scope?: string | null | undefined;
    password?: string | null | undefined;
  } | null;
}>;
/**
 * Apply the `account.accountLinking.updateUserInfoOnLink` policy: when enabled,
 * copy the freshly linked provider's profile onto the local user, matching the
 * field set persisted on sign-up. The local `email` and `emailVerified` are
 * never changed, so a link can't rebind the account's identity, and
 * `updateUser` drops `undefined` fields, so a provider that omits one leaves
 * the existing column intact.
 *
 * Returns the updated user so a caller that issues a session can seed the
 * cookie cache with the fresh row. Returns `undefined` when the policy is
 * disabled or the update fails: a failed profile sync must not abort the link.
 */
declare function applyUpdateUserInfoOnLink(c: GenericEndpointContext, userId: string, userInfo: LinkedProviderProfile): Promise<User | undefined>;
//#endregion
export { applyUpdateUserInfoOnLink, handleOAuthUserInfo, linkOAuthAccount };