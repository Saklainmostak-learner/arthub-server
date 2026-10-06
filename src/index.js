import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";

import { connectToDatabase } from "./config/db.js";
import { createAuth } from "./lib/auth.js";

import {
  configureAuthMiddleware,
} from "./middleware/authMiddleware.js";

import artworksRoutes from "./routes/artworksRoutes.js";
import purchasesRoutes from "./routes/purchasesRoutes.js";
import favoritesRoutes from "./routes/favoritesRoutes.js";
import commentsRoutes from "./routes/commentsRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

const app = express();

const port =
  process.env.PORT || 5000;

const clientUrl =
  process.env.CLIENT_URL ||
  "http://localhost:3000";

async function startServer() {
  try {
    await connectToDatabase();

    const auth =
      createAuth();

    configureAuthMiddleware(auth);

    app.use(
      cors({
        origin: clientUrl,

        credentials: true,

        methods: [
          "GET",
          "POST",
          "PUT",
          "PATCH",
          "DELETE",
          "OPTIONS",
        ],

        allowedHeaders: [
          "Content-Type",
          "Authorization",
        ],
      })
    );

    app.all(
      "/api/auth/*splat",
      toNodeHandler(auth)
    );

    app.use(express.json());

    app.get("/", (req, res) => {
      res.status(200).json({
        success: true,
        message:
          "ArtHub server is running.",
      });
    });

    app.use(
      "/artworks",
      artworksRoutes
    );

    app.use(
      "/purchases",
      purchasesRoutes
    );

    app.use(
      "/favorites",
      favoritesRoutes
    );

    app.use(
      "/comments",
      commentsRoutes
    );

    app.use(
      "/admin",
      adminRoutes
    );

    app.use((req, res) => {
      res.status(404).json({
        success: false,
        message:
          "Route not found.",
      });
    });

    app.listen(port, () => {
      console.log(
        `ArtHub server is running on port ${port}`
      );

      console.log(
        "Better Auth API is ready"
      );

      console.log(
        "Artwork API is ready"
      );

      console.log(
        "Purchase API is ready"
      );

      console.log(
        "Favorites API is ready"
      );

      console.log(
        "Comments API is ready"
      );

      console.log(
        "Admin API is ready"
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