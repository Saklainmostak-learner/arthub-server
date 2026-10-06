import express from "express";
import { ObjectId } from "mongodb";

import { getDatabase } from "../config/db.js";
import { getArtworksCollection } from "../collections/artworksCollection.js";
import { getPurchasesCollection } from "../collections/purchasesCollection.js";

import {
  requireAuth,
  requireRole,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(
  requireAuth,
  requireRole("admin")
);

/**
 * GET ADMIN OVERVIEW
 * GET /admin/stats
 */
router.get(
  "/stats",
  async (req, res) => {
    try {
      const db =
        getDatabase();

      const usersCollection =
        db.collection("user");

      const artworksCollection =
        getArtworksCollection();

      const purchasesCollection =
        getPurchasesCollection();

      const [
        totalUsers,
        totalArtists,
        totalCollectors,
        totalAdmins,
        totalArtworks,
        soldArtworks,
        transactions,
      ] = await Promise.all([
        usersCollection.countDocuments(),

        usersCollection.countDocuments({
          role: "artist",
        }),

        usersCollection.countDocuments({
          role: "user",
        }),

        usersCollection.countDocuments({
          role: "admin",
        }),

        artworksCollection.countDocuments(),

        artworksCollection.countDocuments({
          sold: true,
        }),

        purchasesCollection
          .find({
            paymentStatus: "paid",
          })
          .toArray(),
      ]);

      const totalRevenue =
        transactions.reduce(
          (total, transaction) =>
            total +
            Number(
              transaction.amount || 0
            ),
          0
        );

      return res.status(200).json({
        success: true,

        data: {
          totalUsers,
          totalArtists,
          totalCollectors,
          totalAdmins,
          totalArtworks,
          soldArtworks,

          totalTransactions:
            transactions.length,

          totalRevenue,
        },
      });
    } catch (error) {
      console.error(
        "Admin stats error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load admin statistics.",
      });
    }
  }
);

/**
 * GET ALL USERS
 * GET /admin/users
 */
router.get(
  "/users",
  async (req, res) => {
    try {
      const db =
        getDatabase();

      const usersCollection =
        db.collection("user");

      const users =
        await usersCollection
          .find(
            {},
            {
              projection: {
                password: 0,
              },
            }
          )
          .sort({
            createdAt: -1,
          })
          .toArray();

      return res.status(200).json({
        success: true,
        count: users.length,
        data: users,
      });
    } catch (error) {
      console.error(
        "Admin users error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load users.",
      });
    }
  }
);

/**
 * CHANGE USER ROLE
 * PATCH /admin/users/:id/role
 */
router.patch(
  "/users/:id/role",
  async (req, res) => {
    try {
      const {
        id,
      } = req.params;

      const {
        role,
      } = req.body;

      if (
        !ObjectId.isValid(id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid user ID.",
        });
      }

      const allowedRoles = [
        "user",
        "artist",
        "admin",
      ];

      if (
        !allowedRoles.includes(role)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid role.",
        });
      }

      const currentAdminId =
        req.auth.user.id?.toString();

      if (
        currentAdminId === id &&
        role !== "admin"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "You cannot remove your own admin role.",
        });
      }

      const db =
        getDatabase();

      const usersCollection =
        db.collection("user");

      const user =
        await usersCollection.findOneAndUpdate(
          {
            _id:
              new ObjectId(id),
          },

          {
            $set: {
              role,

              updatedAt:
                new Date(),
            },
          },

          {
            returnDocument:
              "after",
          }
        );

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "User not found.",
        });
      }

      return res.status(200).json({
        success: true,

        message:
          "User role updated successfully.",

        data: user,
      });
    } catch (error) {
      console.error(
        "Admin update role error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update user role.",
      });
    }
  }
);

/**
 * DELETE USER
 * DELETE /admin/users/:id
 */
router.delete(
  "/users/:id",
  async (req, res) => {
    try {
      const {
        id,
      } = req.params;

      if (
        !ObjectId.isValid(id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid user ID.",
        });
      }

      const currentAdminId =
        req.auth.user.id?.toString();

      if (
        currentAdminId === id
      ) {
        return res.status(400).json({
          success: false,
          message:
            "You cannot delete your own admin account.",
        });
      }

      const db =
        getDatabase();

      const usersCollection =
        db.collection("user");

      const accountsCollection =
        db.collection("account");

      const sessionsCollection =
        db.collection("session");

      const user =
        await usersCollection.findOne({
          _id:
            new ObjectId(id),
        });

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "User not found.",
        });
      }

      await Promise.all([
        usersCollection.deleteOne({
          _id:
            new ObjectId(id),
        }),

        accountsCollection.deleteMany({
          userId:
            id,
        }),

        sessionsCollection.deleteMany({
          userId:
            id,
        }),
      ]);

      return res.status(200).json({
        success: true,

        message:
          "User deleted successfully.",
      });
    } catch (error) {
      console.error(
        "Admin delete user error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Failed to delete user.",
      });
    }
  }
);

/**
 * GET ALL ARTWORKS
 */
router.get(
  "/artworks",
  async (req, res) => {
    try {
      const artworksCollection =
        getArtworksCollection();

      const artworks =
        await artworksCollection
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
        "Admin artworks error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load artworks.",
      });
    }
  }
);

/**
 * ADMIN DELETE ARTWORK
 */
router.delete(
  "/artworks/:id",
  async (req, res) => {
    try {
      const {
        id,
      } = req.params;

      if (
        !ObjectId.isValid(id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid artwork ID.",
        });
      }

      const artworksCollection =
        getArtworksCollection();

      const result =
        await artworksCollection.deleteOne({
          _id:
            new ObjectId(id),
        });

      if (
        result.deletedCount ===
        0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Artwork not found.",
        });
      }

      return res.status(200).json({
        success: true,

        message:
          "Artwork deleted successfully.",
      });
    } catch (error) {
      console.error(
        "Admin delete artwork error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to delete artwork.",
      });
    }
  }
);

/**
 * GET ALL TRANSACTIONS
 */
router.get(
  "/transactions",
  async (req, res) => {
    try {
      const purchasesCollection =
        getPurchasesCollection();

      const transactions =
        await purchasesCollection
          .find({
            paymentStatus: "paid",
          })
          .sort({
            purchasedAt: -1,
          })
          .toArray();

      return res.status(200).json({
        success: true,

        count:
          transactions.length,

        data:
          transactions,
      });
    } catch (error) {
      console.error(
        "Admin transactions error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load transactions.",
      });
    }
  }
);

export default router;