import { getDatabase } from "../config/db.js";

export function getCommentsCollection() {
  const db = getDatabase();

  return db.collection("comments");
}