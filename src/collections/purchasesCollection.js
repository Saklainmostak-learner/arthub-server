import { getDatabase } from "../config/db.js";

export function getPurchasesCollection() {
  const db = getDatabase();

  return db.collection("purchases");
}