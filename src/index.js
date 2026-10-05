import "dotenv/config";
import express from "express";
import cors from "cors";

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

app.listen(port, () => {
  console.log(`ArtHub server is running on port ${port}`);
});