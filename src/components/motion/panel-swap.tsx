import { m } from "motion/react";
import type { ReactNode } from "react";

export function PanelSwap({
  panelKey,
  children,
  className,
}: {
  panelKey: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <m.div
      key={panelKey}
      className={className}
      initial={{ opacity: 0, x: 6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.12, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </m.div>
  );
}
