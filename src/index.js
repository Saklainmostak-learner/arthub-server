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
import subscriptionsRoutes from "./routes/subscriptionsRoutes.js";

const app = express();

const port =
  process.env.PORT || 5000;

const clientUrl =
  process.env.CLIENT_URL ||
  "http://localhost:3000";

const productionClient =
  "https://arthub-client-sigma.vercel.app";

function isAllowedOrigin(origin) {
  /*
   * Requests such as curl/Postman/server-to-server
   * can arrive without an Origin header.
   */
  if (!origin) {
    return true;
  }

  const exactAllowedOrigins = [
    clientUrl,
    productionClient,
    "http://localhost:3000",
  ];

  if (
    exactAllowedOrigins.includes(origin)
  ) {
    return true;
  }

  /*
   * Allow only ArtHub's Vercel preview
   * deployment URLs.
   *
   * Example:
   * https://arthub-client-abc123-username-projects.vercel.app
   */
  try {
    const url =
      new URL(origin);

    const isHttps =
      url.protocol === "https:";

    const isVercel =
      url.hostname.endsWith(
        ".vercel.app"
      );

    const isArtHubPreview =
      url.hostname.startsWith(
        "arthub-client-"
      );

    return (
      isHttps &&
      isVercel &&
      isArtHubPreview
    );
  } catch {
    return false;
  }
}

async function startServer() {
  try {
    await connectToDatabase();

    const auth =
      createAuth();

    configureAuthMiddleware(auth);

    app.use(
      cors({
        origin: (
          origin,
          callback
        ) => {
          if (
            isAllowedOrigin(
              origin
            )
          ) {
            return callback(
              null,
              true
            );
          }

          return callback(
            new Error(
              `CORS blocked origin: ${origin}`
            )
          );
        },

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

    /*
     * Better Auth must be mounted
     * before express.json().
     */
    app.all(
      "/api/auth/*splat",
      toNodeHandler(auth)
    );

    app.use(
      express.json()
    );

    app.get(
      "/",
      (req, res) => {
        res
          .status(200)
          .json({
            success: true,
            message:
              "ArtHub server is running.",
          });
      }
    );

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
      "/subscriptions",
      subscriptionsRoutes
    );

    app.use(
      "/admin",
      adminRoutes
    );

    app.use(
      (req, res) => {
        res
          .status(404)
          .json({
            success: false,
            message:
              "Route not found.",
          });
      }
    );

    /*
     * Central error handler.
     * This also gives a clean response
     * when an origin is rejected by CORS.
     */
    app.use(
      (
        error,
        req,
        res,
        next
      ) => {
        console.error(
          "Server error:",
          error.message
        );

        if (
          error.message?.startsWith(
            "CORS blocked origin:"
          )
        ) {
          return res
            .status(403)
            .json({
              success: false,
              message:
                "Origin is not allowed.",
            });
        }

        return res
          .status(500)
          .json({
            success: false,
            message:
              "Internal server error.",
          });
      }
    );

    app.listen(
      port,
      () => {
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
          "Subscription API is ready"
        );

        console.log(
          "Admin API is ready"
        );
      }
    );
  } catch (error) {
    console.error(
      "Failed to start ArtHub server:",
      error
    );

    process.exit(1);
  }
}

startServer();