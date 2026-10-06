import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";

import { getDatabase } from "../config/db.js";

export function createAuth() {
  const db = getDatabase();

  return betterAuth({
    database: mongodbAdapter(db),

    secret: process.env.BETTER_AUTH_SECRET,

    baseURL:
      process.env.BETTER_AUTH_URL ||
      "http://localhost:5000",

    trustedOrigins: [
      process.env.CLIENT_URL ||
        "http://localhost:3000",
      "http://localhost:3000",
      "http://localhost:5000",
    ],

    emailAndPassword: {
      enabled: true,
    },

    socialProviders: {
      google: {
        clientId:
          process.env.GOOGLE_CLIENT_ID,

        clientSecret:
          process.env.GOOGLE_CLIENT_SECRET,
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