"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Command as CommandPrimitive } from "cmdk";
import { Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDensity, type Density } from "@/components/density-provider";

/** Density tiers shared by Command and its rows. */
export type CommandDensity = Density;

/**
 * Propagates the density set on `<Command>` down to the input / list / items so
 * only the palette root needs the prop.
 */
const CommandDensityContext = React.createContext<CommandDensity>("default");

export interface CommandProps
  extends React.ComponentPropsWithoutRef<typeof CommandPrimitive> {
  /** Row density. Falls back to the surrounding density, then to "default". */
  density?: CommandDensity;
}

export const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  CommandProps
>(({ className, density, ...props }, ref) => {
  const globalDensity = useDensity();
  const resolvedDensity = density ?? globalDensity;
  return (
    <CommandDensityContext.Provider value={resolvedDensity}>
      <CommandPrimitive
        ref={ref}
        className={cn(
          "flex h-full w-full flex-col overflow-hidden bg-surface text-foreground",
          resolvedDensity === "compact" ? "rounded-md" : "rounded-lg",
          className
        )}
        {...props}
      />
    </CommandDensityContext.Provider>
  );
});
Command.displayName = "Command";

export interface CommandInputProps
  extends React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input> {}

export const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  CommandInputProps
>(({ className, ...props }, ref) => {
  const density = React.useContext(CommandDensityContext);
  const compact = density === "compact";
  return (
    <div
      className={cn(
        "flex items-center border-b border-border",
        compact ? "px-3" : "px-4"
      )}
      cmdk-input-wrapper=""
    >
      <Search
        className={cn(
          "shrink-0 text-foreground-subtle",
          compact ? "mr-2 h-3.5 w-3.5" : "mr-3 h-4 w-4"
        )}
      />
      <CommandPrimitive.Input
        ref={ref}
        className={cn(
          "w-full bg-transparent outline-none placeholder:text-foreground-subtle disabled:cursor-not-allowed disabled:opacity-50",
          compact ? "h-8 text-xs" : "h-12 text-sm",
          className
        )}
        {...props}
      />
    </div>
  );
});
CommandInput.displayName = "CommandInput";

export interface CommandListProps
  extends React.ComponentPropsWithoutRef<typeof CommandPrimitive.List> {}

export const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  CommandListProps
>(({ className, ...props }, ref) => {
  const density = React.useContext(CommandDensityContext);
  const compact = density === "compact";
  return (
    <CommandPrimitive.List
      ref={ref}
      className={cn(
        "overflow-y-auto overflow-x-hidden",
        // The list owns the horizontal inset for its rows; groups only add
        // vertical padding (see CommandGroup). Previously the two split it, and
        // an ungrouped list — the Combobox panel — ended up with half the
        // breathing room around a highlighted row.
        compact ? "max-h-64 p-1" : "max-h-80 p-2",
        className
      )}
      {...props}
    />
  );
});
CommandList.displayName = "CommandList";

export interface CommandEmptyProps
  extends React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty> {}

export const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  CommandEmptyProps
>(({ className, ...props }, ref) => {
  const density = React.useContext(CommandDensityContext);
  const compact = density === "compact";
  return (
    <CommandPrimitive.Empty
      ref={ref}
      className={cn(
        "text-center text-foreground-muted",
        compact ? "py-4 text-xs" : "py-6 text-sm",
        className
      )}
      {...props}
    />
  );
});
CommandEmpty.displayName = "CommandEmpty";

export interface CommandLoadingProps
  extends React.ComponentPropsWithoutRef<typeof CommandPrimitive.Loading> {}

/**
 * Row shown while remote results are in flight. cmdk gives this no trigger of
 * its own — render it conditionally, in place of `CommandEmpty` and the list
 * itself. The spinner is built in, and a string child doubles as the
 * progressbar's accessible label.
 */
export const CommandLoading = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Loading>,
  CommandLoadingProps
