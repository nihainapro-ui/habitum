import { getTranslations } from 'next-intl/server';
import { Panel } from '@/components/ui';
import { LocaleSwitcher } from '@/components/settings/LocaleSwitcher';
import { ThemeSwitcher } from '@/components/settings/ThemeSwitcher';
import { PortStatus } from '@/components/port-status';

/* Réglages — portés partiellement en phase 3 : seule la section Apparence
   existe, parce que la bascule de thème et de langue est un livrable du
   système visuel. Le reste de la vue arrive en phase 4 (tâche 4.11). */
export default async function Page() {
  const t = await getTranslations('app');

  return (
    <div className="flex max-w-[720px] flex-col gap-8">
      <h1 className="m-0 text-[34px] tracking-tight">{t('navSettings')}</h1>

      <Panel title={t('appearanceSec')}>
        <div className="flex flex-col gap-5">
          <ThemeSwitcher />
          <LocaleSwitcher />
        </div>
      </Panel>

      <PortStatus view="settings" titleKey="navSettings" />
    </div>
  );
}
