// src/app/(site)/admin/branch-qr/page.js
//
// Partner QR-code generator. One card per branch registered in
// src/lib/branches.js — each card renders a QR for the partner's
// /wc2026?branch=<slug> URL and lets the admin copy the link or
// download a print-ready PNG.
//
// Plus an ad-hoc generator at the top for one-off URLs (e.g. a
// special-promo page or an event-specific link that doesn't map to
// a registered branch).
//
// Distinct from /admin/qr-campaigns — that page is for guest-access
// codes with DB-backed sessions. This one is pure URL → QR with no
// persistence; the QR encodes the branch link, and partner
// attribution happens through the existing partner_referrer flow
// when the user lands on /wc2026.
//
// Auth: platform_admin only (client-side gate; safe because the
// page only renders publicly-known data).
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Loader2,
  Download,
  Copy,
  Check,
  QrCode,
  AlertCircle,
} from "lucide-react";
import QRCode from "qrcode";
import { useAuth } from "@/components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import { usePlayerProfile } from "@/lib/hooks/usePlayerData";
import { BRANCHES, DEFAULT_BRANCH_KEY } from "@/lib/branches";

// Production site URL — used to build the QR target. Falls back to
// window.location.origin in the browser so the page still works
// locally on http://localhost:3000.
const SITE_ORIGIN_FALLBACK = "https://www.fieldtalkenglish.com";

// QR rendering options. Q-level error correction (~25% recoverable)
// is a sweet spot for posters: dense enough to scan, robust to
// glare and print bleed. 1024px gives a crisp image at A4 print
// scale. Black-on-white maximises contrast for any phone camera.
const QR_OPTIONS = {
  errorCorrectionLevel: "Q",
  width: 1024,
  margin: 2,
  color: {
    dark: "#070707",
    light: "#FFFFFF",
  },
};

function branchUrl(slug, origin) {
  return `${origin}/wc2026?branch=${encodeURIComponent(slug)}`;
}

function BranchQrAdminContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile, loading: profileLoading } = usePlayerProfile(user?.id);

  useEffect(() => {
    if (profileLoading || !profile) return;
    if (profile.user_type !== "platform_admin") {
      router.replace("/lesson");
    }
  }, [profile, profileLoading, router]);

  // Resolve the live origin once on mount — server-render has no
  // window so we default; client-side we read the real origin in
  // case the page is being tested on a preview deployment.
  const [origin, setOrigin] = useState(SITE_ORIGIN_FALLBACK);
  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  // Every branch except "default" gets a card. Default is the
  // generic non-attributed entry; partners always get a slug.
  const partnerEntries = Object.entries(BRANCHES).filter(
    ([key]) => key !== DEFAULT_BRANCH_KEY
  );

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070707] text-white">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070707] text-white">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6 sm:space-y-8">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 text-sm text-white/65 hover:text-white mb-3"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to admin
          </Link>
          <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-300/70 font-semibold mb-1">
            FieldTalk · admin
          </p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Partner QR codes
          </h1>
          <p className="text-sm text-white/55 mt-2 max-w-2xl leading-relaxed">
            Print-ready QR codes that lead directly to each partner&apos;s
            branded WC2026 landing page. Anyone scanning lands on{" "}
            <code className="text-white/75 text-xs">
              /wc2026?branch=&lt;slug&gt;
            </code>{" "}
            and gets partner-attributed from the first interaction.
          </p>
        </div>

        {/* Ad-hoc one-off generator. Useful for promo posters that
            don't correspond to a registered branch (e.g. a special
            event link, a press tour). */}
        <AdHocGenerator origin={origin} />

        {/* One card per branch. Reads straight from BRANCHES so
            adding a new partner in branches.js automatically adds a
            QR card here — no edits to this file needed. */}
        <section>
          <h2 className="text-base font-bold text-white mb-1">
            Registered partner branches
          </h2>
          <p className="text-[11px] text-white/50 mb-3">
            Pulled from{" "}
            <code className="text-white/75 text-xs">src/lib/branches.js</code>.
            Add a new entry there to create a new card.
          </p>
          {partnerEntries.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/50">
              No partner branches registered yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {partnerEntries.map(([slug, branch]) => (
                <BranchCard
                  key={slug}
                  slug={slug}
                  branch={branch}
                  url={branchUrl(slug, origin)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Print tips — short, in-page so the team doesn't have to
            ask. Anchored to common questions from the Cultura team. */}
        <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
          <h2 className="text-sm font-bold text-white mb-2">Printing tips</h2>
          <ul className="text-xs text-white/55 space-y-1.5 leading-relaxed list-disc pl-4">
            <li>
              Minimum print size <strong>2 cm × 2 cm</strong> for reliable
              scanning at arm&apos;s length. Bigger is better for posters at
              a distance — go 5 cm+ for wall posters.
            </li>
            <li>
              Keep at least 5 mm of clear white space around the QR (the
              &quot;quiet zone&quot;). Don&apos;t overlap text or logos onto the
              code itself.
            </li>
            <li>
              Black-on-white prints scan most reliably. Avoid coloured
              backgrounds, gradients or watermarks underneath the QR.
            </li>
            <li>
              Always test scan the printed proof with at least two
              phones before mass-printing.
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}

/* ─── Branch card ─────────────────────────────────────────────── */

function BranchCard({ slug, branch, url }) {
  const [dataUrl, setDataUrl] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Render the QR off-thread (qrcode's toDataURL is async).
  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, QR_OPTIONS)
      .then((d) => {
        if (!cancelled) setDataUrl(d);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("[branch-qr] QR generation failed:", err);
          setError(err?.message || "Could not generate QR");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore — older browsers without clipboard API
    }
  };

  const handleDownload = () => {
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `fieldtalk-qr-${slug}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
      <header className="flex items-start gap-3 mb-4">
        {branch.logoSrc && (
          <Image
            src={branch.logoSrc}
            alt={branch.alt || slug}
            width={36}
            height={36}
            className="w-9 h-9 rounded-md object-contain bg-white/5 p-1 shrink-0"
            unoptimized
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-200/80 font-semibold">
            {slug}
          </p>
          <h3 className="font-bold text-sm text-white truncate">
            {branch.alt || slug}
          </h3>
        </div>
      </header>

      {/* QR preview — white bg so the QR is visible on the dark
          theme. Aspect-square so it never distorts. */}
      <div className="aspect-square w-full max-w-[240px] mx-auto rounded-xl bg-white p-3 mb-3 flex items-center justify-center">
        {error ? (
          <div className="text-red-600 text-xs flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            {error}
          </div>
        ) : dataUrl ? (
          // The dataUrl is a base64-encoded PNG; img is fine here.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={dataUrl}
            alt={`QR for ${slug}`}
            className="w-full h-full"
          />
        ) : (
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
        )}
      </div>

      <p className="text-[11px] text-white/55 break-all mb-3 font-mono">
        {url}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 text-xs font-semibold transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-300" />
              <span className="text-emerald-300">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              Copy URL
            </>
          )}
        </button>
        <button
          type="button"
          onClick={handleDownload}
          disabled={!dataUrl}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-[#062013] text-xs font-bold transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Download PNG
        </button>
      </div>
    </article>
  );
}

/* ─── Ad-hoc generator ────────────────────────────────────────── */

function AdHocGenerator({ origin }) {
  const [input, setInput] = useState("");
  const [resolvedUrl, setResolvedUrl] = useState("");
  const [dataUrl, setDataUrl] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const cancelledRef = useRef(false);

  const generate = useCallback(async (rawUrl) => {
    if (cancelledRef.current) return;
    setGenerating(true);
    setError(null);
    try {
      const d = await QRCode.toDataURL(rawUrl, QR_OPTIONS);
      if (cancelledRef.current) return;
      setDataUrl(d);
      setResolvedUrl(rawUrl);
    } catch (err) {
      if (cancelledRef.current) return;
      setError(err?.message || "Could not generate QR");
    } finally {
      if (!cancelledRef.current) setGenerating(false);
    }
  }, []);

  const handleGenerate = (e) => {
    e?.preventDefault?.();
    let url = input.trim();
    if (!url) {
      setError("Enter a URL or path to encode");
      return;
    }
    // If the user gave just a path ("/wc2026?branch=foo"), prepend
    // the origin so the QR encodes a fully-qualified URL.
    if (url.startsWith("/")) url = origin + url;
    if (!/^https?:\/\//i.test(url)) {
      setError("URL must start with / or http(s)://");
      return;
    }
    generate(url);
  };

  const handleDownload = () => {
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `fieldtalk-qr-custom.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-1">
        <QrCode className="w-4 h-4 text-emerald-300" />
        <h2 className="text-base font-bold text-white">Custom URL</h2>
      </div>
      <p className="text-[11px] text-white/50 mb-3">
        One-off QR for any URL or path on the site. Paths like{" "}
        <code className="text-white/75 text-xs">/wc2026?branch=foo</code>{" "}
        are auto-prefixed with the site origin.
      </p>

      <form
        onSubmit={handleGenerate}
        className="flex flex-col sm:flex-row gap-2 mb-3"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="https://… or /path"
          className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 focus:outline-none focus:border-emerald-400 font-mono"
        />
        <button
          type="submit"
          disabled={generating}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-[#062013] text-sm font-bold transition-colors"
        >
          {generating ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Generating
            </>
          ) : (
            <>
              <QrCode className="w-3.5 h-3.5" />
              Generate
            </>
          )}
        </button>
      </form>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-200 mb-3">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </div>
      )}

      {dataUrl && (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex flex-col sm:flex-row items-start gap-4">
          <div className="w-32 h-32 rounded-lg bg-white p-2 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={dataUrl}
              alt="Custom QR"
              className="w-full h-full"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-200/80 font-semibold mb-1">
              Encodes
            </p>
            <p className="text-[11px] text-white/65 font-mono break-all mb-3">
              {resolvedUrl}
            </p>
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#062013] text-xs font-bold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download PNG
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default function BranchQrAdminPage() {
  return (
    <ProtectedRoute>
      <BranchQrAdminContent />
    </ProtectedRoute>
  );
}
