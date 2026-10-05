import express from "express";
import cors from "cors";

import { connectToDatabase } from "./config/db.js";
import artworksRoutes from "./routes/artworksRoutes.js";

const app = express();

const port = process.env.PORT || 5000;
const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";

app.use(
  cors({
    origin: clientUrl,
    credentials: true,
  })
);

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "ArtHub server is running.",
  });
});

app.use("/artworks", artworksRoutes);

async function startServer() {
  try {
    await connectToDatabase();

    app.listen(port, () => {
      console.log(`ArtHub server is running on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start ArtHub server:");
    console.error(error.message);

    process.exit(1);
  }
}

startServer();