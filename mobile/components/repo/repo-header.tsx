import * as Haptics from 'expo-haptics';
import {
  Archive,
  ArrowLeft,
  Clock4,
  FileDiff,
  GitBranch,
  GitPullRequest,
  Workflow,
  type LucideIcon,
} from 'lucide-react-native';
import * as React from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { initials } from '~/components/shared/format';
import { Glass, GlassCircle } from '~/components/ui/glass';
import { Icon } from '~/components/ui/icon';
import { Text } from '~/components/ui/text';
import { useHostMeta, useHostRuntime } from '~/lib/connections';
import { useRepoStatus } from '~/lib/repo/queries';
import { REPO_SECTIONS, REPO_SECTION_LABEL, type RepoSection } from '~/lib/repo/route';
import { palette } from '~/lib/theme';

const SECTION_ICON: Record<RepoSection, LucideIcon> = {
  index: FileDiff,
  history: Clock4,
  branches: GitBranch,
  stash: Archive,
  pr: GitPullRequest,
  ci: Workflow,
};

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View className="flex-1 flex-row items-center justify-center gap-1.5">
      <Text className="text-muted-foreground text-xs">{label}</Text>
      <Text style={{ fontVariant: ['tabular-nums'] }} className="text-foreground text-sm font-semibold">
        {value}
      </Text>
    </View>
  );
}

function SectionChip({
  section,
  active,
  onPress,
}: {
  section: RepoSection;
  active: boolean;
  onPress: () => void;
}) {
  const inner = (
    <>
      <Icon
        as={SECTION_ICON[section]}
        size={13}
        color={active ? palette.primaryForeground : palette.foreground}
      />
      <Text
        className={
          active ? 'text-primary-foreground text-sm font-semibold' : 'text-foreground text-sm font-medium'
        }>
        {REPO_SECTION_LABEL[section]}
      </Text>
    </>
  );
  const shape = {
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 14,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  };
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={REPO_SECTION_LABEL[section]}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      {active ? (
        <View style={[shape, { backgroundColor: palette.primary }]}>{inner}</View>
      ) : (
        <Glass style={shape}>{inner}</Glass>
      )}
    </Pressable>
  );
}

export type RepoHeaderProps = {
  hostId: string;
  repoName: string;
  repoPath: string;
  branch?: string | null;
  ahead?: number;
  behind?: number;
  section: RepoSection;
  onSelect: (section: RepoSection) => void;
  onBack: () => void;
};

export function RepoHeader({
  hostId,
  repoName,
  repoPath,
  branch,
  ahead = 0,
  behind = 0,
  section,
  onSelect,
  onBack,
}: RepoHeaderProps) {
  const insets = useSafeAreaInsets();
  const host = useHostMeta(hostId);
  const runtime = useHostRuntime(hostId);
  const online = runtime.status === 'online';
  const status = useRepoStatus(hostId, repoPath, online);
  const changes = status.data?.entries.length ?? 0;

  const select = React.useCallback(
    (next: RepoSection) => {
      if (next === section) {
        return;
      }
      if (Platform.OS !== 'web') {
        void Haptics.selectionAsync();
      }
      onSelect(next);
    },
    [onSelect, section]
  );

  return (
    <View className="bg-background" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-5 pt-2">
        <GlassCircle icon={ArrowLeft} label="Back" onPress={onBack} />
        <Glass
          accessibilityLabel={`${host?.name ?? hostId}: ${online ? "Online" : "Offline"}`}
          style={{
            height: 44,
            borderRadius: 22,
            paddingLeft: 6,
            paddingRight: 14,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.12)',
            }}>
            <Text className="text-foreground text-2xs font-bold">{initials(host?.name)}</Text>
          </View>
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: online ? palette.success : palette.mutedForeground,
            }}
          />
        </Glass>
      </View>

      <View className="flex-row items-center gap-3 px-5 pt-2 pb-1">
        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: palette.card, alignItems: 'center', justifyContent: 'center' }}>
          <Icon as={FileDiff} size={20} color={palette.foreground} />
        </View>
        <View className="flex-1 gap-0.5">
          <Text selectable numberOfLines={1} className="text-foreground text-lg font-bold">{repoName}</Text>
          <View className="flex-row items-center gap-1.5">
            <Icon as={GitBranch} size={12} color={palette.mutedForeground} />
            <Text selectable numberOfLines={1} className="text-muted-foreground flex-1 text-xs">{branch || repoPath}</Text>
          </View>
        </View>
      </View>
      <View className="mx-5 flex-row items-center py-1">
        <Stat label="Ahead" value={ahead} />
        <Stat label="Behind" value={behind} />
        <Stat label="Changes" value={changes} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingTop: 6, paddingBottom: 8 }}
        className="grow-0">
        {REPO_SECTIONS.map((item) => (
          <SectionChip key={item} section={item} active={item === section} onPress={() => select(item)} />
        ))}
      </ScrollView>
    </View>
  );
}
