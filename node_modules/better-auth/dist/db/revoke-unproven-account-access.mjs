import { BetterAuthError } from "@better-auth/core/error";
//#region src/db/revoke-unproven-account-access.ts
const cleanupLockExpiresInMs = 5e3;
const cleanupLockWaitMs = 2e3;
const cleanupLockPollMs = 250;
const cleanupLockIdentifier = (userId) => `revoke-unproven-account-access:${userId}`;
async function waitForCleanupLock(ctx, identifier) {
	const deadline = Date.now() + cleanupLockWaitMs;
	while (Date.now() < deadline) {
		const lock = await ctx.context.internalAdapter.findVerificationValue(identifier);
		if (!lock) return;
		if (lock.expiresAt <= /* @__PURE__ */ new Date()) {
			await ctx.context.internalAdapter.deleteVerificationByIdentifier(identifier);
			return;
		}
		await new Promise((resolve) => setTimeout(resolve, cleanupLockPollMs));
	}
}
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
async function revokeUnprovenAccountAccess(ctx, userId) {
	const lockIdentifier = cleanupLockIdentifier(userId);
	if (!await ctx.context.internalAdapter.reserveVerificationValue({
		identifier: lockIdentifier,
		value: userId,
		expiresAt: new Date(Date.now() + cleanupLockExpiresInMs)
	}).catch((error) => {
		if (error instanceof BetterAuthError && error.message.includes("requires database-backed verification storage")) return true;
		throw error;
	})) {
		await waitForCleanupLock(ctx, lockIdentifier);
		return ctx.context.internalAdapter.findUserById(userId);
	}
	try {
		const user = await ctx.context.internalAdapter.findUserById(userId);
		if (!user || user.emailVerified) return user;
		const accounts = await ctx.context.internalAdapter.findAccounts(userId);
		for (const account of accounts) await ctx.context.internalAdapter.deleteAccount(account.id);
		await ctx.context.internalAdapter.deleteUserSessions(userId);
		return await ctx.context.internalAdapter.updateUser(userId, { emailVerified: true });
	} finally {
		await ctx.context.internalAdapter.deleteVerificationByIdentifier(lockIdentifier).catch(() => {});
	}
}
//#endregion
export { revokeUnprovenAccountAccess };
