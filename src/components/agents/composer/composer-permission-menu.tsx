import { useState } from "react";

import { ComposerMenu, ComposerMenuLabel } from "./composer-menu";
import type { ComposerPermission } from "./types";
import { cn } from "@/lib/utils";

export function ComposerPermissionMenu({
  permissions,
  value,
  onChange,
}: {
  permissions: ComposerPermission[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const active = permissions.find(p => p.id === value) ?? permissions[0];

  return (
    <ComposerMenu
      open={open}
      onOpenChange={setOpen}
      className="w-72"
      trigger={
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm text-foreground/80 transition-colors hover:bg-muted"
        >
          <active.icon className="size-4" strokeWidth={1.75} aria-hidden />
          {active.label}
        </button>
      }
    >
      <ComposerMenuLabel>Permissions</ComposerMenuLabel>
      {permissions.map(permission => (
        <button
          key={permission.id}
          type="button"
          onClick={() => {
            onChange(permission.id);
            setOpen(false);
          }}
          className={cn(
            "flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-muted",
            permission.id === value && "bg-muted",
          )}
        >
          <permission.icon className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} aria-hidden />
          <span className="min-w-0">
            <span className="block text-sm font-medium">{permission.label}</span>
            <span className="block text-xs text-muted-foreground">{permission.hint}</span>
          </span>
        </button>
      ))}
    </ComposerMenu>
  );
}
