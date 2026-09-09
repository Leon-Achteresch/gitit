import { Plus, X } from "lucide-react";
import { useState } from "react";

import { ComposerMenu, ComposerMenuItem, ComposerMenuLabel } from "./composer-menu";
import type { ComposerAction } from "./types";
import { cn } from "@/lib/utils";

export function ComposerAddMenu({
  actions,
  onSelect,
}: {
  actions: ComposerAction[];
  onSelect?: (action: ComposerAction) => void;
}) {
  const [open, setOpen] = useState(false);
  const groups = [...new Set(actions.map(a => a.group ?? ""))];

  return (
    <ComposerMenu
      open={open}
      onOpenChange={setOpen}
      className="w-80"
      trigger={
        <button
          type="button"
          aria-label="Add"
          className={cn(
            "inline-flex size-8 items-center justify-center rounded-full bg-muted text-foreground/80 transition-colors hover:bg-muted/70",
          )}
        >
          {open ? <X className="size-4" /> : <Plus className="size-4" />}
        </button>
      }
    >
      {groups.map(group => (
        <div key={group}>
          {group && <ComposerMenuLabel>{group}</ComposerMenuLabel>}
          {actions
            .filter(a => (a.group ?? "") === group)
            .map(action => (
              <ComposerMenuItem
                key={action.id}
                icon={<action.icon className="size-4" strokeWidth={1.75} />}
                label={action.label}
                hint={action.hint}
                onClick={() => {
                  action.onSelect?.();
                  onSelect?.(action);
                  setOpen(false);
                }}
              />
            ))}
        </div>
      ))}
    </ComposerMenu>
  );
}
