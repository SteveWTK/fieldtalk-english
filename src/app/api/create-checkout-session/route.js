// app/api/create-checkout-session/route.js

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import Stripe from "stripe";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * POST /api/create-checkout-session
 * Creates a Stripe checkout session for FieldTalk Pro subscription.
 * Pricing: Pro R$29/month (BRL) or equivalent USD pricing.
 */
export async function POST(req) {
  try {
    // Get user from Supabase Auth session via cookies
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user?.email) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const supabase = await getSupabaseAdmin();

    // Get user from players table (FieldTalk uses players for regular users)
    let userId = user.id;
    let stripeCustomerId = null;

    const { data: player } = await supabase
      .from("players")
      .select("id, stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    if (player) {
      userId = player.id;
      stripeCustomerId = player.stripe_customer_id;
    } else {
      // Fallback to users table for guests converting
      const { data: guestUser } = await supabase
        .from("users")
        .select("id, stripe_customer_id")
        .eq("id", user.id)
        .single();

      if (guestUser) {
        stripeCustomerId = guestUser.stripe_customer_id;
      }
    }

    const {
      priceType = "subscription",
      subscriptionInterval = "monthly",
      currency = "BRL",
      upgrade_source = "pricing_page",
    } = await req.json();

    let lineItems;
    let mode;

    if (priceType === "subscription") {
      const priceId = getSubscriptionPriceId(subscriptionInterval, currency);

      if (!priceId) {
        return new NextResponse("Invalid subscription configuration", {
          status: 400,
        });
      }

      lineItems = [{ price: priceId, quantity: 1 }];
      mode = "subscription";
    } else {
      return new NextResponse("Invalid price type", { status: 400 });
    }

    // Create or get Stripe customer
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.user_metadata?.full_name || user.user_metadata?.name || "FieldTalk User",
        metadata: { supabase_id: userId },
      });
      stripeCustomerId = customer.id;

      // Update record with Stripe customer ID
      if (player) {
        await supabase
          .from("players")
          .update({ stripe_customer_id: stripeCustomerId })
          .eq("id", player.id);
      } else {
        await supabase
          .from("users")
          .update({ stripe_customer_id: stripeCustomerId })
          .eq("id", user.id);
      }
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: getPaymentMethods(currency),
      mode: mode,
      line_items: lineItems,
      metadata: {
        supabase_id: userId,
        price_type: priceType,
        currency: currency,
        subscription_interval: subscriptionInterval,
        upgrade_source,
      },
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/thank-you?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/pricing?canceled=true`,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    console.error("Error creating checkout session:", err);
    return new NextResponse(`Error: ${err.message}`, { status: 500 });
  }
}

/**
 * Get subscription price ID based on interval and currency.
 * FieldTalk pricing:
 * - Pro Monthly BRL: R$29/month
 * - Pro Monthly USD: $6/month (approximate conversion)
 * - Pro Yearly BRL: R$290/year (save ~17%)
 * - Pro Yearly USD: $60/year
 */
function getSubscriptionPriceId(interval, currency) {
  const priceIds = {
    BRL: {
      monthly: process.env.STRIPE_BRL_PRO_MONTHLY_PRICE_ID,
      yearly: process.env.STRIPE_BRL_PRO_YEARLY_PRICE_ID,
    },
    USD: {
      monthly: process.env.STRIPE_USD_PRO_MONTHLY_PRICE_ID,
      yearly: process.env.STRIPE_USD_PRO_YEARLY_PRICE_ID,
    },
  };

  return priceIds[currency]?.[interval];
}

function getPaymentMethods(currency) {
  if (currency === "BRL") {
    return ["card"]; // PIX is enabled via Stripe dashboard payment method configuration
  }
  return ["card"];
}
