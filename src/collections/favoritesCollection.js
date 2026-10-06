import { getDatabase } from "../config/db.js";

export function getFavoritesCollection() {
  const db = getDatabase();

  return db.collection("favorites");
}