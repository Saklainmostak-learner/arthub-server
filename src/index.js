import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";

import { connectToDatabase } from "./config/db.js";
import { createAuth } from "./lib/auth.js";
import artworksRoutes from "./routes/artworksRoutes.js";

const app = express();

const port = process.env.PORT || 5000;
const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";

app.use(
  cors({
    origin: clientUrl,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "ArtHub server is running.",
  });
});

async function startServer() {
  try {
    // 1. Connect MongoDB first
    await connectToDatabase();

    // 2. Create Better Auth after DB connection
    const auth = createAuth();

    // 3. Better Auth routes
    // Important: Keep this before express.json()
    app.all("/api/auth/*splat", toNodeHandler(auth));

    // 4. JSON parser for our normal API routes
    app.use(express.json());

    // 5. Artwork API
    app.use("/artworks", artworksRoutes);

    // 6. Start server
    app.listen(port, () => {
      console.log(`ArtHub server is running on port ${port}`);
      console.log(
        `Better Auth API is available at http://localhost:${port}/api/auth`
      );
    });
  } catch (error) {
    console.error("Failed to start ArtHub server:");
    console.error(error.message);

    process.exit(1);
  }
}

startServer();