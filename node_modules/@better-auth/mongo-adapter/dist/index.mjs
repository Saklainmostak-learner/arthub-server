import { createAdapterFactory } from "@better-auth/core/db/adapter";
import { resolveDatabaseTableIndexes } from "@better-auth/core/db/internal";
import { ObjectId, UUID } from "mongodb";
//#region src/query-builders.ts
/**
* Escape special regex characters for safe use in MongoDB $regex.
* @see https://www.pcre.org/original/doc/html/pcrepattern.html
*/
function escapeForMongoRegex(input, maxLength = 256) {
	if (typeof input !== "string") return "";
	return input.slice(0, maxLength).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
/**
* Case-insensitive equality using $regex.
*/
function insensitiveEq(field, value) {
	return { [field]: {
		$regex: `^${escapeForMongoRegex(value)}$`,
		$options: "i"
	} };
}
/**
* Case-insensitive IN using $or with regex for each value.
*/
function insensitiveIn(field, values) {
	if (values.length === 0) return { $expr: { $eq: [1, 0] } };
	return { $or: values.map((v) => ({ [field]: {
		$regex: `^${escapeForMongoRegex(v)}$`,
		$options: "i"
	} })) };
}
/**
* Case-insensitive NOT IN using $nor.
*/
function insensitiveNotIn(field, values) {
	if (values.length === 0) return {};
	return { $nor: values.map((v) => ({ [field]: {
		$regex: `^${escapeForMongoRegex(v)}$`,
		$options: "i"
	} })) };
}
/**
* Case-insensitive inequality using $not + $regex.
*/
function insensitiveNe(field, value) {
	return { [field]: { $not: {
		$regex: `^${escapeForMongoRegex(value)}$`,
		$options: "i"
	} } };
}
/**
* Case-insensitive contains (LIKE %value%).
*/
function insensitiveContains(field, value) {
	return { [field]: {
		$regex: `.*${escapeForMongoRegex(value)}.*`,
		$options: "i"
	} };
}
/**
* Case-insensitive starts_with (LIKE value%).
*/
function insensitiveStartsWith(field, value) {
	return { [field]: {
		$regex: `^${escapeForMongoRegex(value)}`,
		$options: "i"
	} };
}
/**
* Case-insensitive ends_with (LIKE %value).
*/
function insensitiveEndsWith(field, value) {
	return { [field]: {
		$regex: `${escapeForMongoRegex(value)}$`,
		$options: "i"
	} };
}
//#endregion
//#region src/mongodb-adapter.ts
var MongoAdapterError = class extends Error {
	constructor(code, message) {
		super(message);
		this.code = code;
		this.name = "MongoAdapterError";
	}
};
const mongodbAdapter = (db, config) => {
	let lazyOptions;
	const indexSetupByDefinition = /* @__PURE__ */ new Map();
	const getCustomIdGenerator = (options) => {
		const generator = options.advanced?.database?.generateId;
		if (typeof generator === "function") return generator;
	};
	const createCustomAdapter = (db, session) => ({ getFieldAttributes, getFieldName, schema, options }) => {
		const customIdGen = getCustomIdGenerator(options);
		const useUUIDs = options.advanced?.database?.generateId === "uuid";
		const resolvedIndexesByModel = /* @__PURE__ */ new Map();
		const getResolvedModelIndexes = (model, modelKey) => {
			const cachedIndexes = resolvedIndexesByModel.get(model);
			if (cachedIndexes) return cachedIndexes;
			const table = schema[modelKey];
			const indexes = !table || table.disableMigrations ? [] : resolveDatabaseTableIndexes({
				fields: table.fields,
				indexes: table.indexes,
				tableName: model
			});
			resolvedIndexesByModel.set(model, indexes);
			return indexes;
		};
		const ensureModelIndexes = async (model, modelKey) => {
			const indexes = getResolvedModelIndexes(model, modelKey);
			await Promise.all(indexes.map((index) => {
				const physicalFieldNames = index.columns.map((fieldName) => fieldName === "id" ? "_id" : fieldName);
				const indexDefinition = JSON.stringify([
					model,
					index.name,
					physicalFieldNames,
					index.unique ?? false
				]);
				const existingIndexSetup = indexSetupByDefinition.get(indexDefinition);
				if (existingIndexSetup) return existingIndexSetup;
				const indexFields = Object.fromEntries(physicalFieldNames.map((field) => [field, 1]));
				const indexSetup = Promise.resolve().then(() => db.collection(model).createIndex(indexFields, {
					name: index.name,
					unique: index.unique ?? false
				}));
				indexSetupByDefinition.set(indexDefinition, indexSetup);
				indexSetup.catch(() => {
					if (indexSetupByDefinition.get(indexDefinition) === indexSetup) indexSetupByDefinition.delete(indexDefinition);
				});
				return indexSetup;
			}));
		};
		function coerceToIdType(value) {
			if (useUUIDs) return new UUID(value);
			return new ObjectId(value);
		}
		function isIdInstance(value) {
			if (useUUIDs) return value instanceof UUID;
			return value instanceof ObjectId;
		}
		function serializeID({ field, value, model }) {
			if (customIdGen) return value;
			if (field === "id" || field === "_id" || schema[model].fields[field]?.references?.field === "id") {
				if (value === null || value === void 0) return value;
				if (typeof value !== "string") {
					if (isIdInstance(value)) return value;
					if (Array.isArray(value)) return value.map((v) => {
						if (v === null || v === void 0) return v;
						if (typeof v === "string") try {
							return coerceToIdType(v);
						} catch {
							return v;
						}
						if (isIdInstance(v)) return v;
						throw new MongoAdapterError("INVALID_ID", "Invalid id value");
					});
					throw new MongoAdapterError("INVALID_ID", "Invalid id value");
				}
				try {
					return coerceToIdType(value);
				} catch {
					return value;
				}
			}
			return value;
		}
		function convertWhereClause({ where, modelKey }) {
			if (!where.length) return {};
			const conditions = where.map((w) => {
				const { field: field_, value, operator = "eq", connector = "AND", mode = "sensitive" } = w;
				let condition;
				let field = getFieldName({
					model: modelKey,
					field: field_
				});
				if (field === "id") field = "_id";
				const fieldAttributes = getFieldAttributes({
					model: modelKey,
					field: field_
				});
				const isInsensitive = !(field === "_id" || fieldAttributes?.references?.field === "id") && mode === "insensitive" && (typeof value === "string" || Array.isArray(value) && value.every((v) => typeof v === "string"));
				switch (operator.toLowerCase()) {
					case "eq":
						if (isInsensitive && typeof value === "string") condition = insensitiveEq(field, value);
						else condition = { [field]: serializeID({
							field,
							value,
							model: modelKey
						}) };
						break;
					case "in":
						if (isInsensitive && Array.isArray(value)) condition = insensitiveIn(field, value);
						else condition = { [field]: { $in: Array.isArray(value) ? value.map((v) => serializeID({
							field,
							value: v,
							model: modelKey
						})) : [serializeID({
							field,
							value,
							model: modelKey
						})] } };
						break;
					case "not_in":
						if (isInsensitive && Array.isArray(value)) condition = insensitiveNotIn(field, value);
						else condition = { [field]: { $nin: Array.isArray(value) ? value.map((v) => serializeID({
							field,
							value: v,
							model: modelKey
						})) : [serializeID({
							field,
							value,
							model: modelKey
						})] } };
						break;
					case "gt":
						condition = { [field]: { $gt: serializeID({
							field,
							value,
							model: modelKey
						}) } };
						break;
					case "gte":
						condition = { [field]: { $gte: serializeID({
							field,
							value,
							model: modelKey
						}) } };
						break;
					case "lt":
						condition = { [field]: { $lt: serializeID({
							field,
							value,
							model: modelKey
						}) } };
						break;
					case "lte":
						condition = { [field]: { $lte: serializeID({
							field,
							value,
							model: modelKey
						}) } };
						break;
					case "ne":
						if (isInsensitive && typeof value === "string") condition = insensitiveNe(field, value);
						else condition = { [field]: { $ne: serializeID({
							field,
							value,
							model: modelKey
						}) } };
						break;
					case "contains":
						condition = isInsensitive ? insensitiveContains(field, value) : { [field]: { $regex: `.*${escapeForMongoRegex(value)}.*` } };
						break;
					case "starts_with":
						condition = isInsensitive ? insensitiveStartsWith(field, value) : { [field]: { $regex: `^${escapeForMongoRegex(value)}` } };
						break;
					case "ends_with":
						condition = isInsensitive ? insensitiveEndsWith(field, value) : { [field]: { $regex: `${escapeForMongoRegex(value)}$` } };
						break;
					default: throw new MongoAdapterError("UNSUPPORTED_OPERATOR", `Unsupported operator: ${operator}`);
				}
				return {
					condition,
					connector
				};
			});
			if (conditions.length === 1) return conditions[0].condition;
			const andConditions = conditions.filter((c) => c.connector === "AND").map((c) => c.condition);
			const orConditions = conditions.filter((c) => c.connector === "OR").map((c) => c.condition);
			let clause = {};
			if (andConditions.length) clause = {
				...clause,
				$and: andConditions
			};
			if (orConditions.length) clause = {
				...clause,
				$or: orConditions
			};
			return clause;
		}
		return {
			async create({ model, modelKey = model, data: values }) {
				await ensureModelIndexes(model, modelKey);
				return {
					_id: (await db.collection(model).insertOne(values, { session })).insertedId.toString(),
					...values
				};
			},
			async findOne({ model, modelKey = model, where, select, join }) {
				const pipeline = [where ? { $match: convertWhereClause({
					where,
					modelKey
				}) } : { $match: {} }];
				if (join) for (const [joinedModel, joinConfig] of Object.entries(join)) {
					const localField = getFieldName({
						field: joinConfig.on.from,
						model: modelKey
					});
					const foreignField = getFieldName({
						field: joinConfig.on.to,
						model: joinConfig.modelKey ?? joinedModel
					});
					const localFieldName = localField === "id" ? "_id" : localField;
					const foreignFieldName = foreignField === "id" ? "_id" : foreignField;
					const isUnique = (schema[joinConfig.modelKey ?? joinedModel]?.fields[joinConfig.on.to])?.unique === true;
					const shouldLimit = !isUnique && joinConfig.limit !== void 0;
					const limit = joinConfig.limit ?? options.advanced?.database?.defaultFindManyLimit ?? 100;
					if (shouldLimit && limit > 0) {
						const foreignFieldRef = `$${foreignFieldName}`;
						pipeline.push({ $lookup: {
							from: joinedModel,
							let: { localFieldValue: `$${localFieldName}` },
							pipeline: [{ $match: { $expr: { $eq: [foreignFieldRef, "$$localFieldValue"] } } }, { $limit: limit }],
							as: joinedModel
						} });
					} else pipeline.push({ $lookup: {
						from: joinedModel,
						localField: localFieldName,
						foreignField: foreignFieldName,
						as: joinedModel
					} });
					if (isUnique) pipeline.push({ $unwind: {
						path: `$${joinedModel}`,
						preserveNullAndEmptyArrays: true
					} });
				}
				if (select) {
					const projection = {};
					select.forEach((field) => {
						projection[getFieldName({
							field,
							model: modelKey
						})] = 1;
					});
					if (join) for (const joinedModel of Object.keys(join)) projection[joinedModel] = 1;
					pipeline.push({ $project: projection });
				}
				pipeline.push({ $limit: 1 });
				const res = await db.collection(model).aggregate(pipeline, { session }).toArray();
				if (!res || res.length === 0) return null;
				return res[0];
			},
			async findMany({ model, modelKey = model, where, limit, select, offset, sortBy, join }) {
				const pipeline = [where ? { $match: convertWhereClause({
					where,
					modelKey
				}) } : { $match: {} }];
				if (join) for (const [joinedModel, joinConfig] of Object.entries(join)) {
					const localField = getFieldName({
						field: joinConfig.on.from,
						model: modelKey
					});
					const foreignField = getFieldName({
						field: joinConfig.on.to,
						model: joinConfig.modelKey ?? joinedModel
					});
					const localFieldName = localField === "id" ? "_id" : localField;
					const foreignFieldName = foreignField === "id" ? "_id" : foreignField;
					const isUnique = getFieldAttributes({
						model: joinConfig.modelKey ?? joinedModel,
						field: joinConfig.on.to
					})?.unique === true;
					const shouldLimit = joinConfig.relation !== "one-to-one" && joinConfig.limit !== void 0;
					const limit = joinConfig.limit ?? options.advanced?.database?.defaultFindManyLimit ?? 100;
					if (shouldLimit && limit > 0) {
						const foreignFieldRef = `$${foreignFieldName}`;
						pipeline.push({ $lookup: {
							from: joinedModel,
							let: { localFieldValue: `$${localFieldName}` },
							pipeline: [{ $match: { $expr: { $eq: [foreignFieldRef, "$$localFieldValue"] } } }, { $limit: limit }],
							as: joinedModel
						} });
					} else pipeline.push({ $lookup: {
						from: joinedModel,
						localField: localFieldName,
						foreignField: foreignFieldName,
						as: joinedModel
					} });
					if (isUnique) pipeline.push({ $unwind: {
						path: `$${joinedModel}`,
						preserveNullAndEmptyArrays: true
					} });
				}
				if (select?.length && select.length > 0) {
					const projection = {};
					select.forEach((field) => {
						projection[getFieldName({
							field,
							model: modelKey
						})] = 1;
					});
					if (join) for (const joinedModel of Object.keys(join)) projection[joinedModel] = 1;
					pipeline.push({ $project: projection });
				}
				if (sortBy) pipeline.push({ $sort: { [getFieldName({
					field: sortBy.field,
					model: modelKey
				})]: sortBy.direction === "desc" ? -1 : 1 } });
				if (offset) pipeline.push({ $skip: offset });
				if (limit) pipeline.push({ $limit: limit });
				return await db.collection(model).aggregate(pipeline, { session }).toArray();
			},
			async count({ model, modelKey = model, where }) {
				const pipeline = [where ? { $match: convertWhereClause({
					where,
					modelKey
				}) } : { $match: {} }, { $count: "total" }];
				const res = await db.collection(model).aggregate(pipeline, { session }).toArray();
				if (!res || res.length === 0) return 0;
				return res[0]?.total ?? 0;
			},
			async update({ model, modelKey = model, where, update: values }) {
				await ensureModelIndexes(model, modelKey);
				const clause = convertWhereClause({
					where,
					modelKey
				});
				const doc = (await db.collection(model).findOneAndUpdate(clause, { $set: values }, {
					session,
					returnDocument: "after",
					includeResultMetadata: true
				}))?.value ?? null;
				if (!doc) return null;
				return doc;
			},
			async updateMany({ model, modelKey = model, where, update: values }) {
				await ensureModelIndexes(model, modelKey);
				const clause = convertWhereClause({
					where,
					modelKey
				});
				return (await db.collection(model).updateMany(clause, { $set: values }, { session })).modifiedCount;
			},
			async delete({ model, modelKey = model, where }) {
				const clause = convertWhereClause({
					where,
					modelKey
				});
				await db.collection(model).deleteOne(clause, { session });
			},
			async deleteMany({ model, modelKey = model, where }) {
				const clause = convertWhereClause({
					where,
					modelKey
				});
				return (await db.collection(model).deleteMany(clause, { session })).deletedCount;
			},
			async consumeOne({ model, modelKey = model, where }) {
				const clause = convertWhereClause({
					where,
					modelKey
				});
				return (await db.collection(model).findOneAndDelete(clause, {
					session,
					includeResultMetadata: true
				}))?.value ?? null;
			},
			async incrementOne({ model, modelKey = model, where, increment, set }) {
				await ensureModelIndexes(model, modelKey);
				const clause = convertWhereClause({
					where,
					modelKey
				});
				const update = {};
				if (Object.keys(increment).length > 0) update.$inc = increment;
				if (set && Object.keys(set).length > 0) update.$set = set;
				if (!update.$inc && !update.$set) return db.collection(model).findOne(clause, { session });
				return (await db.collection(model).findOneAndUpdate(clause, update, {
					session,
					returnDocument: "after",
					includeResultMetadata: true
				}))?.value ?? null;
			}
		};
	};
	let lazyAdapter = null;
	let adapterOptions = null;
	adapterOptions = {
		config: {
			adapterId: "mongodb-adapter",
			adapterName: "MongoDB Adapter",
			usePlural: config?.usePlural ?? false,
			debugLogs: config?.debugLogs ?? false,
			mapKeysTransformInput: { id: "_id" },
			mapKeysTransformOutput: { _id: "id" },
			supportsArrays: true,
			supportsNumericIds: false,
			transaction: config?.client && (config?.transaction ?? true) ? async (cb) => {
				if (!config.client) return cb(lazyAdapter(lazyOptions));
				const session = config.client.startSession();
				try {
					session.startTransaction();
					const result = await cb(createAdapterFactory({
						config: {
							...adapterOptions.config,
							transaction: false
						},
						adapter: createCustomAdapter(db, session)
					})(lazyOptions));
					await session.commitTransaction();
					return result;
				} catch (err) {
					await session.abortTransaction();
					throw err;
				} finally {
					await session.endSession();
				}
			} : false,
			customTransformInput({ action, data, field, fieldAttributes, schema, model, options }) {
				const customIdGen = getCustomIdGenerator(options);
				if (field === "_id" || fieldAttributes.references?.field === "id") {
					if (customIdGen) return data;
					if (action !== "create" && action !== "update") return data;
					const IdClass = options.advanced?.database?.generateId === "uuid" ? UUID : ObjectId;
					if (data instanceof IdClass) return data;
					if (Array.isArray(data)) return data.map((v) => {
						if (typeof v === "string") try {
							return new IdClass(v);
						} catch {
							return v;
						}
						return v;
					});
					if (typeof data === "string") try {
						return new IdClass(data);
					} catch {
						return data;
					}
					if (fieldAttributes?.references?.field === "id" && !fieldAttributes?.required && data === null) return null;
					if (action === "update") return data;
					return new IdClass();
				}
				return data;
			},
			customTransformOutput({ data, field, fieldAttributes }) {
				if (field === "id" || fieldAttributes.references?.field === "id") {
					if (data instanceof UUID) return data.toString();
					if (data instanceof ObjectId) return data.toHexString();
					if (Array.isArray(data)) return data.map((v) => {
						if (v instanceof UUID) return v.toString();
						if (v instanceof ObjectId) return v.toHexString();
						return v;
					});
					return data;
				}
				return data;
			},
			customIdGenerator() {
				return new ObjectId().toString();
			}
		},
		adapter: createCustomAdapter(db)
	};
	lazyAdapter = createAdapterFactory(adapterOptions);
	return (options) => {
		lazyOptions = options;
		return lazyAdapter(options);
	};
};
//#endregion
export { mongodbAdapter };
