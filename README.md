# ArtHub Server

ArtHub Server is the backend API for ArtHub, an online marketplace for original artworks.

It handles authentication, artwork management, favorites, purchases, Stripe payments, and MongoDB data storage.

## Features

- Better Auth authentication
- Email and password login
- Google login
- Artist and Art Collector roles
- Artwork CRUD operations
- Sold artwork protection
- Favorites system
- Stripe Checkout integration
- Purchase history
- MongoDB database integration
- Production-ready environment configuration

## Technologies

- Node.js
- Express.js
- MongoDB
- Better Auth
- Stripe
- CORS

## Environment Variables

Create a `.env` file in the server root.

Required variables:

```env
PORT=
CLIENT_URL=
MONGODB_URI=
DB_NAME=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
STRIPE_SECRET_KEY=