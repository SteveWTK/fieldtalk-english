// src/app/layout.js
// import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { LanguageProvider } from "@/lib/contexts/LanguageContext";

// const inter = Inter({ subsets: ["latin"] });

import { Inter, Poppins, Montserrat, JetBrains_Mono } from "next/font/google";

// Configure fonts
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata = {
  title:
    "FieldTalk English - Elite English Training for Football Professionals",
  description:
    "Custom-built English learning platform designed specifically for international football players. From matchday communication to media interviews.",
};

export default function RootLayout({ children }) {
  const rewardfulKey = process.env.NEXT_PUBLIC_REWARDFUL_API_KEY;
  return (
    <html
      lang="en"
      className={`${inter.variable} ${poppins.variable} ${montserrat.variable} ${jetbrainsMono.variable}`}
    >
      <meta name="apple-mobile-web-app-title" content="FieldTalk" />
      <body className={inter.className}>
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
          <LanguageProvider>{children}</LanguageProvider>
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
