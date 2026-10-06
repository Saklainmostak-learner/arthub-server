# ArtHub Server

ArtHub Server is the backend API for ArtHub, a full-stack online marketplace for original artworks.

The backend handles authentication, authorization, artwork management, favorites, artwork purchases, Stripe payments, verified reviews, artist sales tracking, subscriptions, admin management, and MongoDB data storage.

## Live API

https://arthub-server-k64r.onrender.com

## GitHub Repositories

**Server Repository:**  
https://github.com/Saklainmostak-learner/arthub-server

**Client Repository:**  
https://github.com/Saklainmostak-learner/arthub-client

---

## Project Purpose

The purpose of the ArtHub backend is to provide a secure API for the ArtHub marketplace.

The server manages user authentication, role-based authorization, artworks, purchases, reviews, favorites, subscriptions, admin operations, and MongoDB database communication.

---

## Main Features

- Better Auth authentication
- Email and password authentication
- Google OAuth
- Cookie-based sessions
- Collector role
- Artist role
- Admin role
- Role-based authorization
- Protected API routes
- Artwork CRUD operations
- Artwork ownership validation
- Sold artwork protection
- Favorites system
- Stripe artwork checkout
- Stripe payment confirmation
- Purchase history
- Duplicate purchase protection
- Verified buyer reviews
- Review ownership protection
- Artist sales history
- Artist revenue statistics
- Admin platform statistics
- Admin user management
- Admin role management
- Admin artwork management
- Platform transaction management
- Stripe membership subscriptions
- Free, Pro, and Premium membership system
- Subscription confirmation
- Subscription cancellation
- MongoDB Atlas integration
- Environment-based configuration
- CORS configuration
- API 404 handling

---

## Technology Stack

- Node.js
- Express.js
- MongoDB
- Better Auth
- Better Auth MongoDB Adapter
- Stripe
- CORS
- dotenv

---

## Major NPM Packages

```text
express
mongodb
better-auth
@better-auth/mongo-adapter
stripe
cors
dotenv
nodemon
```

---

## Database

ArtHub uses MongoDB Atlas.

**Database Name:**

```text
arthubDB
```

Main collections include:

```text
user
account
session
verification
artworks
favorites
purchases
comments
subscriptions
```

---

## Authentication

Authentication is handled by Better Auth.

Supported authentication methods:

- Email and password
- Google OAuth

Better Auth API base route:

```text
/api/auth
```

---

## User Roles

ArtHub supports three main roles.

### Collector

Role value:

```text
user
```

Collectors can:

- Save favorites
- Remove favorites
- Purchase artworks
- View purchase history
- Submit verified reviews
- Edit their own reviews
- Delete their own reviews
- Subscribe to membership plans

### Artist

Role value:

```text
artist
```

Artists can:

- Create artworks
- View their own artworks
- Update their own unsold artworks
- Delete their own unsold artworks
- View sold artwork status
- View their own sales history
- View revenue information
- Subscribe to membership plans

Artists cannot purchase their own artworks.

### Admin

Role value:

```text
admin
```

Administrators can:

- View platform statistics
- View all users
- Change user roles
- Promote users to Artist or Admin
- Delete users
- View all artworks
- Delete artworks
- View platform transactions

The currently authenticated administrator cannot remove its own admin role or delete its own account.

---

## API Overview

### Health Route

```http
GET /
```

Returns server status information.

---

### Authentication Routes

Base route:

```text
/api/auth
```

Better Auth handles:

- Registration
- Login
- Logout
- Session management
- Google authentication

---

## Artwork Routes

Base route:

```text
/artworks
```

Available operations include:

```http
GET    /artworks
GET    /artworks/:id
POST   /artworks
PUT    /artworks/:id
DELETE /artworks/:id
```

Artwork routes support:

- Artwork creation
- Artwork retrieval
- Artwork update
- Artwork deletion
- Artist ownership validation
- Sold artwork protection

---

## Favorite Routes

Base route:

```text
/favorites
```

Available operations include:

```http
GET    /favorites/:email
POST   /favorites
DELETE /favorites/:artworkId/:email
```

Favorites are restricted to authenticated collector accounts.

Users can access and manage only their own favorite records.

---

## Purchase Routes

Base route:

```text
/purchases
```

Available operations include:

```http
POST /purchases/create-checkout-session
POST /purchases/confirm-payment
GET  /purchases/buyer/:email
GET  /purchases/artist/:email
```

Purchase functionality includes:

- Stripe Checkout
- Authenticated collector validation
- Buyer identity verification
- Artist self-purchase prevention
- Artwork sold protection
- Duplicate purchase protection
- Purchase history
- Artist sales history
- Revenue tracking

