import { ReactNode } from "react";

export interface EmptyStateHintProps {
  icon: ReactNode;
  text: string;
}

export function EmptyStateHint({ icon, text }: EmptyStateHintProps) {
  return (
    <div className="text-sm text-muted-foreground flex items-center gap-2 bg-secondary/50 px-4 py-2 rounded-full">
      {icon}
      <span>{text}</span>
    </div>
  );
}
