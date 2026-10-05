import { a as insensitiveInArray, c as buildRelationKeysByModel, l as getOneToOneRelationKey, n as escapedLike, o as insensitiveNe, r as insensitiveEq, s as insensitiveNotInArray, t as findDrizzleSchemaProblems } from "../schema-check-DFZjRat1.mjs";
import { createAdapterFactory } from "@better-auth/core/db/adapter";
import { checksSchema, createSchemaCheck, registerSchemaCheck } from "@better-auth/core/db/internal";
import { logger } from "@better-auth/core/env";
import { BetterAuthError } from "@better-auth/core/error";
import { and, asc, count, desc, eq, gt, gte, inArray, isNotNull, isNull, lt, lte, ne, notInArray, or, sql } from "drizzle-orm";
//#region src/relations-v2/index.ts
function escapeLikePattern(value) {
	if (value == null) return "";
	return String(value).replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}
function readDriverRowCount(result) {
	if (!result || typeof result !== "object") return void 0;
	if ("affectedRows" in result) return result.affectedRows;
	if ("rowsAffected" in result) return result.rowsAffected;
	if ("changes" in result) return result.changes;
	if ("meta" in result) {
		const meta = result.meta;
		if (meta && typeof meta === "object" && "changes" in meta) return meta.changes;
	}
}
function hasDriverRowCount(result) {
	return readDriverRowCount(result) !== void 0;
}
function getAffectedRowCount(result, operation, context) {
	let count = 0;
	if (result && typeof result === "object" && "rowCount" in result) count = result.rowCount;
	else if (result && typeof result === "object" && typeof result.count === "number") count = result.count;
	else if (Array.isArray(result)) count = result.length > 0 && hasDriverRowCount(result[0]) ? readDriverRowCount(result[0]) : result.length;
	else if (hasDriverRowCount(result)) count = readDriverRowCount(result);
	if (typeof count !== "number" || !Number.isFinite(count)) {
		logger.error(`[Drizzle Adapter] The result of the ${operation} operation is not a finite number. This is likely a bug in the adapter. Please report this issue to the Better Auth team.`, {
			result,
			...context
		});
		throw new BetterAuthError(`Drizzle adapter ${operation} returned an invalid affected row count`);
	}
	return count;
}
/**
* Maps a single Where entry to a drizzle SQL expression.
* Shared by convertWhereClause across single / AND / OR branches.
*/
function applyWhereOperator(column, w, fieldLabel, provider) {
	const isInsensitive = (w.mode ?? "sensitive") === "insensitive" && (typeof w.value === "string" || Array.isArray(w.value) && w.value.every((v) => typeof v === "string"));
	if (w.operator === "in") {
		if (!Array.isArray(w.value)) throw new BetterAuthError(`The value for the field "${fieldLabel}" must be an array when using the "in" operator.`);
		if (isInsensitive) return insensitiveInArray(column, w.value);
		return inArray(column, w.value);
	}
	if (w.operator === "not_in") {
		if (!Array.isArray(w.value)) throw new BetterAuthError(`The value for the field "${fieldLabel}" must be an array when using the "not_in" operator.`);
		if (isInsensitive) return insensitiveNotInArray(column, w.value);
		return notInArray(column, w.value);
	}
	const likeMode = isInsensitive && typeof w.value === "string" ? "insensitive" : "sensitive";
	if (w.operator === "contains") return escapedLike(column, `%${escapeLikePattern(w.value)}%`, provider, likeMode);
	if (w.operator === "starts_with") return escapedLike(column, `${escapeLikePattern(w.value)}%`, provider, likeMode);
	if (w.operator === "ends_with") return escapedLike(column, `%${escapeLikePattern(w.value)}`, provider, likeMode);
	if (w.operator === "lt") return lt(column, w.value);
	if (w.operator === "lte") return lte(column, w.value);
	if (w.operator === "ne") {
		if (w.value === null) return isNotNull(column);
		if (isInsensitive && typeof w.value === "string") return insensitiveNe(column, w.value);
		return ne(column, w.value);
	}
	if (w.operator === "gt") return gt(column, w.value);
	if (w.operator === "gte") return gte(column, w.value);
	if (w.value === null) return isNull(column);
	if (isInsensitive && typeof w.value === "string") return insensitiveEq(column, w.value);
	return eq(column, w.value);
}
const drizzleAdapter = (db, config) => {
	let lazyOptions = null;
	let mysqlNoIdWarned = false;
	let relationKeysByModel;
	const getRelationKeysByModel = () => relationKeysByModel ??= buildRelationKeysByModel(db._?.relations);
	const createCustomAdapter = (db, inTransaction = false) => ({ getFieldName, getDefaultModelName, options, schema: baSchema }) => {
		if (config.provider === "mysql" && options.advanced?.database?.generateId === false && !mysqlNoIdWarned) {
			mysqlNoIdWarned = true;
			logger.warn("[Drizzle Adapter] MySQL does not support INSERT...RETURNING. With generateId set to false, the adapter uses best-effort fallback strategies (unique columns, full-field match) to retrieve inserted rows. For reliable behavior, use Better Auth's default ID generation, a custom generateId function, or generateId: \"serial\" for auto-increment.");
		}
		function getSchema(model) {
			const schemaModel = config.schema?.[model] ?? db._?.relations?.[model]?.table ?? db._?.fullSchema?.[model];
			if (!schemaModel) throw new BetterAuthError(`[# Drizzle Adapter]: The model "${model}" was not found in the schema object. Please pass the schema directly to the adapter options.`);
			return schemaModel;
		}
		/**
		* Resolve the `db.query` key for a model.
		*
		* `db.query` is keyed by the Drizzle schema export names, which are
		* often plural ("users") even when Better Auth uses singular model
		* names. Try the model directly, then the `usePlural` variant, then
		* scan the schema for the key pointing at the same table.
		*/
		function getQueryModel(model) {
			if (!db.query) return null;
			if (db.query[model]) return model;
			if (config.usePlural) {
				const plural = `${model}s`;
				if (db.query[plural]) return plural;
			}
			if (config.schema) {
				const targetTable = config.schema[model];
				if (targetTable) {
					const relations = db._?.relations;
					const fullSchema = db._?.fullSchema;
					for (const key of Object.keys(db.query)) if ((relations?.[key]?.table ?? fullSchema?.[key]) === targetTable) return key;
				}
			}
			return null;
		}
		function getJoinRelationKey(baseModel, joinModel, baseModelKey, joinModelKey, relationKeys, isUnique) {
			if (isUnique) return getOneToOneRelationKey({
				baseModel,
				joinModel,
				baseModelKey,
				joinModelKey,
				relationKeys,
				schema: baSchema,
				getDefaultModelName
			});
			if (config.usePlural || joinModel.endsWith("s")) return joinModel;
			return `${joinModel}s`;
		}
		const withReturning = async (model, modelKey, builder, data, where) => {
			if (config.provider !== "mysql") return (await builder.returning())[0];
			const isSerialInsert = where === void 0 && options.advanced?.database?.generateId === "serial";
			const insertResult = isSerialInsert ? await builder.$returningId().execute() : await builder.execute();
			const schemaModel = getSchema(model);
			const builderVal = builder.config?.values;
			if (where?.length) {
				const clause = convertWhereClause(where.map((w) => {
					if (data[w.field] !== void 0) return {
						...w,
						value: data[w.field]
					};
					return w;
				}), model, modelKey);
				return (await db.select().from(schemaModel).where(...clause))[0];
			}
			const fetchInserted = async (tx) => {
				const builderId = builderVal?.[0]?.id?.value;
				if (builderId) return (await tx.select().from(schemaModel).where(eq(schemaModel.id, builderId)).limit(1).execute())[0] ?? null;
				if (data.id) return (await tx.select().from(schemaModel).where(eq(schemaModel.id, data.id)).limit(1).execute())[0] ?? null;
				const insertId = isSerialInsert ? insertResult?.[0]?.id : void 0;
				if (insertId && schemaModel.id) return (await tx.select().from(schemaModel).where(eq(schemaModel.id, insertId)).limit(1).execute())[0] ?? null;
				const modelSchema = baSchema[modelKey]?.fields;
				if (modelSchema) for (const [fieldKey, fieldAttr] of Object.entries(modelSchema)) {
					if (!fieldAttr.unique) continue;
					const dbFieldName = getFieldName({
						model: modelKey,
						field: fieldKey
					});
					const val = data[dbFieldName];
					if (val === void 0 || val === null) continue;
					if (!schemaModel[dbFieldName]) continue;
					const res = await tx.select().from(schemaModel).where(eq(schemaModel[dbFieldName], val)).limit(1).execute();
					if (res[0]) return res[0];
				}
				const conditions = [];
				for (const [key, val] of Object.entries(data)) {
					if (val === void 0 || !schemaModel[key]) continue;
					conditions.push(val === null ? isNull(schemaModel[key]) : eq(schemaModel[key], val));
				}
				if (conditions.length > 0) {
					const combined = and(...conditions);
					if (combined) {
						const res = await tx.select().from(schemaModel).where(combined).limit(2).execute();
						if (res.length === 1) return res[0];
					}
				}
				logger.warn(`[Drizzle Adapter] Unable to safely identify the inserted "${model}" row on MySQL. Enable Better Auth ID generation or use generateId: "serial" for reliable behavior.`);
				return null;
			};
			return inTransaction ? fetchInserted(db) : db.transaction(fetchInserted);
		};
		function resolveColumn(model, modelKey, w) {
			const schemaModel = getSchema(model);
			const field = getFieldName({
				model: modelKey,
				field: w.field
			});
			if (!schemaModel[field]) throw new BetterAuthError(`The field "${w.field}" does not exist in the schema for the model "${model}". Please update your schema.`);
			return {
				column: schemaModel[field],
				field
			};
		}
		function convertWhereClause(where, model, modelKey) {
			if (!where) return [];
			if (where.length === 1) {
				const w = where[0];
				if (!w) return [];
				const { column } = resolveColumn(model, modelKey, w);
				return [applyWhereOperator(column, w, w.field, config.provider)];
			}
			const andGroup = where.filter((w) => w.connector === "AND" || !w.connector);
			const orGroup = where.filter((w) => w.connector === "OR");
			const combined = and(and(...andGroup.map((w) => {
				const { column } = resolveColumn(model, modelKey, w);
				return applyWhereOperator(column, w, w.field, config.provider);
			})), or(...orGroup.map((w) => {
				const { column } = resolveColumn(model, modelKey, w);
				return applyWhereOperator(column, w, w.field, config.provider);
			})));
			return combined ? [combined] : [];
		}
		function convertNewWhereClause(where, model, modelKey) {
			const schemaModel = getSchema(model);
			if (!where || where.length === 0) return {};
			const rawCondition = (w, field) => ({ RAW: (table) => applyWhereOperator(table[field], w, w.field, config.provider) });
			const convertWhereToColumn = (w) => {
				const field = getFieldName({
					model: modelKey,
					field: w.field
				});
				if (!schemaModel[field]) throw new BetterAuthError(`The field "${w.field}" does not exist in the schema for the model "${model}". Please update your schema.`);
				const columnObj = {};
				let raw;
				const isInsensitive = w.mode === "insensitive" && (typeof w.value === "string" || Array.isArray(w.value) && w.value.every((v) => typeof v === "string"));
				if (w.operator === "contains" || w.operator === "starts_with" || w.operator === "ends_with" || isInsensitive) raw = rawCondition(w, field);
				else if (w.operator === "in") {
					if (!Array.isArray(w.value)) throw new BetterAuthError(`The value for the field "${w.field}" must be an array when using the "in" operator.`);
					columnObj.in = w.value;
				} else if (w.operator === "not_in") {
					if (!Array.isArray(w.value)) throw new BetterAuthError(`The value for the field "${w.field}" must be an array when using the "not_in" operator.`);
					columnObj.notIn = w.value;
				} else if (w.operator === "lt") columnObj.lt = w.value;
				else if (w.operator === "lte") columnObj.lte = w.value;
				else if (w.operator === "ne") if (w.value === null) columnObj.isNotNull = true;
				else columnObj.ne = w.value;
				else if (w.operator === "gt") columnObj.gt = w.value;
				else if (w.operator === "gte") columnObj.gte = w.value;
				else if (w.value === null) columnObj.isNull = true;
				else columnObj.eq = w.value;
				return {
					field,
					columnObj,
					raw
				};
			};
			if (where.length === 1) {
				const w = where[0];
				if (!w) return {};
				const { field, columnObj, raw } = convertWhereToColumn(w);
				return raw ?? { [field]: columnObj };
			}
			const andGroup = where.filter((w) => w.connector === "AND" || !w.connector);
			const orGroup = where.filter((w) => w.connector === "OR");
			const result = {};
			if (andGroup.length > 0) {
				const fieldMap = {};
				const rawConditions = [];
				for (const w of andGroup) {
					const { field, columnObj, raw } = convertWhereToColumn(w);
					if (raw) {
						rawConditions.push(raw);
						continue;
					}
					if (!fieldMap[field]) fieldMap[field] = [];
					fieldMap[field].push(columnObj);
				}
				for (const [field, conditions] of Object.entries(fieldMap)) if (conditions.length === 1) result[field] = conditions[0];
				else result[field] = { AND: conditions };
				if (rawConditions.length > 0) result.AND = rawConditions;
			}
			if (orGroup.length > 0) {
				const orConditions = [];
				for (const w of orGroup) {
					const { field, columnObj, raw } = convertWhereToColumn(w);
					orConditions.push(raw ?? { [field]: columnObj });
				}
				if (orConditions.length > 0) result.OR = orConditions;
			}
			return result;
		}
		function checkMissingFields(schema, model, values) {
			if (!schema) throw new BetterAuthError("Drizzle adapter failed to initialize. Drizzle Schema not found. Please provide a schema object in the adapter options object.");
			for (const key in values) if (!schema[key]) throw new BetterAuthError(`The field "${key}" does not exist in the "${model}" Drizzle schema. Please update your drizzle schema or re-generate using "npx auth@latest generate".`);
		}
		return {
			async create({ model, modelKey = model, data: values }) {
				const table = getSchema(model);
				checkMissingFields(table, modelKey, values);
				return await withReturning(model, modelKey, db.insert(table).values(values), values);
			},
			async findOne({ model, modelKey = model, where, select, join }) {
				const table = getSchema(model);
				const clause = convertWhereClause(where, model, modelKey);
				if (join) {
					const queryModel = getQueryModel(model);
					if (!db.query || !queryModel) {
						logger.error(`[# Drizzle Adapter]: The model "${model}" was not found in the query object. Please update your Drizzle schema to include relations or re-generate using "npx auth@latest generate".`);
						logger.info("Falling back to regular query");
					} else {
						let includes;
						const renamedJoinResults = [];
						const relationKeys = getRelationKeysByModel().get(queryModel);
						includes = {};
						const joinEntries = Object.entries(join);
						for (const [joinModel, joinAttr] of joinEntries) {
							const limit = joinAttr.limit ?? options.advanced?.database?.defaultFindManyLimit ?? 100;
							const isUnique = joinAttr.relation === "one-to-one";
							const relationKey = getJoinRelationKey(model, joinModel, modelKey, joinAttr.modelKey ?? joinModel, relationKeys, isUnique);
							includes[relationKey] = isUnique ? true : { limit };
							if (relationKey !== joinModel) renamedJoinResults.push({
								key: relationKey,
								target: joinModel
							});
						}
						const clause = convertNewWhereClause(where, model, modelKey);
						const res = await db.query[queryModel].findFirst({
							where: clause,
							columns: select?.length && select.length > 0 ? select.reduce((acc, field) => {
								acc[getFieldName({
									model: modelKey,
									field
								})] = true;
								return acc;
							}, {}) : void 0,
							with: includes
						});
						if (res) for (const { key, target } of renamedJoinResults) {
							res[target] = res[key];
							delete res[key];
						}
						return res;
					}
				}
				const res = await db.select(select?.length && select.length > 0 ? select.reduce((acc, field) => {
					const fieldName = getFieldName({
						model: modelKey,
						field
					});
					return {
						...acc,
						[fieldName]: table[fieldName]
					};
				}, {}) : void 0).from(table).where(...clause);
				if (!res.length) return null;
				return res[0];
			},
			async findMany({ model, modelKey = model, where, sortBy, limit, select, offset, join }) {
				const table = getSchema(model);
				const clause = where ? convertWhereClause(where, model, modelKey) : [];
				const sortFn = sortBy?.direction === "desc" ? desc : asc;
				if (join) {
					const queryModel = getQueryModel(model);
					if (!db.query || !queryModel) {
						logger.error(`[# Drizzle Adapter]: The model "${model}" was not found in the query object. Please update your Drizzle schema to include relations or re-generate using "npx auth@latest generate".`);
						logger.info("Falling back to regular query");
					} else {
						let includes;
						const renamedJoinResults = [];
						const relationKeys = getRelationKeysByModel().get(queryModel);
						includes = {};
						const joinEntries = Object.entries(join);
						for (const [joinModel, joinAttr] of joinEntries) {
							const isUnique = joinAttr.relation === "one-to-one";
							const limit = joinAttr.limit ?? options.advanced?.database?.defaultFindManyLimit ?? 100;
							const relationKey = getJoinRelationKey(model, joinModel, modelKey, joinAttr.modelKey ?? joinModel, relationKeys, isUnique);
							includes[relationKey] = isUnique ? true : { limit };
							if (relationKey !== joinModel) renamedJoinResults.push({
								key: relationKey,
								target: joinModel
							});
						}
						let orderBy = void 0;
						if (sortBy?.field) orderBy = { [getFieldName({
							model: modelKey,
							field: sortBy.field
						})]: sortBy.direction === "desc" ? "desc" : "asc" };
						const res = await db.query[queryModel].findMany({
							where: where ? convertNewWhereClause(where, model, modelKey) : void 0,
							with: includes,
							columns: select?.length && select.length > 0 ? select.reduce((acc, field) => {
								acc[getFieldName({
									model: modelKey,
									field
								})] = true;
								return acc;
							}, {}) : void 0,
							limit: limit ?? 100,
							offset: offset ?? 0,
							orderBy
						});
						if (res) for (const item of res) for (const { key, target } of renamedJoinResults) {
							item[target] = item[key];
							delete item[key];
						}
						return res;
					}
				}
				let builder = db.select(select?.length && select.length > 0 ? select.reduce((acc, field) => {
					const fieldName = getFieldName({
						model: modelKey,
						field
					});
					return {
						...acc,
						[fieldName]: table[fieldName]
					};
				}, {}) : void 0).from(table);
				const effectiveLimit = limit;
				const effectiveOffset = offset;
				if (typeof effectiveLimit !== "undefined") builder = builder.limit(effectiveLimit);
				if (typeof effectiveOffset !== "undefined") builder = builder.offset(effectiveOffset);
				if (sortBy?.field) builder = builder.orderBy(sortFn(table[getFieldName({
					model: modelKey,
					field: sortBy?.field
				})]));
				return await builder.where(...clause);
			},
			async count({ model, modelKey = model, where }) {
				const table = getSchema(model);
				const clause = where ? convertWhereClause(where, model, modelKey) : [];
				return (await db.select({ count: count() }).from(table).where(...clause))[0].count;
			},
			async update({ model, modelKey = model, where, update: values }) {
				const table = getSchema(model);
				const clause = convertWhereClause(where, model, modelKey);
				return await withReturning(model, modelKey, db.update(table).set(values).where(...clause), values, where);
			},
			async updateMany({ model, modelKey = model, where, update: values }) {
				const table = getSchema(model);
				const clause = convertWhereClause(where, model, modelKey);
				return getAffectedRowCount(await db.update(table).set(values).where(...clause), "updateMany", {
					model,
					where
				});
			},
			async delete({ model, modelKey = model, where }) {
				const table = getSchema(model);
				const clause = convertWhereClause(where, model, modelKey);
				return await db.delete(table).where(...clause);
			},
			async deleteMany({ model, modelKey = model, where }) {
				const table = getSchema(model);
				const clause = convertWhereClause(where, model, modelKey);
				return getAffectedRowCount(await db.delete(table).where(...clause), "deleteMany", {
					model,
					where
				});
			},
			async consumeOne({ model, modelKey = model, where }) {
				const table = getSchema(model);
				const clause = convertWhereClause(where, model, modelKey);
				const idField = getFieldName({
					model: modelKey,
					field: "id"
				});
				const idColumn = table[idField];
				if (config.provider === "mysql") {
					const claimFromTransaction = async (tx) => {
						const target = (await tx.select().from(table).where(...clause).for("update").limit(1))[0];
						if (!target) return null;
						const targetId = target[idField] ?? target.id;
						if (targetId === void 0 || targetId === null || !idColumn) return null;
						return getAffectedRowCount(await tx.delete(table).where(eq(idColumn, targetId)).execute(), "consumeOne", {
							model,
							where
						}) > 0 ? target : null;
					};
					return inTransaction ? claimFromTransaction(db) : db.transaction(claimFromTransaction);
				}
				if (!idColumn) return null;
				const targetIds = db.select({ id: idColumn }).from(table).where(...clause).limit(1);
				return (await db.delete(table).where(inArray(idColumn, targetIds)).returning())[0] ?? null;
			},
			async incrementOne({ model, modelKey = model, where, increment, set }) {
				const table = getSchema(model);
				const clause = convertWhereClause(where, model, modelKey);
				const idField = getFieldName({
					model: modelKey,
					field: "id"
				});
				const idColumn = table[idField];
				const assignments = {};
				for (const [field, delta] of Object.entries(increment)) {
					const columnName = getFieldName({
						model: modelKey,
						field
					});
					const column = table[columnName];
					if (!column) throw new BetterAuthError(`The field "${field}" does not exist in the schema for the model "${model}". Please update your schema.`);
					assignments[columnName] = sql`${column} + ${sql.param(delta)}`;
				}
				if (set) for (const [field, value] of Object.entries(set)) {
					const columnName = getFieldName({
						model: modelKey,
						field
					});
					if (!table[columnName]) throw new BetterAuthError(`The field "${field}" does not exist in the schema for the model "${model}". Please update your schema.`);
					assignments[columnName] = value;
				}
				if (config.provider === "mysql") {
					const mutateInTransaction = async (tx) => {
						const target = (await tx.select().from(table).where(...clause).for("update").limit(1))[0];
						if (!target) return null;
						const targetId = target[idField] ?? target.id;
						if (targetId === void 0 || targetId === null || !idColumn) return null;
						await tx.update(table).set(assignments).where(eq(idColumn, targetId)).execute();
						return (await tx.select().from(table).where(eq(idColumn, targetId)).limit(1).execute())[0] ?? null;
					};
					return inTransaction ? mutateInTransaction(db) : db.transaction(mutateInTransaction);
				}
				if (!idColumn) return null;
				const targetIds = db.select({ id: idColumn }).from(table).where(...clause).limit(1);
				return (await db.update(table).set(assignments).where(and(...clause, inArray(idColumn, targetIds))).returning())[0] ?? null;
			},
			async createSchema(props) {
				const { generateDrizzleSchema } = await import("../generate-drizzle-schema-iWvrXnu0.mjs");
				return await generateDrizzleSchema({
					adapterConfig: config,
					options,
					provider: config.provider,
					camelCase: config.camelCase,
					file: props.file,
					tables: props.tables
				});
			},
			options: config
		};
	};
	let adapterOptions = null;
	adapterOptions = {
		config: {
			adapterId: "drizzle",
			adapterName: "Drizzle Adapter",
			usePlural: config.usePlural ?? false,
			debugLogs: config.debugLogs ?? false,
			supportsUUIDs: config.provider === "pg" ? true : false,
			supportsJSON: true,
			supportsArrays: true,
			transaction: config.transaction ?? false ? (cb) => db.transaction((tx) => {
				return cb(createAdapterFactory({
					config: {
						...adapterOptions.config,
						transaction: false
					},
					adapter: createCustomAdapter(tx, true)
				})(lazyOptions));
			}) : false
		},
		adapter: createCustomAdapter(db)
	};
	const adapter = createAdapterFactory(adapterOptions);
	return (options) => {
		lazyOptions = options;
		const instance = adapter(options);
		registerSchemaCheck(instance, createSchemaCheck(() => {
			const relations = db._?.relations ?? {};
			return findDrizzleSchemaProblems({
				...db._?.fullSchema,
				...Object.fromEntries(Object.entries(relations).map(([name, relation]) => [name, relation.table])),
				...config.schema
			}, options, config.usePlural);
		}, "drizzle"), { runtimeEnabled: checksSchema(options) });
		return instance;
	};
};
//#endregion
export { drizzleAdapter };
