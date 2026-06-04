import Stripe from "stripe";
import { getRequiredEnv } from "./_payment-config.js";
import { getSupabaseAdmin } from "./_supabase.js";

const stripe = new Stripe(getRequiredEnv("STRIPE_SECRET_KEY"), {
  apiVersion: "2026-05-27.dahlia"
});

export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  let event;

  try {
    const signature = request.headers["stripe-signature"];
    const rawBody = await readRawBody(request);
    event = stripe.webhooks.constructEvent(rawBody, signature, getRequiredEnv("STRIPE_WEBHOOK_SECRET"));
  } catch (error) {
    console.error("Stripe webhook signature verification failed", error);
    return response.status(400).send("Invalid webhook signature");
  }

  try {
    if (event.type === "checkout.session.completed") {
      await recordCompletedCheckout(event.data.object);
    }

    return response.status(200).json({ received: true });
  } catch (error) {
    console.error("Stripe webhook handling failed", error);
    return response.status(500).json({ error: "Webhook handling failed" });
  }
}

async function recordCompletedCheckout(session) {
  const supabase = getSupabaseAdmin();
  const boostId = session.metadata?.boost_id;
  const candidateId = session.metadata?.candidate_id;
  const candidateName = session.metadata?.candidate_name ?? "";
  const spots = Number(session.metadata?.spots ?? 0);

  const { error: paymentError } = await supabase
    .from("boost_payments")
    .update({
      status: "paid",
      stripe_payment_intent_id:
        typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
      paid_at: new Date().toISOString()
    })
    .eq("stripe_session_id", session.id);

  if (paymentError) {
    throw paymentError;
  }

  const { error: boostError } = await supabase.from("paid_rank_boosts").insert({
    stripe_session_id: session.id,
    candidate_id: candidateId,
    candidate_name: candidateName,
    boost_id: boostId,
    spots
  });

  if (boostError && boostError.code !== "23505") {
    throw boostError;
  }
}

async function readRawBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}
