import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
export const useRecentRepos = create<{ paths: string[]; remember: (path: string) => void }>()(persist(set => ({
  paths: [], remember: path => set(s => ({ paths: [path, ...s.paths.filter(p => p !== path)].slice(0, 8) })),
}), { name: 'l8git-recent-repos', storage: createJSONStorage(() => localStorage) }));
