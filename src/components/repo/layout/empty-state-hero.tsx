import { ReactNode } from "react";

export interface EmptyStateHeroProps {
  icon: ReactNode;
  title: string;
  description: string;
}

export function EmptyStateHero({ icon, title, description }: EmptyStateHeroProps) {
  return (
    <>
      <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-primary/10 text-primary shadow-2xl shadow-primary/20">
        {icon}
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </>
  );
}
