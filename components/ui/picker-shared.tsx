"use client";

import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { WheelPickerItem } from "@/components/ui/wheel-picker";
import { useControllableState } from "@/hooks/use-controllable-state";
import { useDensity, type Density } from "@/components/density-provider";

/**
 * Shared building blocks for field-like pickers (DatePicker / TimePicker /
 * DateTimePicker): trigger styling, hidden input, controlled-state wiring,
 * and the hour/minute/period item builders for WheelPicker columns.
 *
 * Height values correspond one-to-one with inputVariants sizes in input.tsx.
 */

export type PickerSize = "xs" | "sm" | "md" | "lg";

const fieldTriggerVariants = cva(
  "relative flex items-center w-full bg-surface border text-base text-foreground transition-colors duration-base cursor-pointer",
  {
    variants: {
      size: {
        // Radius lives in the size variant so the compact tier (h-8) stays a
        // rounded rect instead of collapsing into a capsule.
        xs: "h-8 rounded-md text-xs",
        sm: "h-10 rounded-lg",
        md: "h-12 rounded-lg",
        lg: "h-14 rounded-lg",
      },
      state: {
        default: "border-border focus-within:border-border-strong",
        disabled: "border-border bg-hover-bg cursor-not-allowed opacity-60",
      },
    },
    defaultVariants: {
      size: "md",
      state: "default",
    },
  }
);

/**
 * Content geometry per trigger size.
 *
 * Left and right padding are kept as separate single-purpose classes rather
 * than one combined `"pl-10 pr-3"` string: the label padding depends on whether
 * a leading and/or trailing icon is present, and two competing `pr-*` classes
 * would resolve by stylesheet order instead of by intent. Only `xs` deviates
 * from the original left-3 / pl-10 geometry, so the other tiers render
 * unchanged.
 */
const PICKER_SLOT: Record<
  PickerSize,
  {
    /** Absolute placement + glyph size for the leading icon. */
    icon: string;
    /** Absolute placement + glyph size for the trailing icon. */
    trailing: string;
    /** Label left padding when a leading icon is present. */
    padLeft: string;
    /** Label left padding when there is no leading icon. */
    padLeftBare: string;
    /** Label right padding when there is no trailing icon. */
    padRight: string;
    /** Label right padding when a trailing icon is present. */
    padRightTrailing: string;
  }
> = {
  xs: {
    icon: "left-2 [&>svg]:h-3.5 [&>svg]:w-3.5",
    trailing: "right-2 [&>svg]:h-3.5 [&>svg]:w-3.5",
    padLeft: "pl-7",
    padLeftBare: "pl-2.5",
    padRight: "pr-2",
    padRightTrailing: "pr-7",
  },
  sm: {
    icon: "left-3 [&>svg]:h-4 [&>svg]:w-4",
    trailing: "right-3 [&>svg]:h-4 [&>svg]:w-4",
    padLeft: "pl-10",
    padLeftBare: "pl-3",
    padRight: "pr-3",
    padRightTrailing: "pr-9",
  },
  md: {
    icon: "left-3 [&>svg]:h-4 [&>svg]:w-4",
    trailing: "right-3 [&>svg]:h-4 [&>svg]:w-4",
    padLeft: "pl-10",
    padLeftBare: "pl-3",
    padRight: "pr-3",
    padRightTrailing: "pr-9",
  },
  lg: {
    icon: "left-3 [&>svg]:h-4 [&>svg]:w-4",
    trailing: "right-3 [&>svg]:h-4 [&>svg]:w-4",
    padLeft: "pl-10",
    padLeftBare: "pl-3",
    padRight: "pr-3",
    padRightTrailing: "pr-9",
  },
};

/** Size used when no explicit `size` is given, derived from the global density. */
const PICKER_SIZE_FOR_DENSITY: Record<Density, PickerSize> = {
  compact: "xs",
  default: "md",
  comfortable: "lg",
};

/**
 * Resolve the effective trigger size: an explicit `size` wins, otherwise the
 * global density tier decides. Exported so a consumer that renders its own
 * popover panel (e.g. Combobox) can match the trigger's corner radius.
 */
export function resolvePickerSize(
  size: PickerSize | undefined,
  density: Density
): PickerSize {
  return size ?? PICKER_SIZE_FOR_DENSITY[density];
}

export interface PickerTriggerProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Ref for the hidden input that carries the form value. */
  inputRef?: React.Ref<HTMLInputElement>;
  /** Extra attributes forwarded to the hidden input (name, required, etc.). */
  inputProps?: Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "value" | "type" | "disabled" | "ref"
  >;
  /** Serialized value carried by the hidden input for native form submission. */
  value?: string;
  /** Leading icon, rendered at a fixed glyph size per tier. Optional: a
   * Combobox trigger has no leading icon. */
  icon?: React.ReactNode;
  /** Trailing icon (e.g. a chevron). Optional — the pickers have none. */
  trailingIcon?: React.ReactNode;
  displayValue: string;
  placeholder?: string;
  size?: PickerSize;
  disabled?: boolean;
  open?: boolean;
  /**
   * Popup role announced to assistive tech. `"dialog"` suits the calendar /
   * wheel popovers; a Combobox passes `"listbox"`.
   */
  "aria-haspopup"?: React.AriaAttributes["aria-haspopup"];
}

