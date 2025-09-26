// lib/currency-utils.js
export function detectUserCurrency(req = null) {
  // Method 1: Server-side detection from headers
  if (req && typeof window === "undefined") {
    const country =
      req.headers.get("cf-ipcountry") || // Cloudflare
      req.headers.get("x-vercel-ip-country") || // Vercel
      req.geo?.country; // Vercel Edge

    return country === "BR" ? "BRL" : "USD";
  }

  // Method 2: Client-side detection from locale
  if (typeof window !== "undefined") {
    const locale = navigator.language || navigator.languages?.[0];
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Brazilian indicators
    if (
      locale?.includes("pt-BR") ||
      locale?.includes("pt") ||
      timeZone?.includes("America/Sao_Paulo") ||
      timeZone?.includes("America/Fortaleza")
    ) {
      return "BRL";
    }
  }

  return "USD"; // Default
}

export function getCurrencySymbol(currency) {
  const symbols = {
    USD: "$",
    BRL: "R$",
    GBP: "£",
  };
  return symbols[currency] || "$";
}

export function formatPrice(amount, currency) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: currency === "BRL" ? 2 : 2,
  }).format(amount);
}
