import { ReactNode } from "react";

export interface FeatureCardProps {
  icon: ReactNode;
  label: string;
}

export function FeatureCard({ icon, label }: FeatureCardProps) {
  return (
    <div className="flex flex-col items-center p-4 rounded-xl bg-card/50 hover:bg-card transition-colors">
      <div className="mb-3">{icon}</div>
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}
