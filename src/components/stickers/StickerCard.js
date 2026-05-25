// src/components/stickers/StickerCard.js
//
// Single sticker card. Two render paths:
//   1. If sticker.image_url is set → render the artwork inside the
//      rarity frame (Recraft-generated art lives here).
//   2. Otherwise → a country-coloured placeholder that still feels
//      sticker-shaped (kit stripe + shirt number + name + rating).
//
// Used by the album view, the pack-opening modal, and (soon) the squad
// builder. All sizing is responsive via the `size` prop.
"use client";

import React from "react";
import Image from "next/image";
import { Star } from "lucide-react";
import { getCountryPalette, getRarity } from "@/lib/stickers/countryPalette";

/**
 * @param {object} props
 * @param {object} props.sticker    The sticker row (name, country_code, position, rating, etc.)
 * @param {number=} props.quantity  Owned quantity badge (omit for "not owned")
 * @param {boolean=} props.owned    true → full colour, false → dimmed silhouette
 * @param {"sm"|"md"|"lg"=} props.size  Default "md"
 * @param {boolean=} props.glow     Animated rarity glow (used in pack-opening reveal)
 * @param {string=} props.className Extra classes for the outer wrapper
 */
export default function StickerCard({
  sticker,
  quantity = 0,
  owned = true,
  size = "md",
  glow = false,
  className = "",
}) {
  if (!sticker) return null;

  const palette = getCountryPalette(sticker.country_code);
  const rarity = getRarity(sticker.rating);

  const dims =
    size === "xs"
      ? { w: "w-12", h: "h-16", name: "text-[8px]", num: "text-sm" }
      : size === "sm"
        ? { w: "w-20", h: "h-28", name: "text-[10px]", num: "text-xl" }
        : size === "lg"
          ? { w: "w-40", h: "h-56", name: "text-base", num: "text-5xl" }
          : { w: "w-28", h: "h-40", name: "text-xs", num: "text-3xl" };

  const stars = Array.from({ length: 5 }, (_, i) => i < sticker.rating);

  const ringStyle = {
    boxShadow: glow
      ? `0 0 0 2px ${rarity.ring}, 0 0 24px 4px ${rarity.glow}`
      : `0 0 0 2px ${rarity.ring}`,
  };

  return (
    <div
      className={`${dims.w} ${dims.h} relative rounded-xl overflow-hidden shrink-0 ${
        owned ? "" : "opacity-30 grayscale"
      } ${className}`}
      style={ringStyle}
      title={`${sticker.name} — ${sticker.country} — ${rarity.label}`}
    >
      {sticker.image_url ? (
        <Image
          src={sticker.image_url}
          alt={sticker.name}
          fill
          sizes="200px"
          className="object-cover"
          onError={(e) => {
            e.target.style.display = "none";
          }}
        />
      ) : (
        // Fallback art: full country colour with shirt number + name.
        <div
          className="absolute inset-0 flex flex-col"
          style={{ backgroundColor: palette.primary, color: palette.text }}
        >
          {/* Kit stripe across the top */}
          <div
            className="h-2 w-full"
            style={{ backgroundColor: palette.secondary }}
          />
          {/* Shirt number — big and centred */}
          <div className="flex-1 flex items-center justify-center">
            <span className={`${dims.num} font-black leading-none`}>
              {sticker.shirt_number ?? "?"}
            </span>
          </div>
          {/* Name + country code */}
          <div
            className="px-1.5 py-1 border-t"
            style={{ borderColor: palette.secondary }}
          >
            <p
              className={`${dims.name} font-bold tracking-tight leading-tight truncate text-center`}
            >
              {sticker.name}
            </p>
            <p
              className={`${dims.name} font-mono opacity-70 leading-tight text-center uppercase`}
            >
              {sticker.country_code}
            </p>
          </div>
        </div>
      )}

      {/* Rating stars across the bottom */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-0.5 px-1 pb-0.5 bg-gradient-to-t from-black/70 to-transparent pt-2">
        {stars.map((on, i) => (
          <Star
            key={i}
            className={`w-2.5 h-2.5 ${on ? "fill-yellow-400 text-yellow-400" : "text-white/30"}`}
          />
        ))}
      </div>

      {/* Position badge — top-left */}
      <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/65 text-white text-[10px] font-bold tracking-wide">
        {sticker.position}
      </div>

      {/* Duplicate quantity badge — top-right */}
      {owned && quantity > 1 && (
        <div className="absolute top-1 right-1 min-w-[20px] h-5 px-1 rounded-full bg-amber-500 text-black text-[10px] font-bold flex items-center justify-center shadow">
          ×{quantity}
        </div>
      )}
    </div>
  );
}