/**
 * Shared combobox-style trigger: visible div (role="combobox", receives the
 * accessible label) + hidden input (carries the form value).
 */
export const PickerTrigger = React.forwardRef<HTMLDivElement, PickerTriggerProps>(
  (
    {
      inputRef,
      inputProps,
      value,
      icon,
      trailingIcon,
      displayValue,
      placeholder,
      size,
      disabled,
      open,
      "aria-haspopup": ariaHasPopup = "dialog",
      className,
      ...props
    },
    ref
  ) => {
    const globalDensity = useDensity();
    const resolvedSize = resolvePickerSize(size, globalDensity);
    const slot = PICKER_SLOT[resolvedSize];
    return (
      <div
        ref={ref}
        className={cn(
          fieldTriggerVariants({
            size: resolvedSize,
            state: disabled ? "disabled" : "default",
          }),
          className
        )}
        // Make the div behave like an input: focusable and activatable by a label
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={open}
        aria-haspopup={ariaHasPopup}
        aria-disabled={disabled || undefined}
        {...props}
      >
        <input
          ref={inputRef}
          type="hidden"
          value={value ?? ""}
          disabled={disabled}
          {...inputProps}
        />
        {icon && (
          <span
            className={cn(
              "pointer-events-none absolute flex items-center justify-center text-foreground-subtle",
              slot.icon
            )}
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
        <span
          className={cn(
            "flex-1 truncate",
            icon ? slot.padLeft : slot.padLeftBare,
            trailingIcon ? slot.padRightTrailing : slot.padRight,
            !displayValue && "text-foreground-subtle"
          )}
        >
          {displayValue || placeholder}
        </span>
        {trailingIcon && (
          <span
            className={cn(
              "pointer-events-none absolute flex items-center justify-center text-foreground-subtle",
              slot.trailing
            )}
            aria-hidden="true"
          >
            {trailingIcon}
          </span>
        )}
      </div>
    );
  }
);
PickerTrigger.displayName = "PickerTrigger";

/**
 * Detect whether 12-hour mode should be used by default.
 *
 * Judges only by the browser's preferred language (`navigator.language`)
 * BCP-47 tag: `en-*` / `es-*` / `ar-*` etc. use 12-hour; `zh-*` / `ja-*` /
 * `de-*` etc. use 24-hour. Returns false during SSR (default 24h).
 */
export function detectDefault12Hour(): boolean {
  if (typeof navigator === "undefined") return false;
  const lang = (navigator.language || "").toLowerCase();
  return (
    lang.startsWith("en") ||
    lang.startsWith("es") ||
    lang.startsWith("ar") ||
    lang.startsWith("hi") ||
    lang.startsWith("pt") ||
    lang.startsWith("ms") ||
    lang.startsWith("fil") ||
    lang.startsWith("sw")
  );
}

/** Lazily-detected 12-hour default, stable across re-renders. */
export function useDefault12Hour(): boolean {
  const [auto] = React.useState(detectDefault12Hour);
  return auto;
}

/** Validate minuteStep; warn and fall back to 1 in development. */
export function normalizeMinuteStep(component: string, minuteStep: number): number {
  if (minuteStep > 0 && 60 % minuteStep === 0) return minuteStep;
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      `[${component}] minuteStep must evenly divide 60, got ${minuteStep}, falling back to 1.`
    );
  }
  return 1;
}

/** Resolve a 12-hour clock value (1-12) + period into a 24-hour hour. */
export function resolveHour(hour12: number, isPM: boolean): number {
  if (hour12 === 12) return isPM ? 12 : 0;
  return isPM ? hour12 + 12 : hour12;
}

export function buildHourItems(use12Hour: boolean): WheelPickerItem[] {
  const arr: WheelPickerItem[] = [];
  const maxHour = use12Hour ? 12 : 23;
  const startHour = use12Hour ? 1 : 0;
  for (let h = startHour; h <= maxHour; h++) {
    arr.push({
      value: h,
      label: use12Hour ? String(h) : String(h).padStart(2, "0"),
    });
  }
  return arr;
}

export function buildMinuteItems(minuteStep: number): WheelPickerItem[] {
  const arr: WheelPickerItem[] = [];
  for (let m = 0; m < 60; m += minuteStep) {
    arr.push({ value: m, label: String(m).padStart(2, "0") });
  }
  return arr;
}

export const PERIOD_ITEMS: WheelPickerItem[] = [
  { value: "AM", label: "AM" },
  { value: "PM", label: "PM" },
];

/**
 * Locate the nearest `[role="dialog"]` ancestor so popovers opened from a
 * picker inside a dialog portal into that dialog instead of the body.
 */
export function usePopoverContainer() {
  const triggerRef = React.useRef<HTMLDivElement>(null);
  const [container, setContainer] = React.useState<HTMLElement | null>(null);

  React.useEffect(() => {
    setContainer(
      triggerRef.current?.closest('[role="dialog"]') as HTMLElement | null
    );
  }, []);

  return { triggerRef, container };
}

/** Re-export so pickers share one controlled-state implementation. */
export { useControllableState };
export type { WheelPickerItem };
