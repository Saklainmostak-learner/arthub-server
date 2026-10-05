import { a as DEFAULT_MIGRATION_LOCK_TABLE, i as toSqliteTableMetadata, o as DEFAULT_MIGRATION_TABLE, r as sqliteIntegerPrimaryKeyColumn } from "./sqlite-introspector-DSCAP82F.mjs";
import { SqliteAdapter, SqliteQueryCompiler } from "kysely";
//#region src/d1-sqlite-dialect.ts
function quoteSqliteStringLiteral(value) {
	return `'${value.replaceAll("'", "''")}'`;
}
function createD1IndexIntrospector(database) {
	return async (tableNames) => {
		if (tableNames.length === 0) return [];
		const indexes = (await database.batch(tableNames.map((tableName) => database.prepare(`PRAGMA index_list(${quoteSqliteStringLiteral(tableName)})`)))).flatMap((indexList, tablePosition) => {
			const tableName = tableNames[tablePosition];
			if (!tableName) return [];
			return indexList.results.map((index) => ({
				...index,
				tableName
			}));
		});
		if (indexes.length === 0) return [];
		const indexColumns = await database.batch(indexes.map((index) => database.prepare(`PRAGMA index_info(${quoteSqliteStringLiteral(index.name)})`)));
		return indexes.map((index, indexPosition) => ({
			columns: (indexColumns[indexPosition]?.results ?? []).map((column) => ({
				fullLength: column.name !== null,
				name: column.name,
				position: column.seqno
			})),
			name: index.name,
			partial: index.partial !== 0,
			table: index.tableName,
			unique: index.unique !== 0,
			valid: true
		}));
	};
}
var D1SqliteAdapter = class extends SqliteAdapter {};
var D1SqliteDriver = class {
	#config;
	#connection;
	constructor(config) {
		this.#config = { ...config };
	}
	async init() {
		this.#connection = new D1SqliteConnection(this.#config.database);
		if (this.#config.onCreateConnection) await this.#config.onCreateConnection(this.#connection);
	}
	async acquireConnection() {
		return this.#connection;
	}
	async beginTransaction() {
		throw new Error("D1 does not support interactive transactions. Use the D1 batch() API instead.");
	}
	async commitTransaction() {
		throw new Error("D1 does not support interactive transactions. Use the D1 batch() API instead.");
	}
	async rollbackTransaction() {
		throw new Error("D1 does not support interactive transactions. Use the D1 batch() API instead.");
	}
	async releaseConnection() {}
	async destroy() {}
};
var D1SqliteConnection = class {
	#db;
	constructor(db) {
		this.#db = db;
	}
	async executeQuery(compiledQuery) {
		const results = await this.#db.prepare(compiledQuery.sql).bind(...compiledQuery.parameters).all();
		const numAffectedRows = results.meta.changes != null ? BigInt(results.meta.changes) : void 0;
		return {
			insertId: results.meta.last_row_id === void 0 || results.meta.last_row_id === null ? void 0 : BigInt(results.meta.last_row_id),
			rows: results?.results || [],
			numAffectedRows
		};
	}
	async *streamQuery() {
		throw new Error("D1 does not support streaming queries.");
	}
};
var D1SqliteIntrospector = class {
	#db;
	#d1;
	constructor(db, d1) {
		this.#db = db;
		this.#d1 = d1;
	}
	async getSchemas() {
		return [];
	}
	async getTables(options = { withInternalKyselyTables: false }) {
		let query = this.#db.selectFrom("sqlite_master").where("type", "in", ["table", "view"]).where("name", "not like", "sqlite_%").where("name", "not like", "_cf_%").select(["name", "type"]).$castTo();
		if (!options.withInternalKyselyTables) query = query.where("name", "!=", DEFAULT_MIGRATION_TABLE).where("name", "!=", DEFAULT_MIGRATION_LOCK_TABLE);
		const tables = await query.execute();
		if (tables.length === 0) return [];
		const statements = tables.map((table) => this.#d1.prepare("SELECT * FROM pragma_table_info(?)").bind(table.name));
		const batchResults = await this.#d1.batch(statements);
		const rowidCandidates = tables.flatMap((table, index) => {
			const column = sqliteIntegerPrimaryKeyColumn(batchResults[index]?.results ?? []);
			return column ? [{
				index,
				tableName: table.name,
				column
			}] : [];
		});
		const indexResults = rowidCandidates.length ? await this.#d1.batch(rowidCandidates.map(({ tableName }) => this.#d1.prepare(`PRAGMA index_list(${quoteSqliteStringLiteral(tableName)})`))) : [];
		const generatedColumns = new Map(rowidCandidates.filter((_, index) => !indexResults[index]?.results?.some((row) => row.origin === "pk")).map(({ index, column }) => [index, column]));
		return tables.map((table, index) => {
			return toSqliteTableMetadata(table, batchResults[index]?.results ?? [], generatedColumns.get(index));
		});
	}
	async getMetadata(options) {
		return { tables: await this.getTables(options) };
	}
};
var D1SqliteQueryCompiler = class extends SqliteQueryCompiler {};
var D1SqliteDialect = class {
	#config;
	constructor(config) {
		this.#config = { ...config };
	}
	createDriver() {
		return new D1SqliteDriver(this.#config);
	}
	createQueryCompiler() {
		return new D1SqliteQueryCompiler();
	}
	createAdapter() {
		return new D1SqliteAdapter();
	}
	createIntrospector(db) {
		return new D1SqliteIntrospector(db, this.#config.database);
	}
};
//#endregion
export { D1SqliteDialect, createD1IndexIntrospector };
