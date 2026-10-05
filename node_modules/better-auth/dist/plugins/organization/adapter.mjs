import { getDate } from "../../utils/date.mjs";
import { parseJSON } from "../../client/parser.mjs";
import { getCurrentAdapter, runWithTransaction } from "@better-auth/core/context";
import { BetterAuthError } from "@better-auth/core/error";
import { filterOutputFields } from "@better-auth/core/utils/db";
import { base64Url } from "@better-auth/utils/base64";
import { createHash } from "@better-auth/utils/hash";
//#region src/plugins/organization/adapter.ts
async function computeTeamMembershipKey(data) {
	const digest = await createHash("SHA-256").digest(new TextEncoder().encode(JSON.stringify([data.teamId, data.userId])));
	return base64Url.encode(new Uint8Array(digest), { padding: false });
}
async function findTeamMemberByKeyOrPair(adapter, data) {
	const memberByKey = await adapter.findOne({
		model: "teamMember",
		where: [{
			field: "membershipKey",
			value: data.membershipKey
		}]
	});
	if (memberByKey) return memberByKey;
	return adapter.findOne({
		model: "teamMember",
		where: [{
			field: "teamId",
			value: data.teamId
		}, {
			field: "userId",
			value: data.userId
		}]
	});
}
async function syncTeamMemberCount(adapter, teamId) {
	const memberCount = await adapter.count({
		model: "teamMember",
		where: [{
			field: "teamId",
			value: teamId
		}]
	});
	await adapter.incrementOne({
		model: "team",
		where: [{
			field: "id",
			value: teamId
		}, {
			field: "memberCount",
			operator: "lt",
			value: memberCount
		}],
		increment: {},
		set: { memberCount }
	});
}
async function reserveTeamSeat(adapter, data) {
	const team = await adapter.incrementOne({
		model: "team",
		where: [{
			field: "id",
			value: data.teamId
		}, {
			field: "memberCount",
			operator: "lt",
			value: data.maximumMembersPerTeam
		}],
		increment: { memberCount: 1 }
	});
	return Boolean(team);
}
async function incrementTeamMemberCount(adapter, teamId) {
	await adapter.incrementOne({
		model: "team",
		where: [{
			field: "id",
			value: teamId
		}],
		increment: { memberCount: 1 }
	});
}
async function releaseTeamSeats(adapter, teamId, count) {
	if (count <= 0) return;
	await adapter.incrementOne({
		model: "team",
		where: [{
			field: "id",
			value: teamId
		}, {
			field: "memberCount",
			operator: "gte",
			value: count
		}],
		increment: { memberCount: -count }
	});
}
async function createTeamMemberWithKey(adapter, data) {
	try {
		return {
			status: "created",
			member: await adapter.create({
				model: "teamMember",
				data: {
					teamId: data.teamId,
					userId: data.userId,
					membershipKey: data.membershipKey,
					createdAt: /* @__PURE__ */ new Date()
				}
			})
		};
	} catch (error) {
		const existing = await findTeamMemberByKeyOrPair(adapter, data);
		if (existing) return {
			status: "existing",
			member: existing
		};
		throw error;
	}
}
function stripTeamMembershipKey(member) {
	const { membershipKey: _membershipKey, ...output } = member;
	return output;
}
function stripTeamMembershipKeys(members) {
	return members.map(stripTeamMembershipKey);
}
const getOrgAdapter = (context, options) => {
	const baseAdapter = context.adapter;
	const orgAdditionalFields = options?.schema?.organization?.additionalFields;
	const memberAdditionalFields = options?.schema?.member?.additionalFields;
	const invitationAdditionalFields = options?.schema?.invitation?.additionalFields;
	const teamAdditionalFields = options?.schema?.team?.additionalFields;
	return {
		findOrganizationBySlug: async (slug) => {
			return filterOutputFields(await (await getCurrentAdapter(baseAdapter)).findOne({
				model: "organization",
				where: [{
					field: "slug",
					value: slug
				}]
			}), orgAdditionalFields);
		},
		createOrganization: async (data) => {
			const organization = await (await getCurrentAdapter(baseAdapter)).create({
				model: "organization",
				data: {
					...data.organization,
					metadata: data.organization.metadata ? JSON.stringify(data.organization.metadata) : void 0
				},
				forceAllowId: true
			});
			return filterOutputFields({
				...organization,
				metadata: organization.metadata && typeof organization.metadata === "string" ? JSON.parse(organization.metadata) : void 0
			}, orgAdditionalFields);
		},
		findMemberByEmail: async (data) => {
			const adapter = await getCurrentAdapter(baseAdapter);
			const user = await adapter.findOne({
				model: "user",
				where: [{
					field: "email",
					value: data.email.toLowerCase()
				}]
			});
			if (!user) return null;
			const member = await adapter.findOne({
				model: "member",
				where: [{
					field: "organizationId",
					value: data.organizationId
				}, {
					field: "userId",
					value: user.id
				}]
			});
			if (!member) return null;
			return {
				...member,
				user: {
					id: user.id,
					name: user.name,
					email: user.email,
					image: user.image
				}
			};
		},
		listMembers: async (data) => {
			const adapter = await getCurrentAdapter(baseAdapter);
			const members = await Promise.all([adapter.findMany({
				model: "member",
				where: [{
					field: "organizationId",
					value: data.organizationId
				}, ...data.filter?.field ? [{
					field: data.filter?.field,
					value: data.filter?.value,
					...data.filter.operator ? { operator: data.filter.operator } : {}
				}] : []],
				limit: data.limit || (typeof options?.membershipLimit === "number" ? options.membershipLimit : 100) || 100,
				offset: data.offset || 0,
				sortBy: data.sortBy ? {
					field: data.sortBy,
					direction: data.sortOrder || "asc"
				} : void 0
			}), adapter.count({
				model: "member",
				where: [{
					field: "organizationId",
					value: data.organizationId
				}, ...data.filter?.field ? [{
					field: data.filter?.field,
					value: data.filter?.value,
					...data.filter.operator ? { operator: data.filter.operator } : {}
				}] : []]
			})]);
			const users = await adapter.findMany({
				model: "user",
				where: [{
					field: "id",
					value: members[0].map((member) => member.userId),
					operator: "in"
				}],
				limit: members[0].length
			});
			return {
				members: members[0].map((member) => {
					const user = users.find((user) => user.id === member.userId);
					if (!user) throw new BetterAuthError("Unexpected error: User not found for member");
					return {
						...member,
						user: {
							id: user.id,
							name: user.name,
							email: user.email,
							image: user.image
						}
					};
				}),
				total: members[1]
			};
		},
		findMemberByOrgId: async (data) => {
			const result = await (await getCurrentAdapter(baseAdapter)).findOne({
				model: "member",
				where: [{
					field: "userId",
					value: data.userId
				}, {
					field: "organizationId",
					value: data.organizationId
				}],
				join: { user: true }
			});
			if (!result || !result.user) return null;
			const { user, ...member } = result;
			return {
				...member,
				user: {
					id: user.id,
					name: user.name,
					email: user.email,
					image: user.image
				}
			};
		},
		findMemberById: async (memberId) => {
			const result = await (await getCurrentAdapter(baseAdapter)).findOne({
				model: "member",
				where: [{
					field: "id",
					value: memberId
				}],
				join: { user: true }
			});
			if (!result) return null;
			const { user, ...member } = result;
			return {
				...member,
				user: {
					id: user.id,
					name: user.name,
					email: user.email,
					image: user.image
				}
			};
		},
		createMember: async (data) => {
			return await (await getCurrentAdapter(baseAdapter)).create({
				model: "member",
				data: {
					...data,
					createdAt: /* @__PURE__ */ new Date()
				}
			});
		},
		updateMember: async (memberId, role) => {
			return await (await getCurrentAdapter(baseAdapter)).update({
				model: "member",
				where: [{
					field: "id",
					value: memberId
				}],
				update: { role }
			});
		},
		deleteMember: async ({ memberId, organizationId, userId: _userId }) => {
			return runWithTransaction(baseAdapter, async () => {
				const adapter = await getCurrentAdapter(baseAdapter);
				let userId;
				if (!_userId) {
					const member = await adapter.findOne({
						model: "member",
						where: [{
							field: "id",
							value: memberId
						}]
					});
					if (!member) throw new BetterAuthError("Member not found");
					userId = member.userId;
				} else userId = _userId;
				const member = await adapter.delete({
					model: "member",
					where: [{
						field: "id",
						value: memberId
					}]
				});
				if (options?.teams?.enabled) {
					const teams = await adapter.findMany({
						model: "team",
						where: [{
							field: "organizationId",
							value: organizationId
						}]
					});
					for (const team of teams) {
						const deleted = await adapter.deleteMany({
							model: "teamMember",
							where: [{
								field: "userId",
								value: userId
							}, {
								field: "teamId",
								value: team.id
							}]
						});
						await releaseTeamSeats(adapter, team.id, deleted);
					}
				}
				return member;
			});
		},
		updateOrganization: async (organizationId, data) => {
			const organization = await (await getCurrentAdapter(baseAdapter)).update({
				model: "organization",
				where: [{
					field: "id",
					value: organizationId
				}],
				update: {
					...data,
					metadata: typeof data.metadata === "object" ? JSON.stringify(data.metadata) : data.metadata
				}
			});
			if (!organization) return null;
			return filterOutputFields({
				...organization,
				metadata: organization.metadata ? parseJSON(organization.metadata) : void 0
			}, orgAdditionalFields);
		},
		deleteOrganization: async (organizationId) => {
			return runWithTransaction(baseAdapter, async () => {
				const adapter = await getCurrentAdapter(baseAdapter);
				await adapter.deleteMany({
					model: "member",
					where: [{
						field: "organizationId",
						value: organizationId
					}]
				});
				await adapter.deleteMany({
					model: "invitation",
					where: [{
						field: "organizationId",
						value: organizationId
					}]
				});
				await adapter.delete({
					model: "organization",
					where: [{
						field: "id",
						value: organizationId
					}]
				});
				return organizationId;
			});
		},
		setActiveOrganization: async (sessionToken, organizationId, ctx) => {
			return await context.internalAdapter.updateSession(sessionToken, { activeOrganizationId: organizationId });
		},
		findOrganizationById: async (organizationId) => {
			return filterOutputFields(await (await getCurrentAdapter(baseAdapter)).findOne({
				model: "organization",
				where: [{
					field: "id",
					value: organizationId
				}]
			}), orgAdditionalFields);
		},
		checkMembership: async ({ userId, organizationId }) => {
			return await (await getCurrentAdapter(baseAdapter)).findOne({
				model: "member",
				where: [{
					field: "userId",
					value: userId
				}, {
					field: "organizationId",
					value: organizationId
				}]
			});
		},
		/**
		* @requires db
		*/
		findFullOrganization: async ({ organizationId, isSlug, includeTeams, membersLimit }) => {
			const adapter = await getCurrentAdapter(baseAdapter);
			const result = await adapter.findOne({
				model: "organization",
				where: [{
					field: isSlug ? "slug" : "id",
					value: organizationId
				}],
				join: {
					invitation: true,
					member: membersLimit ? { limit: membersLimit } : true,
					...includeTeams ? { team: true } : {}
				}
			});
			if (!result) return null;
			const { invitation: invitations, member: members, team: teams, ...org } = result;
			const userIds = members.map((member) => member.userId);
			const users = userIds.length > 0 ? await adapter.findMany({
				model: "user",
				where: [{
					field: "id",
					value: userIds,
					operator: "in"
				}],
				limit: (typeof options?.membershipLimit === "number" ? options.membershipLimit : 100) || 100
			}) : [];
			const userMap = new Map(users.map((user) => [user.id, user]));
			const membersWithUsers = members.map((member) => {
				const user = userMap.get(member.userId);
				if (!user) throw new BetterAuthError("Unexpected error: User not found for member");
				return {
					...filterOutputFields(member, memberAdditionalFields),
					user: {
						id: user.id,
						name: user.name,
						email: user.email,
						image: user.image
					}
				};
			});
			const filteredOrg = filterOutputFields(org, orgAdditionalFields);
			const filteredInvitations = invitations.map((inv) => filterOutputFields(inv, invitationAdditionalFields));
			const filteredTeams = teams?.map((team) => filterOutputFields(team, teamAdditionalFields));
			return {
				...filteredOrg,
				invitations: filteredInvitations,
				members: membersWithUsers,
				teams: filteredTeams
			};
		},
		listOrganizations: async (userId) => {
			const result = await (await getCurrentAdapter(baseAdapter)).findMany({
				model: "member",
				where: [{
					field: "userId",
					value: userId
				}],
				join: { organization: true }
			});
			if (!result || result.length === 0) return [];
			return result.map((member) => filterOutputFields(member.organization, orgAdditionalFields));
		},
		createTeam: async (data) => {
			const { memberCount: _memberCount, ...output } = await (await getCurrentAdapter(baseAdapter)).create({
				model: "team",
				data: {
					...data,
					memberCount: 0
				},
				forceAllowId: true
			});
			return filterOutputFields(output, teamAdditionalFields);
		},
		findTeamById: async ({ teamId, organizationId, includeTeamMembers }) => {
			const result = await (await getCurrentAdapter(baseAdapter)).findOne({
				model: "team",
				where: [{
					field: "id",
					value: teamId
				}, ...organizationId ? [{
					field: "organizationId",
					value: organizationId
				}] : []],
				join: { ...includeTeamMembers ? { teamMember: true } : {} }
			});
			if (!result) return null;
			const { teamMember, memberCount: _memberCount, ...team } = result;
			return {
				...filterOutputFields(team, teamAdditionalFields),
				...includeTeamMembers ? { members: stripTeamMembershipKeys(teamMember ?? []) } : {}
			};
		},
		updateTeam: async (teamId, data) => {
			const adapter = await getCurrentAdapter(baseAdapter);
			if ("id" in data) data.id = void 0;
			const team = await adapter.update({
				model: "team",
				where: [{
					field: "id",
					value: teamId
				}],
				update: { ...data }
			});
			if (!team) return team;
			const { memberCount: _memberCount, ...output } = team;
			return filterOutputFields(output, teamAdditionalFields);
		},
		deleteTeam: async (teamId) => {
			const adapter = await getCurrentAdapter(baseAdapter);
			await adapter.deleteMany({
				model: "teamMember",
				where: [{
					field: "teamId",
					value: teamId
				}]
			});
			return await adapter.delete({
				model: "team",
				where: [{
					field: "id",
					value: teamId
				}]
			});
		},
		listTeams: async (organizationId) => {
			return (await (await getCurrentAdapter(baseAdapter)).findMany({
				model: "team",
				where: [{
					field: "organizationId",
					value: organizationId
				}]
			})).map((team) => {
				const { memberCount: _memberCount, ...output } = team;
				return filterOutputFields(output, teamAdditionalFields);
			});
		},
		createTeamInvitation: async ({ email, role, teamId, organizationId, inviterId, expiresIn = 1e3 * 60 * 60 * 48 }) => {
			const adapter = await getCurrentAdapter(baseAdapter);
			const expiresAt = getDate(expiresIn);
			return await adapter.create({
				model: "invitation",
				data: {
					email,
					role,
					organizationId,
					teamId,
					inviterId,
					status: "pending",
					expiresAt
				}
			});
		},
		setActiveTeam: async (sessionToken, teamId, ctx) => {
			return await context.internalAdapter.updateSession(sessionToken, { activeTeamId: teamId });
		},
		listTeamMembers: async (data) => {
			return stripTeamMembershipKeys(await (await getCurrentAdapter(baseAdapter)).findMany({
				model: "teamMember",
				where: [{
					field: "teamId",
					value: data.teamId
				}]
			}));
		},
		countTeamMembers: async (data) => {
			return await (await getCurrentAdapter(baseAdapter)).count({
				model: "teamMember",
				where: [{
					field: "teamId",
					value: data.teamId
				}]
			});
		},
		countMembers: async (data) => {
			return await (await getCurrentAdapter(baseAdapter)).count({
				model: "member",
				where: [{
					field: "organizationId",
					value: data.organizationId
				}]
			});
		},
		listTeamsByUser: async (data) => {
			return (await (await getCurrentAdapter(baseAdapter)).findMany({
				model: "teamMember",
				where: [{
					field: "userId",
					value: data.userId
				}],
				join: { team: true }
			})).map((result) => {
				const { memberCount: _memberCount, ...team } = result.team;
				return filterOutputFields(team, teamAdditionalFields);
			});
		},
		findTeamMember: async (data) => {
			const member = await (await getCurrentAdapter(baseAdapter)).findOne({
				model: "teamMember",
				where: [{
					field: "teamId",
					value: data.teamId
				}, {
					field: "userId",
					value: data.userId
				}]
			});
			return member ? stripTeamMembershipKey(member) : null;
		},
		findOrCreateTeamMember: async (data) => {
			return runWithTransaction(baseAdapter, async () => {
				const adapter = await getCurrentAdapter(baseAdapter);
				const membershipKey = await computeTeamMembershipKey(data);
				const existing = await findTeamMemberByKeyOrPair(adapter, {
					...data,
					membershipKey
				});
				if (existing) return stripTeamMembershipKey(existing);
				await syncTeamMemberCount(adapter, data.teamId);
				const result = await createTeamMemberWithKey(adapter, {
					...data,
					membershipKey
				});
				if (result.status === "created") await incrementTeamMemberCount(adapter, data.teamId);
				return stripTeamMembershipKey(result.member);
			});
		},
		/**
		* Adds a user to a team by reserving capacity on the team row before
		* creating the membership row. The durable team counter is the aggregate
		* capacity boundary; the membership key is the single-column uniqueness
		* boundary for a user within a team.
		*/
		addTeamMemberWithLimit: async (data) => {
			return runWithTransaction(baseAdapter, async () => {
				const adapter = await getCurrentAdapter(baseAdapter);
				const membershipKey = await computeTeamMembershipKey(data);
				const existing = await findTeamMemberByKeyOrPair(adapter, {
					teamId: data.teamId,
					userId: data.userId,
					membershipKey
				});
				if (existing) return {
					status: "added",
					member: stripTeamMembershipKey(existing)
				};
				await syncTeamMemberCount(adapter, data.teamId);
				if (!await reserveTeamSeat(adapter, {
					teamId: data.teamId,
					maximumMembersPerTeam: data.maximumMembersPerTeam
				})) return { status: "limitReached" };
				let result;
				try {
					result = await createTeamMemberWithKey(adapter, {
						teamId: data.teamId,
						userId: data.userId,
						membershipKey
					});
				} catch (error) {
					await releaseTeamSeats(adapter, data.teamId, 1);
					throw error;
				}
				if (result.status === "existing") await releaseTeamSeats(adapter, data.teamId, 1);
				return {
					status: "added",
					member: stripTeamMembershipKey(result.member)
				};
			});
		},
		removeTeamMember: async (data) => {
			const adapter = await getCurrentAdapter(baseAdapter);
			const deleted = await adapter.deleteMany({
				model: "teamMember",
				where: [{
					field: "teamId",
					value: data.teamId
				}, {
					field: "userId",
					value: data.userId
				}]
			});
			await releaseTeamSeats(adapter, data.teamId, deleted);
		},
		findInvitationsByTeamId: async (teamId) => {
			return await (await getCurrentAdapter(baseAdapter)).findMany({
				model: "invitation",
				where: [{
					field: "teamId",
					value: teamId
				}]
			});
		},
		listUserInvitations: async (email) => {
			return (await (await getCurrentAdapter(baseAdapter)).findMany({
				model: "invitation",
				where: [{
					field: "email",
					value: email.toLowerCase()
				}],
				join: { organization: true }
			})).filter(Boolean).map(({ organization, ...inv }) => ({
				...inv,
				organizationName: organization?.name
			}));
		},
		createInvitation: async ({ invitation, user }) => {
			const adapter = await getCurrentAdapter(baseAdapter);
			const expiresAt = getDate(options?.invitationExpiresIn || 3600 * 48, "sec");
			return await adapter.create({
				model: "invitation",
				data: {
					status: "pending",
					expiresAt,
					createdAt: /* @__PURE__ */ new Date(),
					inviterId: user.id,
					...invitation,
					teamId: invitation.teamIds.length > 0 ? invitation.teamIds.join(",") : null
				},
				forceAllowId: true
			});
		},
		findInvitationById: async (id) => {
			return await (await getCurrentAdapter(baseAdapter)).findOne({
				model: "invitation",
				where: [{
					field: "id",
					value: id
				}]
			});
		},
		findPendingInvitation: async (data) => {
			return (await (await getCurrentAdapter(baseAdapter)).findMany({
				model: "invitation",
				where: [
					{
						field: "email",
						value: data.email.toLowerCase()
					},
					{
						field: "organizationId",
						value: data.organizationId
					},
					{
						field: "status",
						value: "pending"
					}
				]
			})).filter((invite) => new Date(invite.expiresAt) > /* @__PURE__ */ new Date());
		},
		findPendingInvitations: async (data) => {
			return (await (await getCurrentAdapter(baseAdapter)).findMany({
				model: "invitation",
				where: [{
					field: "organizationId",
					value: data.organizationId
				}, {
					field: "status",
					value: "pending"
				}]
			})).filter((invite) => new Date(invite.expiresAt) > /* @__PURE__ */ new Date());
		},
		listInvitations: async (data) => {
			return await (await getCurrentAdapter(baseAdapter)).findMany({
				model: "invitation",
				where: [{
					field: "organizationId",
					value: data.organizationId
				}]
			});
		},
		updateInvitation: async (data) => {
			const adapter = await getCurrentAdapter(baseAdapter);
			const where = [{
				field: "id",
				value: data.invitationId
			}];
			if (data.fromStatus) where.push({
				field: "status",
				value: data.fromStatus
			});
			return await adapter.incrementOne({
				model: "invitation",
				where,
				increment: {},
				set: { status: data.status }
			});
		}
	};
};
//#endregion
export { getOrgAdapter };
