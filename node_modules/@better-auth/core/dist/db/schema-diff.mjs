import { BetterAuthError } from "../error/index.mjs";
import { getAuthTables } from "./get-tables.mjs";
//#region src/db/schema-diff.ts
/**
* The tables this configuration writes, keyed the way the adapter addresses
* them. Tables that share a physical name are merged into one entry.
*/
function getExpectedSchema(options, { usePlural = false } = {}) {
	const expected = {};
	for (const table of Object.values(getAuthTables(options))) {
		const name = usePlural ? `${table.modelName}s` : table.modelName;
		const entry = expected[name] ??= {
			fields: {},
			disableMigrations: true
		};
		for (const [key, field] of Object.entries(table.fields)) entry.fields[field.fieldName || key] = field;
		entry.disableMigrations = entry.disableMigrations && !!table.disableMigrations;
	}
	return expected;
}
/**
* Compares the tables Better Auth writes with what the store holds.
*
* A table or column Better Auth writes must exist. A column Better Auth does
* not write must accept an insert that omits it, so it is nullable or carries
* a default. Otherwise every insert into that table fails with a constraint
* error that says nothing about why the schema drifted.
*/
function diffSchema(expected, actual) {
	const findings = [];
	for (const [tableName, table] of Object.entries(expected)) {
		if (table.disableMigrations) continue;
		const actualTable = actual.find((candidate) => candidate.name === tableName && (table.schema === void 0 || candidate.schema === table.schema));
		if (!actualTable) {
			findings.push({
				kind: "missing-table",
				table: tableName
			});
			continue;
		}
		const written = new Set([table.idColumn ?? "id", ...Object.keys(table.fields)]);
		for (const column of written) if (!actualTable.columns.some((candidate) => candidate.name === column)) findings.push({
			kind: "missing-column",
			table: tableName,
			column
		});
		for (const column of actualTable.columns) {
			if (written.has(column.name) || column.nullable || column.hasDefault) continue;
			findings.push({
				kind: "unexpected-required-column",
				table: tableName,
				column: column.name
			});
		}
	}
	return findings;
}
const applyHint = {
	database: "Run `npx auth migrate` to add it.",
	drizzle: "Run `npx auth generate` to refresh the Drizzle schema, then apply it with your migration tool.",
	prisma: "Run `npx auth generate` to refresh the Prisma schema, then run `prisma migrate`."
};
const relaxHint = {
	database: "Drop the column, make it nullable, or give it a database default.",
	drizzle: "Remove it from the Drizzle schema, make it nullable, or give it a default, then apply the change with your migration tool.",
	prisma: "Remove it from the Prisma schema, make it optional, or give it a default, then run `prisma migrate`."
};
const sourceLabel = {
	database: "Database",
	drizzle: "Drizzle",
	prisma: "Prisma"
};
/**
* One finding as a sentence that names the change resolving it.
*/
function formatSchemaFinding(finding, source) {
	switch (finding.kind) {
		case "missing-table": return `Table "${finding.table}" is missing. ${applyHint[source]}`;
		case "missing-column": return `Column "${finding.column}" is missing from table "${finding.table}". ${applyHint[source]}`;
		case "unexpected-required-column": {
			const issuer = finding.column === "issuer" ? " If this column came from Better Auth 1.7.0 through 1.7.2, follow the upgrade guide before removing it: https://www.better-auth.com/docs/guides/1-7-upgrade-guide" : "";
			return `Column "${finding.column}" on table "${finding.table}" is required but Better Auth never writes it, so every insert into "${finding.table}" fails. ${relaxHint[source]}${issuer}`;
		}
	}
}
const repairHint = {
	database: "Make the listed columns nullable, give them defaults, or remove them.",
	drizzle: "Make the listed columns nullable in your Drizzle schema, give them defaults, or remove them.",
	prisma: "Make the listed fields optional in your Prisma schema, give them defaults, or remove them."
};
const migrationHint = {
	...applyHint,
	database: "Run `npx auth migrate` to add the missing tables and columns."
};
function formatSchemaMismatch(findings, source) {
	const tables = [];
	const columns = [];
	const required = [];
	const affectedTables = /* @__PURE__ */ new Set();
	let hasIssuer = false;
	for (const finding of findings) switch (finding.kind) {
		case "missing-table":
			tables.push(finding.table);
			break;
		case "missing-column":
			columns.push(`${finding.table}.${finding.column}`);
			break;
		case "unexpected-required-column":
			required.push(`${finding.table}.${finding.column}`);
			affectedTables.add(finding.table);
			hasIssuer ||= finding.column === "issuer";
			break;
	}
	const sections = [`${sourceLabel[source]} schema mismatch`];
	if (tables.length) sections.push(`  Missing tables\n    ${tables.join(", ")}`);
	if (columns.length) sections.push(`  Missing columns\n    ${columns.join("\n    ")}`);
	if (required.length) {
		sections.push(`  Required columns Better Auth never writes\n    ${required.join("\n    ")}`);
		sections.push(`  Inserts into ${[...affectedTables].join(", ")} will fail.`);
	}
	const help = [];
	if (required.length) help.push(repairHint[source]);
	if (tables.length || columns.length || required.length && source !== "database") help.push(migrationHint[source]);
	if (help.length) sections.push(`  help: ${help.join("\n        ")}`);
	if (hasIssuer) sections.push("  note: If this column came from Better Auth 1.7.0 through 1.7.2,\n        follow the upgrade guide before removing it:\n        https://www.better-auth.com/docs/guides/1-7-upgrade-guide");
	return sections.join("\n\n");
}
/**
* The store cannot hold what this configuration writes.
*
* `findings` carries every problem as data; `message` lists each one with the
* change that resolves it. Reported during initialization and thrown when
* requests await validation, in every environment. Also thrown by
* `auth migrate` before it changes anything.
*
* @example
* ```ts
* try {
*   await auth.api.getSession({ headers });
* } catch (error) {
*   if (error instanceof SchemaMismatchError) console.error(error.findings);
* }
* ```
*/
var SchemaMismatchError = class extends BetterAuthError {
	code = "SCHEMA_MISMATCH";
	constructor(findings, source) {
		super(formatSchemaMismatch(findings, source));
		this.findings = findings;
		this.source = source;
	}
};
//#endregion
export { SchemaMismatchError, diffSchema, formatSchemaFinding, getExpectedSchema };
