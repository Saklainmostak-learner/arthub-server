import { sql } from "kysely";
//#region src/kysely-migration-tables.ts
/**
* Kysely's internal migration table names, mirrored as local constants.
*
* Kysely 0.29 moved these from its main entry to the `kysely/migration`
* subpath (which 0.28 lacks), and the main entry now exports only type stubs
* with no runtime value, which breaks strict ESM bundlers.
*
* The values are stable parts of Kysely's public migration contract. Mirroring
* them allows the SQLite dialects to support both Kysely 0.28 and 0.29.
*
* TODO: Import these from `kysely/migration` after dropping Kysely 0.28.
*/
const DEFAULT_MIGRATION_TABLE = "kysely_migration";
const DEFAULT_MIGRATION_LOCK_TABLE = "kysely_migration_lock";
//#endregion
//#region src/sqlite-introspector.ts
function sqliteIntegerPrimaryKeyColumn(columns) {
	const primaryKeys = columns.filter((column) => column.pk > 0);
	const primaryKey = primaryKeys.length === 1 ? primaryKeys[0] : void 0;
	return primaryKey?.type.toLowerCase() === "integer" ? primaryKey.name : void 0;
}
async function sqliteGeneratedPrimaryKeyColumn(db, name, columns) {
	const column = sqliteIntegerPrimaryKeyColumn(columns);
	if (!column) return;
	const { rows } = await sql`
		PRAGMA index_list(${sql.id(name)})
	`.execute(db.withoutPlugins());
	return rows.some((index) => index.origin === "pk") ? void 0 : column;
}
function toSqliteTableMetadata(table, columns, autoIncrementColumn) {
	return {
		name: table.name,
		isView: table.type === "view",
		columns: columns.map((column) => ({
			name: column.name,
			dataType: column.type,
			isNullable: column.notnull === 0,
			isAutoIncrementing: column.name === autoIncrementColumn,
			hasDefaultValue: column.dflt_value != null
		}))
	};
}
async function readTableMetadata(db, name) {
	const { rows: columns } = await sql`
		PRAGMA table_info(${sql.id(name)})
	`.execute(db.withoutPlugins());
	if (columns.length === 0) return;
	const generatedColumn = await sqliteGeneratedPrimaryKeyColumn(db, name, columns);
	return toSqliteTableMetadata({ name }, columns, generatedColumn);
}
async function introspectSqliteTables(db, tableNames) {
	if (tableNames.length === 0) return [];
	try {
		return await db.introspection.getTables();
	} catch {
		return (await Promise.all(tableNames.map((name) => readTableMetadata(db, name)))).filter((table) => table !== void 0);
	}
}
function createSqliteIntrospector(db) {
	const systemDb = db;
	async function getSchemas() {
		return [];
	}
	async function getTables(options = { withInternalKyselyTables: false }) {
		let query = systemDb.selectFrom("sqlite_schema").where("type", "=", "table").where("name", "not like", "sqlite_%").select("name");
		if (!options.withInternalKyselyTables) query = query.where("name", "!=", DEFAULT_MIGRATION_TABLE).where("name", "!=", DEFAULT_MIGRATION_LOCK_TABLE);
		const tables = await query.execute();
		return Promise.all(tables.map(async ({ name }) => {
			const columns = await db.selectFrom(sql`pragma_table_info(${name})`.as("table_info")).select([
				"cid",
				"name",
				"type",
				"notnull",
				"dflt_value",
				"pk"
			]).execute();
			const generatedColumn = await sqliteGeneratedPrimaryKeyColumn(db, name, columns);
			return toSqliteTableMetadata({ name }, columns, generatedColumn);
		}));
	}
	return {
		getSchemas,
		getTables,
		getMetadata: async (options) => ({ tables: await getTables(options) })
	};
}
//#endregion
export { DEFAULT_MIGRATION_LOCK_TABLE as a, toSqliteTableMetadata as i, introspectSqliteTables as n, DEFAULT_MIGRATION_TABLE as o, sqliteIntegerPrimaryKeyColumn as r, createSqliteIntrospector as t };
