// src/app/o/[token]/route.js
//
// Branded short-URL for outreach links. GET /o/<token> looks up the
// lead by token and 302-redirects to the WhatsApp deeplink
// (wa.me/<business>?text=Oi<zero-width token>).
//
// Purpose:
//   - Keeps what the salesperson pastes into their DM short and clean —
//     "globalplayerpro.com/o/kg7m3xph" reads as a bespoke branded link
//     rather than a wa.me URL bloated with %-encoded zero-width bytes.
//   - Trust — the recipient sees the brand domain before opening WA,
//     answering the "should I click this random link" reflex.
//
// This route intentionally does the minimum: verify the token exists,
// build the deeplink, redirect. No cookies, no logging beyond an error
// log for missing tokens. Every lead click will still register in the
// funnel router when they hit "Oi" on WhatsApp.

import { redirect } from "next/navigation";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { buildWhatsappDeeplink } from "@/lib/whatsapp/lead-funnel-outreach";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const { token } = await params;
  if (!token || typeof token !== "string") {
    return new Response("Not found", { status: 404 });
  }

  const businessNumber = process.env.NEXT_PUBLIC_WHATSAPP_BUSINESS_NUMBER;
  if (!businessNumber) {
    console.error(
      "[o/[token]] NEXT_PUBLIC_WHATSAPP_BUSINESS_NUMBER not set — cannot redirect",
    );
    return new Response("Not configured", { status: 500 });
  }

  const supabase = await getSupabaseAdmin();
  const { data: lead } = await supabase
    .from("leads")
    .select("id, do_not_contact")
    .eq("outreach_token", token.toLowerCase())
    .maybeSingle();

  if (!lead) {
    return new Response("Not found", { status: 404 });
  }
  if (lead.do_not_contact) {
    // Lead has opted out — refuse to build the outreach hand-off.
    return new Response("Not available", { status: 410 });
  }

  const target = buildWhatsappDeeplink({
    businessNumberE164: businessNumber,
    token,
  });

  redirect(target);
}
