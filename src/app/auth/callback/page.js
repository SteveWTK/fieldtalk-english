// FIXED src/app/auth/callback/page.js
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader } from "lucide-react";
import { readPartnerReferrer } from "@/lib/partners/referrer";
import PartnerLogo from "@/components/branding/PartnerLogo";
import GlobalPlayerLogo from "@/components/brand/GlobalPlayerLogo";
import Button from "@/components/ui/button";

export default function AuthCallbackPage() {
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Completing your sign in...");
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      const supabase = createClient();

      try {
        console.log("🔍 Starting OAuth callback process...");
        console.log("Current URL:", window.location.href);

        // Handle the OAuth callback
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("❌ OAuth callback error:", error);
          setStatus("error");
          setMessage(error.message);
          return;
        }

        console.log("📊 Session data:", data);

        if (data.session) {
          console.log("✅ Valid session found, user authenticated");
          setStatus("success");
          setMessage("Sign in successful! Redirecting...");

          // OAuth signups don't pass our metadata through, so we ensure a
          // properly-tagged players row exists via a server-side admin
          // upsert. If the user came from /wc2026, the edition was stashed
          // in localStorage before the OAuth redirect.
          try {
            const pendingEdition =
              typeof window !== "undefined"
                ? localStorage.getItem("pending_edition")
                : null;
            // Always call ensure-player so a row exists, even if no
            // pending_edition (default to 'players' edition). The
            // partner_referrer (if any) was stashed at /wc2026 or
            // /join before the OAuth redirect and survives in
            // localStorage; ensure-player only writes it on first
            // signup, so it's safe to send on every callback.
            await fetch("/api/auth/ensure-player", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                // Default to wc2026 — every active acquisition channel
                // is World Cup themed. `pending_edition` from /wc2026
                // wins when present.
                edition: pendingEdition || "wc2026",
                partnerReferrer: readPartnerReferrer(),
                // Browser-detected preferred language. LanguageContext
                // writes the detected value to localStorage on mount;
                // read it here so the players row gets the right
                // language at first creation. Falls back to null
                // (server defaults to "en") for ancient browsers.
                preferredLanguage:
                  (typeof window !== "undefined" &&
                    localStorage.getItem("preferredLanguage")) ||
                  null,
              }),
            });
            if (pendingEdition && typeof window !== "undefined") {
              localStorage.removeItem("pending_edition");
            }
          } catch (err) {
            // Non-fatal — user can still proceed, just may not have the
            // edition tag applied. Worst case they re-enter via the
            // landing link.
            console.warn("Could not ensure player row:", err);
          }

          // Redirect to lesson page after short delay
          setTimeout(() => {
            router.push("/lesson");
          }, 1500);
        } else {
          console.log("❌ No session found");
          setStatus("error");
          setMessage("Authentication failed. Please try again.");
        }
      } catch (error) {
        console.error("❌ Unexpected error in auth callback:", error);
        setStatus("error");
        setMessage("An unexpected error occurred.");
      }
    };

    handleAuthCallback();
  }, [router]);

  if (status === "error") {
    return (
      <div className="min-h-screen bg-primary-900 text-primary-50 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Ambient lime wash — matches the rest of the auth flow. */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-[-15%] left-[-15%] w-[60vw] h-[60vw] rounded-full blur-3xl opacity-70"
            style={{
              background:
                "radial-gradient(circle at center, rgba(163,230,53,0.12), rgba(163,230,53,0) 70%)",
            }}
          />
        </div>
        <div className="relative text-center bg-primary-panel border border-primary-700 p-8 rounded-panel max-w-sm w-full">
          <div className="flex justify-center mb-6">
            <GlobalPlayerLogo
              variant="crest"
              tone="tonalDark"
              size={64}
              sting="rise"
            />
          </div>
          <h1 className="text-2xl font-bold mb-4 text-primary-50">
            Authentication Error
          </h1>
          <p className="text-primary-300 mb-6">{message}</p>
          <div className="space-y-2">
            <Button
              variant="primary"
              fullWidth
              onClick={() => router.push("/signin")}
            >
              Try Again
            </Button>
            <Button
              variant="secondary"
              fullWidth
              onClick={() => window.location.reload()}
            >
              Reload Page
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary-900 text-primary-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient lime wash — matches the rest of the auth flow. */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-[-15%] left-[-15%] w-[60vw] h-[60vw] rounded-full blur-3xl opacity-70"
          style={{
            background:
              "radial-gradient(circle at center, rgba(163,230,53,0.12), rgba(163,230,53,0) 70%)",
          }}
        />
      </div>
      <div className="relative text-center">
        {/* Partner logo first (when the user signed up via a partner
            branch link with placements.loading enabled). Sits above
            the Global Player wordmark so the partner name reads as the
            "presenter" of this experience for the brief moment the
            splash is up. Renders null for non-attributed users so
            organic traffic still sees the standard Global Player
            wordmark front-and-centre. */}
        <PartnerLogo placement="loading" size="lg" className="mx-auto mb-6" />

        <div className="flex flex-col items-center justify-center mb-8">
          <GlobalPlayerLogo
            variant="crest"
            tone="tonalDark"
            size={64}
            sting="rise"
          />
          <span className="mt-4 text-2xl font-bold tracking-tight text-primary-50">
            Global Player
          </span>
        </div>

        <Loader className="w-8 h-8 text-accent-400 mx-auto mb-4 animate-spin" />
        <p className="text-primary-300">
          {status === "success" ? message : "Completing your sign in..."}
        </p>
      </div>
    </div>
  );
}

// src/app/auth/callback/page.js - Handle OAuth callbacks
// "use client";

// import React, { useEffect, useState } from "react";
// import { useRouter } from "next/navigation";
// import { createClient } from "@/lib/supabase/client";
// import { Globe, Loader } from "lucide-react";

// export default function AuthCallbackPage() {
//   const [status, setStatus] = useState("loading");
//   const router = useRouter();

//   useEffect(() => {
//     const handleAuthCallback = async () => {
//       const supabase = createClient();

//       try {
//         const { data, error } = await supabase.auth.getSession();

//         if (error) {
//           console.error("Auth callback error:", error);
//           setStatus("error");
//           return;
//         }

//         if (data.session) {
//           // User is authenticated, redirect to dashboard
//           router.push("/dashboard");
//         } else {
//           // No session, redirect to signin
//           router.push("/auth/signin");
//         }
//       } catch (error) {
//         console.error("Unexpected error in auth callback:", error);
//         setStatus("error");
//       }
//     };

//     handleAuthCallback();
//   }, [router]);

//   if (status === "error") {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
//         <div className="text-center">
//           <h1 className="text-2xl font-bold text-gray-900 mb-4">
//             Authentication Error
//           </h1>
//           <p className="text-gray-600 mb-4">
//             There was a problem signing you in.
//           </p>
//           <a
//             href="/auth/signin"
//             className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
//           >
//             Try Again
//           </a>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
//       <div className="text-center">
//         <div className="flex items-center justify-center space-x-2 mb-4">
//           <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-green-500 rounded-full flex items-center justify-center">
//             <Globe className="w-6 h-6 text-white" />
//           </div>
//           <span className="text-2xl font-bold text-gray-900">
//             FieldTalk English
//           </span>
//         </div>
//         <Loader className="w-8 h-8 text-blue-600 mx-auto mb-4 animate-spin" />
//         <p className="text-gray-600">Completing your sign in...</p>
//       </div>
//     </div>
//   );
// }
