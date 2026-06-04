import Stripe from "stripe";
import { getBoostPackage, getRequiredEnv } from "./_payment-config.js";
import { getSupabaseAdmin } from "./_supabase.js";

const stripe = new Stripe(getRequiredEnv("STRIPE_SECRET_KEY"), {
  apiVersion: "2026-05-27.dahlia"
});

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { boostId, candidateId, candidateName } = request.body ?? {};
    const boost = getBoostPackage(boostId);

    if (!boost || typeof candidateId !== "string" || candidateId.length === 0) {
      return response.status(400).json({ error: "Invalid boost request" });
    }

    const origin = getAppOrigin(request);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: boost.unitAmount,
            product_data: {
              name: `${boost.name} Rank Boost`,
              description: `Move up ${boost.spots} ${boost.spots === 1 ? "spot" : "spots"} on Dating Leaderboard`
            }
          },
          quantity: 1
        }
      ],
      metadata: {
        boost_id: boost.id,
        candidate_id: candidateId,
        candidate_name: String(candidateName ?? ""),
        spots: String(boost.spots)
      },
      success_url: `${origin}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?payment=cancelled`
    });

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("boost_payments").insert({
      stripe_session_id: session.id,
      candidate_id: candidateId,
      candidate_name: String(candidateName ?? ""),
      boost_id: boost.id,
      spots: boost.spots,
      amount_cents: boost.unitAmount,
      currency: "usd",
      status: "pending"
    });

    if (error) {
      throw error;
    }

    return response.status(200).json({ url: session.url });
  } catch (error) {
    console.error("create-checkout-session failed", error);
    return response.status(500).json({ error: "Unable to start checkout" });
  }
}

function getAppOrigin(request) {
  if (process.env.PUBLIC_APP_URL) {
    return process.env.PUBLIC_APP_URL.replace(/\/$/, "");
  }

  const protocol = request.headers["x-forwarded-proto"] ?? "http";
  const host = request.headers["x-forwarded-host"] ?? request.headers.host;
  return `${protocol}://${host}`;
}
