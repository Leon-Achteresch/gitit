import { useTranslation } from 'react-i18next';
import { useWorkspacePrefs } from '@/lib/workspace-prefs';
import { useSidebarPrefs } from '@/lib/sidebar-prefs';
import { Button } from '@/components/ui/button';
export function LayoutPrefsCard() {
  const { t } = useTranslation();
  const prefs = useWorkspacePrefs();
  return <div className="space-y-3 rounded-lg border border-border bg-card p-4">
    <p className="text-sm font-medium">{t('audit.layout')}</p>
    <div className="flex gap-2" role="group" aria-label={t('audit.density')}>
      {(['comfortable','compact'] as const).map(density => <Button key={density} variant={prefs.uiDensity === density ? 'default' : 'outline'} size="sm" aria-pressed={prefs.uiDensity === density} onClick={() => { prefs.setUiDensity(density); useSidebarPrefs.getState().setTabSize(density === 'compact' ? 'compact' : 'normal'); }}>{t(`audit.${density}`)}</Button>)}
    </div>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={prefs.navLabels} onChange={e => prefs.setNavLabels(e.target.checked)} />{t('audit.navLabels')}</label>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={prefs.previewAiContext} onChange={e => prefs.setPreviewAiContext(e.target.checked)} />{t('audit.previewAi')}</label>
  </div>;
}
