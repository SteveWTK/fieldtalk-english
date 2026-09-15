// src/components/ui/select.js
//
// The Global Player Select — visually identical to Input but with a
// custom Unicode caret (▾, U+25BE per DS §Iconography) sitting on the
// right. Wraps native `<select>` so the browser's picker + keyboard
// handling + form submission all work unchanged; only the visual
// chrome is replaced.
//
// Accepts either:
//   - a plain array of strings: options={["A", "B"]}
//   - an array of { value, label } objects
//   - or manual `<option>` children (pass options={undefined})
"use client";

import { forwardRef } from "react";

const BASE_FIELD_CLASS = [
  "bg-primary-900 text-primary-100",
  "border rounded-control",
  "font-sans text-[15px] leading-normal",
  // Left padding matches Input; right padding leaves space for the
  // caret glyph absolutely positioned on top.
  "pl-[15px] pr-9 py-[13px]",
  // Kill the default OS chevron — the styled ▾ below is the sole
  // affordance. `appearance-none` handles WebKit + Firefox; older
  // Edge covered by the `-ms-` reset if we ever need it (rare now).
  "appearance-none",
  "outline-none cursor-pointer",
  "transition-colors duration-micro ease-out",
  "w-full",
].join(" ");

/**
 * @param {{
 *   label?: string | React.ReactNode,
 *   hint?: string | React.ReactNode,
 *   invalid?: boolean,
 *   options?: Array<string | { value: string, label: string, disabled?: boolean }>,
 *   placeholder?: string,      // renders as a disabled first <option>
 *   wrapperClassName?: string,
 *   className?: string,
 *   children?: React.ReactNode, // manual <option>s if `options` isn't supplied
 * } & Record<string, any>} props
 */
const Select = forwardRef(function Select(
  {
    label,
    hint,
    invalid = false,
    options,
    placeholder,
    wrapperClassName = "",
    className = "",
    disabled,
    children,
    ...rest
  },
  ref,
) {
  const borderClass = invalid
    ? "border-signal-alert focus:border-signal-alert"
    : "border-primary-600 focus:border-accent-400 hover:border-primary-500";
  const disabledClass = disabled
    ? "opacity-60 cursor-not-allowed hover:border-primary-600"
    : "";
  const fieldClass = [BASE_FIELD_CLASS, borderClass, disabledClass, className]
    .filter(Boolean)
    .join(" ");
  const hintClass = invalid ? "text-signal-alert" : "text-primary-500";

  return (
    <label
      className={`flex flex-col gap-1.5 ${wrapperClassName}`.trim()}
    >
      {label && (
        <span className="text-xs text-primary-400 font-medium">
          {label}
        </span>
      )}
      <div className="relative flex">
        <select
          ref={ref}
          disabled={disabled}
          className={fieldClass}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled className="bg-primary-800">
              {placeholder}
            </option>
          )}
          {options
            ? options.map((o) =>
                typeof o === "string" ? (
                  <option key={o} value={o} className="bg-primary-800">
                    {o}
                  </option>
                ) : (
                  <option
                    key={o.value}
                    value={o.value}
                    disabled={o.disabled}
                    className="bg-primary-800"
                  >
                    {o.label}
                  </option>
                ),
              )
            : children}
        </select>
        {/* Custom caret. Positioned absolutely so it doesn't affect
            the select's own layout. `pointer-events-none` so clicks
            fall through to the underlying select and open the OS
            picker as expected. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-accent-400 text-sm font-semibold"
        >
          ▾
        </span>
      </div>
      {hint && <span className={`text-xs ${hintClass}`}>{hint}</span>}
    </label>
  );
});

export default Select;
export { Select };
