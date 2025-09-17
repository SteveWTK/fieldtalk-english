// src/app/layout.js
// import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";

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

{
  <meta name="apple-mobile-web-app-title" content="FieldTalk" />;
}

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${poppins.variable} ${montserrat.variable} ${jetbrainsMono.variable}`}
    >
      <meta name="apple-mobile-web-app-title" content="FieldTalk" />
      <body className={inter.className}>
        <AuthProvider>{children}</AuthProvider>
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
