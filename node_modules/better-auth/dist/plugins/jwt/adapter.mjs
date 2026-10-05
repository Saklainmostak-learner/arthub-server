import { getCurrentAdapter } from "@better-auth/core/context";
//#region src/plugins/jwt/adapter.ts
const getJwksAdapter = (baseAdapter, options) => {
	return {
		getAllKeys: async (ctx) => {
			if (options?.adapter?.getJwks) return await options.adapter.getJwks(ctx);
			return await (await getCurrentAdapter(baseAdapter)).findMany({ model: "jwks" });
		},
		getLatestKey: async (ctx) => {
			const now = /* @__PURE__ */ new Date();
			const isLive = (k) => !k.expiresAt || k.expiresAt > now;
			if (options?.adapter?.getJwks) return (await options.adapter.getJwks(ctx))?.filter(isLive).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
			return (await (await getCurrentAdapter(baseAdapter)).findMany({ model: "jwks" }))?.filter(isLive).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
		},
		/**
		* Look up a key by its `id` (matches the JWS `kid` header). Returns
		* `undefined` when no key with that id exists.
		*
		* When `options.adapter.getJwks` is configured (custom keyring),
		* filters in-memory after fetching the full set — the custom adapter
		* isn't required to implement an id index.
		*/
		getKeyById: async (ctx, id) => {
			if (options?.adapter?.getJwks) return (await options.adapter.getJwks(ctx))?.find((k) => k.id === id);
			return await (await getCurrentAdapter(baseAdapter)).findOne({
				model: "jwks",
				where: [{
					field: "id",
					value: id
				}]
			}) ?? void 0;
		},
		/**
		* Find the most recent key matching a specific algorithm. Used when
		* a caller (e.g. an OAuth audience) specifies `signingAlgorithm` but
		* not a specific `kid`. Returns `undefined` if no key with the alg
		* exists — callers decide whether to mint one or reject.
		*
		* Legacy rows persisted before the `alg` column existed have
		* `alg: null`. Per `schema.ts`, those rows are treated as the
		* configured default alg (`options.jwks.keyPairConfig.alg ?? "EdDSA"`),
		* so deployments that have only legacy rows can still satisfy an
		* audience-pinned `signingAlgorithm` matching the default.
		*
		* Expired keys are filtered out here — see `getLatestKey` for
		* rationale.
		*/
		getLatestKeyByAlg: async (ctx, alg) => {
			const candidates = options?.adapter?.getJwks ? await options.adapter.getJwks(ctx) : await (await getCurrentAdapter(baseAdapter)).findMany({ model: "jwks" });
			if (!candidates) return void 0;
			const configAlg = options?.jwks?.keyPairConfig?.alg ?? "EdDSA";
			const now = /* @__PURE__ */ new Date();
			return candidates.filter((k) => k.alg === alg || k.alg == null && configAlg === alg).filter((k) => !k.expiresAt || k.expiresAt > now).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
		},
		createJwk: async (ctx, webKey) => {
			if (options?.adapter?.createJwk) return await options.adapter.createJwk(webKey, ctx);
			return await (await getCurrentAdapter(baseAdapter)).create({
				model: "jwks",
				data: {
					...webKey,
					createdAt: /* @__PURE__ */ new Date()
				}
			});
		}
	};
};
//#endregion
export { getJwksAdapter };
