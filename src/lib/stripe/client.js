// src/lib/stripe/client.js
//
// Singleton Stripe SDK client. Lazy so the env var only needs to be
// present in environments that actually hit Stripe (e.g. not at
// build time on a static page).
//
// Pin the API version so a future stripe-node upgrade doesn't
// silently shift payload shapes our webhook depends on. Update the
// version + run the test suite when intentionally upgrading.
import Stripe from "stripe";

let _client = null;

export function getStripeClient() {
  if (_client) return _client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Add it to .env.local (test mode) " +
        "or your hosting provider's env vars (live mode)."
    );
  }
  _client = new Stripe(key, { apiVersion: "2024-11-20.acacia" });
  return _client;
}
