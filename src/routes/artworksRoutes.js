import express from "express";
import { ObjectId } from "mongodb";

import { getArtworksCollection } from "../collections/artworksCollection.js";

const router = express.Router();

/**
 * GET /artworks
 * Get all artworks
 */
router.get("/", async (req, res) => {
  try {
    const artworksCollection = getArtworksCollection();

    const artworks = await artworksCollection
      .find()
      .sort({ createdAt: -1 })
      .toArray();

    res.json({
      success: true,
      count: artworks.length,
      data: artworks,
    });
  } catch (error) {
    console.error("Failed to fetch artworks:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch artworks.",
    });
  }
});

/**
 * GET /artworks/:id
 * Get a single artwork
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid artwork id.",
      });
    }

    const artworksCollection = getArtworksCollection();

    const artwork = await artworksCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!artwork) {
      return res.status(404).json({
        success: false,
        message: "Artwork not found.",
      });
    }

    res.json({
      success: true,
      data: artwork,
    });
  } catch (error) {
    console.error("Failed to fetch artwork:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch artwork.",
    });
  }
});

/**
 * POST /artworks
 * Create a new artwork
 */
router.post("/", async (req, res) => {
  try {
    const {
      title,
      artistName,
      artistEmail,
      description,
      price,
      category,
      image,
    } = req.body;

    if (
      !title ||
      !artistName ||
      !artistEmail ||
      !description ||
      price === undefined ||
      !category ||
      !image
    ) {
      return res.status(400).json({
        success: false,
        message: "All artwork fields are required.",
      });
    }

    const numericPrice = Number(price);

    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      return res.status(400).json({
        success: false,
        message: "Price must be a valid non-negative number.",
      });
    }

    const artwork = {
      title,
      artistName,
      artistEmail,
      description,
      price: numericPrice,
      category,
      image,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const artworksCollection = getArtworksCollection();

    const result = await artworksCollection.insertOne(artwork);

    res.status(201).json({
      success: true,
      message: "Artwork created successfully.",
      data: {
        _id: result.insertedId,
        ...artwork,
      },
    });
  } catch (error) {
    console.error("Failed to create artwork:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create artwork.",
    });
  }
});

/**
 * PUT /artworks/:id
 * Update an existing artwork
 */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid artwork id.",
      });
    }

    const {
      title,
      artistName,
      artistEmail,
      description,
      price,
      category,
      image,
    } = req.body;

    if (
      !title ||
      !artistName ||
      !artistEmail ||
      !description ||
      price === undefined ||
      !category ||
      !image
    ) {
      return res.status(400).json({
        success: false,
        message: "All artwork fields are required.",
      });
    }

    const numericPrice = Number(price);

    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      return res.status(400).json({
        success: false,
        message: "Price must be a valid non-negative number.",
      });
    }

    const updatedArtwork = {
      title,
      artistName,
      artistEmail,
      description,
      price: numericPrice,
      category,
      image,
      updatedAt: new Date(),
    };

    const artworksCollection = getArtworksCollection();

    const result = await artworksCollection.updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $set: updatedArtwork,
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Artwork not found.",
      });
    }

    const artwork = await artworksCollection.findOne({
      _id: new ObjectId(id),
    });

    res.json({
      success: true,
      message: "Artwork updated successfully.",
      data: artwork,
    });
  } catch (error) {
    console.error("Failed to update artwork:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update artwork.",
    });
  }
});

/**
 * DELETE /artworks/:id
 * Delete an artwork
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid artwork id.",
      });
    }

    const artworksCollection = getArtworksCollection();

    const result = await artworksCollection.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Artwork not found.",
      });
    }

    res.json({
      success: true,
      message: "Artwork deleted successfully.",
    });
  } catch (error) {
    console.error("Failed to delete artwork:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete artwork.",
    });
  }
});

export default router;