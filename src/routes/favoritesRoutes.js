import express from "express";
import { ObjectId } from "mongodb";

import { getFavoritesCollection } from "../collections/favoritesCollection.js";
import { getArtworksCollection } from "../collections/artworksCollection.js";

const router = express.Router();

/**
 * GET USER FAVORITES
 * GET /favorites/:email
 */
router.get("/:email", async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "User email is required.",
      });
    }

    const favoritesCollection =
      getFavoritesCollection();

    const favorites = await favoritesCollection
      .find({
        userEmail: email.toLowerCase(),
      })
      .sort({
        createdAt: -1,
      })
      .toArray();

    return res.status(200).json({
      success: true,
      count: favorites.length,
      data: favorites,
    });
  } catch (error) {
    console.error(
      "Get favorites error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load favorites.",
    });
  }
});

/**
 * ADD FAVORITE
 * POST /favorites
 */
router.post("/", async (req, res) => {
  try {
    const {
      artworkId,
      userName,
      userEmail,
    } = req.body;

    if (!artworkId || !userEmail) {
      return res.status(400).json({
        success: false,
        message:
          "Artwork ID and user email are required.",
      });
    }

    if (!ObjectId.isValid(artworkId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid artwork ID.",
      });
    }

    const artworksCollection =
      getArtworksCollection();

    const favoritesCollection =
      getFavoritesCollection();

    const artwork =
      await artworksCollection.findOne({
        _id: new ObjectId(artworkId),
      });

    if (!artwork) {
      return res.status(404).json({
        success: false,
        message: "Artwork not found.",
      });
    }

    const normalizedEmail =
      userEmail.toLowerCase();

    const existingFavorite =
      await favoritesCollection.findOne({
        artworkId,
        userEmail: normalizedEmail,
      });

    if (existingFavorite) {
      return res.status(409).json({
        success: false,
        message:
          "Artwork is already in favorites.",
      });
    }

    const favorite = {
      artworkId,
      userName: userName || "",
      userEmail: normalizedEmail,

      title: artwork.title,
      image: artwork.image,
      category: artwork.category,
      price: artwork.price,

      artistName: artwork.artistName,
      artistEmail: artwork.artistEmail,

      sold: artwork.sold === true,

      createdAt: new Date(),
    };

    const result =
      await favoritesCollection.insertOne(
        favorite
      );

    return res.status(201).json({
      success: true,
      message: "Artwork added to favorites.",
      data: {
        ...favorite,
        _id: result.insertedId,
      },
    });
  } catch (error) {
    console.error(
      "Add favorite error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to add artwork to favorites.",
    });
  }
});

/**
 * REMOVE FAVORITE
 * DELETE /favorites/:artworkId/:email
 */
router.delete(
  "/:artworkId/:email",
  async (req, res) => {
    try {
      const {
        artworkId,
        email,
      } = req.params;

      if (!artworkId || !email) {
        return res.status(400).json({
          success: false,
          message:
            "Artwork ID and email are required.",
        });
      }

      const favoritesCollection =
        getFavoritesCollection();

      const result =
        await favoritesCollection.deleteOne({
          artworkId,
          userEmail:
            email.toLowerCase(),
        });

      if (result.deletedCount === 0) {
        return res.status(404).json({
          success: false,
          message:
            "Favorite artwork not found.",
        });
      }

      return res.status(200).json({
        success: true,
        message:
          "Artwork removed from favorites.",
      });
    } catch (error) {
      console.error(
        "Remove favorite error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to remove favorite.",
      });
    }
  }
);

export default router;