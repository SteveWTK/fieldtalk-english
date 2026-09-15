// src/components/ui/input.js
//
// The Global Player Input. Follows docs/brand/handoff/HANDOFF.md §3:
//
//   bg-primary-900, 1px primary-600 border, radius 8, 13px 15px
//   padding, 15px primary-100 text. Focus border → accent-400.
//   Label 12px primary-400 above the field.
//
// Renders as `<label>` wrapping `<input>` (or a Textarea variant)
// so callers get the whole stack — visible label + field + optional
// hint / error — from one element. Native inputs stay native — no
// custom event plumbing, no hidden state — so form libraries + React
// Hook Form + refs all work unchanged.
//
// Textarea variant lives in the same file: pass `multiline` (or
// `rows>1`) and it swaps `<input>` for `<textarea>`.
"use client";

import { forwardRef } from "react";

const BASE_FIELD_CLASS = [
  // Colour + surface
  "bg-primary-900 text-primary-100 placeholder:text-primary-500",
  // Border — normal state
  "border rounded-control",
  // Type
  "font-sans text-[15px] leading-normal",
  // Padding — 13px vertical, 15px horizontal per DS
  "px-[15px] py-[13px]",
  // No outline; focus ring is drawn via border-color + ring
  "outline-none",
  // Motion
  "transition-colors duration-micro ease-out",
  // Full-width by default in the label wrapper
  "w-full",
].join(" ");

/**
 * @param {{
 *   label?: string | React.ReactNode,
 *   hint?: string | React.ReactNode,   // small helper text below the field
 *   invalid?: boolean,                 // switches border + hint to alert red
 *   multiline?: boolean,               // renders <textarea> instead of <input>
 *   rows?: number,                     // when multiline, initial row count
 *   wrapperClassName?: string,         // applied to the outer <label>
 *   className?: string,                // applied to the input/textarea
 * } & Record<string, any>} props
 */
const Input = forwardRef(function Input(
  {
    label,
    hint,
    invalid = false,
    multiline = false,
    rows,
    wrapperClassName = "",
    className = "",
    disabled,
    ...rest
  },
  ref,
) {
  const useTextarea = multiline || (typeof rows === "number" && rows > 1);
  const borderClass = invalid
    ? "border-signal-alert focus:border-signal-alert"
    : "border-primary-600 focus:border-accent-400 hover:border-primary-500";
  const disabledClass = disabled
    ? "opacity-60 cursor-not-allowed hover:border-primary-600"
    : "";
  const fieldClass = [
    BASE_FIELD_CLASS,
    borderClass,
    disabledClass,
    useTextarea ? "resize-y" : "",
    className,
  ]
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
      {useTextarea ? (
        <textarea
          ref={ref}
          rows={rows || 3}
          disabled={disabled}
          className={fieldClass}
          {...rest}
        />
      ) : (
        <input
          ref={ref}
          disabled={disabled}
          className={fieldClass}
          {...rest}
        />
      )}
      {hint && <span className={`text-xs ${hintClass}`}>{hint}</span>}
    </label>
  );
});

export default Input;
export { Input };
