import { MagicPill } from "@/components/motion/magic-pill";
import { cn } from "@/lib/utils";

interface SidebarNavItemProps {
  isActive: boolean;
  icon: React.ReactNode;
  label: string;
  count?: number;
  compact: boolean;
  onClick: () => void;
}

export function SidebarNavItem({
  isActive,
  icon,
  label,
  count,
  compact,
  onClick,
}: SidebarNavItemProps) {
  const hasCount = count != null && count > 0;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      title={label}
      onClick={onClick}
      className={cn(
        "group relative flex w-full items-center rounded-md text-sm transition-colors duration-150",
        compact ? "justify-center px-2 py-2" : "gap-2.5 px-2.5 py-1.5",
        isActive
          ? "bg-accent text-accent-foreground font-medium"
          : "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
      )}
    >
      {isActive && (
        <MagicPill
          layoutId="sidebar-tab-pill"
          className="pointer-events-none absolute inset-y-1.5 right-0 w-[3px] rounded-full bg-primary"
        />
      )}

      <span className="relative shrink-0">
        {icon}
        {compact && hasCount && (
          <span className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-[3px] text-[9px] font-bold leading-none tabular-nums text-primary-foreground">
            {count! > 9 ? "9+" : count}
          </span>
        )}
      </span>

      {!compact && (
        <>
          <span className="min-w-0 flex-1 truncate text-left">{label}</span>
          {hasCount && (
            <span className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 px-1 text-[10px] font-semibold tabular-nums text-primary">
              {count! > 99 ? "99+" : count}
            </span>
          )}
        </>
      )}
    </button>
  );
}
