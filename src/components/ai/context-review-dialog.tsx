import { diffSections, excludeDiffFile } from '@/lib/ai/context';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useAiContextReview } from '@/lib/ai/context-review';
import { useCommitPrefs } from '@/lib/commit-prefs';
export function ContextReviewDialog() {
  const { t } = useTranslation();
  const pending = useAiContextReview(s => s.pending);
  const provider = useCommitPrefs(s => s.aiProviderType);
  const [context, setContext] = useState({ prompt: '', system: '' });
  useEffect(() => { if (pending) setContext(pending.context); }, [pending]);
  const files = [...new Set([...diffSections(context.system), ...diffSections(context.prompt)].map(file => file.path))];
  return <Dialog open={!!pending} onOpenChange={open => { if (!open) pending?.resolve(null); }}>
    <DialogContent className="flex max-h-[85dvh] max-w-3xl flex-col">
      <DialogHeader><DialogTitle>{t('audit.contextTitle')}</DialogTitle><DialogDescription>{t('audit.contextHint', { provider })}</DialogDescription></DialogHeader>
      <div className="min-h-0 space-y-3 overflow-auto">
        {files.length > 0 && <fieldset className="rounded-md border border-border p-3"><legend className="px-1 text-sm">{t('audit.contextFiles')}</legend><p className="mb-2 text-xs text-muted-foreground">{t('audit.excludeHint')}</p>{files.map(path => <div key={path} className="flex items-center justify-between gap-3 py-1"><span className="min-w-0 truncate font-mono text-xs" title={path}>{path}</span><Button size="sm" variant="outline" aria-label={t('audit.excludeFileNamed', { path })} onClick={() => setContext(current => ({ system: excludeDiffFile(current.system, path), prompt: excludeDiffFile(current.prompt, path) }))}>{t('audit.excludeFile')}</Button></div>)}</fieldset>}
        {(['system', 'prompt'] as const).map(field => <label className="block text-sm" key={field}>{t(`audit.${field}`)}<Textarea aria-label={t(`audit.${field}`)} className="mt-1 min-h-40 font-mono text-xs" value={context[field]} onChange={e => setContext({ ...context, [field]: e.target.value })} /></label>)}
      </div>
      <p className="text-xs text-muted-foreground">{t('audit.contextSize', { count: context.prompt.length + context.system.length })}</p>
      <DialogFooter><Button variant="outline" onClick={() => pending?.resolve(null)}>{t('common.cancel')}</Button><Button disabled={!context.prompt.trim()} onClick={() => pending?.resolve(context)}>{t('audit.sendContext')}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}
