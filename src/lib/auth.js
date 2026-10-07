import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";

import { getDatabase } from "../config/db.js";

export function createAuth() {
  const db = getDatabase();

  return betterAuth({
    database: mongodbAdapter(db),

    secret:
      process.env.BETTER_AUTH_SECRET,

    /*
     * IMPORTANT:
     *
     * Auth requests are proxied through the
     * Next.js frontend:
     *
     * https://arthub-client-sigma.vercel.app/api/auth/*
     *
     * So Better Auth must build OAuth callback
     * URLs from the forwarded Vercel host instead
     * of hardcoding the Render server URL.
     */
    trustedOrigins: [
      process.env.CLIENT_URL ||
        "http://localhost:3000",

      "http://localhost:3000",

      "http://localhost:5000",

      "https://arthub-client-sigma.vercel.app",

      "https://arthub-client-*.vercel.app",
    ],

    advanced: {
      trustedProxyHeaders: true,

      useSecureCookies:
        process.env.NODE_ENV ===
        "production",

      defaultCookieAttributes: {
        httpOnly: true,

        secure:
          process.env.NODE_ENV ===
          "production",

        sameSite:
          process.env.NODE_ENV ===
          "production"
            ? "lax"
            : "lax",
      },
    },

    emailAndPassword: {
      enabled: true,
    },

    socialProviders: {
      google: {
        clientId:
          process.env.GOOGLE_CLIENT_ID,

        clientSecret:
          process.env
            .GOOGLE_CLIENT_SECRET,
      },
    },

    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            const safeRole =
              user.role === "artist"
                ? "artist"
                : "user";

            return {
              data: {
                ...user,
                role: safeRole,
              },
            };
          },
        },

        update: {
          before: async (userData) => {
            const {
              role: _role,
              ...safeUserData
            } = userData;

            return {
              data:
                safeUserData,
            };
          },
        },
      },
    },

    user: {
      additionalFields: {
        role: {
          type: [
            "user",
            "artist",
            "admin",
          ],

          required: false,

          defaultValue: "user",

          input: true,
        },
      },
    },
  });
}