"use client";

import * as React from "react";
import { Check, Contrast, Moon, Sun } from "lucide-react";
import { useAppTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** No-op subscription; only used to detect that we are on the client */
const subscribeNoop = () => () => {};

export function ThemeToggle({
  size = "icon-sm",
  className,
}: {
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
}) {
  const { resolvedTheme, setTheme, highContrast, toggleHighContrast } = useAppTheme();
  // Server snapshot false, client snapshot true — keeps hydration consistent
  const mounted = React.useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={size}
          aria-label="切换主题"
          className={className ?? "shrink-0"}
        >
          {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="min-w-[176px]">
        <DropdownMenuLabel>外观</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="h-4 w-4" />
          <span>浅色</span>
          {mounted && !isDark && !highContrast && (
            <Check className="ml-auto h-3.5 w-3.5 text-foreground-muted" />
          )}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="h-4 w-4" />
          <span>深色</span>
          {mounted && isDark && !highContrast && (
            <Check className="ml-auto h-3.5 w-3.5 text-foreground-muted" />
          )}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Sun className="h-4 w-4" />
          <span>跟随系统</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={toggleHighContrast}>
          <Contrast className="h-4 w-4" />
          <span>高对比度</span>
          {mounted && highContrast && (
            <Check className="ml-auto h-3.5 w-3.5 text-foreground-muted" />
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
