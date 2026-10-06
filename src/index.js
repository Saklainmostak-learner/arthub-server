import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";

import { connectToDatabase } from "./config/db.js";
import { createAuth } from "./lib/auth.js";

import artworksRoutes from "./routes/artworksRoutes.js";
import purchasesRoutes from "./routes/purchasesRoutes.js";
import favoritesRoutes from "./routes/favoritesRoutes.js";

const app = express();

const port = process.env.PORT || 5000;

const clientUrl =
  process.env.CLIENT_URL || "http://localhost:3000";

async function startServer() {
  try {
    // 1. First connect MongoDB
    await connectToDatabase();

    // 2. Then create Better Auth
    // createAuth() uses the connected MongoDB database
    const auth = createAuth();

    // 3. CORS
    app.use(
      cors({
        origin: clientUrl,
        credentials: true,
      })
    );

    // 4. Better Auth routes
    // Keep this before express.json()
    app.all(
      "/api/auth/*splat",
      toNodeHandler(auth)
    );

    // 5. JSON middleware
    app.use(express.json());

    // 6. Health / root route
    app.get("/", (req, res) => {
      res.status(200).json({
        success: true,
        message: "ArtHub server is running.",
      });
    });

    // 7. Artwork routes
    app.use("/artworks", artworksRoutes);

    // 8. Purchase / Stripe routes
    app.use("/purchases", purchasesRoutes);

    // 9. Favorites routes
    app.use("/favorites", favoritesRoutes);

    // 10. 404 route
    app.use((req, res) => {
      res.status(404).json({
        success: false,
        message: "Route not found.",
      });
    });

    // 11. Start server
    app.listen(port, () => {
      console.log(
        `ArtHub server is running on port ${port}`
      );

      console.log(
        `Better Auth API is available at http://localhost:${port}/api/auth`
      );

      console.log(
        `Artwork API is available at http://localhost:${port}/artworks`
      );

      console.log(
        `Purchase API is available at http://localhost:${port}/purchases`
      );

      console.log(
        `Favorites API is available at http://localhost:${port}/favorites`
      );
    });
  } catch (error) {
    console.error(
      "Failed to start ArtHub server:",
      error
    );

    process.exit(1);
  }
}

startServer();