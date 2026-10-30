"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
  CommandLoading,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  PickerTrigger,
  resolvePickerSize,
  useControllableState,
  usePopoverContainer,
  type PickerSize,
} from "@/components/ui/picker-shared";
import { useDensity } from "@/components/density-provider";

/**
 * Combobox — a single-select field with type-to-filter search.
 *
 * Pick this over `Select` whenever the option list is long enough that hunting
 * through a scroll area is annoying (projects, assignees, time zones). `Select`
 * stays the better choice for short, fixed lists — it is fully keyboard-driven
 * with no typing step.
 *
 * Built from `Popover` + `Command` (cmdk), with the same trigger as the date /
 * time pickers so the whole family renders at one set of heights:
 *
 * - Trigger is a `PickerTrigger` (visible div + hidden input carrying the form
 *   value), so it submits inside a plain `<form>` and follows the global
 *   density tier (`compact` → `xs`, `comfortable` → `lg`).
 * - Opening the panel highlights the current selection rather than the first
 *   row; typing filters by label and `keywords`; picking closes the panel.
 * - `usePopoverContainer` re-targets the portal to the nearest dialog, so it
 *   works inside a `<Dialog>` without being clipped by the scroll lock.
 *
 * **Remote (async) search.** The component never fetches anything itself — that
 * belongs to the caller's data layer. The four props below are what it takes to
 * plug one in:
 *
 * - `searchValue` / `onSearchValueChange` — take the query over so it can be
 *   debounced and sent to an endpoint. The query is cleared on close.
 * - `shouldFilter={false}` — stop cmdk from re-filtering a page the server has
 *   already filtered, which would usually empty the list.
 * - `loading` — swap "no results" for a spinner while a request is in flight.
 * - `selectedOption` — keep the trigger labelled when the saved value is not
 *   part of the page currently loaded.
 *
 * Request ordering (aborting a superseded request, ignoring a stale response)
 * stays on the caller's side.
 *
 * **Multi-select and creating.** `multiple` turns selection into a toggle and
 * keeps the panel open; `value` / `onValueChange` become arrays. `creatable`
 * adds a trailing row that mints an option from the typed text, which is what
 * turns a picker into a tag input. Both compose with remote search.
 *
 * @example
 * const [project, setProject] = React.useState("orkest");
 * <Combobox
 *   value={project}
 *   onValueChange={setProject}
 *   placeholder="Select a project"
 *   searchPlaceholder="Search projects..."
 *   emptyText="No project found."
 *   options={[
 *     { value: "orkest", label: "Orkest", description: "Main project" },
 *     { value: "reading", label: "Reading list", keywords: ["books"] },
 *   ]}
 * />
 *
 * @example
 * // Remote search
 * const [query, setQuery] = React.useState("");
 * const { data = [], isFetching } = useQuery(searchProjects(query));
 * <Combobox
 *   options={data}
 *   loading={isFetching}
 *   shouldFilter={false}
 *   searchValue={query}
 *   onSearchValueChange={setQuery}
 *   selectedOption={savedProject}
 * />
 *
 * @example
 * // Multi-select with creation
 * const [tags, setTags] = React.useState<string[]>(["design"]);
 * <Combobox
 *   multiple
 *   creatable
 *   value={tags}
 *   onValueChange={setTags}
 *   createText="Create"
 *   options={[
 *     { value: "design", label: "Design" },
 *     { value: "eng", label: "Engineering" },
 *   ]}
 * />
 */

export interface ComboboxOption {
  value: string;
  label: string;
  /** Secondary line rendered under the label. */
  description?: string;
  /** Leading glyph, rendered at the tier's icon size. */
  icon?: React.ReactNode;
  /** Extra terms matched by the search box, in addition to the label. */
  keywords?: string[];
  disabled?: boolean;
}