>(({ className, children, label, ...props }, ref) => {
  const density = React.useContext(CommandDensityContext);
  const compact = density === "compact";
  return (
    <CommandPrimitive.Loading
      ref={ref}
      label={label ?? (typeof children === "string" ? children : "Loading…")}
      className={cn(
        "text-foreground-muted",
        compact ? "py-4 text-xs" : "py-6 text-sm",
        /**
         * cmdk wraps `children` in an unclassed inner `<div aria-hidden>`, and
         * Tailwind's preflight sets `svg { display: block }` — so the spinner and
         * the label would stack instead of sitting in a row. The flex layout has
         * to land on that inner wrapper, not on the element we control.
         */
        "[&>div]:flex [&>div]:items-center [&>div]:justify-center [&>div]:gap-2",
        className
      )}
      {...props}
    >
      <Loader2
        className={cn("shrink-0 animate-spin", compact ? "h-3.5 w-3.5" : "h-4 w-4")}
        aria-hidden="true"
      />
      {children}
    </CommandPrimitive.Loading>
  );
});
CommandLoading.displayName = "CommandLoading";

export interface CommandGroupProps
  extends React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group> {}

export const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  CommandGroupProps
>(({ className, ...props }, ref) => {
  const density = React.useContext(CommandDensityContext);
  const compact = density === "compact";
  return (
    <CommandPrimitive.Group
      ref={ref}
      className={cn(
        "overflow-hidden text-foreground",
        // Vertical only — the list already insets the rows horizontally, so
        // adding horizontal padding here would double it up for grouped panels.
        compact ? "py-0.5" : "py-1",
        "[&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-foreground-muted",
        compact
          ? "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[11px]"
          : "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs",
        className
      )}
      {...props}
    />
  );
});
CommandGroup.displayName = "CommandGroup";

export interface CommandItemProps
  extends React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item> {}

export const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  CommandItemProps
>(({ className, ...props }, ref) => {
  const density = React.useContext(CommandDensityContext);
  const compact = density === "compact";
  return (
    <CommandPrimitive.Item
      ref={ref}
      className={cn(
        "relative flex cursor-pointer select-none items-center gap-2 rounded-md outline-none transition-colors",
        compact ? "px-2 py-1 text-xs" : "px-2 py-1.5 text-sm",
        "data-[selected=true]:bg-hover-bg",
        "data-[disabled=true]:opacity-50 data-[disabled=true]:pointer-events-none",
        className
      )}
      {...props}
    />
  );
});
CommandItem.displayName = "CommandItem";

export interface CommandShortcutProps
  extends React.HTMLAttributes<HTMLSpanElement> {}

export const CommandShortcut = React.forwardRef<
  HTMLSpanElement,
  CommandShortcutProps
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      "ml-auto text-xs tracking-wide text-foreground-subtle",
      className
    )}
    {...props}
  />
));
CommandShortcut.displayName = "CommandShortcut";

export interface CommandSeparatorProps
  extends React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator> {}

export const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Separator>,
  CommandSeparatorProps
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator
    ref={ref}
    className={cn("h-px bg-border my-1", className)}
    {...props}
  />
));
CommandSeparator.displayName = "CommandSeparator";

export interface CommandLabelProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export const CommandLabel = React.forwardRef<
  HTMLDivElement,
  CommandLabelProps
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    cmdk-label=""
    className={cn(
      "px-2 py-1.5 text-xs font-medium tracking-wide text-foreground-muted",
      className
    )}
    {...props}
  />
));
CommandLabel.displayName = "CommandLabel";

export interface CommandDialogProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root> {
  children?: React.ReactNode;
}

export const CommandDialog = ({ children, ...props }: CommandDialogProps) => {
  return (
    <DialogPrimitive.Root {...props}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-modal bg-overlay backdrop-blur-sm",
            "data-[state=open]:animate-fade-in"
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            // Horizontal centering intentionally avoids `left-1/2 -translate-x-1/2`:
            // the enter animation animates `transform`, which overrides the
            // `-translate-x-1/2` utility for the animation's duration and makes
            // the panel appear off-center, then snap to the middle.
            // `inset-x-0 mx-auto` centers without touching `transform`.
            "fixed inset-x-0 top-[20%] z-modal mx-auto w-full max-w-xl overflow-hidden rounded-xl border border-border bg-surface shadow-dialog",
            "data-[state=open]:animate-fade-slide-in"
          )}
        >
          <DialogPrimitive.Title className="sr-only">
            Command palette
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Search for a command to run.
          </DialogPrimitive.Description>
          <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-foreground-muted [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-2 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
            {children}
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export { CommandPrimitive, DialogPrimitive as Dialog };
