import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { exportPreferences, parsePreferences, applyPreferences, type PreferencesExport } from '@/lib/preferences-transfer';
import { saveJson } from '@/lib/user-export';
import { collectDiagnostics } from '@/lib/diagnostics';
import { toastError } from '@/lib/error-toast';
export function DataPortabilityCard() {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<PreferencesExport | null>(null);
  const [previous, setPrevious] = useState<PreferencesExport | null>(null);
  const [busy, setBusy] = useState(false);
  async function run(task: () => Promise<unknown>) { setBusy(true); try { await task(); } catch (e) { toastError(String(e)); } finally { setBusy(false); } }
  return <Card><CardHeader><CardTitle>{t('audit.portability')}</CardTitle><CardDescription>{t('audit.portabilityHint')}</CardDescription></CardHeader><CardContent className="space-y-3">
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" disabled={busy} onClick={() => void run(() => saveJson('l8git-preferences.json', exportPreferences()))}>{t('audit.export')}</Button>
      <label className="inline-flex cursor-pointer items-center rounded-md border border-input px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-ring">{t('audit.import')}<input aria-label={t('audit.import')} disabled={busy} type="file" accept=".json,application/json" className="sr-only" onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void run(async () => { if (file.size > 2_000_000) throw new Error(t('audit.invalidImport')); setPreview(parsePreferences(await file.text())); }); }} /></label>
      <Button variant="ghost" disabled={busy} onClick={() => void run(async () => saveJson('l8git-diagnostics.json', await collectDiagnostics()))}>{t('audit.diagnostics')}</Button>
      {previous && <Button variant="ghost" onClick={() => { try { applyPreferences(previous); setPrevious(null); } catch (e) { toastError(String(e)); } }}>{t('audit.undoImport')}</Button>}
    </div>
    <Dialog open={!!preview} onOpenChange={open => { if (!open) setPreview(null); }}><DialogContent className="max-w-xl"><DialogHeader><DialogTitle>{t('audit.import')}</DialogTitle><DialogDescription>{t('audit.importHint')}</DialogDescription></DialogHeader>
      <pre className="max-h-72 overflow-auto rounded-md bg-muted p-3 text-xs">{preview && JSON.stringify(preview, null, 2)}</pre>
      <DialogFooter><Button variant="outline" onClick={() => setPreview(null)}>{t('common.cancel')}</Button><Button onClick={() => { if (preview) { const before = exportPreferences(); try { applyPreferences(preview); setPrevious(before); setPreview(null); } catch (e) { toastError(String(e)); } } }}>{t('audit.applyImport')}</Button></DialogFooter>
    </DialogContent></Dialog>
  </CardContent></Card>;
}
