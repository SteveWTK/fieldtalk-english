// src/components/demo/LeadAttributionCapture.js
//
// Client-side glue between the demo CTA and the /api/leads/
// attribute-conversion endpoint.
//
// Two responsibilities:
//   1. Persistence — when the signup URL carries ?attribution_lead_token,
//      stash it in localStorage so the token survives the auth redirect
//      dance (email confirmation → magic link → landing).
//   2. Attribution firing — once useAuth reports an authenticated user,
//      POST to the API with the stored token. On success, clear storage
//      so we don't fire again on future logins.
//
// Mounted once at the root layout. Safe to leave running on any page
// the user visits — every branch is a no-op unless both a token and a
// user are present.

"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";

const STORAGE_KEY = "demo_attribution_token";
const QUERY_PARAM = "attribution_lead_token";

export default function LeadAttributionCapture() {
  const { user } = useAuth();
  // Guard against double-fires when auth state churns during initial
  // page load. Once we've posted successfully, don't post again in
  // the same session.
  const firedRef = useRef(false);

  // Step 1: capture from URL if present. Runs on every route change
  // that reaches this layout (so signup URLs deep-linked from the
  // demo CTA still get their token stashed even if the user hits the
  // page while already authenticated).
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const params = new URLSearchParams(window.location.search);
      const t = params.get(QUERY_PARAM);
      if (!t) return;
      window.localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* silent — localStorage may be blocked */
    }
  }, []);

  // Step 2: once we have a user AND a stored token, fire the API.
  useEffect(() => {
    if (!user || firedRef.current) return;
    if (typeof window === "undefined") return;

    let cancelled = false;
    const token = safeGetStored();
    if (!token) return;

    firedRef.current = true;

    (async () => {
      try {
        const res = await fetch("/api/leads/attribute-conversion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (cancelled) return;
        // 200 (converted or already-converted) OR 404 (lead disappeared)
        // — either way, stop retrying. 401 is a race — keep the token
        // for the next auth-ready render.
        if (res.status !== 401) {
          safeClearStored();
        } else {
          firedRef.current = false;
        }
      } catch {
        // Network error — leave the token in storage; next page-load
        // effect will retry.
        firedRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  return null;
}

function safeGetStored() {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function safeClearStored() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* silent */
  }
}
