// src/components/notifications/ServiceWorkerBridge.js
//
// Two responsibilities, both lightweight, both client-side only:
//
//   1. Register /sw.js once per session for every signed-in user.
//      The service worker has to be active before pushManager can
//      subscribe, AND the worker is what actually receives pushes —
//      registering early means a returning user who's already opted
//      in will get pushes even on their first dashboard visit.
//
//   2. Listen for "navigate" messages from the worker so that a
//      notification click lands on the right page WITHIN the current
//      tab (the worker can't navigate the page directly; it posts a
//      message and we router.push()).
//
// Renders nothing. Mount once near the root of the (site) layout.

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import {
  isPushSupported,
  registerServiceWorker,
} from "@/lib/push/subscribe-client";

export default function ServiceWorkerBridge() {
  const router = useRouter();
  const { user } = useAuth();

  // Register /sw.js as soon as we have a signed-in user. Registering
  // for anonymous visitors is technically harmless but wastes a few
  // CPU cycles and creates an empty registration in their browser
  // they can't use, so we gate on auth.
  useEffect(() => {
    if (!user) return;
    if (!isPushSupported()) return;
    registerServiceWorker().catch((err) =>
      console.warn("[sw-bridge] register failed:", err?.message)
    );
  }, [user]);

  // The service worker's notificationclick handler sends a
  // { type: "navigate", url } message back to the page so we can do
  // a soft client-side navigation rather than a full reload. This
  // listener is what catches it.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    const handler = (event) => {
      if (event.data?.type === "navigate" && event.data.url) {
        router.push(event.data.url);
      }
    };
    navigator.serviceWorker.addEventListener("message", handler);
    return () =>
      navigator.serviceWorker.removeEventListener("message", handler);
  }, [router]);

  return null;
}
