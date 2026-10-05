import { getDatabase } from "../config/db.js";

export function getArtworksCollection() {
  const db = getDatabase();

  return db.collection("artworks");
}