import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env");

dotenv.config({
  path: envPath,
});

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || "arthubDB";

if (!uri) {
  throw new Error(
    `MONGODB_URI is missing. Checked environment file at: ${envPath}`
  );
}

const client = new MongoClient(uri);

let db = null;

export async function connectToDatabase() {
  if (db) {
    return db;
  }

  await client.connect();

  db = client.db(dbName);

  console.log(`Connected to MongoDB database: ${dbName}`);

  return db;
}

export function getDatabase() {
  if (!db) {
    throw new Error(
      "Database is not connected yet. Call connectToDatabase() first."
    );
  }

  return db;
}