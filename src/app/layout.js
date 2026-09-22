// src/app/layout.js
//
// Root layout — font stack was replaced 2026-09-12 as part of the
// Global Player rebrand (Stage 1b). The old Inter / Poppins /
// Montserrat trio is retired; Archivo + Instrument Sans + JetBrains
// Mono are the new families per docs/brand/handoff/HANDOFF.md.
//
// The CSS variable names for Instrument Sans reuse the existing
// `--font-inter` and `--font-body` slots so app code that already
// references `font-body` picks up the new family without a
// component-wide rename. Same for `--font-poppins` and
// `--font-montserrat` → now both Archivo.
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { LanguageProvider } from "@/lib/contexts/LanguageContext";
import LeadAttributionCapture from "@/components/demo/LeadAttributionCapture";

import { Archivo, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import { PRODUCT_NAME } from "@/lib/brand/name";

// Archivo — display + heading + wordmark + big numbers. Weights per
// HANDOFF.md §1 (Type): 300 for light display, 500 for eyebrows +
// italic, 700 for H2/H3, 800 for H1 + button labels, 900 for
// display + wordmark.
const archivo = Archivo({
  subsets: ["latin"],
  weight: ["300", "500", "700", "800", "900"],
  style: ["normal", "italic"],
  variable: "--font-archivo",
  display: "swap",
});

// Instrument Sans — body + UI + captions + form labels.
const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-instrument",
  display: "swap",
});

// JetBrains Mono — status / terminal register only. Not used in
// product chrome or marketing body copy. Kept as a variable font
// so the whole weight range is available for future callouts.
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata = {
  title: `${PRODUCT_NAME} — Mental armour. Field English.`,
  description:
    "Global Player prepares base-category football athletes for international transfers — mental training, field English, and measured performance readiness. Built for academies, clubs and agents.",
};

export default function RootLayout({ children }) {
  const rewardfulKey = process.env.NEXT_PUBLIC_REWARDFUL_API_KEY;
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${instrumentSans.variable} ${jetbrainsMono.variable}`}
    >
      <meta name="apple-mobile-web-app-title" content={PRODUCT_NAME} />
      <body className={instrumentSans.className}>
        {/* Rewardful — affiliate tracking. Renders only when the API
            key is configured so dev / preview deploys without the env
            var don't load it. The script reads ?via= from the URL,
            drops a rewardful.referral cookie, and /api/checkout passes
            it through to Stripe as client_reference_id. No further
            client wiring needed. */}
        {rewardfulKey ? (
          <>
            <Script
              id="rewardful-init"
              strategy="beforeInteractive"
            >{`(function(w,r){w._rwq=r;w[r]=w[r]||function(){(w[r].q=w[r].q||[]).push(arguments)}})(window,'rewardful');`}</Script>
            <Script
              src="https://r.wdfrl.com/rw.js"
              data-rewardful={rewardfulKey}
              strategy="afterInteractive"
              async
            />
          </>
        ) : null}
        <AuthProvider>
          <LanguageProvider>
            {/* Captures ?attribution_lead_token from any URL and, once
                auth resolves, posts to /api/leads/attribute-conversion
                to mark the WhatsApp-funnel lead as converted. Silent
                no-op when no token is present. */}
            <LeadAttributionCapture />
            {children}
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

// // src/app/layout.js
// "use client";

// import "@/app/globals.css";
// import { SessionProvider } from "next-auth/react";

// // Import Google Fonts
// import { Inter, Poppins, Montserrat, JetBrains_Mono } from "next/font/google";

// // Configure fonts
// const inter = Inter({
//   subsets: ["latin"],
//   variable: "--font-inter",
//   display: "swap",
// });

// const poppins = Poppins({
//   subsets: ["latin"],
//   weight: ["300", "400", "500", "600", "700"],
//   variable: "--font-poppins",
//   display: "swap",
// });

// const montserrat = Montserrat({
//   subsets: ["latin"],
//   variable: "--font-montserrat",
//   display: "swap",
// });

// const jetbrainsMono = JetBrains_Mono({
//   subsets: ["latin"],
//   variable: "--font-jetbrains-mono",
//   display: "swap",
// });

// export default function RootLayout({ children }) {
//   return (
//     <html
//       lang="en"
//       className={`${inter.variable} ${poppins.variable} ${montserrat.variable} ${jetbrainsMono.variable}`}
//     >
//       <body className="antialiased font-body bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100">
//         <SessionProvider>{children}</SessionProvider>
//       </body>
//     </html>
//   );
// }
