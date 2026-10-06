import { getDatabase } from "../config/db.js";

export function getSubscriptionsCollection() {
  const db = getDatabase();

  return db.collection("subscriptions");
}