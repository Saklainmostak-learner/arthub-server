import express from "express";
import Stripe from "stripe";
import { ObjectId } from "mongodb";

import { getPurchasesCollection } from "../collections/purchasesCollection.js";
import { getArtworksCollection } from "../collections/artworksCollection.js";

import {
  requireAuth,
  requireRole,
} from "../middleware/authMiddleware.js";

const router = express.Router();

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY
);

const clientUrl =
  process.env.CLIENT_URL ||
  "http://localhost:3000";

/**
 * CREATE STRIPE CHECKOUT SESSION
 * Collector only
 */
router.post(
  "/create-checkout-session",
  requireAuth,
  requireRole("user"),
  async (req, res) => {
    try {
      const user =
        req.auth.user;

      const {
        artworkId,
      } = req.body;

      if (!artworkId) {
        return res.status(400).json({
          success: false,
          message:
            "Artwork ID is required.",
        });
      }

      if (!ObjectId.isValid(artworkId)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid artwork ID.",
        });
      }

      const artworksCollection =
        getArtworksCollection();

      const purchasesCollection =
        getPurchasesCollection();

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

      if (artwork.sold === true) {
        return res.status(409).json({
          success: false,
          message:
            "This artwork has already been sold.",
        });
      }

      const buyerEmail =
        user.email
          .trim()
          .toLowerCase();

      const artistEmail =
        artwork.artistEmail
          ?.trim()
          .toLowerCase();

      if (
        artistEmail ===
        buyerEmail
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You cannot purchase your own artwork.",
        });
      }

      const existingPurchase =
        await purchasesCollection.findOne({
          artworkId:
            artwork._id.toString(),

          paymentStatus:
            "paid",
        });

      if (existingPurchase) {
        return res.status(409).json({
          success: false,
          message:
            "This artwork has already been sold.",
        });
      }

      const price =
        Number(
          artwork.price
        );

      if (
        !Number.isFinite(price) ||
        price <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Artwork price is invalid.",
        });
      }

      const checkoutSession =
        await stripe.checkout.sessions.create({
          mode: "payment",

          customer_email:
            buyerEmail,

          line_items: [
            {
              price_data: {
                currency: "usd",

                product_data: {
                  name:
                    artwork.title,

                  description:
                    `Original artwork by ${artwork.artistName}`,
                },

                unit_amount:
                  Math.round(
                    price * 100
                  ),
              },

              quantity: 1,
            },
          ],

          metadata: {
            artworkId:
              artwork._id.toString(),

            artworkTitle:
              artwork.title || "",

            artistName:
              artwork.artistName || "",

            artistEmail:
              artwork.artistEmail || "",

            buyerName:
              user.name || "",

            buyerEmail,
          },

          success_url:
            `${clientUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,

          cancel_url:
            `${clientUrl}/artworks/${artwork._id}`,
        });

      return res.status(200).json({
        success: true,
        url:
          checkoutSession.url,
      });
    } catch (error) {
      console.error(
        "Create Stripe checkout error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          error?.message ||
          "Failed to create checkout session.",
      });
    }
  }
);

/**
 * CONFIRM STRIPE PAYMENT
 * Collector only
 */
router.post(
  "/confirm-payment",
  requireAuth,
  requireRole("user"),
  async (req, res) => {
    try {
      const user =
        req.auth.user;

      const {
        sessionId,
      } = req.body;

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          message:
            "Stripe session ID is required.",
        });
      }

      const stripeSession =
        await stripe.checkout.sessions.retrieve(
          sessionId
        );

      if (
        stripeSession.payment_status !==
        "paid"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Payment has not been completed.",
        });
      }

      const sessionBuyerEmail =
        user.email
          .trim()
          .toLowerCase();

      const stripeBuyerEmail =
        stripeSession.metadata
          ?.buyerEmail
          ?.trim()
          .toLowerCase();

      if (
        !stripeBuyerEmail ||
        stripeBuyerEmail !==
          sessionBuyerEmail
      ) {
        return res.status(403).json({
          success: false,
          message:
            "This payment does not belong to the current user.",
        });
      }

      const purchasesCollection =
        getPurchasesCollection();

      const artworksCollection =
        getArtworksCollection();

      const existingSessionPurchase =
        await purchasesCollection.findOne({
          stripeSessionId:
            stripeSession.id,
        });

      if (existingSessionPurchase) {
        return res.status(200).json({
          success: true,
          message:
            "Purchase already confirmed.",
          data:
            existingSessionPurchase,
        });
      }

      const artworkId =
        stripeSession.metadata
          ?.artworkId || "";

      if (
        !artworkId ||
        !ObjectId.isValid(
          artworkId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid artwork information.",
        });
      }

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
            "Artwork could not be found.",
        });
      }

      const existingArtworkPurchase =
        await purchasesCollection.findOne({
          artworkId,
          paymentStatus:
            "paid",
        });

      if (
        existingArtworkPurchase
      ) {
        return res.status(409).json({
          success: false,
          message:
            "This artwork has already been sold.",
        });
      }

      const purchase = {
        artworkId,

        artworkTitle:
          stripeSession.metadata
            ?.artworkTitle ||
          artwork.title ||
          "",

        artistName:
          stripeSession.metadata
            ?.artistName ||
          artwork.artistName ||
          "",

        artistEmail:
          (
            stripeSession.metadata
              ?.artistEmail ||
            artwork.artistEmail ||
            ""
          )
            .trim()
            .toLowerCase(),

        buyerName:
          user.name || "",

        buyerEmail:
          sessionBuyerEmail,

        amount:
          Number(
            stripeSession.amount_total ||
              0
          ) / 100,

        currency:
          stripeSession.currency ||
          "usd",

        stripeSessionId:
          stripeSession.id,

        paymentStatus:
          stripeSession.payment_status,

        purchasedAt:
          new Date(),
      };

      const result =
        await purchasesCollection.insertOne(
          purchase
        );

      await artworksCollection.updateOne(
        {
          _id:
            new ObjectId(
              artworkId
            ),
        },

        {
          $set: {
            sold: true,

            soldTo:
              purchase.buyerEmail,

            soldAt:
              new Date(),

            updatedAt:
              new Date(),
          },
        }
      );

      return res.status(201).json({
        success: true,

        message:
          "Purchase saved successfully.",

        data: {
          ...purchase,
          _id:
            result.insertedId,
        },
      });
    } catch (error) {
      console.error(
        "Confirm Stripe payment error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          error?.message ||
          "Failed to confirm payment.",
      });
    }
  }
);

/**
 * GET PURCHASES BY BUYER
 * Collector only
 */
router.get(
  "/buyer/:email",
  requireAuth,
  requireRole("user"),
  async (req, res) => {
    try {
      const sessionEmail =
        req.auth.user.email
          .trim()
          .toLowerCase();

      const requestedEmail =
        req.params.email
          .trim()
          .toLowerCase();

      if (
        sessionEmail !==
        requestedEmail
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You can only view your own purchases.",
        });
      }

      const purchasesCollection =
        getPurchasesCollection();

      const purchases =
        await purchasesCollection
          .find({
            buyerEmail:
              sessionEmail,

            paymentStatus:
              "paid",
          })
          .sort({
            purchasedAt: -1,
          })
          .toArray();

      return res.status(200).json({
        success: true,

        count:
          purchases.length,

        data:
          purchases,
      });
    } catch (error) {
      console.error(
        "Get buyer purchases error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load purchases.",
      });
    }
  }
);

/**
 * GET ARTIST SALES
 * Artist only
 */
router.get(
  "/artist/:email",
  requireAuth,
  requireRole("artist"),
  async (req, res) => {
    try {
      const sessionEmail =
        req.auth.user.email
          .trim()
          .toLowerCase();

      const requestedEmail =
        req.params.email
          .trim()
          .toLowerCase();

      if (
        sessionEmail !==
        requestedEmail
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You can only view your own sales.",
        });
      }

      const purchasesCollection =
        getPurchasesCollection();

      const sales =
        await purchasesCollection
          .find({
            artistEmail:
              sessionEmail,

            paymentStatus:
              "paid",
          })
          .sort({
            purchasedAt: -1,
          })
          .toArray();

      const totalRevenue =
        sales.reduce(
          (total, sale) =>
            total +
            Number(
              sale.amount || 0
            ),
          0
        );

      return res.status(200).json({
        success: true,

        count:
          sales.length,

        totalRevenue,

        data:
          sales,
      });
    } catch (error) {
      console.error(
        "Get artist sales error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Failed to load artist sales.",
      });
    }
  }
);

export default router;