---

## Review Routes

Base route:

```text
/comments
```

Available operations include:

```http
GET    /comments/artwork/:artworkId
POST   /comments
PUT    /comments/:id
DELETE /comments/:id
```

Review functionality includes:

- Public review viewing
- Verified purchase validation
- 1–5 star rating validation
- Review ownership validation
- Review update
- Review deletion

Only verified buyers can submit reviews.

Users can update or delete only their own reviews.

---

## Subscription Routes

Base route:

```text
/subscriptions
```

Available operations include:

```http
GET  /subscriptions/plans
GET  /subscriptions/me
POST /subscriptions/create-checkout-session
POST /subscriptions/confirm
POST /subscriptions/cancel
```

Supported membership plans:

```text
free
pro
premium
```

Stripe Checkout is used for paid memberships.

Subscription information is stored in MongoDB.

---

## Admin Routes

Base route:

```text
/admin
```

Admin-only operations include:

```http
GET    /admin/stats
GET    /admin/users
PATCH  /admin/users/:id/role
DELETE /admin/users/:id
GET    /admin/artworks
DELETE /admin/artworks/:id
GET    /admin/transactions
```

All admin routes require:

- A valid authenticated session
- Admin role authorization

Admin security includes:

- Self-role-removal protection
- Self-account-deletion protection

---

## Artist Sales

Artists can access their own sales information through:

```http
GET /purchases/artist/:email
```

The API provides:

- Total sales
- Total revenue
- Average sale value
- Individual sales
- Buyer information
- Sale amount
- Sale date

Artists cannot access another artist's sales information.

---

## Environment Variables

Create a `.env` file in the server root.

### Local Development Example

```env
PORT=5000

CLIENT_URL=http://localhost:3000

MONGODB_URI=your_mongodb_connection_string
DB_NAME=arthubDB

BETTER_AUTH_SECRET=your_better_auth_secret
BETTER_AUTH_URL=http://localhost:5000

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

STRIPE_SECRET_KEY=your_stripe_test_secret_key
```

### Production Example

```env
CLIENT_URL=https://arthub-client-sigma.vercel.app
BETTER_AUTH_URL=https://arthub-server-k64r.onrender.com
```

Never commit real secret values to GitHub.

---

## Install and Run Locally

Clone the server repository:

```bash
git clone https://github.com/Saklainmostak-learner/arthub-server.git
```

Enter the project:

```bash
cd arthub-server
```

Install dependencies:

```bash
npm install
```

Create a `.env` file in the project root.

Start the development server:

```bash
npm run dev
```

Or start the production server:

```bash
npm start
```

The API will run locally at:

```text
http://localhost:5000
```

---

## Available Scripts

### Development Server

```bash
npm run dev
```

### Production Server

```bash
npm start
```

This Express server does not require a separate frontend-style production build command.

---

## Deployment

The backend is deployed on Render.

**Production API:**

https://arthub-server-k64r.onrender.com

The Render server communicates with:

- MongoDB Atlas
- Better Auth
- Stripe
- Vercel frontend

---

## CORS

CORS is configured using the frontend URL stored in:

```env
CLIENT_URL
```

Credentials are enabled so Better Auth session cookies can be used between the client and server.

---

## Security

The ArtHub backend includes:

- Authenticated protected routes
- Role-based authorization
- Artist ownership checks
- Collector-only operations
- Admin-only operations
- Artwork sold protection
- Duplicate purchase protection
- Buyer identity validation
- Verified purchase checks
- Review ownership checks
- User-specific favorites
- User-specific purchase history
- Artist-specific sales history
- Protected active administrator account
- Environment-based secrets

---

## Stripe

Stripe test mode is used for:

- Artwork purchases
- Pro membership subscriptions
- Premium membership subscriptions

Stripe secret keys are stored only in server environment variables.

No Stripe secret key is exposed in the client application.

---

## Admin Access

The administrator account is created as a normal account first and then assigned the `admin` role in the database or by an existing administrator.

Public users cannot register themselves directly as administrators.

The Admin Dashboard is available from the client at:

```text
/dashboard/admin
```

Evaluation credentials should be provided separately in the assignment submission.

---

## Project Status

ArtHub Server supports the backend workflow for:

- Collectors
- Artists
- Administrators
- Artwork CRUD
- Favorites
- Stripe artwork payments
- Purchase history
- Verified reviews
- Artist sales
- Platform administration
- Membership subscriptions
- Role-based authorization

The backend is built using Node.js, Express, MongoDB, Better Auth, and Stripe.