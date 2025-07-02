// src/app/layout.js
"use client";

import "@/app/globals.css";
import { SessionProvider } from "next-auth/react";

// Import Google Fonts
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

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${poppins.variable} ${montserrat.variable} ${jetbrainsMono.variable}`}
    >
      <body className="antialiased font-body bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
