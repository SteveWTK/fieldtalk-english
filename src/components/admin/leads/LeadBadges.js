// src/components/admin/leads/LeadBadges.js
//
// Tiny badge components shared between list + kanban + detail so the
// visual language stays consistent. Kept in one file (not one per
// badge) because they're all small + composed similarly.
//
// Stage / type / tag are all *status* markers — never brand — so
// they hang off the signal palette + slate ramp defined in the DS.

import { STAGE_TONES, t } from "@/lib/leads/constants";

export function StageBadge({ stage, lang }) {
  const tone = STAGE_TONES[stage] || "bg-primary-700 text-primary-200";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}
    >
      {t(`stages.${stage}`, lang)}
    </span>
  );
}

// TypeBadge + TagPill share the DS "muted chip" recipe — the same
// slate panel fill + hairline border used everywhere else for
// neutral metadata (owner names, sources, etc.). Deliberately not
// using <Chip> as a wrapper because Chip is an interactive primitive
// (button/link semantics); these are display-only spans.
export function TypeBadge({ type, lang }) {
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-primary-800 text-primary-300 border border-primary-700">
      {t(`types.${type}`, lang)}
    </span>
  );
}

export function TagPill({ tag }) {
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-primary-panel text-primary-400 border border-primary-700">
      #{tag}
    </span>
  );
}

/**
 * Compact "3d ago" style timestamp — used in list rows + kanban cards
 * where the exact time doesn't matter but the recency does. Falls
 * back to a short date once we're past a week.
 */
export function RelativeTime({ iso, lang }) {
  if (!iso) return <span className="text-primary-500">—</span>;
  const now = Date.now();
  const t0 = new Date(iso).getTime();
  const diffSec = Math.floor((now - t0) / 1000);
  const isPt = lang === "pt";
  if (diffSec < 60) return <span>{isPt ? "agora" : "just now"}</span>;
  if (diffSec < 3600) {
    const m = Math.floor(diffSec / 60);
    return (
      <span>
        {m}
        {isPt ? "m atrás" : "m ago"}
      </span>
    );
  }
  if (diffSec < 86400) {
    const h = Math.floor(diffSec / 3600);
    return (
      <span>
        {h}
        {isPt ? "h atrás" : "h ago"}
      </span>
    );
  }
  if (diffSec < 86400 * 7) {
    const d = Math.floor(diffSec / 86400);
    return (
      <span>
        {d}
        {isPt ? "d atrás" : "d ago"}
      </span>
    );
  }
  return (
    <span className="tabular-nums">
      {new Date(iso).toLocaleDateString(isPt ? "pt-BR" : "en-GB", {
        day: "2-digit",
        month: "short",
      })}
    </span>
  );
}
