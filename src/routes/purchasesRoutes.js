import express from "express";
import Stripe from "stripe";
import { ObjectId } from "mongodb";

import { getPurchasesCollection } from "../collections/purchasesCollection.js";
import { getArtworksCollection } from "../collections/artworksCollection.js";

const router = express.Router();

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY
);

const clientUrl =
  process.env.CLIENT_URL ||
  "http://localhost:3000";

/**
 * CREATE STRIPE CHECKOUT SESSION
 * POST /purchases/create-checkout-session
 */
router.post(
  "/create-checkout-session",
  async (req, res) => {
    try {
      const {
        artworkId,
        buyerName,
        buyerEmail,
      } = req.body;

      if (!artworkId || !buyerEmail) {
        return res.status(400).json({
          success: false,
          message:
            "Artwork ID and buyer email are required.",
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

      const purchasesCollection =
        getPurchasesCollection();

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

      // Extra protection in case sold state already exists
      if (artwork.sold === true) {
        return res.status(409).json({
          success: false,
          message:
            "This artwork has already been sold.",
        });
      }

      // Artist cannot purchase own artwork
      if (
        artwork.artistEmail ===
        buyerEmail
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You cannot purchase your own artwork.",
        });
      }

      // Prevent checkout for already purchased artwork
      const existingPurchase =
        await purchasesCollection.findOne({
          artworkId:
            artwork._id.toString(),

          paymentStatus: "paid",
        });

      if (existingPurchase) {
        return res.status(409).json({
          success: false,
          message:
            "This artwork has already been sold.",
        });
      }

      const price =
        Number(artwork.price);

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
              artwork.artistName ||
              "",

            artistEmail:
              artwork.artistEmail ||
              "",

            buyerName:
              buyerName || "",

            buyerEmail:
              buyerEmail || "",
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
 * POST /purchases/confirm-payment
 */
router.post(
  "/confirm-payment",
  async (req, res) => {
    try {
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

      const purchasesCollection =
        getPurchasesCollection();

      const artworksCollection =
        getArtworksCollection();

      // Same Stripe session already processed
      const existingSessionPurchase =
        await purchasesCollection.findOne({
          stripeSessionId:
            stripeSession.id,
        });

      if (
        existingSessionPurchase
      ) {
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

      if (!artworkId) {
        return res.status(400).json({
          success: false,
          message:
            "Artwork information is missing.",
        });
      }

      if (
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

      // Prevent the same artwork from being purchased twice
      const existingArtworkPurchase =
        await purchasesCollection.findOne({
          artworkId,
          paymentStatus: "paid",
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
          stripeSession.metadata
            ?.artistEmail ||
          artwork.artistEmail ||
          "",

        buyerName:
          stripeSession.metadata
            ?.buyerName || "",

        buyerEmail:
          stripeSession.metadata
            ?.buyerEmail || "",

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

      // Mark artwork as sold
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
 * GET /purchases/buyer/:email
 */
router.get(
  "/buyer/:email",
  async (req, res) => {
    try {
      const {
        email,
      } = req.params;

      if (!email) {
        return res.status(400).json({
          success: false,
          message:
            "Buyer email is required.",
        });
      }

      const purchasesCollection =
        getPurchasesCollection();

      const purchases =
        await purchasesCollection
          .find({
            buyerEmail: email,
            paymentStatus: "paid",
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
          error?.message ||
          "Failed to load purchases.",
      });
    }
  }
);

export default router;