// components/exercises/TimelineDrag.js
"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { CheckCircle, RotateCcw, Trophy, AlertCircle } from "lucide-react";

/**
 * TimelineDrag Step
 *
 * Renders a timeline with year markers and a tray of event cards.
 * User drags each card onto the timeline at the year it belongs.
 * Validation uses tolerance_years.
 *
 * Layouts (responsive):
 *   - desktop (≥1024px): horizontal timeline, tray below
 *   - tablet (768–1023px): vertical timeline, tray beside
 *   - mobile (<768px):    vertical timeline, tray above
 *
 * timeline_config:
 *   - year_min: number
 *   - year_max: number
 *   - year_marker_interval: number (default 10)
 *   - tolerance_years: number (default 2)
 *   - events: array of { id, year, title, description? }
 */
export default function TimelineDrag({
  step,
  onComplete,
  userLanguage = "en",
}) {
  const config = step?.timeline_config || {};
  const yearMin = config.year_min ?? 1900;
  const yearMax = config.year_max ?? 2025;
  const markerInterval = config.year_marker_interval || 10;
  const tolerance = config.tolerance_years ?? 2;
  const events = config.events || [];
  const baseXp = step?.xp_reward || 30;
  const isPortuguese = userLanguage === "pt-BR" || userLanguage === "pt";

  const labels = isPortuguese
    ? {
        instruction: "Arraste cada cartão para o ano correto na linha do tempo",
        progress: "colocados corretamente",
        wrongPlace: () => `Não foi nesse ano. Tente novamente.`,
        complete: "Linha do tempo completa!",
        reset: "Recomeçar",
        xpEarned: "XP ganho",
        toleranceHint: (n) =>
          `Você tem uma tolerância de ${n} ano${n === 1 ? "" : "s"}.`,
      }
    : {
        instruction: "Drag each card to the correct year on the timeline",
        progress: "placed correctly",
        wrongPlace: () => "Not the right year. Try again.",
        complete: "Timeline complete!",
        reset: "Reset",
        xpEarned: "XP earned",
        toleranceHint: (n) =>
          `You have a tolerance of ±${n} year${n === 1 ? "" : "s"}.`,
      };

  // Layout: 'mobile' | 'tablet' | 'desktop'
  // Default to 'desktop' on first render to avoid SSR/hydration mismatch — we
  // pick the real layout in useEffect after mount.
  const [layoutMode, setLayoutMode] = useState("desktop");

  useEffect(() => {
    const updateLayout = () => {
      const w = typeof window !== "undefined" ? window.innerWidth : 1280;
      if (w < 768) setLayoutMode("mobile");
      else if (w < 1024) setLayoutMode("tablet");
      else setLayoutMode("desktop");
    };
    updateLayout();
    window.addEventListener("resize", updateLayout);
    return () => window.removeEventListener("resize", updateLayout);
  }, []);

  const isVertical = layoutMode !== "desktop";

  // Shuffle once on mount
  const shuffledEvents = useMemo(() => {
    const arr = [...events];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [placements, setPlacements] = useState({});
  const [draggingEventId, setDraggingEventId] = useState(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [shakeEventId, setShakeEventId] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [completed, setCompleted] = useState(false);

  const timelineRef = useRef(null);
  const markerRefsRef = useRef({});
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const placedCount = Object.keys(placements).length;
  const totalEvents = events.length;
  const isComplete = placedCount === totalEvents && totalEvents > 0;

  useEffect(() => {
    if (isComplete && !completed) {
      setCompleted(true);
      onCompleteRef.current?.(baseXp);
    }
  }, [isComplete, completed, baseXp]);

  const percentForYear = (year) =>
    ((year - yearMin) / (yearMax - yearMin)) * 100;
  const yearAtPercent = (percent) =>
    yearMin + (percent / 100) * (yearMax - yearMin);

  const markerYears = useMemo(() => {
    const arr = [];
    for (let y = yearMin; y <= yearMax; y += markerInterval) arr.push(y);
    if (arr[arr.length - 1] !== yearMax) arr.push(yearMax);
    return arr;
  }, [yearMin, yearMax, markerInterval]);

  // ---- Drag handlers ----
  const handlePointerDown = (e, eventId) => {
    if (placements[eventId]) return;
    e.preventDefault();
    setDraggingEventId(eventId);
    setDragPos({ x: e.clientX, y: e.clientY });
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handlePointerMove = useCallback(
    (e) => {
      if (!draggingEventId) return;
      setDragPos({ x: e.clientX, y: e.clientY });
    },
    [draggingEventId]
  );

  const handlePointerUp = useCallback(
    (e) => {
      if (!draggingEventId) return;
      const event = events.find((ev) => ev.id === draggingEventId);

      const timeline = timelineRef.current;
      let placed = false;
      if (timeline && event) {
        const rect = timeline.getBoundingClientRect();
        const buffer = 40;
        const inside =
          e.clientX >= rect.left - buffer &&
          e.clientX <= rect.right + buffer &&
          e.clientY >= rect.top - buffer &&
          e.clientY <= rect.bottom + buffer;

        if (inside) {
          let droppedYear;
          if (isVertical) {
            // Empirical: use actual rendered positions of the first and last
            // year markers to map pointer Y → year. This bypasses any CSS
            // positioning quirks that could make percent-based math drift
            // from where markers are actually rendered.
            const firstEl = markerRefsRef.current[yearMin];
            const lastEl = markerRefsRef.current[yearMax];
            if (firstEl && lastEl) {
              const firstR = firstEl.getBoundingClientRect();
              const lastR = lastEl.getBoundingClientRect();
              const firstY = firstR.top + firstR.height / 2;
              const lastY = lastR.top + lastR.height / 2;
              if (lastY === firstY) {
                droppedYear = yearMin;
              } else {
                const t = (e.clientY - firstY) / (lastY - firstY);
                droppedYear = yearMin + t * (yearMax - yearMin);
              }
            } else {
              droppedYear = yearAtPercent(
                ((e.clientY - rect.top) / rect.height) * 100
              );
            }
          } else {
            droppedYear = yearAtPercent(
              ((e.clientX - rect.left) / rect.width) * 100
            );
          }

          if (Math.abs(droppedYear - event.year) <= tolerance) {
            placed = true;
            setPlacements((prev) => ({ ...prev, [event.id]: true }));
            setErrorMessage(null);
          }
        }
      }

      if (!placed) {
        setShakeEventId(draggingEventId);
        setErrorMessage(labels.wrongPlace(event?.year));
        setTimeout(() => setShakeEventId(null), 600);
        setTimeout(() => setErrorMessage(null), 2000);
      }

      setDraggingEventId(null);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [draggingEventId, events, tolerance, isVertical, yearMin, yearMax]
  );

  useEffect(() => {
    if (!draggingEventId) return;
    const moveHandler = (e) => handlePointerMove(e);
    const upHandler = (e) => handlePointerUp(e);
    window.addEventListener("pointermove", moveHandler);
    window.addEventListener("pointerup", upHandler);
    window.addEventListener("pointercancel", upHandler);
    return () => {
      window.removeEventListener("pointermove", moveHandler);
      window.removeEventListener("pointerup", upHandler);
      window.removeEventListener("pointercancel", upHandler);
    };
  }, [draggingEventId, handlePointerMove, handlePointerUp]);

  const resetAll = () => {
    setPlacements({});
    setCompleted(false);
    setErrorMessage(null);
  };

  const trayEvents = shuffledEvents.filter((ev) => !placements[ev.id]);
  const placedEvents = events.filter((ev) => placements[ev.id]);

  // Render an event card
  const renderEventCard = (event, opts = {}) => {
    const { isPlaced = false, isShaking = false, isCompact = false } = opts;
    return (
      <div
        className={`select-none touch-none ${
          isPlaced
            ? "px-2 py-1 min-w-[80px]"
            : "px-3 py-2 cursor-grab active:cursor-grabbing"
        } ${isShaking ? "animate-shake" : ""} bg-white dark:bg-gray-700 rounded-lg shadow-md border-2 ${
          isPlaced
            ? "border-green-500"
            : "border-gray-300 dark:border-gray-600 hover:border-accent-500"
        } transition-colors`}
      >
        <p
          className={`font-semibold text-gray-900 dark:text-white text-center ${
            isCompact ? "text-xs" : "text-sm"
          }`}
        >
          {event.title}
        </p>
        {isPlaced && (
          <p className="text-xs text-green-600 dark:text-green-400 text-center font-bold">
            {event.year}
          </p>
        )}
        {!isPlaced && event.description && !isCompact && (
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1 max-w-[200px]">
            {event.description}
          </p>
        )}
      </div>
    );
  };

  // ---- Timeline render: horizontal ----
  // Outer container provides visual styling; inner ref-bound div is what
  // drop detection and percent positioning measure against, so the math
  // stays consistent with what the user sees.
  const renderHorizontalTimeline = () => (
    <div
      className="relative w-full bg-gradient-to-b from-blue-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700"
      style={{ height: "180px" }}
    >
      {/* Inner: timelineRef + percent-positioned content */}
      <div
        ref={timelineRef}
        className="absolute inset-x-3 top-3 bottom-3"
      >
        {/* Year markers */}
        {markerYears.map((year) => {
          const left = percentForYear(year);
          return (
            <div
              key={year}
              className="absolute top-0 -translate-x-1/2 flex flex-col items-center"
              style={{ left: `${left}%` }}
            >
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                {year}
              </span>
              <div className="h-3 w-0.5 bg-gray-400 dark:bg-gray-500" />
            </div>
          );
        })}

        {/* Axis line */}
        <div className="absolute left-0 right-0 h-px bg-gray-400 dark:bg-gray-500" style={{ top: "32px" }} />

        {/* Placed events */}
        {placedEvents.map((event) => (
          <div
            key={event.id}
            className="absolute -translate-x-1/2"
            style={{ left: `${percentForYear(event.year)}%`, top: "40px" }}
          >
            <div className="animate-pop-in flex flex-col items-center">
              <div className="w-0.5 h-3 bg-green-500 mb-1" />
              {renderEventCard(event, { isPlaced: true, isCompact: true })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ---- Timeline render: vertical ----
  const renderVerticalTimeline = () => (
    <div
      className="relative bg-gradient-to-r from-blue-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 flex-1"
      style={{
        minHeight: "500px",
        minWidth: layoutMode === "tablet" ? "180px" : undefined,
      }}
    >
      {/* Inner: timelineRef + percent-positioned content (inset to avoid clipping at edges) */}
      <div
        ref={timelineRef}
        className="absolute inset-x-0 inset-y-4"
      >
        {/* Year markers (left of axis, right-aligned so ticks line up).
            Refs are stored so drop detection can use the markers' actual
            rendered positions instead of CSS-percent math. */}
        {markerYears.map((year) => {
          const top = percentForYear(year);
          return (
            <div
              key={year}
              ref={(el) => {
                markerRefsRef.current[year] = el;
              }}
              className="absolute -translate-y-1/2 flex items-center justify-end gap-1"
              style={{ top: `${top}%`, left: 0, width: "56px" }}
            >
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
                {year}
              </span>
              <div className="w-3 h-0.5 bg-gray-400 dark:bg-gray-500" />
            </div>
          );
        })}

        {/* Axis line */}
        <div className="absolute top-0 bottom-0 w-px bg-gray-400 dark:bg-gray-500" style={{ left: "56px" }} />

        {/* Placed events (right of line) */}
        {placedEvents.map((event) => {
          const top = percentForYear(event.year);
          return (
            <div
              key={event.id}
              className="absolute -translate-y-1/2"
              style={{ top: `${top}%`, left: "56px" }}
            >
              <div className="animate-pop-in-v flex items-center gap-1">
                <div className="h-0.5 w-3 bg-green-500" />
                {renderEventCard(event, { isPlaced: true, isCompact: true })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ---- Tray render ----
  const renderTray = () => {
    if (trayEvents.length === 0 || completed) return null;
    const isColumn = layoutMode === "tablet";
    return (
      <div
        className={`bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 ${
          isColumn ? "flex-shrink-0" : ""
        }`}
        style={isColumn ? { width: "180px" } : undefined}
      >
        <div
          className={`flex gap-3 ${
            isColumn ? "flex-col items-stretch" : "flex-wrap justify-center"
          }`}
        >
          {trayEvents.map((event) => {
            const isShaking = shakeEventId === event.id;
            return (
              <div
                key={event.id}
                onPointerDown={(e) => handlePointerDown(e, event.id)}
                style={{ touchAction: "none" }}
              >
                {renderEventCard(event, { isShaking })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Instruction & progress */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {step?.content || labels.instruction}
          </p>
          {tolerance > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {labels.toleranceHint(tolerance)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="font-semibold text-gray-900 dark:text-white">
            {placedCount}/{totalEvents} {labels.progress}
          </span>
          {placedCount > 0 && !completed && (
            <button
              onClick={resetAll}
              className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <RotateCcw className="w-3 h-3" />
              {labels.reset}
            </button>
          )}
        </div>
      </div>

      {/* Error toast */}
      {errorMessage && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4" />
          {errorMessage}
        </div>
      )}

      {/* Layout: tray + timeline arranged per layoutMode */}
      {layoutMode === "tablet" ? (
        // Vertical timeline + tray beside (left)
        <div className="flex flex-row gap-4 items-stretch">
          {renderTray()}
          {renderVerticalTimeline()}
        </div>
      ) : layoutMode === "mobile" ? (
        // Vertical timeline with tray above
        <div className="flex flex-col gap-4">
          {renderTray()}
          {renderVerticalTimeline()}
        </div>
      ) : (
        // Horizontal timeline + tray below
        <div className="flex flex-col gap-4">
          {renderHorizontalTimeline()}
          {renderTray()}
        </div>
      )}

      {/* Floating card + sleek aim tick on the side facing the timeline.
          Drop accuracy is guaranteed by the marker-position-based math in
          handlePointerUp, so the aim line just needs to be a visual hint —
          it doesn't carry the precision burden. */}
      {draggingEventId && (
        <div
          className="fixed pointer-events-none z-50"
          style={{
            left: dragPos.x,
            top: dragPos.y,
            transform: "translate(-50%, -50%)",
          }}
        >
          <div className="relative">
            {renderEventCard(
              events.find((ev) => ev.id === draggingEventId) || {}
            )}
            {isVertical ? (
              // Vertical timeline: short tick on the LEFT of the card
              <div
                className="absolute right-full top-1/2 -translate-y-1/2 h-0.5 bg-green-500 shadow-md"
                style={{ width: "40px" }}
              />
            ) : (
              // Horizontal timeline: short tick on TOP of the card
              <div
                className="absolute bottom-full left-1/2 -translate-x-1/2 w-0.5 bg-green-500 shadow-md"
                style={{ height: "40px" }}
              />
            )}
          </div>
        </div>
      )}

      {/* Completion */}
      {completed && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl p-6 text-center">
          <Trophy className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {labels.complete}
          </h3>
          <div className="inline-flex items-center gap-2 text-green-700 dark:text-green-400 font-semibold">
            <CheckCircle className="w-5 h-5" />+{baseXp} {labels.xpEarned}
          </div>
        </div>
      )}

      {/* Animations */}
      <style jsx>{`
        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          20%,
          60% {
            transform: translateX(-8px);
          }
          40%,
          80% {
            transform: translateX(8px);
          }
        }
        @keyframes pop-in-h {
          0% {
            transform: scale(0.5);
            opacity: 0;
          }
          60% {
            transform: scale(1.1);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes pop-in-v {
          0% {
            transform: scale(0.5);
            opacity: 0;
          }
          60% {
            transform: scale(1.1);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        :global(.animate-shake) {
          animation: shake 0.5s ease-in-out;
        }
        :global(.animate-pop-in) {
          animation: pop-in-h 0.35s ease-out;
        }
        :global(.animate-pop-in-v) {
          animation: pop-in-v 0.35s ease-out;
        }
      `}</style>
    </div>
  );
}
