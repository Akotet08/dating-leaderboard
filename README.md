# Dating Leaderboard

A responsive satirical dating ranking app built with React, TypeScript, Vite, Vercel serverless functions, Stripe Checkout, and Postgres.

## Local Verification

Install dependencies:

```bash
npm install
```

Check syntax, TypeScript, and production bundling:

```bash
npm run build
```

Run the frontend only:

```bash
npm run dev
```

Then open the local URL Vite prints, usually `http://127.0.0.1:5173/`.

For auth, database APIs, and Stripe checkout, run through Vercel dev instead:

```bash
npx vercel dev
```

## App Setup

Create a local env file:

```bash
cp .env.example .env.local
```

Fill in:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `POSTGRES_URL`
- `PUBLIC_APP_URL`
- `SESSION_SECRET`
- `ADMIN_DEFAULT_PASSWORD`

The API uses `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, or `POSTGRES_URL_NON_POOLING`, in that order. It creates the auth, leaderboard, boost payment, and paid boost tables automatically if they are missing.

The first API call seeds one admin account:

- name: `Deme`
- default password: `Deme_looking_for_the_one`

The password is stored only as a hash and can be changed after login.

For local payment testing, forward Stripe webhooks in another terminal:

```bash
stripe listen --forward-to http://localhost:3000/api/stripe-webhook
```

Copy the `whsec_...` value from Stripe CLI into `STRIPE_WEBHOOK_SECRET`.

For Vercel production, add the same env vars in the Vercel project settings. Set `PUBLIC_APP_URL` to the production URL, then add a Stripe webhook endpoint pointing to:

```text
https://your-domain.com/api/stripe-webhook
```

Subscribe it to `checkout.session.completed`.

## Current Scope

- Top-three podium
- Full ranked contender list
- Public leaderboard viewing
- User registration with name, pickup line, and password
- Single seeded admin login for `Deme`
- Change password flow for logged-in accounts
- Admin add, edit, rate, and delete user records
- Registered users start at the bottom of the leaderboard
- Search and tier filtering
- Stripe Checkout for Nudge, Push, and Launch boost packages
- Postgres tables for users, leaderboard records, pending boosts, and paid boost records
