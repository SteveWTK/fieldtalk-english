"use client";

import "@/app/globals.css";
import { SessionProvider } from "next-auth/react";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased font-roboto relative">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
