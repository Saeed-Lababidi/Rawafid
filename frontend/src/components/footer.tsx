import { useTranslations } from 'next-intl';
import { HealthBadge } from '@/components/health-badge';
import { RafidMark } from '@/components/rafid-mark';

export function Footer() {
  const t = useTranslations('disclaimer');
  const tBrand = useTranslations('brand');
  const tFooter = useTranslations('footer');

  return (
    <footer className="bg-[#02182e] text-[#8fa0b4]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-9 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-[19px] font-bold text-brand-cream">
            <RafidMark className="h-5.75 w-8" strokeClassName="text-brand-cream" />
            {tBrand('name')}
          </div>
          <span className="font-mono text-[12.5px]">{tFooter('note')}</span>
        </div>
        <div className="flex flex-col flex-wrap items-start justify-between gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center">
          <p className="max-w-3xl text-meta text-[#8fa0b4]">{t('text')}</p>
          {/* Forces the lighter dark-mode risk/muted tokens for legibility on
              this always-dark footer, independent of the site's theme toggle. */}
          <div className="dark">
            <HealthBadge />
          </div>
        </div>
      </div>
    </footer>
  );
}
