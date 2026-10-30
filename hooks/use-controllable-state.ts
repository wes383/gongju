"use client";

import * as React from "react";

export interface UseControllableStateProps<T> {
  /** The controlled value. When provided (not undefined), the state is controlled. */
  value?: T;
  /** Initial value for uncontrolled usage. */
  defaultValue?: T | (() => T);
  /** Called whenever the value changes (controlled or uncontrolled). */
  onChange?: (value: T, ...args: any[]) => void;
}

/**
 * useControllableState — supports both controlled and uncontrolled usage.
 * Mirrors Radix UI's `useControllableState` pattern.
 *
 * - If `value` is provided (not `undefined`), the state is **controlled** and
 *   `setValue` will only call `onChange`.
 * - Otherwise, the state is **uncontrolled** and `setValue` updates internally
 *   before calling `onChange`.
 *
 * @example
 * const [open, setOpen] = useControllableState({
 *   value: controlledOpen,
 *   defaultValue: false,
 *   onChange: (next) => console.log(next),
 * });
 */
export function useControllableState<T>(
  props: UseControllableStateProps<T>
): [T, (next: T | ((prev: T) => T)) => void] {
  const { value: valueProp, defaultValue, onChange } = props;

  const isControlled = valueProp !== undefined;

  const [uncontrolledValue, setUncontrolledValue] = React.useState<T | undefined>(
    defaultValue
  );

  // Keep latest onChange in a ref to avoid stale closures / re-renders.
  const onChangeRef = React.useRef(onChange);
  React.useEffect(() => {
    onChangeRef.current = onChange;
  });

  const value = isControlled ? valueProp : uncontrolledValue;

  const setValue = React.useCallback(
    (next: T | ((prev: T) => T)) => {
      if (typeof next === "function") {
        const updater = next as (prev: T) => T;
        const resolved = updater(value as T);
        if (!isControlled) setUncontrolledValue(resolved);
        onChangeRef.current?.(resolved);
      } else {
        if (!isControlled) setUncontrolledValue(next);
        onChangeRef.current?.(next);
      }
    },
    [isControlled, value]
  );

  return [value as T, setValue];
}
