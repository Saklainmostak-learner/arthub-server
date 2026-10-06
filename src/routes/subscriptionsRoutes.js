import express from "express";
import Stripe from "stripe";

import { getSubscriptionsCollection } from "../collections/subscriptionsCollection.js";

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

const PLANS = {
  free: {
    id: "free",
    name: "Free",
    price: 0,
    interval: "month",
    description:
      "Explore ArtHub and use the essential marketplace features.",
    features: [
      "Browse all artworks",
      "Save favorite artworks",
      "Purchase original artwork",
      "Basic marketplace access",
    ],
  },

  pro: {
    id: "pro",
    name: "Pro",
    price: 9,
    interval: "month",
    description:
      "More flexibility for active ArtHub members.",
    features: [
      "Everything in Free",
      "Priority marketplace experience",
      "Extended collection features",
      "Pro member badge",
      "Early access to selected platform features",
    ],
  },

  premium: {
    id: "premium",
    name: "Premium",
    price: 19,
    interval: "month",
    description:
      "The complete ArtHub membership experience.",
    features: [
      "Everything in Pro",
      "Premium member badge",
      "Priority support",
      "Advanced marketplace benefits",
      "Premium feature access",
    ],
  },
};

/**
 * PUBLIC PLANS
 * GET /subscriptions/plans
 */
router.get(
  "/plans",
  (req, res) => {
    return res.status(200).json({
      success: true,
      data: Object.values(PLANS),
    });
  }
);

/**
 * GET CURRENT SUBSCRIPTION
 */
router.get(
  "/me",
  requireAuth,
  requireRole(
    "user",
    "artist"
  ),
  async (req, res) => {
    try {
      const user =
        req.auth.user;

      const email =
        user.email
          .trim()
          .toLowerCase();

      const subscriptionsCollection =
        getSubscriptionsCollection();

      const subscription =
        await subscriptionsCollection.findOne({
          userEmail: email,
        });

      if (!subscription) {
        return res.status(200).json({
          success: true,

          data: {
            plan: "free",
            status: "active",
            userEmail: email,
          },
        });
      }

      return res.status(200).json({
        success: true,
        data: subscription,
      });
    } catch (error) {
      console.error(
        "Get subscription error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load subscription.",
      });
    }
  }
);

/**
 * CREATE SUBSCRIPTION CHECKOUT
 */
