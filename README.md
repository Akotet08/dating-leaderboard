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

Run locally:

```bash
npm run dev
```

Then open the local URL Vite prints, usually `http://127.0.0.1:5173/`.

## Stripe and Supabase Setup

Create a local env file:

```bash
cp .env.example .env.local
```

Fill in:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `POSTGRES_URL`
- `PUBLIC_APP_URL`

The payment API uses `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, or `POSTGRES_URL_NON_POOLING`, in that order. It creates the `boost_payments` and `paid_rank_boosts` tables automatically if they are missing.

You can also run the SQL in `supabase/schema.sql` manually if you want to create the tables ahead of time.

For local payment testing, use Vercel dev so `/api/*` functions are available:

```bash
npx vercel dev
```

In another terminal, forward Stripe webhooks:

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
- Current-user highlighted row
- Search and tier filtering
- Admin add, edit, delete, reset, and mark-as-user tools
- Stripe Checkout for Nudge, Push, and Launch boost packages
- Postgres tables for pending and paid boost records
