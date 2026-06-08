// src/components/branding/PartnerLogo.js
//
// Renders the partner branch's logo at a given placement, IF the
// branch's `placements[<placement>]` is set to true in
// src/lib/branches.js. Returns null otherwise — including for
// non-attributed users — so it's safe to mount unconditionally on
// any surface.
//
// Usage:
//
//   // Loading splash, profile not yet fetched (uses localStorage):
//   <PartnerLogo placement="loading" size="lg" />
//
//   // Dashboard (uses player profile.partner_referrer):
//   <PartnerLogo placement="dashboard" profile={profile} size="sm" />
//
//   // Header / footer:
//   <PartnerLogo placement="siteHeader" profile={profile} size="xs" />
//   <PartnerLogo placement="footer" profile={profile} size="xs" />
//
// To enable a placement for a specific partner, flip the relevant
// flag in branches.js:
//   placements: { loading: true, dashboard: true, ... }
//
// To onboard a new partner with the same defaults as Fortaleza,
// copy the fortaleza entry and rename the slug + logo path.
"use client";

import Image from "next/image";
import { getBranch, isPlacementEnabled } from "@/lib/branches";
import { useCurrentBranchSlug } from "@/lib/branches/useCurrentBranchSlug";

// Visual sizes — height in px (width auto from aspect). Picked to
// match the surfaces we expect the logo on without breaking layout.
const SIZE_CLASSES = {
  xs: "h-5 sm:h-6 w-auto",
  sm: "h-7 sm:h-8 w-auto",
  md: "h-10 sm:h-12 w-auto",
  lg: "h-14 sm:h-16 w-auto",
  xl: "h-20 sm:h-24 w-auto",
};

export default function PartnerLogo({
  placement,
  profile = null,
  size = "md",
  className = "",
}) {
  const slug = useCurrentBranchSlug(profile);
  // No slug → no partner attribution → render nothing.
  if (!slug) return null;
  // Branch exists but doesn't have this placement turned on.
  if (!isPlacementEnabled(slug, placement)) return null;

  const branch = getBranch(slug);
  if (!branch?.logoSrc) return null;

  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;

  return (
    <Image
      src={branch.logoSrc}
      alt={branch.alt || "Partner"}
      width={300}
      height={120}
      // Sized by CSS so a wide vs tall logo both render proportionally.
      className={`${sizeClass} object-contain ${className}`.trim()}
      // Logos are small static PNGs; skip the optimizer (and its
      // quota cost) the same way we do for flag avatars.
      unoptimized
      priority={placement === "loading"}
    />
  );
}
