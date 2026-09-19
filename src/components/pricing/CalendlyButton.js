// src/components/pricing/CalendlyButton.js
//
// Opens a Calendly popup when clicked. Loads the Calendly widget
// script lazily — the script only downloads the first time a user
// hits the button, so it doesn't cost anyone a page-load. The
// popup itself doesn't take the user off the site (Calendly modal
// overlays the pricing page and closes back to it after booking).
//
// Setup:
//   1. Sign in to Calendly (free tier is enough for one event type).
//   2. Create a booking type — e.g. "Global Player demo · 15 min".
//   3. Copy the event URL (looks like
//      https://calendly.com/<your-handle>/<event-slug>).
//   4. Add to .env.local:
//        NEXT_PUBLIC_CALENDLY_URL="https://calendly.com/<handle>/<slug>"
//   5. Restart dev / redeploy.
//
// If the env var isn't set, the button still renders but clicking it
// opens Calendly's own homepage in a new tab (so we don't ship a dead
// CTA to production if the env var is missed).

"use client";

import { useCallback, useEffect, useState } from "react";
import { Calendar } from "lucide-react";
import Button from "@/components/ui/button";

const CALENDLY_SCRIPT_ID = "calendly-widget-script";
const CALENDLY_STYLE_ID = "calendly-widget-css";
const CALENDLY_URL =
  process.env.NEXT_PUBLIC_CALENDLY_URL || "https://calendly.com";

// Load Calendly's widget script + stylesheet ONCE per page-load.
// Idempotent — repeated calls just return the existing promise.
let widgetReadyPromise = null;
function loadCalendlyWidget() {
  if (typeof window === "undefined") return Promise.resolve();
  if (widgetReadyPromise) return widgetReadyPromise;

  widgetReadyPromise = new Promise((resolve) => {
    // CSS
    if (!document.getElementById(CALENDLY_STYLE_ID)) {
      const link = document.createElement("link");
      link.id = CALENDLY_STYLE_ID;
      link.rel = "stylesheet";
      link.href = "https://assets.calendly.com/assets/external/widget.css";
      document.head.appendChild(link);
    }
    // JS
    if (window.Calendly) {
      resolve();
      return;
    }
    if (document.getElementById(CALENDLY_SCRIPT_ID)) {
      // Someone else started loading; poll briefly for window.Calendly.
      const start = Date.now();
      const tick = () => {
        if (window.Calendly) return resolve();
        if (Date.now() - start > 5000) return resolve(); // give up quietly
        setTimeout(tick, 50);
      };
      tick();
      return;
    }
    const script = document.createElement("script");
    script.id = CALENDLY_SCRIPT_ID;
    script.src = "https://assets.calendly.com/assets/external/widget.js";
    script.async = true;
    script.onload = () => resolve();
    // If the script fails to load (network / adblocker), still resolve
    // so the click handler falls back to opening the URL in a new tab.
    script.onerror = () => resolve();
    document.body.appendChild(script);
  });

  return widgetReadyPromise;
}

/**
 * @param {{
 *   label?: string | React.ReactNode,
 *   variant?: 'primary' | 'secondary' | 'ghost',
 *   size?: 'sm' | 'md' | 'lg',
 *   fullWidth?: boolean,
 *   className?: string,
 *   prefill?: { name?: string, email?: string },
 *   utm?: { source?: string, medium?: string, campaign?: string },
 *   tier?: string,   // pricing tier the user is interested in (for utm)
 * }} props
 */
export default function CalendlyButton({
  label = "Book a demo",
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
  prefill,
  utm,
  tier,
}) {
  const [loading, setLoading] = useState(false);

  // Pre-warm the widget once the button is in the viewport so the
  // first click is instant. Kept behind requestIdleCallback so it
  // doesn't fight for network with above-the-fold assets.
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const warm = () => {
      loadCalendlyWidget();
    };
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(warm, { timeout: 3000 });
    } else {
      setTimeout(warm, 500);
    }
    return undefined;
  }, []);

  const handleClick = useCallback(async () => {
    setLoading(true);
    await loadCalendlyWidget();
    setLoading(false);

    // Merge tier into UTM so bookings arrive at Calendly with the
    // pricing-tier attribution attached. Calendly surfaces utm_*
    // params in the booking payload / dashboard.
    const utmParams = {
      utmSource: utm?.source || "pricing_page",
      utmMedium: utm?.medium || "cta",
      utmCampaign: utm?.campaign || (tier ? `tier_${tier}` : "pricing"),
    };

    if (typeof window !== "undefined" && window.Calendly) {
      window.Calendly.initPopupWidget({
        url: CALENDLY_URL,
        prefill: prefill || {},
        utm: utmParams,
      });
      return;
    }

    // Fallback — Calendly script failed to load OR env var missing.
    // Open the URL directly in a new tab so the user still lands
    // somewhere sensible.
    if (typeof window !== "undefined") {
      window.open(CALENDLY_URL, "_blank", "noopener,noreferrer");
    }
  }, [prefill, utm, tier]);

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      loading={loading}
      disabled={loading}
      Icon={Calendar}
      className={[fullWidth ? "w-full" : "", className].join(" ").trim()}
    >
      {label}
    </Button>
  );
}
