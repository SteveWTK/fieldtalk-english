// src/components/ui/switch.js
//
// The Global Player Switch — a 44×24 toggle for boolean settings.
// Per DS: lime fill when on, slate-600 when off, slate-800 thumb
// when on (contrast against the lime) or slate-300 when off. No
// scale bounce on toggle — colour + position only.
//
// Accessibility: role="switch" + aria-checked wire up screen-reader
// support. Clicking the label AND the thumb both toggle. Keyboard:
// Space toggles when focused.
"use client";

/**
 * @param {{
 *   checked: boolean,
 *   onChange: (nextChecked: boolean) => void,
 *   label?: string | React.ReactNode,
 *   sublabel?: string | React.ReactNode,  // optional smaller text below the label
 *   disabled?: boolean,
 *   className?: string,        // applied to the outer <label>
 * } & Record<string, any>} props
 */
function Switch({
  checked = false,
  onChange,
  label,
  sublabel,
  disabled = false,
  className = "",
  ...rest
}) {
  return (
    <label
      className={`inline-flex items-start gap-3 ${
        disabled ? "cursor-not-allowed" : "cursor-pointer"
      } ${className}`.trim()}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange && onChange(!checked)}
        className={[
          // Track — 44×24 pill, 3px inner padding so the 18×18 thumb
          // aligns cleanly at both ends.
          "relative shrink-0 inline-flex items-center",
          "w-11 h-6 p-0.5",
          "rounded-full border-none",
          "transition-colors duration-micro ease-out",
          // Focus ring
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-900",
          checked
            ? disabled
              ? "bg-accent-400/40"
              : "bg-accent-400"
            : disabled
              ? "bg-primary-700"
              : "bg-primary-600",
        ].join(" ")}
        {...rest}
      >
        {/* Thumb — 18×18 pill that translates from left→right on
            toggle. Colour flips too: dark ink when on (contrast
            against lime), light slate when off (contrast against
            the slate track). */}
        <span
          className={[
            "block w-[18px] h-[18px] rounded-full",
            "transition-all duration-micro ease-out",
            "transform",
            checked
              ? "translate-x-5 bg-primary-800"
              : "translate-x-0 bg-primary-300",
          ].join(" ")}
        />
      </button>
      {(label || sublabel) && (
        <span className="flex flex-col gap-0.5 min-w-0">
          {label && (
            <span
              className={`text-sm font-medium leading-tight ${
                disabled ? "text-primary-500" : "text-primary-200"
              }`}
            >
              {label}
            </span>
          )}
          {sublabel && (
            <span className="text-xs text-primary-500 leading-snug">
              {sublabel}
            </span>
          )}
        </span>
      )}
    </label>
  );
}

export default Switch;
export { Switch };