/** Props both value modes share. */
interface ComboboxCommonProps {
  options: ComboboxOption[];
  /** Shown in the trigger when nothing is selected. */
  placeholder?: string;
  /** Placeholder of the search box inside the panel. */
  searchPlaceholder?: string;
  /** Shown in the panel when the query matches nothing. */
  emptyText?: string;
  /**
   * Opt out of cmdk's built-in client-side filtering. Set to `false` when
   * `options` already holds server-filtered results — otherwise cmdk applies
   * its own matcher to that page with the same query and the list usually goes
   * empty. Leave unset for local, in-memory option lists.
   *
   * @default true
   */
  shouldFilter?: boolean;
  /** Controlled search query — the hook for remote search. */
  searchValue?: string;
  /**
   * Called on every keystroke. Also called with `""` when the panel closes, so
   * a controlled caller should write the value straight back and let its result
   * list reset too. The reset is skipped when the query is already empty, so
   * every call reports a query that actually changed.
   */
  onSearchValueChange?: (value: string) => void;
  /** Replaces the empty state with a spinner row while a request is in flight. */
  loading?: boolean;
  /** Label beside the loading spinner. */
  loadingText?: string;
  /**
   * Option(s) to render for `value` entries that are missing from `options`.
   * Remote search hits this on every edit form: the saved value belongs to a
   * page that has not been fetched, so a plain lookup finds nothing and the
   * trigger renders blank. One object for single-select, an array for
   * multi-select.
   */
  selectedOption?: ComboboxOption | ComboboxOption[] | null;
  /**
   * Let the user mint an option out of whatever they typed, through a trailing
   * "create" row. The row only appears when the query is non-empty and matches
   * no existing label exactly, so it never competes with a real option.
   */
  creatable?: boolean;
  /**
   * Text of the create row. Pass a function to own the whole string — the typed
   * text is handed over verbatim.
   *
   * @default "Create"
   */
  createText?: string | ((query: string) => string);
  /**
   * Called when the create row is activated. Return a string to use as the new
   * option's value (a server id, say); return nothing to use the typed text as
   * both value and label. The option is registered locally and selected either
   * way, so its label survives later refetches.
   */
  onCreate?: (query: string) => string | void;
  /** Trigger size. Omit to follow the global density tier. */
  size?: PickerSize;
  disabled?: boolean;
  /** id applied to the visible trigger element. */
  id?: string;
  className?: string;
  contentClassName?: string;
  "aria-label"?: string;
}

