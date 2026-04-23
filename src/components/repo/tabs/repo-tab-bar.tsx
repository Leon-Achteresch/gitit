import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useRepoStore, repoLabel } from "@/lib/repo-store";
import { RepoTab } from "./repo-tab";
import { AddRepoButton } from "./add-repo-button";

export function RepoTabBar() {
  const paths = useRepoStore((s) => s.paths);
  const activePath = useRepoStore((s) => s.activePath);
  const loading = useRepoStore((s) => s.loading);
  const favicons = useRepoStore((s) => s.favicons);
  const setActive = useRepoStore((s) => s.setActive);
  const removeRepo = useRepoStore((s) => s.removeRepo);
  const reload = useRepoStore((s) => s.reload);
  const reorderRepos = useRepoStore((s) => s.reorderRepos);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = paths.indexOf(String(active.id));
    const to = paths.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    reorderRepos(from, to);
  }

  return (
    <div className="flex min-h-0 min-w-0 items-center gap-1 border-b">
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={paths}
            strategy={horizontalListSortingStrategy}
          >
            {paths.map((p) => (
              <RepoTab
                key={p}
                path={p}
                label={repoLabel(p)}
                active={p === activePath}
                loading={!!loading[p]}
                favicon={favicons[p]}
                onSelect={() => setActive(p)}
                onClose={() => removeRepo(p)}
                onReload={() => void reload(p)}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
      <AddRepoButton />
    </div>
  );
}
