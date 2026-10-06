import express from "express";
import { ObjectId } from "mongodb";

import { getCommentsCollection } from "../collections/commentsCollection.js";
import { getArtworksCollection } from "../collections/artworksCollection.js";
import { getPurchasesCollection } from "../collections/purchasesCollection.js";

import {
  requireAuth,
  requireRole,
} from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * GET COMMENTS FOR AN ARTWORK
 * Public
 */
router.get(
  "/artwork/:artworkId",
  async (req, res) => {
    try {
      const { artworkId } = req.params;

      if (!ObjectId.isValid(artworkId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid artwork ID.",
        });
      }

      const commentsCollection =
        getCommentsCollection();

      const comments =
        await commentsCollection
          .find({
            artworkId,
          })
          .sort({
            createdAt: -1,
          })
          .toArray();

      return res.status(200).json({
        success: true,
        count: comments.length,
        data: comments,
      });
    } catch (error) {
      console.error(
        "Get comments error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load comments.",
      });
    }
  }
);

/**
 * CREATE COMMENT
 * Verified collector only
 */
router.post(
  "/",
  requireAuth,
  requireRole("user"),
  async (req, res) => {
    try {
      const user =
        req.auth.user;

      const {
        artworkId,
        comment,
        rating,
      } = req.body;

      if (
        !artworkId ||
        !comment?.trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Artwork ID and comment are required.",
        });
      }

      if (!ObjectId.isValid(artworkId)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid artwork ID.",
        });
      }

      const numericRating =
        Number(rating);

      if (
        !Number.isInteger(
          numericRating
        ) ||
        numericRating < 1 ||
        numericRating > 5
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Rating must be between 1 and 5.",
        });
      }

      const normalizedEmail =
        user.email
          .trim()
          .toLowerCase();

      const artworksCollection =
        getArtworksCollection();

      const purchasesCollection =
        getPurchasesCollection();

      const commentsCollection =
        getCommentsCollection();

      const artwork =
        await artworksCollection.findOne({
          _id:
            new ObjectId(
              artworkId
            ),
        });

      if (!artwork) {
        return res.status(404).json({
          success: false,
          message:
            "Artwork not found.",
        });
      }

      const verifiedPurchase =
        await purchasesCollection.findOne({
          artworkId,

          buyerEmail:
            normalizedEmail,

          paymentStatus:
            "paid",
        });

      if (!verifiedPurchase) {
        return res.status(403).json({
          success: false,
          message:
            "Only verified buyers can review this artwork.",
        });
      }

      const existingComment =
        await commentsCollection.findOne({
          artworkId,

          userEmail:
            normalizedEmail,
        });

      if (existingComment) {
        return res.status(409).json({
          success: false,
          message:
            "You have already reviewed this artwork.",
        });
      }

      const newComment = {
        artworkId,

        userName:
          user.name || "Collector",

        userEmail:
          normalizedEmail,

        comment:
          comment.trim(),

        rating:
          numericRating,

        verifiedBuyer: true,

        createdAt:
          new Date(),

        updatedAt:
          new Date(),
      };

      const result =
        await commentsCollection.insertOne(
          newComment
        );

      return res.status(201).json({
        success: true,

        message:
          "Review added successfully.",

        data: {
          ...newComment,
          _id:
            result.insertedId,
        },
      });
    } catch (error) {
      console.error(
        "Create comment error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to add review.",
      });
    }
  }
);

/**
 * UPDATE OWN COMMENT
 */
router.put(
  "/:id",
  requireAuth,
  requireRole("user"),
  async (req, res) => {
    try {
      const user =
        req.auth.user;

      const { id } =
        req.params;

      const {
        comment,
        rating,
      } = req.body;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid comment ID.",
        });
      }

      if (!comment?.trim()) {
        return res.status(400).json({
          success: false,
          message:
            "Comment is required.",
        });
      }

      const numericRating =
        Number(rating);

      if (
        !Number.isInteger(
          numericRating
        ) ||
        numericRating < 1 ||
        numericRating > 5
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Rating must be between 1 and 5.",
        });
      }

      const commentsCollection =
        getCommentsCollection();

      const existingComment =
        await commentsCollection.findOne({
          _id:
            new ObjectId(id),
        });

      if (!existingComment) {
        return res.status(404).json({
          success: false,
          message:
            "Review not found.",
        });
      }

      const sessionEmail =
        user.email
          .trim()
          .toLowerCase();

      if (
        existingComment.userEmail !==
        sessionEmail
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You can only edit your own review.",
        });
      }

      const result =
        await commentsCollection.findOneAndUpdate(
          {
            _id:
              new ObjectId(id),
          },

          {
            $set: {
              comment:
                comment.trim(),

              rating:
                numericRating,

              updatedAt:
                new Date(),
            },
          },

          {
            returnDocument:
              "after",
          }
        );

      return res.status(200).json({
        success: true,

        message:
          "Review updated successfully.",

        data:
          result,
      });
    } catch (error) {
      console.error(
        "Update comment error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update review.",
      });
    }
  }
);

/**
 * DELETE OWN COMMENT
 */
router.delete(
  "/:id",
  requireAuth,
  requireRole("user"),
  async (req, res) => {
    try {
      const user =
        req.auth.user;

      const { id } =
        req.params;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid comment ID.",
        });
      }

      const commentsCollection =
        getCommentsCollection();

      const existingComment =
        await commentsCollection.findOne({
          _id:
            new ObjectId(id),
        });

      if (!existingComment) {
        return res.status(404).json({
          success: false,
          message:
            "Review not found.",
        });
      }

      const sessionEmail =
        user.email
          .trim()
          .toLowerCase();

      if (
        existingComment.userEmail !==
        sessionEmail
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You can only delete your own review.",
        });
      }

      await commentsCollection.deleteOne({
        _id:
          new ObjectId(id),
      });

      return res.status(200).json({
        success: true,
        message:
          "Review deleted successfully.",
      });
    } catch (error) {
      console.error(
        "Delete comment error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to delete review.",
      });
    }
  }
);

export default router;