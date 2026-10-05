import { User } from "../types/models.mjs";
import { GenericEndpointContext } from "@better-auth/core";

//#region src/db/revoke-unproven-account-access.d.ts
/**
 * Strip every account link and session a pre-existing account accrued before
 * control of its email was proven.
 *
 * An `emailVerified: false` row carries no proof that linked access belongs
 * to the mailbox owner. When an email-primary proof (magic link, email OTP)
 * resolves to such a row, deleting accounts and revoking standing sessions
 * makes the verified owner inherit no password, OAuth link, or session that
 * predates the proof. This helper also flips `emailVerified` after cleanup and
 * returns the current user for the caller to use when minting the owner's
 * session.
 *
 * @param userId - The pre-existing, not-yet-verified user being promoted.
 */
declare function revokeUnprovenAccountAccess(ctx: GenericEndpointContext, userId: string): Promise<User | null>;
//#endregion
export { revokeUnprovenAccountAccess };