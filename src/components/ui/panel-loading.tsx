import { useTranslation } from 'react-i18next';
export function PanelLoading() {
  const { t } = useTranslation();
  return <div role="status" className="flex min-h-32 flex-1 flex-col gap-3 p-6" aria-busy="true"><span className="text-sm text-muted-foreground">{t('common.loading')}</span><div className="h-6 w-1/3 rounded bg-muted motion-safe:animate-pulse" /><div className="h-20 rounded bg-muted motion-safe:animate-pulse" /></div>;
}
