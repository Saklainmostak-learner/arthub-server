import { diffSchema, getExpectedSchema } from "@better-auth/core/db/internal";
import { Table, getTableColumns, ilike, is, sql } from "drizzle-orm";
//#region src/join-relation-key.ts
/**
* Reads the relation registry used to build Drizzle relational queries.
*
* - Drizzle 0.x (Relations v1): `db._.schema`
* - Drizzle 1.x (Relations v2): `db._.relations`
*/
function buildRelationKeysByModel(relationRegistry) {
	const relationKeysByModel = /* @__PURE__ */ new Map();
	for (const [model, tableMetadata] of Object.entries(relationRegistry ?? {})) {
		if (!tableMetadata.relations) continue;
		relationKeysByModel.set(model, new Set(Object.keys(tableMetadata.relations)));
	}
	return relationKeysByModel;
}
function getOneToOneRelationKey({ baseModel, joinModel, baseModelKey, joinModelKey, relationKeys, schema, getDefaultModelName }) {
	const defaultBaseModelName = baseModelKey ?? getDefaultModelName(baseModel);
	const defaultJoinModelName = joinModelKey ?? getDefaultModelName(joinModel);
	const joinModelFields = schema[defaultJoinModelName]?.fields ?? {};
	const generatedRelationKey = Object.values(joinModelFields).some((field) => field.references && getDefaultModelName(field.references.model) === defaultBaseModelName) ? joinModel : schema[defaultJoinModelName]?.modelName ?? defaultJoinModelName;
	if (!relationKeys?.size) return joinModel;
	if (relationKeys.has(generatedRelationKey)) return generatedRelationKey;
	if (relationKeys.has(joinModel)) return joinModel;
	return generatedRelationKey;
}
//#endregion
//#region src/query-builders.ts
/**
* Case-insensitive LIKE/ILIKE for pattern matching.
* Uses ILIKE on PostgreSQL, LOWER()+LIKE on MySQL/SQLite.
*/
function insensitiveIlike(column, pattern, provider) {
	return provider === "pg" ? ilike(column, pattern) : sql`LOWER(${column}) LIKE LOWER(${pattern})`;
}
/**
* LIKE/ILIKE with an explicit backslash escape character so callers can match a
* literal `%` or `_`. SQLite has no default LIKE escape, so the ESCAPE clause is
* always supplied. The escape character is passed as a bound parameter.
*
* This does not support MySQL's `NO_BACKSLASH_ESCAPES` sql_mode, under which the
* bound backslash is rejected as a two-character ESCAPE argument.
*
* @see https://www.sqlite.org/lang_expr.html
*/
function escapedLike(column, pattern, provider, mode = "sensitive") {
	const escape = "\\";
	if (mode === "insensitive") return provider === "pg" ? sql`${column} ILIKE ${pattern} ESCAPE ${escape}` : sql`LOWER(${column}) LIKE LOWER(${pattern}) ESCAPE ${escape}`;
	return sql`${column} LIKE ${pattern} ESCAPE ${escape}`;
}
/**
* Case-insensitive IN for string arrays.
*/
function insensitiveInArray(column, values) {
	if (values.length === 0) return sql`false`;
	return sql`LOWER(${column}) IN (${sql.join(values.map((v) => sql`LOWER(${v})`), sql`, `)})`;
}
/**
* Case-insensitive NOT IN for string arrays.
*/
function insensitiveNotInArray(column, values) {
	if (values.length === 0) return sql`true`;
	return sql`LOWER(${column}) NOT IN (${sql.join(values.map((v) => sql`LOWER(${v})`), sql`, `)})`;
}
/**
* Case-insensitive equality for strings.
*/
function insensitiveEq(column, value) {
	return sql`LOWER(${column}) = LOWER(${value})`;
}
/**
* Case-insensitive inequality for strings.
*/
function insensitiveNe(column, value) {
	return sql`LOWER(${column}) <> LOWER(${value})`;
}
//#endregion
//#region src/schema-check.ts
/**
* Reads a Drizzle schema object the way the adapter addresses it: each table
* by the key it is exported under, each column by its property name. Values
* that are not tables, such as relations, are skipped.
*/
function introspectDrizzleSchema(schema) {
	const tables = [];
	for (const [name, table] of Object.entries(schema)) {
		if (!is(table, Table)) continue;
		const columns = Object.entries(getTableColumns(table)).map(([key, column]) => ({
			name: key,
			nullable: !column.notNull,
			hasDefault: column.hasDefault || column.generated !== void 0 || column.generatedIdentity !== void 0
		}));
		tables.push({
			name,
			columns
		});
	}
	return tables;
}
/**
* Compares a Drizzle schema object with the tables this configuration writes.
*/
function findDrizzleSchemaProblems(schema, options, usePlural) {
	return diffSchema(getExpectedSchema(options, { usePlural }), introspectDrizzleSchema(schema));
}
//#endregion
export { insensitiveInArray as a, buildRelationKeysByModel as c, insensitiveIlike as i, getOneToOneRelationKey as l, escapedLike as n, insensitiveNe as o, insensitiveEq as r, insensitiveNotInArray as s, findDrizzleSchemaProblems as t };
