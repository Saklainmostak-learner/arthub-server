import { initGetFieldName, initGetModelName } from "@better-auth/core/db/adapter";
import { getDatabaseFieldIndexName, getDatabaseIndexStringLength, resolveDatabaseSchemaIndexes } from "@better-auth/core/db/internal";
import { existsSync } from "node:fs";
import path from "node:path";
import { getAuthTables } from "@better-auth/core/db";
//#region src/relations-v2/generate-drizzle-schema.ts
function convertToSnakeCase(str, camelCase) {
	if (camelCase) return str;
	return str.replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2").replace(/([a-z\d])([A-Z])/g, "$1_$2").toLowerCase();
}
/**
* Convert a schema namespace into a valid JavaScript identifier so it can be
* used as the `export const <name>Schema = pgSchema(...)` variable name.
* e.g. "my-auth" -> "myAuth", "123schema" -> "_123schema".
*/
function toValidIdentifier(str) {
	let result = str.replace(/[^a-zA-Z0-9]+([a-zA-Z0-9])/g, (_, char) => char.toUpperCase()).replace(/[^a-zA-Z0-9]/g, "").replace(/^[0-9]/, "_$&");
	if (result.length > 0 && /[A-Z]/.test(result[0])) result = result[0].toLowerCase() + result.slice(1);
	return result || "schema";
}
const generateDrizzleSchema = async ({ options, file, provider, adapterConfig, camelCase, tables: propsTables }) => {
	const tables = propsTables ?? getAuthTables(options);
	const filePath = file || "./auth-schema.ts";
	const databaseType = provider;
	const schemaName = adapterConfig?.schemaName;
	if (!databaseType) throw new Error(`Database provider type is undefined during Drizzle schema generation. Please define a \`provider\` in the Drizzle adapter config. Read more at https://better-auth.com/docs/adapters/drizzle`);
	const fileExist = existsSync(filePath);
	let code = generateImport({
		databaseType,
		tables,
		options,
		schemaName
	});
	let schemaVarName;
	if (databaseType === "pg" && schemaName) {
		schemaVarName = `${toValidIdentifier(schemaName)}Schema`;
		if (schemaVarName === "pgSchema") schemaVarName = "pgCustomSchema";
		code += `\nexport const ${schemaVarName} = pgSchema(${JSON.stringify(schemaName)});\n`;
	}
	const tableFunction = databaseType === "pg" && schemaName && schemaVarName ? `${schemaVarName}.table` : `${databaseType}Table`;
	const getModelName = initGetModelName({
		schema: tables,
		usePlural: adapterConfig?.usePlural
	});
	const getSingularModelName = initGetModelName({
		schema: tables,
		usePlural: false
	});
	const getFieldName = initGetFieldName({
		schema: tables,
		usePlural: adapterConfig?.usePlural
	});
	const resolvedIndexesByTable = resolveDatabaseSchemaIndexes(Object.keys(tables).filter((tableKey) => !tables[tableKey].disableMigrations).map((tableKey) => ({
		fields: tables[tableKey].fields,
		indexes: tables[tableKey].indexes,
		tableName: getModelName(tableKey)
	})));
	for (const tableKey in tables) {
		const table = tables[tableKey];
		if (table.disableMigrations) continue;
		const modelName = getModelName(tableKey);
		const fields = table.fields;
		const resolvedTableIndexes = resolvedIndexesByTable.get(modelName) ?? [];
		function getType(name, field, tableIndexStringLength) {
			if (!databaseType) throw new Error(`Database provider type is undefined during Drizzle schema generation. Please define a \`provider\` in the Drizzle adapter config. Read more at https://better-auth.com/docs/adapters/drizzle`);
			name = convertToSnakeCase(name, camelCase);
			if (field.references?.field === "id") {
				const useNumberId = options.advanced?.database?.generateId === "serial";
				const useUUIDs = options.advanced?.database?.generateId === "uuid";
				if (useNumberId) if (databaseType === "pg") return `integer('${name}')`;
				else if (databaseType === "mysql") return `int('${name}')`;
				else return `integer('${name}')`;
				if (useUUIDs && databaseType === "pg") return `uuid('${name}')`;
				if (field.references.field) {
					if (databaseType === "mysql") return `varchar('${name}', { length: 36 })`;
				}
				return `text('${name}')`;
			}
			const type = field.type;
			if (typeof type !== "string") if (Array.isArray(type) && type.every((x) => typeof x === "string")) return {
				sqlite: `text('${name}', { enum: [${type.map((x) => `'${x}'`).join(", ")}] })`,
				pg: `text('${name}', { enum: [${type.map((x) => `'${x}'`).join(", ")}] })`,
				mysql: `mysqlEnum('${name}', [${type.map((x) => `'${x}'`).join(", ")}])`
			}[databaseType];
			else throw new TypeError(`Invalid field type for field ${name} in model ${modelName}`);
			const dbTypeMap = {
				string: {
					sqlite: `text('${name}')`,
					pg: `text('${name}')`,
					mysql: tableIndexStringLength ? `varchar('${name}', { length: ${tableIndexStringLength} })` : field.unique ? `varchar('${name}', { length: 255 })` : field.references ? `varchar('${name}', { length: 36 })` : field.sortable ? `varchar('${name}', { length: 255 })` : field.index ? `varchar('${name}', { length: 255 })` : `text('${name}')`
				},
				boolean: {
					sqlite: `integer('${name}', { mode: 'boolean' })`,
					pg: `boolean('${name}')`,
					mysql: `boolean('${name}')`
				},
				number: {
					sqlite: `integer('${name}')`,
					pg: field.bigint ? `bigint('${name}', { mode: 'number' })` : `integer('${name}')`,
					mysql: field.bigint ? `bigint('${name}', { mode: 'number' })` : `int('${name}')`
				},
				date: {
					sqlite: `integer('${name}', { mode: 'timestamp_ms' })`,
					pg: `timestamp('${name}')`,
					mysql: `timestamp('${name}', { fsp: 3 })`
				},
				"number[]": {
					sqlite: `text('${name}', { mode: "json" })`,
					pg: field.bigint ? `bigint('${name}', { mode: 'number' }).array()` : `integer('${name}').array()`,
					mysql: `json('${name}')`
				},
				"string[]": {
					sqlite: `text('${name}', { mode: "json" })`,
					pg: `text('${name}').array()`,
					mysql: `json('${name}')`
				},
				json: {
					sqlite: `text('${name}', { mode: "json" })`,
					pg: `jsonb('${name}')`,
					mysql: `json('${name}')`
				}
			}[type];
			if (!dbTypeMap) throw new Error(`Unsupported field type '${field.type}' for field '${name}'.`);
			return dbTypeMap[databaseType];
		}
		let id = "";
		const useNumberId = options.advanced?.database?.generateId === "serial";
		if (options.advanced?.database?.generateId === "uuid" && databaseType === "pg") id = `uuid("id").default(sql\`pg_catalog.gen_random_uuid()\`).primaryKey()`;
		else if (useNumberId) if (databaseType === "pg") id = `integer("id").generatedByDefaultAsIdentity().primaryKey()`;
		else if (databaseType === "sqlite") id = `integer("id", { mode: "number" }).primaryKey({ autoIncrement: true })`;
		else id = `int("id").autoincrement().primaryKey()`;
		else if (databaseType === "mysql") id = `varchar('id', { length: 36 }).primaryKey()`;
		else if (databaseType === "pg") id = `text('id').primaryKey()`;
		else id = `text('id').primaryKey()`;
		const indexes = [];
		const assignIndexes = (indexes) => {
			if (!indexes.length) return "";
			const code = [`, (table) => [`];
			for (const index of indexes) code.push(`  ${index.type}(${JSON.stringify(index.name)}).on(${index.on.map((fieldName) => `table.${fieldName}`).join(", ")}),`);
			code.push(`]`);
			return code.join("\n");
		};
		for (const tableIndex of resolvedTableIndexes) indexes.push({
			type: tableIndex.unique ? "uniqueIndex" : "index",
			name: tableIndex.name,
			on: tableIndex.columns
		});
		const schema = `export const ${modelName} = ${tableFunction}("${convertToSnakeCase(modelName, camelCase)}", {
					id: ${id},
					${Object.keys(fields).map((field) => {
			const attr = fields[field];
			const fieldName = attr.fieldName || field;
			let type = getType(fieldName, attr, databaseType === "mysql" ? getDatabaseIndexStringLength({
				columnName: fieldName,
				dialect: "mysql",
				fields,
				indexes: resolvedTableIndexes
			}) : void 0);
			if (attr.index && !attr.unique) indexes.push({
				type: "index",
				name: getDatabaseFieldIndexName(modelName, fieldName, false),
				on: [fieldName]
			});
			else if (attr.index && attr.unique) indexes.push({
				type: "uniqueIndex",
				name: getDatabaseFieldIndexName(modelName, fieldName, true),
				on: [fieldName]
			});
			if (attr.defaultValue !== null && typeof attr.defaultValue !== "undefined") if (typeof attr.defaultValue === "function") {
				if (attr.type === "date" && attr.defaultValue.toString().includes("new Date()")) if (databaseType === "sqlite") type += `.default(sql\`(cast(unixepoch('subsecond') * 1000 as integer))\`)`;
				else type += `.defaultNow()`;
			} else if (typeof attr.defaultValue === "string") type += `.default(${JSON.stringify(attr.defaultValue)})`;
			else if (Array.isArray(attr.defaultValue)) {
				const elements = attr.defaultValue.map((value) => JSON.stringify(value)).join(", ");
				type += `.default([${elements}])`;
			} else if (typeof attr.defaultValue === "object" && attr.defaultValue !== null) type += `.default(${JSON.stringify(attr.defaultValue)})`;
			else type += `.default(${attr.defaultValue})`;
			if (attr.onUpdate && attr.type === "date") {
				if (typeof attr.onUpdate === "function") type += `.$onUpdate(${attr.onUpdate})`;
			}
			return `${fieldName}: ${type}${attr.required ? ".notNull()" : ""}${attr.unique ? ".unique()" : ""}${attr.references ? `.references(()=> ${getModelName(attr.references.model)}.${getFieldName({
				model: attr.references.model,
				field: attr.references.field
			})}, { onDelete: '${attr.references.onDelete || "cascade"}' })` : ""}`;
		}).join(",\n ")}
					}${assignIndexes(indexes)});`;
		code += `\n${schema}\n`;
	}
	const schemaObjectKeys = [];
	for (const tableKey in tables) {
		if (tables[tableKey].disableMigrations) continue;
		const modelName = getModelName(tableKey);
		schemaObjectKeys.push(modelName);
	}
	const schemaObject = `{ ${schemaObjectKeys.join(", ")} }`;
	const relationsMap = /* @__PURE__ */ new Map();
	for (const tableKey in tables) {
		const table = tables[tableKey];
		if (table.disableMigrations) continue;
		const modelName = getModelName(tableKey);
		const modelRelations = [];
		const foreignFields = Object.entries(table.fields).filter(([_, field]) => field.references);
		for (const [fieldName, field] of foreignFields) {
			const referencedModel = field.references.model;
			if (tables[referencedModel]?.disableMigrations) continue;
			const targetModelName = getModelName(referencedModel);
			const fromField = getFieldName({
				model: tableKey,
				field: fieldName
			});
			const toField = getFieldName({
				model: referencedModel,
				field: field.references.field || "id"
			});
			const existingToSameModel = modelRelations.filter((r) => r.targetModel === targetModelName && r.type === "one");
			const singularName = getSingularModelName(referencedModel);
			const relationKey = existingToSameModel.length > 0 ? `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}${singularName.charAt(0).toUpperCase() + singularName.slice(1)}` : singularName;
			modelRelations.push({
				key: relationKey,
				type: "one",
				targetModel: targetModelName,
				fromField,
				toField,
				sourceModel: modelName
			});
		}
		const otherModels = Object.entries(tables).filter(([modelName, otherTable]) => modelName !== tableKey && !otherTable.disableMigrations);
		for (const [otherTableKey, otherTable] of otherModels) {
			const foreignKeysPointingHere = Object.entries(otherTable.fields).filter(([_, field]) => field.references?.model === tableKey || field.references?.model === modelName);
			if (foreignKeysPointingHere.length === 0) continue;
			const otherModelName = getModelName(otherTableKey);
			if (foreignKeysPointingHere.some(([_, field]) => !field.unique)) {
				const nonUniqueFKs = foreignKeysPointingHere.filter(([_, field]) => !field.unique);
				for (let i = 0; i < nonUniqueFKs.length; i++) {
					const fkField = nonUniqueFKs[i];
					if (!fkField) continue;
					const [fkFieldName, fkFieldAttr] = fkField;
					const fromField = getFieldName({
						model: tableKey,
						field: fkFieldAttr.references?.field || "id"
					});
					const toField = getFieldName({
						model: otherTableKey,
						field: fkFieldName
					});
					let relationKey = otherModelName;
					if (!adapterConfig?.usePlural) relationKey = otherModelName.endsWith("s") ? otherModelName : `${otherModelName}s`;
					if (nonUniqueFKs.length > 1) {
						const capitalizedField = fkFieldName.charAt(0).toUpperCase() + fkFieldName.slice(1);
						relationKey = `${relationKey}By${capitalizedField}`;
					}
					modelRelations.push({
						key: relationKey,
						type: "many",
						targetModel: otherModelName,
						fromField,
						toField,
						sourceModel: modelName
					});
				}
			} else {
				const fkField = foreignKeysPointingHere.find(([_, field]) => field.unique);
				if (fkField) {
					const [fkFieldName, fieldAttr] = fkField;
					const fromField = getFieldName({
						model: tableKey,
						field: fieldAttr.references?.field || "id"
					});
					const toField = getFieldName({
						model: otherTableKey,
						field: fkFieldName
					});
					const relationKey = otherModelName;
					modelRelations.push({
						key: relationKey,
						type: "one",
						targetModel: otherModelName,
						fromField,
						toField,
						sourceModel: modelName
					});
				}
			}
		}
		if (modelRelations.length > 0) relationsMap.set(modelName, modelRelations);
	}
	let relationsString = "";
	if (relationsMap.size > 0) {
		const relationsEntries = [];
		for (const [modelName, relations] of relationsMap.entries()) {
			const relationDefs = [];
			for (const relation of relations) if (relation.type === "one") relationDefs.push(`    ${relation.key}: r.one.${relation.targetModel}({\n      from: r.${relation.sourceModel}.${relation.fromField},\n      to: r.${relation.targetModel}.${relation.toField},\n    })`);
			else relationDefs.push(`    ${relation.key}: r.many.${relation.targetModel}({\n      from: r.${relation.sourceModel}.${relation.fromField},\n      to: r.${relation.targetModel}.${relation.toField},\n    })`);
			if (relationDefs.length > 0) relationsEntries.push(`  ${modelName}: {\n${relationDefs.join(",\n")}\n  }`);
		}
		if (relationsEntries.length > 0) relationsString = `\n\nexport const authRelations = defineRelationsPart(${schemaObject}, (r) => ({\n${relationsEntries.join(",\n")}\n}));\n`;
	}
	code += relationsString;
	let formattedCode = code;
	try {
		const { format } = await new Function("moduleName", "return import(moduleName);")("prettier");
		formattedCode = await format(code, { parser: "typescript" });
	} catch {}
	return {
		code: formattedCode,
		fileName: path.basename(filePath),
		overwrite: fileExist,
		path: filePath,
		append: false
	};
};
function generateImport({ databaseType, tables, options, schemaName }) {
	const rootImports = ["defineRelationsPart"];
	const coreImports = [];
	if (databaseType === "pg" && schemaName) coreImports.push("pgSchema");
	if (!(databaseType === "pg" && schemaName)) coreImports.push(`${databaseType}Table`);
	let hasBigint = false;
	let hasJson = false;
	for (const table of Object.values(tables)) {
		for (const field of Object.values(table.fields)) {
			if (field.bigint) hasBigint = true;
			if (field.type === "json" || databaseType === "mysql" && (field.type === "number[]" || field.type === "string[]")) hasJson = true;
		}
		if (hasJson && hasBigint) break;
	}
	const useNumberId = options.advanced?.database?.generateId === "serial";
	const useUUIDs = options.advanced?.database?.generateId === "uuid";
	coreImports.push(databaseType === "mysql" ? "varchar, text" : databaseType === "pg" ? "text" : "text");
	coreImports.push(hasBigint ? databaseType !== "sqlite" ? "bigint" : "" : "");
	coreImports.push(databaseType !== "sqlite" ? "timestamp, boolean" : "");
	if (databaseType === "mysql") {
		const hasNonBigintNumber = Object.values(tables).some((table) => Object.values(table.fields).some((field) => (field.type === "number" || field.type === "number[]") && !field.bigint));
		if (!!useNumberId || hasNonBigintNumber) coreImports.push("int");
		if (Object.values(tables).some((table) => Object.values(table.fields).some((field) => typeof field.type !== "string" && Array.isArray(field.type) && field.type.every((x) => typeof x === "string")))) coreImports.push("mysqlEnum");
	} else if (databaseType === "pg") {
		if (useUUIDs) rootImports.push("sql");
		if (Object.values(tables).some((table) => Object.values(table.fields).some((field) => (field.type === "number" || field.type === "number[]") && !field.bigint)) || options.advanced?.database?.generateId === "serial") coreImports.push("integer");
	} else coreImports.push("integer");
	if (databaseType === "pg" && useUUIDs) coreImports.push("uuid");
	if (hasJson) {
		if (databaseType === "pg") coreImports.push("jsonb");
		if (databaseType === "mysql") coreImports.push("json");
	}
	if (databaseType === "sqlite" && Object.values(tables).some((table) => Object.values(table.fields).some((field) => field.type === "date" && field.defaultValue && typeof field.defaultValue === "function" && field.defaultValue.toString().includes("new Date()")))) rootImports.push("sql");
	const hasIndexes = Object.values(tables).some((table) => Object.values(table.fields).some((field) => field.index && !field.unique) || (table.indexes?.some((index) => !index.unique) ?? false));
	const hasUniqueIndexes = Object.values(tables).some((table) => Object.values(table.fields).some((field) => field.unique && field.index) || (table.indexes?.some((index) => index.unique) ?? false));
	if (hasIndexes) coreImports.push("index");
	if (hasUniqueIndexes) coreImports.push("uniqueIndex");
	return `${rootImports.length > 0 ? `import { ${rootImports.join(", ")} } from "drizzle-orm";\n` : ""}import { ${coreImports.map((x) => x.trim()).filter((x) => x !== "").join(", ")} } from "drizzle-orm/${databaseType}-core";\n`;
}
//#endregion
export { generateDrizzleSchema };