router.post(
  "/create-checkout-session",
  requireAuth,
  requireRole(
    "user",
    "artist"
  ),
  async (req, res) => {
    try {
      const user =
        req.auth.user;

      const {
        plan,
      } = req.body;

      if (
        !plan ||
        !["pro", "premium"].includes(
          plan
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please choose a valid paid plan.",
        });
      }

      const selectedPlan =
        PLANS[plan];

      const email =
        user.email
          .trim()
          .toLowerCase();

      const subscriptionsCollection =
        getSubscriptionsCollection();

      const existingSubscription =
        await subscriptionsCollection.findOne({
          userEmail: email,
          status: "active",
        });

      if (
        existingSubscription?.plan ===
        plan
      ) {
        return res.status(409).json({
          success: false,
          message:
            `You are already subscribed to the ${selectedPlan.name} plan.`,
        });
      }

      const checkoutSession =
        await stripe.checkout.sessions.create({
          mode: "subscription",

          customer_email:
            email,

          line_items: [
            {
              price_data: {
                currency: "usd",

                unit_amount:
                  Math.round(
                    selectedPlan.price *
                      100
                  ),

                recurring: {
                  interval:
                    "month",
                },

                product_data: {
                  name:
                    `ArtHub ${selectedPlan.name}`,

                  description:
                    selectedPlan.description,
                },
              },

              quantity: 1,
            },
          ],

          metadata: {
            plan,
            userName:
              user.name || "",
            userEmail:
              email,
            userRole:
              user.role || "user",
          },

          success_url:
            `${clientUrl}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,

          cancel_url:
            `${clientUrl}/pricing`,
        });

      return res.status(200).json({
        success: true,
        url:
          checkoutSession.url,
      });
    } catch (error) {
      console.error(
        "Create subscription checkout error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          error?.message ||
          "Failed to create subscription checkout.",
      });
    }
  }
);

/**
 * CONFIRM SUBSCRIPTION
 */
router.post(
  "/confirm",
  requireAuth,
  requireRole(
    "user",
    "artist"
  ),
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
        stripeSession.status !==
        "complete"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Subscription checkout has not been completed.",
        });
      }

      const metadata =
        stripeSession.metadata || {};

      const plan =
        metadata.plan;

      if (
        !["pro", "premium"].includes(
          plan
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid subscription plan.",
        });
      }

      const sessionEmail =
        user.email
          .trim()
          .toLowerCase();

      const checkoutEmail =
        metadata.userEmail
          ?.trim()
          .toLowerCase();

      if (
        !checkoutEmail ||
        checkoutEmail !==
          sessionEmail
      ) {
        return res.status(403).json({
          success: false,
          message:
            "This subscription does not belong to the current user.",
        });
      }

      const subscriptionsCollection =
        getSubscriptionsCollection();

      const now =
        new Date();

      const nextBillingDate =
        new Date(now);

      nextBillingDate.setMonth(
        nextBillingDate.getMonth() +
          1
      );

      const subscriptionData = {
        userName:
          user.name || "",

        userEmail:
          sessionEmail,

        userRole:
          user.role || "user",

        plan,

        planName:
          PLANS[plan].name,

        price:
          PLANS[plan].price,

        currency:
          stripeSession.currency ||
          "usd",

        status: "active",

        stripeSessionId:
          stripeSession.id,

        stripeSubscriptionId:
          typeof stripeSession.subscription ===
          "string"
            ? stripeSession.subscription
            : stripeSession.subscription
                ?.id || "",

        startedAt:
          now,

        nextBillingDate,

        updatedAt:
          now,
      };

      await subscriptionsCollection.updateOne(
        {
          userEmail:
            sessionEmail,
        },

        {
          $set:
            subscriptionData,

          $setOnInsert: {
            createdAt:
              now,
          },
        },

        {
          upsert: true,
        }
      );

      const savedSubscription =
        await subscriptionsCollection.findOne({
          userEmail:
            sessionEmail,
        });

      return res.status(200).json({
        success: true,

        message:
          `${PLANS[plan].name} subscription activated successfully.`,

        data:
          savedSubscription,
      });
    } catch (error) {
      console.error(
        "Confirm subscription error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          error?.message ||
          "Failed to confirm subscription.",
      });
    }
  }
);

/**
 * CANCEL SUBSCRIPTION
 * Returns user to Free
 */
router.post(
  "/cancel",
  requireAuth,
  requireRole(
    "user",
    "artist"
  ),
  async (req, res) => {
    try {
      const user =
        req.auth.user;

      const email =
        user.email
          .trim()
          .toLowerCase();

      const subscriptionsCollection =
        getSubscriptionsCollection();

      const subscription =
        await subscriptionsCollection.findOne({
          userEmail: email,
        });

      if (
        !subscription ||
        subscription.plan ===
          "free"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "You do not have an active paid subscription.",
        });
      }

      if (
        subscription.stripeSubscriptionId
      ) {
        try {
          await stripe.subscriptions.cancel(
            subscription.stripeSubscriptionId
          );
        } catch (stripeError) {
          console.error(
            "Stripe cancellation warning:",
            stripeError.message
          );
        }
      }

      const now =
        new Date();

      await subscriptionsCollection.updateOne(
        {
          userEmail: email,
        },

        {
          $set: {
            plan: "free",
            planName: "Free",
            price: 0,
            status: "active",
            stripeSubscriptionId:
              "",
            canceledAt:
              now,
            updatedAt:
              now,
          },
        }
      );

      return res.status(200).json({
        success: true,
        message:
          "Subscription canceled. You are now on the Free plan.",
      });
    } catch (error) {
      console.error(
        "Cancel subscription error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to cancel subscription.",
      });
    }
  }
);

export default router;