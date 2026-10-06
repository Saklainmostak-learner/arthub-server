import express from "express";
import { ObjectId } from "mongodb";

import { getArtworksCollection } from "../collections/artworksCollection.js";

const router = express.Router();

/**
 * GET ALL ARTWORKS
 * GET /artworks
 */
router.get("/", async (req, res) => {
  try {
    const artworksCollection =
      getArtworksCollection();

    const artworks = await artworksCollection
      .find()
      .sort({
        createdAt: -1,
      })
      .toArray();

    return res.status(200).json({
      success: true,
      count: artworks.length,
      data: artworks,
    });
  } catch (error) {
    console.error(
      "Get all artworks error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load artworks.",
    });
  }
});

/**
 * GET SINGLE ARTWORK
 * GET /artworks/:id
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

    const artworksCollection =
      getArtworksCollection();

    const artwork =
      await artworksCollection.findOne({
        _id: new ObjectId(id),
      });

    if (!artwork) {
      return res.status(404).json({
        success: false,
        message: "Artwork not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: artwork,
    });
  } catch (error) {
    console.error(
      "Get single artwork error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load artwork.",
    });
  }
});

/**
 * CREATE ARTWORK
 * POST /artworks
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
      price === null ||
      price === "" ||
      !category ||
      !image
    ) {
      return res.status(400).json({
        success: false,
        message:
          "All artwork fields are required.",
      });
    }

    const numericPrice = Number(price);

    if (
      !Number.isFinite(numericPrice) ||
      numericPrice <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Artwork price must be greater than 0.",
      });
    }

    const artworksCollection =
      getArtworksCollection();

    const artwork = {
      title: title.trim(),
      artistName: artistName.trim(),
      artistEmail: artistEmail
        .trim()
        .toLowerCase(),
      description: description.trim(),
      price: numericPrice,
      category: category.trim(),
      image: image.trim(),

      sold: false,

      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result =
      await artworksCollection.insertOne(
        artwork
      );

    return res.status(201).json({
      success: true,
      message:
        "Artwork created successfully.",
      data: {
        ...artwork,
        _id: result.insertedId,
      },
    });
  } catch (error) {
    console.error(
      "Create artwork error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to create artwork.",
    });
  }
});

/**
 * UPDATE ARTWORK
 * PUT /artworks/:id
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

    const artworksCollection =
      getArtworksCollection();

    const existingArtwork =
      await artworksCollection.findOne({
        _id: new ObjectId(id),
      });

    if (!existingArtwork) {
      return res.status(404).json({
        success: false,
        message: "Artwork not found.",
      });
    }

    // Protect sold artwork
    if (existingArtwork.sold === true) {
      return res.status(403).json({
        success: false,
        message:
          "Sold artworks cannot be updated.",
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
      price === null ||
      price === "" ||
      !category ||
      !image
    ) {
      return res.status(400).json({
        success: false,
        message:
          "All artwork fields are required.",
      });
    }

    const numericPrice = Number(price);

    if (
      !Number.isFinite(numericPrice) ||
      numericPrice <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Artwork price must be greater than 0.",
      });
    }

    const updatedArtwork = {
      title: title.trim(),
      artistName: artistName.trim(),
      artistEmail: artistEmail
        .trim()
        .toLowerCase(),
      description: description.trim(),
      price: numericPrice,
      category: category.trim(),
      image: image.trim(),
      updatedAt: new Date(),
    };

    const result =
      await artworksCollection.findOneAndUpdate(
        {
          _id: new ObjectId(id),
        },
        {
          $set: updatedArtwork,
        },
        {
          returnDocument: "after",
        }
      );

    return res.status(200).json({
      success: true,
      message:
        "Artwork updated successfully.",
      data: result,
    });
  } catch (error) {
    console.error(
      "Update artwork error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update artwork.",
    });
  }
});

/**
 * DELETE ARTWORK
 * DELETE /artworks/:id
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

    const artworksCollection =
      getArtworksCollection();

    const existingArtwork =
      await artworksCollection.findOne({
        _id: new ObjectId(id),
      });

    if (!existingArtwork) {
      return res.status(404).json({
        success: false,
        message: "Artwork not found.",
      });
    }

    // Protect sold artwork
    if (existingArtwork.sold === true) {
      return res.status(403).json({
        success: false,
        message:
          "Sold artworks cannot be deleted.",
      });
    }

    const result =
      await artworksCollection.deleteOne({
        _id: new ObjectId(id),
      });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Artwork not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Artwork deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Delete artwork error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to delete artwork.",
    });
  }
});

export default router;