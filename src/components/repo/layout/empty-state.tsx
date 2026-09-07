import { Button } from '@/components/ui/button';
import { usePickRepo } from '@/lib/use-pick-repo';
import { Download, FolderGit2, Plus, ArrowUpRight } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RepoSourceDialogs } from '@/components/repo/tabs/repo-source-dialogs';
import { useRecentRepos } from '@/lib/recent-repos';
import { useRepoStore } from '@/lib/repo-store';

export function EmptyState() {
  const { t } = useTranslation();
  const pickRepo = usePickRepo();
  const [cloneOpen, setCloneOpen] = useState(false);
  const [initOpen, setInitOpen] = useState(false);
  const recent = useRecentRepos(s => s.paths);
  const addRepo = useRepoStore(s => s.addRepo);
  return <div className="flex min-h-full w-full flex-col items-center justify-center overflow-y-auto bg-background px-6 py-10">
    <div className="w-full max-w-xl">
      <FolderGit2 className="mb-5 size-9 text-muted-foreground" strokeWidth={1.5} />
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t('audit.welcome')}</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">{t('audit.welcomeHint')}</p>
      <div className="mt-7 flex flex-wrap gap-2">
        <Button onClick={() => void pickRepo()}><FolderGit2 className="size-4" />{t('emptyState.ctaOpen')}</Button>
        <Button variant="outline" onClick={() => setCloneOpen(true)}><Download className="size-4" />{t('emptyState.ctaClone')}</Button>
        <Button variant="ghost" onClick={() => setInitOpen(true)}><Plus className="size-4" />{t('emptyState.ctaInit')}</Button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{t('audit.dropHint')}</p>
      {recent.length > 0 && <section className="mt-10 border-t border-border pt-5" aria-label={t('audit.recentRepos')}>
        <h2 className="mb-2 text-xs font-medium text-muted-foreground">{t('audit.recentRepos')}</h2>
        {recent.map(path => <button key={path} className="flex w-full items-center gap-3 rounded-md px-2 py-3 text-left hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring" onClick={() => void addRepo(path)}>
          <FolderGit2 className="size-4 shrink-0 text-muted-foreground" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{path.split(/[\\/]/).pop()}</span><span className="block truncate text-xs text-muted-foreground">{path}</span></span><ArrowUpRight className="size-4 text-muted-foreground" />
        </button>)}
      </section>}
    </div>
    <RepoSourceDialogs cloneOpen={cloneOpen} initOpen={initOpen} onCloseClone={() => setCloneOpen(false)} onCloseInit={() => setInitOpen(false)} />
  </div>;
}
