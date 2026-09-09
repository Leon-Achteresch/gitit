import type { LucideIcon } from "lucide-react";

export type ComposerProvider = {
  id: string;
  label: string;
};

export type ComposerModel = {
  id: string;
  label: string;
  providerId?: string;
  efforts?: string[];
};

export type ComposerPermission = {
  id: string;
  label: string;
  hint: string;
  icon: LucideIcon;
};

export type ComposerAction = {
  id: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  group?: string;
  onSelect?: () => void;
};

export type ComposerContext = {
  branch?: string;
  project?: string;
  usedPercent?: number;
};

export type ComposerValue = {
  text: string;
  modelId: string;
  effort?: string;
  permissionId: string;
};