export interface ComboboxSingleProps extends ComboboxCommonProps {
  multiple?: false;
  /** Controlled value. `null` means "nothing selected". */
  value?: string | null;
  /** Initial value for uncontrolled usage. */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

export interface ComboboxMultipleProps extends ComboboxCommonProps {
  /** Selecting toggles a value and keeps the panel open. */
  multiple: true;
  /** Controlled selection. */
  value?: string[];
  /** Initial selection for uncontrolled usage. */
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
}

/**
 * Single-select by default; pass `multiple` to toggle values instead of
 * replacing one. The union is what gives `value` / `onValueChange` their type
 * from the flag, so callers never have to narrow by hand.
 */
export type ComboboxProps = ComboboxSingleProps | ComboboxMultipleProps;

/** The body works on one normalized shape; the public type is the union above. */
type NormalizedProps = ComboboxCommonProps & {
  multiple?: boolean;
  value?: string | string[] | null;
  defaultValue?: string | string[];
  onValueChange?: (value: string | string[]) => void;
};

/** Anything the caller may hand in as a selection, flattened to an array. */
function toArray(input: string | string[] | null | undefined): string[] {
  if (input == null) return [];
  // `""` is a controlled "empty selection", not a value.
  return (Array.isArray(input) ? input : [input]).filter((entry) => entry !== "");
}

/**
 * Search key for an option. cmdk derives both filtering and the highlighted-row
 * identity from an item's `value`, so the label and the extra keywords are
 * packed into one string; the actual option value is bound through the
 * `onSelect` closure instead.
 */
function searchKeyOf(option: ComboboxOption): string {
  return [option.label, ...(option.keywords ?? [])].join(" ");
}

const ComboboxImpl = React.forwardRef<HTMLInputElement, NormalizedProps>(
  (
    {
      options,
      value: valueProp,
      defaultValue,
      onValueChange,
      multiple = false,
      creatable = false,
      createText = "Create",
      onCreate,
      placeholder = "Select…",
      searchPlaceholder,
      emptyText = "No results.",
      shouldFilter,
      searchValue,
      onSearchValueChange,
      loading = false,
      loadingText = "Loading…",
      selectedOption,
      size,
      disabled,
      id,
      className,
      contentClassName,
      "aria-label": ariaLabel,
    },
    ref
  ) => {
    const isMultiple = multiple === true;

    // One selection state for both modes. `useControllableState` cannot be
    // called per-mode (hooks are unconditional), so a single value is normalized
    // to `string[]` and widened back on the way out. The `useMemo` keeps the
    // controlled array identity stable, otherwise `setValues` would be recreated
    // on every render.
    const controlledValues = React.useMemo(
      () => (valueProp === undefined ? undefined : toArray(valueProp)),
      [valueProp]
    );
    const [values, setValues] = useControllableState<string[]>({
      value: controlledValues,
      defaultValue: toArray(defaultValue),
      onChange: (next) => onValueChange?.(isMultiple ? next : next[0] ?? ""),
    });

    const [open, setOpen] = React.useState(false);
    const { triggerRef, container } = usePopoverContainer();
    const density = useDensity();
    const compact = resolvePickerSize(size, density) === "xs";

    // The query is controllable so a remote caller can debounce it. The `Command`
    // unmounts with the popover, so an uncontrolled query already resets itself;
    // a controlled one has to be cleared explicitly on close.
    const [query, setQuery] = useControllableState<string>({
      value: searchValue,
      defaultValue: "",
      onChange: onSearchValueChange,
    });

    /**
     * Options minted from typed text, kept beside `options` so a created label
     * survives the next refetch — and so the trigger stays labelled when the
     * value is not on the current page. A value that also appears in `options`
     * is dropped from here, letting the server's row win.
     */
    const [createdOptions, setCreatedOptions] = React.useState<ComboboxOption[]>([]);
    const allOptions = React.useMemo(() => {
      const serverValues = new Set(options.map((option) => option.value));
      return [
        ...createdOptions.filter((option) => !serverValues.has(option.value)),
        ...options,
      ];
    }, [createdOptions, options]);

    /** `selectedOption` accepts one object or an array; normalize either. */
    const overrides = React.useMemo<ComboboxOption[]>(() => {
      if (selectedOption == null) return [];
      return Array.isArray(selectedOption) ? selectedOption : [selectedOption];
    }, [selectedOption]);

    // Explicit `selectedOption` wins over a lookup: with remote search the value
    // can legitimately be absent from the page in `options`.
    const selectedOptions = values
      .map(
        (entry) =>
          overrides.find((option) => option.value === entry) ??
          allOptions.find((option) => option.value === entry) ??
          null
      )
      .filter((option): option is ComboboxOption => option !== null);

    const selectedLabels = selectedOptions.map((option) => option.label);
    let displayValue: string;
    if (!isMultiple) {
      displayValue = selectedLabels[0] ?? "";
    } else if (selectedLabels.length <= 2) {
      displayValue = selectedLabels.join(", ");
    } else {
      // Two names plus a counter keeps the trigger readable at any width. The
      // comma before the counter matches the one separating the names.
      displayValue = `${selectedLabels.slice(0, 2).join(", ")}, +${
        selectedLabels.length - 2
      }`;
    }

    const handleOpenChange = React.useCallback(
      (next: boolean) => {
        if (disabled) return;
        // Closing resets the query so reopening starts clean; without this a
        // remote list would reopen showing another keyword's results.
        //
        // Skipped when the box is already empty: `setQuery` reports the change
        // unconditionally (no equality bail-out, mirroring Radix), so a
        // redundant call would tell a controlled caller "the query changed"
        // when nothing did — and because no re-render follows, a caller that
        // kicks off a request on that signal has nothing left to settle it.
        if (!next && query !== "") setQuery("");
        setOpen(next);
      },
      [disabled, query, setQuery]
    );

    const createQuery = query.trim();
    // An exact label match means the user retyped something that already
    // exists — offering to create it would be noise.
    const showCreateRow =
      creatable &&
      createQuery.length > 0 &&
      !allOptions.some(
        (option) => option.label.toLowerCase() === createQuery.toLowerCase()
      );

    const handleCreate = React.useCallback(() => {
      const label = createQuery;
      const value = onCreate?.(label) || label;
      setCreatedOptions((prev) =>
        prev.some((option) => option.value === value)
          ? prev
          : [{ value, label }, ...prev]
      );
      // Clear the box so the next tag can be typed straight away; in multi mode
      // it also retires the create row, which is now redundant.
      setQuery("");
      if (isMultiple) {
        setValues((prev) => (prev.includes(value) ? prev : [...prev, value]));
      } else {
        setValues([value]);
        handleOpenChange(false);
      }
    }, [createQuery, onCreate, isMultiple, setValues, setQuery, handleOpenChange]);

    const handleSelect = React.useCallback(
      (option: ComboboxOption) => {
        if (isMultiple) {
          // Toggle and stay open — the panel's value is picking several, so
          // closing after each one would be working against the user.
          setValues((prev) =>
            prev.includes(option.value)
              ? prev.filter((entry) => entry !== option.value)
              : [...prev, option.value]
          );
          return;
        }
        setValues([option.value]);
        // Route through the open handler rather than `setOpen`: it also resets
        // the query, which a controlled remote search would otherwise keep.
        handleOpenChange(false);
      },
      [isMultiple, setValues, handleOpenChange]
    );

    // The row the panel opens on. Single-select keeps it controlled so the
    // highlight follows the value; multi-select only seeds it, because taking it
    // over would yank the highlight back to the first selection on every toggle.
    const highlightKey = selectedOptions[0]
      ? searchKeyOf(selectedOptions[0])
      : undefined;

    return (
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <PickerTrigger
            ref={triggerRef}
            id={id}
            inputRef={ref}
            value={values.join(",")}
            displayValue={displayValue}
            placeholder={placeholder}
            size={size}
            disabled={disabled}
            open={open}
            aria-label={ariaLabel}
            // The panel is a list of options, not a dialog.
            aria-haspopup="listbox"
            className={className}
            trailingIcon={
              <ChevronsUpDown
                className={cn(
                  "shrink-0 opacity-60 transition-transform duration-base",
                  open && "rotate-180"
                )}
                aria-hidden="true"
              />
            }
            /**
             * A Combobox trigger is a div, not a native button, so it gets no
             * built-in keyboard activation. Open on the keys a select-like
             * control is expected to respond to.
             */
            onKeyDown={(event) => {
              if (disabled) return;
              if (
                event.key === "Enter" ||
                event.key === " " ||
                event.key === "ArrowDown"
              ) {
                event.preventDefault();
                setOpen(true);
              }
            }}
          />
        </PopoverTrigger>
        <PopoverContent
          align="start"
          container={container}
          className={cn(
            // Match the trigger width so the panel reads as part of the field.
            "w-[var(--radix-popover-trigger-width)] min-w-56 p-0",
            compact && "rounded-md",
            contentClassName
          )}
          /**
           * `PopoverContent` suppresses focus return by default to avoid a
           * lingering ring on trigger buttons. Here the trigger is a field, and
           * dropping focus to <body> would send the next Tab to the top of the
           * document — put it back on the trigger instead. The trigger has no
           * ring class, so nothing visible changes.
           */
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            triggerRef.current?.focus();
          }}
        >
          <Command
            /**
             * cmdk's `value` is the highlighted row, not the selection. Single
             * mode keeps it controlled so opening the panel lands on the current
             * selection instead of the first row; arrow keys still move freely
             * afterwards. Multi mode only seeds it via `defaultValue`: the
             * `Command` remounts with the popover, so that re-seeds on every
             * open, while a controlled value would snap the highlight back to
             * the first selection on every toggle.
             */
            value={isMultiple ? undefined : highlightKey}
            defaultValue={isMultiple ? highlightKey : undefined}
            shouldFilter={shouldFilter}
            loop
          >
            <CommandInput
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder={searchPlaceholder ?? placeholder}
            />
            <CommandList>
              {loading ? (
                /**
                 * The loading row stands alone. Rendering the previous page
                 * underneath it — a "stale while revalidating" list — reads as
                 * a bug rather than as progress, because a spinner sitting above
                 * live-looking results has no way to say which ones are current.
                 */
                <CommandLoading>{loadingText}</CommandLoading>
              ) : (
                <>
                  {/* cmdk's own empty state would contradict a visible create
                      row, so it steps aside for it. */}
                  {!showCreateRow && <CommandEmpty>{emptyText}</CommandEmpty>}
                  {allOptions.map((option) => {
                    const isSelected = values.includes(option.value);
                    return (
                      <CommandItem
                        key={option.value}
                        value={searchKeyOf(option)}
                        disabled={option.disabled}
                        onSelect={() => handleSelect(option)}
                      >
                        {option.icon && (
                          <span
                            className="shrink-0 text-foreground-subtle [&>svg]:h-4 [&>svg]:w-4"
                            aria-hidden="true"
                          >
                            {option.icon}
                          </span>
                        )}
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate">{option.label}</span>
                          {option.description && (
                            <span className="truncate text-xs text-foreground-muted">
                              {option.description}
                            </span>
                          )}
                        </span>
                        <Check
                          className={cn(
                            "ml-auto shrink-0 text-accent transition-opacity",
                            compact ? "h-3.5 w-3.5" : "h-4 w-4",
                            isSelected ? "opacity-100" : "opacity-0"
                          )}
                          strokeWidth={3}
                          aria-hidden="true"
                        />
                      </CommandItem>
                    );
                  })}
                  {showCreateRow && (
                    /**
                     * `value` is the raw query rather than a decorated string, so
                     * an exact match scores 1 and cmdk sorts this row to the top
                     * — the position a "create" affordance is expected in. It
                     * also keeps the row reachable by arrow keys, which
                     * `forceMount` would not: a force-mounted item is never
                     * registered with the store.
                     */
                    <CommandItem
                      key={`create:${createQuery}`}
                      value={createQuery}
                      onSelect={handleCreate}
                    >
                      <Plus
                        className={cn(
                          "shrink-0 text-accent",
                          compact ? "h-3.5 w-3.5" : "h-4 w-4"
                        )}
                        aria-hidden="true"
                      />
                      <span className="truncate">
                        {typeof createText === "function"
                          ? createText(createQuery)
                          : `${createText} "${createQuery}"`}
                      </span>
                    </CommandItem>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }
);
ComboboxImpl.displayName = "Combobox";

/**
 * The public type is a discriminated union on `multiple`, while the body above
 * works on one normalized shape. This is the single place the two meet.
 */
export const Combobox = ComboboxImpl as unknown as React.ForwardRefExoticComponent<
  ComboboxProps & React.RefAttributes<HTMLInputElement>
>;
