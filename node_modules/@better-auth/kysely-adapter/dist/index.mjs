import { n as introspectSqliteTables } from "./sqlite-introspector-DSCAP82F.mjs";
import { BetterAuthError } from "@better-auth/core/error";
import { ColumnNode, Kysely, MssqlDialect, MysqlDialect, PostgresDialect, ReferenceNode, SelectQueryNode, SqliteDialect, TableNode, sql } from "kysely";
import { createAdapterFactory } from "@better-auth/core/db/adapter";
import { checksSchema, createSchemaCheck, diffSchema, getExpectedSchema, registerSchemaCheck } from "@better-auth/core/db/internal";
import { logger } from "@better-auth/core/env";
import { capitalizeFirstLetter } from "@better-auth/core/utils/string";
//#region src/dialect.ts
function getKyselyDatabaseType(db) {
	if (!db) return null;
	if ("dialect" in db) return getKyselyDatabaseType(db.dialect);
	if ("createDriver" in db) {
		if (db instanceof SqliteDialect) return "sqlite";
		if (db instanceof MysqlDialect) return "mysql";
		if (db instanceof PostgresDialect) return "postgres";
		if (db instanceof MssqlDialect) return "mssql";
	}
	if ("aggregate" in db) return "sqlite";
	if ("getConnection" in db) return "mysql";
	if ("connect" in db) return "postgres";
	if ("fileControl" in db) return "sqlite";
	if ("open" in db && "close" in db && "prepare" in db) return "sqlite";
	if ("batch" in db && "exec" in db && "prepare" in db) return "sqlite";
	return null;
}
function checkSchemaName(schemaName, databaseType) {
	if (schemaName === void 0) return;
	if (typeof schemaName !== "string" || schemaName.length === 0) throw new BetterAuthError("`database.schemaName` must be a non-empty schema name.");
	if (databaseType !== "postgres") throw new BetterAuthError(`\`database.schemaName\` is only supported on PostgreSQL, but the configured database type is "${databaseType ?? "unknown"}".`);
}
const createKyselyAdapter = async (config) => {
	const db = config.database;
	if (!db) return {
		kysely: null,
		databaseType: null,
		introspectIndexes: void 0,
		schemaName: void 0,
		transaction: void 0
	};
	if ("db" in db) {
		const schemaName = db.schemaName;
		checkSchemaName(schemaName, db.type);
		return {
			kysely: schemaName ? db.db.withSchema(schemaName) : db.db,
			databaseType: db.type,
			introspectIndexes: void 0,
			schemaName,
			transaction: db.transaction
		};
	}
	if ("dialect" in db) {
		const schemaName = db.schemaName;
		checkSchemaName(schemaName, db.type);
		const kysely = new Kysely({ dialect: db.dialect });
		return {
			kysely: schemaName ? kysely.withSchema(schemaName) : kysely,
			databaseType: db.type,
			introspectIndexes: void 0,
			schemaName,
			transaction: db.transaction
		};
	}
	let dialect = void 0;
	let introspectIndexes = void 0;
	let transaction = void 0;
	const databaseType = getKyselyDatabaseType(db);
	if ("createDriver" in db) dialect = db;
	if ("aggregate" in db && !("createSession" in db)) {
		dialect = new SqliteDialect({ database: db });
		transaction = true;
	}
	if ("getConnection" in db) {
		dialect = new MysqlDialect(db);
		transaction = true;
	}
	if ("connect" in db) {
		dialect = new PostgresDialect({ pool: db });
		transaction = true;
	}
	if ("fileControl" in db) {
		const { BunSqliteDialect } = await import("./bun-sqlite-dialect-DoOVo4ja.mjs");
		dialect = new BunSqliteDialect({ database: db });
		transaction = true;
	}
	if ("createSession" in db) {
		let DatabaseSync = void 0;
		try {
			const nodeSqlite = "node:sqlite";
			({DatabaseSync} = await import(
				/* @vite-ignore */
				/* webpackIgnore: true */
				nodeSqlite
));
		} catch (error) {
			if (error !== null && typeof error === "object" && "code" in error && error.code !== "ERR_UNKNOWN_BUILTIN_MODULE") throw error;
		}
		if (DatabaseSync && db instanceof DatabaseSync) {
			const { NodeSqliteDialect } = await import("./node-sqlite-dialect.mjs");
			dialect = new NodeSqliteDialect({ database: db });
			transaction = true;
		}
	}
	if ("batch" in db && "exec" in db && "prepare" in db) {
		const { createD1IndexIntrospector, D1SqliteDialect } = await import("./d1-sqlite-dialect-Cru74LbR.mjs");
		dialect = new D1SqliteDialect({ database: db });
		introspectIndexes = createD1IndexIntrospector(db);
		transaction = false;
	}
	return {
		kysely: dialect ? new Kysely({ dialect }) : null,
		databaseType,
		introspectIndexes,
		schemaName: void 0,
		transaction
	};
};
//#endregion
//#region src/query-builders.ts
/**
* Case-insensitive ILIKE/LIKE for pattern matching.
* Uses ILIKE on PostgreSQL, LOWER()+LIKE on MySQL/SQLite/MSSQL.
*/
function insensitiveIlike(columnRef, pattern, dbType) {
	return dbType === "postgres" ? sql`${sql.ref(columnRef)} ILIKE ${pattern}` : sql`LOWER(${sql.ref(columnRef)}) LIKE LOWER(${pattern})`;
}
/**
* Case-insensitive IN for string arrays.
* Returns { lhs, values } for use with eb(lhs, "in", values).
*/
function insensitiveIn(columnRef, values) {
	return {
		lhs: sql`LOWER(${sql.ref(columnRef)})`,
		values: values.map((v) => v.toLowerCase())
	};
}
/**
* Case-insensitive NOT IN for string arrays.
*/
function insensitiveNotIn(columnRef, values) {
	return {
		lhs: sql`LOWER(${sql.ref(columnRef)})`,
		values: values.map((v) => v.toLowerCase())
	};
}
/**
* Case-insensitive equality for strings.
* Returns { lhs, value } for use with eb(lhs, "=", value).
*/
function insensitiveEq(columnRef, value) {
	return {
		lhs: sql`LOWER(${sql.ref(columnRef)})`,
		value: value.toLowerCase()
	};
}
/**
* Case-insensitive inequality for strings.
*/
function insensitiveNe(columnRef, value) {
	return {
		lhs: sql`LOWER(${sql.ref(columnRef)})`,
		value: value.toLowerCase()
	};
}
//#endregion
//#region src/schema-check.ts
/**
* Converts Kysely table metadata into the shape `diffSchema` compares.
*/
function toIntrospectedTables(tables) {
	return tables.map((table) => ({
		name: table.name,
		schema: table.schema,
		columns: table.columns.map((column) => ({
			name: column.name,
			nullable: column.isNullable,
			hasDefault: column.hasDefaultValue || column.isAutoIncrementing
		}))
	}));
}
/**
* The expected schema in the identifiers the connection sends. A plugin that
* renames identifiers, such as `CamelCasePlugin`, does so in `transformQuery`,
* so compiling one select per table through the connection yields the names
* the database is asked for. Without such a plugin the schema is unchanged.
*/
function toPhysicalSchema(db, expected) {
	const physical = {};
	for (const [table, definition] of Object.entries(expected)) {
		const entries = Object.entries(definition.fields);
		const sent = sentIdentifiers(db, table, [definition.idColumn ?? "id", ...entries.map(([column]) => column)]);
		const fields = {};
		entries.forEach(([column, attribute], index) => {
			fields[sent.columns[index + 1] ?? column] = attribute;
		});
		physical[sent.table] = {
			...definition,
			fields,
			schema: sent.schema ?? definition.schema,
			...sent.columns[0] !== "id" && { idColumn: sent.columns[0] }
		};
	}
	return physical;
}
/**
* Compiles a select of `columns` from `table` and reads the identifiers back
* out of the transformed query, including the schema a plugin such as
* `WithSchemaPlugin` qualifies the table with. A node the query does not
* carry in the expected shape leaves its identifier undefined.
*/
function sentIdentifiers(db, table, columns) {
	const { query } = db.selectFrom(table).select(columns).compile();
	if (!SelectQueryNode.is(query)) return {
		table,
		columns: []
	};
	const from = query.from?.froms[0];
	const sentTable = from && TableNode.is(from) ? from.table : void 0;
	return {
		schema: sentTable?.schema?.name,
		table: sentTable?.identifier.name ?? table,
		columns: (query.selections ?? []).map(({ selection }) => ReferenceNode.is(selection) && ColumnNode.is(selection.column) ? selection.column.column.name : void 0)
	};
}
/**
* The default schema for migration tooling. Let PostgreSQL resolve role
* names and privileges, retaining the legacy public fallback when none exists.
* Runtime validation uses the effective search path instead of this fallback.
*/
async function getPostgresSchema(db) {
	return (await sql`
		SELECT pg_catalog.current_schema() AS schema
	`.execute(db.withoutPlugins())).rows[0]?.schema ?? "public";
}
async function getMssqlSchema(db) {
	return (await sql`
		SELECT SCHEMA_NAME() AS "schemaName"
	`.execute(db.withoutPlugins())).rows[0]?.schemaName || "dbo";
}
async function schemaSearchPath(db, dbType) {
	if (dbType === "postgres") return (await sql`
			SELECT pg_catalog.current_schemas(true)::text[] AS schemas
		`.execute(db.withoutPlugins())).rows[0]?.schemas ?? [];
	if (dbType === "mssql") return [await getMssqlSchema(db), "dbo"];
}
/**
* Compares the live database with the tables this configuration writes. Both
* sides are read in the identifiers the connection sends: a plugin that
* renames identifiers or qualifies them with a schema is applied to the
* expected side, and introspection reports what the database stores.
*/
async function findSchemaProblems(db, dbType, expected) {
	const physical = toPhysicalSchema(db, expected);
	if (dbType === "sqlite") return diffSchema(physical, toIntrospectedTables(await introspectSqliteTables(db, Object.entries(physical).flatMap(([name, table]) => table.disableMigrations ? [] : [name]))));
	return db.connection().execute(async (connection) => {
		const searchPath = await schemaSearchPath(connection, dbType);
		const tables = toIntrospectedTables(await connection.introspection.getTables());
		for (const [name, table] of Object.entries(physical)) {
			if (table.schema !== void 0 || !searchPath) continue;
			table.schema = searchPath.find((schema) => tables.some((candidate) => candidate.name === name && candidate.schema === schema)) ?? "";
		}
		return diffSchema(physical, tables);
	});
}
//#endregion
//#region src/kysely-adapter.ts
const kyselyAdapter = (db, config) => {
	let lazyOptions = null;
	let mysqlNoIdWarned = false;
	const createCustomAdapter = (db, inTransaction = false) => {
		return ({ getFieldName, schema, getDefaultFieldName, getDefaultModelName, getFieldAttributes, getModelName, options }) => {
			if (config?.type === "mysql" && options.advanced?.database?.generateId === false && !mysqlNoIdWarned) {
				mysqlNoIdWarned = true;
				logger.warn("[Kysely Adapter] MySQL does not support INSERT...RETURNING. With generateId set to false, the adapter uses best-effort fallback strategies (unique columns, full-field match) to retrieve inserted rows. For reliable behavior, use Better Auth's default ID generation, a custom generateId function, or generateId: \"serial\" for auto-increment.");
			}
			const selectAllJoins = (join) => {
				const allSelects = [];
				const allSelectsStr = [];
				if (join) for (const [joinModel, joinConfig] of Object.entries(join)) {
					const fields = schema[joinConfig.modelKey ?? getDefaultModelName(joinModel)]?.fields;
					const [_joinModelSchema, joinModelName] = joinModel.includes(".") ? joinModel.split(".") : [void 0, joinModel];
					if (!fields) continue;
					fields.id = { type: "string" };
					for (const [field, fieldAttr] of Object.entries(fields)) {
						allSelects.push(sql`${sql.ref(`join_${joinModelName}`)}.${sql.ref(fieldAttr.fieldName || field)} as ${sql.ref(`_joined_${joinModelName}_${fieldAttr.fieldName || field}`)}`);
						allSelectsStr.push({
							joinModel,
							joinModelRef: joinModelName,
							fieldName: fieldAttr.fieldName || field
						});
					}
				}
				return {
					allSelectsStr,
					allSelects
				};
			};
			const withReturning = async (values, builder, model, modelKey, where) => {
				if (config?.type === "mysql") {
					if (where.length > 0) {
						const updateResult = await builder.executeTakeFirst();
						if (!updateResult || Number(updateResult.numUpdatedRows ?? 0) === 0) return null;
						const idEqualityWhere = where.find((w) => w.field === "id" && (w.operator === void 0 || w.operator === "eq") && w.connector !== "OR" && w.value !== void 0 && w.value !== null);
						let reselectField;
						let reselectValue;
						if (values.id !== void 0 && values.id !== null) {
							reselectField = "id";
							reselectValue = values.id;
						} else if (idEqualityWhere) {
							reselectField = "id";
							reselectValue = idEqualityWhere.value;
						} else if (where[0]?.field) {
							reselectField = where[0].field;
							reselectValue = values[reselectField] !== void 0 ? values[reselectField] : where[0].value;
						} else return null;
						return await db.selectFrom(model).selectAll().where(getFieldName({
							model: modelKey,
							field: reselectField
						}), reselectValue === null ? "is" : "=", reselectValue).limit(1).executeTakeFirst();
					}
					await builder.execute();
					const fetchInserted = async (trx) => {
						if (values.id) return await trx.selectFrom(model).selectAll().where(getFieldName({
							model: modelKey,
							field: "id"
						}), "=", values.id).limit(1).executeTakeFirst();
						if (options.advanced?.database?.generateId === "serial") {
							const lastId = (await sql`SELECT LAST_INSERT_ID() as id`.execute(trx)).rows[0]?.id;
							if (lastId) return await trx.selectFrom(model).selectAll().where(getFieldName({
								model: modelKey,
								field: "id"
							}), "=", lastId).limit(1).executeTakeFirst();
						}
						const modelSchema = schema[modelKey]?.fields;
						if (modelSchema) for (const [fieldKey, fieldAttr] of Object.entries(modelSchema)) {
							if (!fieldAttr.unique) continue;
							const dbFieldName = getFieldName({
								model: modelKey,
								field: fieldKey
							});
							const val = values[dbFieldName];
							if (val === void 0 || val === null) continue;
							const row = await trx.selectFrom(model).selectAll().where(dbFieldName, "=", val).limit(1).executeTakeFirst();
							if (row) return row;
						}
						let query = trx.selectFrom(model).selectAll();
						let hasConditions = false;
						for (const [key, val] of Object.entries(values)) {
							if (val === void 0) continue;
							query = query.where(key, val === null ? "is" : "=", val);
							hasConditions = true;
						}
						if (hasConditions) {
							const rows = await query.limit(2).execute();
							if (rows.length === 1) return rows[0];
						}
						logger.warn(`[Kysely Adapter] Unable to safely identify the inserted "${model}" row on MySQL. Enable Better Auth ID generation or use generateId: "serial" for reliable behavior.`);
						return null;
					};
					return inTransaction ? fetchInserted(db) : db.transaction().execute(fetchInserted);
				}
				if (config?.type === "mssql") return await builder.outputAll("inserted").executeTakeFirst();
				return await builder.returningAll().executeTakeFirst();
			};
			function convertWhereClause(model, modelKey, w) {
				if (!w) return {
					and: null,
					or: null
				};
				const conditions = {
					and: [],
					or: []
				};
				w.forEach((condition) => {
					const { field: _field, value: _value, operator = "eq", connector = "AND", mode = "sensitive" } = condition;
					const value = _value;
					const field = getFieldName({
						model: modelKey,
						field: _field
					});
					const isInsensitive = mode === "insensitive" && (typeof value === "string" || Array.isArray(value) && value.every((v) => typeof v === "string"));
					const expr = (eb) => {
						const f = `${model}.${field}`;
						if (operator.toLowerCase() === "in") {
							if (isInsensitive) {
								const { lhs, values } = insensitiveIn(f, Array.isArray(value) ? value : [value]);
								return eb(lhs, "in", values);
							}
							return eb(f, "in", Array.isArray(value) ? value : [value]);
						}
						if (operator.toLowerCase() === "not_in") {
							if (isInsensitive) {
								const { lhs, values } = insensitiveNotIn(f, Array.isArray(value) ? value : [value]);
								return eb(lhs, "not in", values);
							}
							return eb(f, "not in", Array.isArray(value) ? value : [value]);
						}
						if (operator === "contains") {
							if (isInsensitive && typeof value === "string") return insensitiveIlike(f, `%${value}%`, config?.type);
							return eb(f, "like", `%${value}%`);
						}
						if (operator === "starts_with") {
							if (isInsensitive && typeof value === "string") return insensitiveIlike(f, `${value}%`, config?.type);
							return eb(f, "like", `${value}%`);
						}
						if (operator === "ends_with") {
							if (isInsensitive && typeof value === "string") return insensitiveIlike(f, `%${value}`, config?.type);
							return eb(f, "like", `%${value}`);
						}
						if (operator === "eq") {
							if (value === null) return eb(f, "is", null);
							if (isInsensitive && typeof value === "string") {
								const { lhs, value: v } = insensitiveEq(f, value);
								return eb(lhs, "=", v);
							}
							return eb(f, "=", value);
						}
						if (operator === "ne") {
							if (value === null) return eb(f, "is not", null);
							if (isInsensitive && typeof value === "string") {
								const { lhs, value: v } = insensitiveNe(f, value);
								return eb(lhs, "<>", v);
							}
							return eb(f, "<>", value);
						}
						if (operator === "gt") return eb(f, ">", value);
						if (operator === "gte") return eb(f, ">=", value);
						if (operator === "lt") return eb(f, "<", value);
						if (operator === "lte") return eb(f, "<=", value);
						return eb(f, operator, value);
					};
					if (connector === "OR") conditions.or.push(expr);
					else conditions.and.push(expr);
				});
				return {
					and: conditions.and.length ? conditions.and : null,
					or: conditions.or.length ? conditions.or : null
				};
			}
			function processJoinedResults(rows, joinConfig, allSelectsStr) {
				if (!joinConfig || !rows.length) return rows;
				const groupedByMainId = /* @__PURE__ */ new Map();
				for (const currentRow of rows) {
					const mainModelFields = {};
					const joinedModelFields = {};
					for (const [joinModel] of Object.entries(joinConfig)) joinedModelFields[joinModel] = {};
					for (const [key, value] of Object.entries(currentRow)) {
						const keyStr = String(key);
						let assigned = false;
						for (const { joinModel, fieldName, joinModelRef } of allSelectsStr) if (keyStr === `_joined_${joinModelRef}_${fieldName}` || keyStr === `_Joined${capitalizeFirstLetter(joinModelRef)}${capitalizeFirstLetter(fieldName)}`) {
							joinedModelFields[joinModel][getFieldName({
								model: joinConfig[joinModel]?.modelKey ?? joinModel,
								field: fieldName
							})] = value;
							assigned = true;
							break;
						}
						if (!assigned) mainModelFields[key] = value;
					}
					const mainId = mainModelFields.id;
					if (!mainId) continue;
					if (!groupedByMainId.has(mainId)) {
						const entry = { ...mainModelFields };
						for (const [joinModel, joinAttr] of Object.entries(joinConfig)) entry[joinModel] = joinAttr.relation === "one-to-one" ? null : [];
						groupedByMainId.set(mainId, entry);
					}
					const entry = groupedByMainId.get(mainId);
					for (const [joinModel, joinAttr] of Object.entries(joinConfig)) {
						const isUnique = joinAttr.relation === "one-to-one";
						const limit = joinAttr.limit ?? 100;
						const joinedObj = joinedModelFields[joinModel];
						const hasData = joinedObj && Object.keys(joinedObj).length > 0 && Object.values(joinedObj).some((value) => value !== null && value !== void 0);
						if (isUnique) entry[joinModel] = hasData ? joinedObj : null;
						else {
							const joinModelName = joinModel;
							if (Array.isArray(entry[joinModelName]) && hasData) {
								if (entry[joinModelName].length >= limit) continue;
								const idFieldName = getFieldName({
									model: joinAttr.modelKey ?? joinModel,
									field: "id"
								});
								const joinedId = joinedObj[idFieldName];
								if (joinedId) {
									if (!entry[joinModelName].some((item) => item[idFieldName] === joinedId) && entry[joinModelName].length < limit) entry[joinModelName].push(joinedObj);
								} else if (entry[joinModelName].length < limit) entry[joinModelName].push(joinedObj);
							}
						}
					}
				}
				const result = Array.from(groupedByMainId.values());
				for (const entry of result) for (const [joinModel, joinAttr] of Object.entries(joinConfig)) if (joinAttr.relation !== "one-to-one") {
					const joinModelName = joinModel;
					if (Array.isArray(entry[joinModelName])) {
						const limit = joinAttr.limit ?? 100;
						if (entry[joinModelName].length > limit) entry[joinModelName] = entry[joinModelName].slice(0, limit);
					}
				}
				return result;
			}
			return {
				async create({ data, model, modelKey = model }) {
					return await withReturning(data, db.insertInto(model).values(data), model, modelKey, []);
				},
				async findOne({ model, modelKey = model, where, select, join }) {
					const { and, or } = convertWhereClause(model, modelKey, where);
					let query = db.selectFrom((eb) => {
						let b = eb.selectFrom(model);
						if (and) b = b.where((eb) => eb.and(and.map((expr) => expr(eb))));
						if (or) b = b.where((eb) => eb.or(or.map((expr) => expr(eb))));
						if (select?.length && select.length > 0) b = b.select(select.map((field) => getFieldName({
							model: modelKey,
							field
						})));
						else b = b.selectAll();
						return b.as("primary");
					}).selectAll("primary");
					if (join) for (const [joinModel, joinAttr] of Object.entries(join)) {
						const [_joinModelSchema, joinModelName] = joinModel.includes(".") ? joinModel.split(".") : [void 0, joinModel];
						query = query.leftJoin(`${joinModel} as join_${joinModelName}`, (join) => join.onRef(`join_${joinModelName}.${joinAttr.on.to}`, "=", `primary.${joinAttr.on.from}`));
					}
					const { allSelectsStr, allSelects } = selectAllJoins(join);
					query = query.select(allSelects);
					const res = await query.execute();
					if (!res || !Array.isArray(res) || res.length === 0) return null;
					const row = res[0];
					if (join) return processJoinedResults(res, join, allSelectsStr)[0];
					return row;
				},
				async findMany({ model, modelKey = model, where, limit, select, offset, sortBy, join }) {
					const { and, or } = convertWhereClause(model, modelKey, where);
					let query = db.selectFrom((eb) => {
						let b = eb.selectFrom(model);
						if (config?.type === "mssql") {
							if (offset !== void 0) {
								if (!sortBy) b = b.orderBy(getFieldName({
									model: modelKey,
									field: "id"
								}));
								b = b.offset(offset).fetch(limit || 100);
							} else if (limit !== void 0) b = b.top(limit);
						} else {
							if (limit !== void 0) b = b.limit(limit);
							if (offset !== void 0) b = b.offset(offset);
						}
						if (sortBy?.field) b = b.orderBy(`${getFieldName({
							model: modelKey,
							field: sortBy.field
						})}`, sortBy.direction);
						if (and) b = b.where((eb) => eb.and(and.map((expr) => expr(eb))));
						if (or) b = b.where((eb) => eb.or(or.map((expr) => expr(eb))));
						if (select?.length && select.length > 0) b = b.select(select.map((field) => getFieldName({
							model: modelKey,
							field
						})));
						else b = b.selectAll();
						return b.as("primary");
					}).selectAll("primary");
					if (join) for (const [joinModel, joinAttr] of Object.entries(join)) {
						const [_joinModelSchema, joinModelName] = joinModel.includes(".") ? joinModel.split(".") : [void 0, joinModel];
						query = query.leftJoin(`${joinModel} as join_${joinModelName}`, (join) => join.onRef(`join_${joinModelName}.${joinAttr.on.to}`, "=", `primary.${joinAttr.on.from}`));
					}
					const { allSelectsStr, allSelects } = selectAllJoins(join);
					query = query.select(allSelects);
					if (sortBy?.field) query = query.orderBy(`${getFieldName({
						model: modelKey,
						field: sortBy.field
					})}`, sortBy.direction);
					const res = await query.execute();
					if (!res) return [];
					if (join) return processJoinedResults(res, join, allSelectsStr);
					return res;
				},
				async update({ model, modelKey = model, where, update: values }) {
					if (where.length === 0) return null;
					const { and, or } = convertWhereClause(model, modelKey, where);
					let query = db.updateTable(model).set(values);
					if (and) query = query.where((eb) => eb.and(and.map((expr) => expr(eb))));
					if (or) query = query.where((eb) => eb.or(or.map((expr) => expr(eb))));
					return await withReturning(values, query, model, modelKey, where);
				},
				async updateMany({ model, modelKey = model, where, update: values }) {
					const { and, or } = convertWhereClause(model, modelKey, where);
					let query = db.updateTable(model).set(values);
					if (and) query = query.where((eb) => eb.and(and.map((expr) => expr(eb))));
					if (or) query = query.where((eb) => eb.or(or.map((expr) => expr(eb))));
					const res = (await query.executeTakeFirst()).numUpdatedRows;
					return res > Number.MAX_SAFE_INTEGER ? Number.MAX_SAFE_INTEGER : Number(res);
				},
				async count({ model, modelKey = model, where }) {
					const { and, or } = convertWhereClause(model, modelKey, where);
					let query = db.selectFrom(model).select(db.fn.count("id").as("count"));
					if (and) query = query.where((eb) => eb.and(and.map((expr) => expr(eb))));
					if (or) query = query.where((eb) => eb.or(or.map((expr) => expr(eb))));
					const res = await query.execute();
					if (typeof res[0].count === "number") return res[0].count;
					if (typeof res[0].count === "bigint") return Number(res[0].count);
					return parseInt(res[0].count);
				},
				async delete({ model, modelKey = model, where }) {
					const { and, or } = convertWhereClause(model, modelKey, where);
					let query = db.deleteFrom(model);
					if (and) query = query.where((eb) => eb.and(and.map((expr) => expr(eb))));
					if (or) query = query.where((eb) => eb.or(or.map((expr) => expr(eb))));
					await query.execute();
				},
				async deleteMany({ model, modelKey = model, where }) {
					const { and, or } = convertWhereClause(model, modelKey, where);
					let query = db.deleteFrom(model);
					if (and) query = query.where((eb) => eb.and(and.map((expr) => expr(eb))));
					if (or) query = query.where((eb) => eb.or(or.map((expr) => expr(eb))));
					const res = (await query.executeTakeFirst()).numDeletedRows;
					return res > Number.MAX_SAFE_INTEGER ? Number.MAX_SAFE_INTEGER : Number(res);
				},
				async consumeOne({ model, modelKey = model, where }) {
					const { and, or } = convertWhereClause(model, modelKey, where);
					const applyWhere = (query) => {
						if (and) query = query.where((eb) => eb.and(and.map((expr) => expr(eb))));
						if (or) query = query.where((eb) => eb.or(or.map((expr) => expr(eb))));
						return query;
					};
					const idField = getFieldName({
						model: modelKey,
						field: "id"
					});
					const deleteSelectedRow = async (db, row) => {
						const targetId = row[idField] ?? row.id;
						if (targetId === void 0 || targetId === null) return null;
						const query = db.deleteFrom(model).where(`${model}.${idField}`, "=", targetId);
						if (config?.type === "mysql") {
							const result = await query.executeTakeFirst();
							return Number(result.numDeletedRows) > 0 ? row : null;
						}
						if (config?.type === "mssql") return await query.outputAll("deleted").executeTakeFirst() ?? null;
						return await query.returningAll().executeTakeFirst() ?? null;
					};
					const deleteWithReturning = async (query) => {
						if (config?.type === "mssql") return await query.outputAll("deleted").executeTakeFirst() ?? null;
						return await query.returningAll().executeTakeFirst() ?? null;
					};
					if (config?.type === "mysql") {
						const claimFromTransaction = async (trx) => {
							const row = await applyWhere(trx.selectFrom(model).selectAll().forUpdate()).limit(1).executeTakeFirst();
							if (!row) return null;
							return deleteSelectedRow(trx, row);
						};
						return inTransaction ? claimFromTransaction(db) : db.transaction().execute(claimFromTransaction);
					}
					const selectIds = applyWhere(db.selectFrom(model).select(`${model}.${idField}`));
					const targetIds = config?.type === "mssql" ? selectIds.top(1) : selectIds.limit(1);
					return deleteWithReturning(applyWhere(db.deleteFrom(model).where(`${model}.${idField}`, "in", targetIds)));
				},
				async incrementOne({ model, modelKey = model, where, increment, set }) {
					const { and, or } = convertWhereClause(model, modelKey, where);
					const applyWhere = (query) => {
						if (and) query = query.where((eb) => eb.and(and.map((expr) => expr(eb))));
						if (or) query = query.where((eb) => eb.or(or.map((expr) => expr(eb))));
						return query;
					};
					const assignments = { ...set ?? {} };
					for (const [field, delta] of Object.entries(increment)) assignments[field] = sql`${sql.ref(field)} + ${delta}`;
					const idField = getFieldName({
						model: modelKey,
						field: "id"
					});
					if (config?.type === "mysql") {
						const incrementInTransaction = async (trx) => {
							const target = await applyWhere(trx.selectFrom(model).select(`${model}.${idField}`).forUpdate()).limit(1).executeTakeFirst();
							if (!target) return null;
							const targetId = target[idField] ?? target.id;
							if (targetId === void 0 || targetId === null) return null;
							const updated = await applyWhere(trx.updateTable(model).set(assignments)).where(`${model}.${idField}`, "=", targetId).executeTakeFirst();
							if (Number(updated.numUpdatedRows) === 0) return null;
							return await trx.selectFrom(model).selectAll().where(`${model}.${idField}`, "=", targetId).limit(1).executeTakeFirst() ?? null;
						};
						return inTransaction ? incrementInTransaction(db) : db.transaction().execute(incrementInTransaction);
					}
					const selectIds = applyWhere(db.selectFrom(model).select(`${model}.${idField}`));
					const targetIds = config?.type === "mssql" ? selectIds.top(1) : selectIds.limit(1);
					const updateQuery = applyWhere(db.updateTable(model).set(assignments)).where(`${model}.${idField}`, "in", targetIds);
					if (config?.type === "mssql") return await updateQuery.outputAll("inserted").executeTakeFirst() ?? null;
					return await updateQuery.returningAll().executeTakeFirst() ?? null;
				},
				options: config
			};
		};
	};
	let adapterOptions = null;
	adapterOptions = {
		config: {
			adapterId: "kysely",
			adapterName: "Kysely Adapter",
			usePlural: config?.usePlural,
			debugLogs: config?.debugLogs,
			supportsBooleans: config?.type === "sqlite" || config?.type === "mssql" || config?.type === "mysql" || !config?.type ? false : true,
			supportsDates: config?.type === "sqlite" || config?.type === "mssql" || !config?.type ? false : true,
			supportsJSON: config?.type === "postgres" ? true : false,
			supportsArrays: false,
			supportsUUIDs: config?.type === "postgres" ? true : false,
			transaction: config?.transaction ? (cb) => db.transaction().execute((trx) => {
				return cb(createAdapterFactory({
					config: {
						...adapterOptions.config,
						transaction: false
					},
					adapter: createCustomAdapter(trx, true)
				})(lazyOptions));
			}) : false
		},
		adapter: createCustomAdapter(db)
	};
	const adapter = createAdapterFactory(adapterOptions);
	return (options) => {
		lazyOptions = options;
		const instance = adapter(options);
		registerSchemaCheck(instance, createSchemaCheck(() => findSchemaProblems(db, config?.type, getExpectedSchema(options, { usePlural: config?.usePlural })), "database", options.database), { runtimeEnabled: checksSchema(options) });
		return instance;
	};
};
//#endregion
export { createKyselyAdapter, getKyselyDatabaseType, getMssqlSchema, getPostgresSchema, kyselyAdapter, toIntrospectedTables, toPhysicalSchema };
