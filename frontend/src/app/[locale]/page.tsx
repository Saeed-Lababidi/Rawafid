'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { CheckCircle2, Quote } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { LangToggle } from '@/components/lang-toggle';
import { ThemeToggle } from '@/components/theme-toggle';
import { RafidMark } from '@/components/rafid-mark';
import { FlowLines } from '@/components/flow-lines';
import { Eyebrow, FinCard } from '@/components/brand';
import { SolutionDiagram } from '@/components/solution-diagram';
import {
  BankPreview,
  DashboardPreview,
  EnginePreview,
  FinancingPreview,
} from '@/components/product-previews';
import { useLandingMotion } from '@/lib/use-landing-motion';
import {
  IconApproved,
  IconCashflow,
  IconInvoice,
  IconLiveData,
  IconRepeat,
  IconRiskShield,
  IconWallet,
} from '@/components/brand-icons';

const SECTIONS = ['problem', 'solution', 'platform', 'alinma', 'model'] as const;

const HEADLINE_H2 =
  'font-display text-[clamp(26px,3.6vw,42px)] font-bold leading-[1.1] tracking-tight text-brand-navy dark:text-brand-cream';

export default function LandingPage() {
  useLandingMotion();

  const tNav = useTranslations('nav');
  const tHero = useTranslations('hero');
  const tProblem = useTranslations('problem');
  const tSol = useTranslations('solution');
  const tDiagram = useTranslations('solution.diagram');
  const tPlat = useTranslations('platform');
  const tEng = useTranslations('engine');
  const tProduct = useTranslations('product');
  const tAlinma = useTranslations('forAlinma');
  const tModel = useTranslations('model');
  const tFinal = useTranslations('finalCta');

  const tabs = SECTIONS.map((id) => ({ id, label: tNav(`sections.${id}`) }));

  const platformFeatures = [
    { icon: IconLiveData, k: 'unified' },
    { icon: IconCashflow, k: 'cashflow' },
    { icon: IconWallet, k: 'advance' },
    { icon: IconApproved, k: 'record' },
  ] as const;

  const engineFeatures = [
    { icon: IconLiveData, k: 'sales' },
    { icon: IconRepeat, k: 'repayment' },
    { icon: IconRiskShield, k: 'risk' },
  ] as const;

  const screens = [
    { icon: IconWallet, k: 'dashboard', preview: <DashboardPreview /> },
    { icon: IconInvoice, k: 'financing', preview: <FinancingPreview /> },
    { icon: IconLiveData, k: 'engine', preview: <EnginePreview /> },
    { icon: IconApproved, k: 'bank', preview: <BankPreview /> },
  ] as const;

  const tiers = ['starter', 'growth', 'scale'] as const;

  return (
    <div className="flex flex-col">
      {/* scroll-progress bar */}
      <div
        data-progress
        className="fixed inset-x-0 top-0 z-[60] h-[3px] scale-x-0 bg-brand-terra"
        aria-hidden
      />

      {/* sticky mini-nav (slides in past the hero) */}
      <div
        data-stickynav
        className="fixed inset-x-0 top-0 z-50 border-b border-hairline bg-page-bg/90 backdrop-blur-md"
      >
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
          <a href="#top" className="flex items-center gap-2.5 text-brand-navy dark:text-brand-cream">
            <RafidMark className="h-8 w-11" />
            <span className="font-display text-[17px] font-bold">{tHero('tag')}</span>
          </a>
          <nav className="hidden items-center gap-7 font-mono text-[12px] uppercase tracking-[0.08em] text-body-text-muted md:flex">
            {tabs.map((t) => (
              <a key={t.id} data-navlink={t.id} href={`#${t.id}`} className="hover:text-brand-terra">
                {t.label}
              </a>
            ))}
          </nav>
          <Link
            href="/login"
            className="inline-flex h-9 items-center justify-center rounded-pill bg-accent px-4 text-[13px] font-bold text-accent-foreground"
          >
            {tNav('getStarted')}
          </Link>
        </div>
      </div>

      {/* ================= HERO ================= */}
      <section
        id="top"
        className="relative flex min-h-screen flex-col overflow-hidden bg-page-bg text-body-text"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_100%_0%,rgba(195,107,78,0.12),transparent_55%)]" />

        {/* hero nav */}
        <nav className="relative z-10">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
            <a href="#top" className="flex items-center gap-3">
              <RafidMark className="h-10 w-14" />
              <span className="font-display text-[18px] font-semibold tracking-tight text-brand-navy dark:text-brand-cream">
                {tHero('tag')}
              </span>
            </a>
            <div className="hidden items-center gap-7 font-mono text-[12.5px] uppercase tracking-[0.08em] text-body-text-muted lg:flex">
              {tabs.map((t) => (
                <a key={t.id} data-navlink={t.id} href={`#${t.id}`} className="transition-colors hover:text-brand-terra">
                  {t.label}
                </a>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <LangToggle />
              <ThemeToggle />
            </div>
          </div>
        </nav>

        {/* hero body */}
        <div className="relative z-[2] flex flex-1 items-center">
          <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
            <div>
              <div data-hero="eyebrow" style={{ opacity: 0 }} className="mb-6 font-mono text-[12px] uppercase tracking-[0.24em] text-brand-terra">
                {tHero('tag')}
              </div>
              <h1 className="font-display text-[clamp(30px,7vw,70px)] font-bold leading-[0.95] tracking-[-0.03em] text-brand-navy dark:text-brand-cream">
                <span data-hero="line" style={{ opacity: 0 }} className="block">
                  {tHero('headline1')}
                </span>
                <span data-hero="line" style={{ opacity: 0 }} className="block">
                  {tHero('headline2')}
                </span>
                <span data-hero="line" style={{ opacity: 0 }} className="block text-brand-terra">
                  {tHero('headline3')}
                </span>
              </h1>
              <p data-hero="sub" style={{ opacity: 0 }} className="mt-7 max-w-[52ch] text-[18px] leading-relaxed text-body-text-muted">
                {tHero('subheadline')}
              </p>
              <div className="mt-9 flex flex-wrap gap-3.5">
                <Link
                  data-hero="cta"
                  style={{ opacity: 0 }}
                  href="/login"
                  className="inline-flex h-12 items-center justify-center rounded-tile bg-accent px-7 text-body font-bold text-accent-foreground shadow-[0_14px_30px_-12px_rgba(195,107,78,0.9)]"
                >
                  {tHero('ctaPrimary')}
                </Link>
                <a
                  data-hero="cta"
                  style={{ opacity: 0 }}
                  href="#solution"
                  className="inline-flex h-12 items-center justify-center rounded-tile border-[1.5px] border-brand-navy/20 px-7 text-body font-bold text-brand-navy transition-colors hover:border-brand-terra hover:text-brand-terra dark:border-white/25 dark:text-white"
                >
                  {tHero('cta')}
                </a>
              </div>
              {/* <div className="mt-12 flex flex-wrap gap-x-9 gap-y-5">
                {(['builtFor', 'category', 'model'] as const).map((m) => (
                  <div key={m} data-hero="meta" style={{ opacity: 0 }} className="font-mono text-[11px] uppercase tracking-[0.06em] text-brand-cream/45">
                    {tHero(`meta.${m}Label`)}
                    <b className="mt-1.5 block font-display text-[14px] font-medium normal-case tracking-normal text-white">
                      {tHero(`meta.${m}Value`)}
                    </b>
                  </div>
                ))}
              </div> */}
            </div>

            {/* hero visual: photo + quote card with quote mark */}
            <div data-hero="card" style={{ opacity: 0 }} className="relative">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[24px] ring-1 ring-white/10 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7)]">
                <Image
                  src="/brand/hero.jpg"
                  alt=""
                  fill
                  priority
                  sizes="(min-width: 1024px) 45vw, 100vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/70 via-transparent to-transparent" />
              </div>
              <figure className="absolute -bottom-15 start-[-28px] max-w-[330px] rounded-2xl border border-white/10 bg-[#06192e]/95 p-5 shadow-[0_24px_50px_-20px_rgba(0,0,0,0.8)] backdrop-blur-sm max-lg:static max-lg:mt-6 max-lg:max-w-none">
                <Quote aria-hidden className="h-7 w-7 text-brand-terra" strokeWidth={2.2} />
                <blockquote className="mt-2 font-display text-[16px] font-semibold leading-snug text-white">
                  {tHero('quote.kicker')}
                </blockquote>
                <p className="mt-2 text-[13px] leading-relaxed text-brand-cream/65">{tHero('quote.body')}</p>
                <figcaption className="mt-3 font-mono text-[12px] text-brand-terra/90">
                  {tHero('quote.attribution')}
                </figcaption>
              </figure>
            </div>
          </div>
        </div>

        {/* scroll cue */}
        <a
          href="#problem"
          data-hero="scrollcue"
          data-scrollcue
          style={{ opacity: 0 }}
          className="absolute inset-x-0 bottom-6 z-[3] mx-auto flex w-max flex-col items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-body-text-muted transition-colors hover:text-brand-terra"
        >
          {tHero('scrollCue')}
          <span className="cue-dot text-[15px] leading-none">↓</span>
        </a>
      </section>

      {/* ================= PROBLEM (animated cobalt) ================= */}
      <section
        id="problem"
        className="relative scroll-mt-20 overflow-hidden bg-brand-navy py-20 text-brand-cream lg:py-28"
      >
        <FlowLines className="pointer-events-none absolute inset-0 h-full w-full opacity-90" idSuffix="problem" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_100%_0%,rgba(195,107,78,0.16),transparent_55%)]" />
        <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div data-reveal>
            <Eyebrow className="text-brand-terra">{tProblem('eyebrow')}</Eyebrow>
          </div>
          <h2
            data-reveal
            className="mt-5 max-w-[24ch] font-display text-[clamp(26px,3.6vw,42px)] font-bold leading-[1.1] tracking-tight text-brand-cream"
          >
            {tProblem('title')}
          </h2>
          <p data-reveal className="mt-5 max-w-[72ch] text-[18px] leading-relaxed text-brand-cream/75">
            {tProblem('body')}
          </p>
          <div data-reveal-group className="mt-12 grid gap-4 sm:grid-cols-3">
            {(['target', 'actual', 'locked'] as const).map((key) => (
              <div
                key={key}
                data-reveal
                className="rounded-card border border-white/10 bg-white/4 p-7 backdrop-blur-sm"
              >
                <div
                  className="font-mono text-[40px] font-medium leading-none text-brand-terra sm:text-[46px]"
                  data-count={tProblem(`stats.${key}.value`)}
                  data-suffix={tProblem(`stats.${key}.suffix`)}
                >
                  {tProblem(`stats.${key}.value`)}
                  {tProblem(`stats.${key}.suffix`)}
                </div>
                <div className="mt-3 text-[14.5px] leading-snug text-brand-cream/70">
                  {tProblem(`stats.${key}.label`)}
                </div>
              </div>
            ))}
          </div>
          <p data-reveal className="mt-6 font-mono text-[12px] text-brand-cream/45">{tProblem('note')}</p>
        </div>
      </section>

      {/* ================= SOLUTION ================= */}
      <section id="solution" className="scroll-mt-20 border-t border-hairline bg-card py-20 lg:py-28">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div data-reveal>
            <Eyebrow className="text-brand-terra">{tSol('eyebrow')}</Eyebrow>
          </div>
          <h2 data-reveal className={`mt-5 max-w-[22ch] ${HEADLINE_H2}`}>
            {tSol('title')}
          </h2>
          <p data-reveal className="mt-5 max-w-[72ch] text-[18px] leading-relaxed text-body-text-muted">
            {tSol('body')}
          </p>

          <div data-reveal className="mt-12 rounded-[22px] border border-hairline bg-plate-cream p-5 shadow-[0_24px_50px_-30px_rgba(3,35,65,0.3)] sm:p-8">
            <SolutionDiagram
              labels={{
                sourcesTitle: tDiagram('sourcesTitle'),
                sourcesSub: tDiagram('sourcesSub'),
                src1: tDiagram('src1'),
                src2: tDiagram('src2'),
                src3: tDiagram('src3'),
                hubTitle: tDiagram('hubTitle'),
                hubSub: tDiagram('hubSub'),
                out1Title: tDiagram('out1Title'),
                out1Sub: tDiagram('out1Sub'),
                out2Title: tDiagram('out2Title'),
                out2Sub: tDiagram('out2Sub'),
              }}
            />
          </div>

          <div data-reveal-group className="mt-6 grid gap-4 md:grid-cols-2">
            {(['sme', 'bank'] as const).map((who) => (
              <div key={who} data-reveal className="rounded-card border border-hairline bg-page-bg p-6">
                <div className="font-display text-[17px] font-bold text-brand-navy dark:text-brand-cream">
                  {tSol(`${who}.title`)}
                </div>
                <p className="mt-2 text-[14.5px] leading-relaxed text-body-text-muted">{tSol(`${who}.body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= PLATFORM ================= */}
      <section id="platform" className="scroll-mt-20 border-t border-hairline bg-page-bg py-20 lg:py-28">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div data-reveal>
            <Eyebrow className="text-brand-terra">{tPlat('eyebrow')}</Eyebrow>
          </div>
          <h2 data-reveal className={`mt-5 max-w-[24ch] ${HEADLINE_H2}`}>
            {tPlat('title')}
          </h2>
          <p data-reveal className="mt-5 max-w-[60ch] text-[18px] leading-relaxed text-body-text-muted">
            {tPlat('body')}
          </p>
          <div data-reveal-group className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {platformFeatures.map((f, i) => (
              <div
                key={f.k}
                data-reveal
                className="group rounded-card border border-hairline bg-card p-6"
              >
                <div className="flex items-center justify-between">
                  <f.icon className="h-9 w-9 text-brand-navy dark:text-brand-cream" />
                  <span className="font-mono text-[13px] font-medium text-brand-terra/80">0{i + 1}</span>
                </div>
                <h3 className="mt-5 font-display text-[17px] font-bold text-brand-navy dark:text-brand-cream">
                  {tPlat(`features.${f.k}.title`)}
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-body-text-muted">
                  {tPlat(`features.${f.k}.body`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= ENGINE ================= */}
      <section id="engine" className="scroll-mt-20 border-t border-hairline bg-card py-20 lg:py-28">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div data-reveal>
            <Eyebrow className="text-brand-terra">{tEng('eyebrow')}</Eyebrow>
          </div>
          <h2 data-reveal className={`mt-5 max-w-[24ch] ${HEADLINE_H2}`}>
            {tEng('title')}
          </h2>
          <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p data-reveal className="max-w-[62ch] text-[18px] leading-relaxed text-body-text-muted">
                {tEng('body')}
              </p>
              <div data-reveal-group className="mt-6 flex flex-col gap-3.5">
                {engineFeatures.map((feat) => (
                  <div key={feat.k} data-reveal className="flex items-start gap-3.5 rounded-xl border border-hairline bg-page-bg p-4">
                    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-tile bg-chip-info-bg text-brand-navy dark:text-brand-cream">
                      <feat.icon className="h-[22px] w-[22px]" />
                    </span>
                    <div>
                      <div className="text-[15.5px] font-bold text-body-text">{tEng(`features.${feat.k}.title`)}</div>
                      <div className="mt-0.5 text-[13.5px] text-body-text-muted">{tEng(`features.${feat.k}.body`)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div data-reveal className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-brand-navy to-[#06192e] p-8 text-brand-cream shadow-[0_28px_60px_-30px_rgba(3,35,65,0.7)]">
              <FlowLines className="pointer-events-none absolute inset-0 h-full w-full opacity-40" idSuffix="engine" />
              <div className="relative pb-4 text-center">
                <div className="font-display text-[48px] font-bold leading-none text-brand-terra">
                  {tEng('viz.score')}
                </div>
                <div className="mt-2 font-mono text-[12px] uppercase tracking-[0.08em] text-brand-cream/60">
                  {tEng('viz.scoreLabel')}
                </div>
              </div>
              {(
                [
                  { label: tEng('viz.repayment'), pct: 92 },
                  { label: tEng('viz.growth'), pct: 78 },
                  { label: tEng('viz.stability'), pct: 85 },
                ] as const
              ).map((row) => (
                <div key={row.label} className="relative flex items-center justify-between gap-4 border-b border-white/10 py-3.5 text-[14px] last:border-none">
                  <span className="text-brand-cream/85">{row.label}</span>
                  <span className="h-2 w-[120px] shrink-0 overflow-hidden rounded-full bg-white/10">
                    <span className="block h-full rounded-full bg-brand-terra" style={{ width: `${row.pct}%` }} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================= PRODUCT - one platform, four views ================= */}
      <section className="scroll-mt-20 border-t border-hairline bg-page-bg py-20 lg:py-28">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div data-reveal>
            <Eyebrow className="text-brand-terra">{tProduct('eyebrow')}</Eyebrow>
          </div>
          <h2 data-reveal className={`mt-5 max-w-[20ch] ${HEADLINE_H2}`}>
            {tProduct('title')}
          </h2>
          <p data-reveal className="mt-5 max-w-[64ch] text-[18px] leading-relaxed text-body-text-muted">
            {tProduct('body')}
          </p>

          <div data-reveal-group className="mt-12 grid gap-5 sm:grid-cols-2">
            {screens.map((s) => (
              <figure key={s.k} data-reveal className="overflow-hidden rounded-card border border-hairline bg-card shadow-[0_20px_44px_-30px_rgba(3,35,65,0.4)]">
                <div className="flex items-center gap-2 border-b border-hairline px-4 py-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-hairline-strong" />
                  <span className="h-2.5 w-2.5 rounded-full bg-hairline-strong" />
                  <span className="h-2.5 w-2.5 rounded-full bg-hairline-strong" />
                  <span className="ms-2 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.08em] text-body-text-muted">
                    <s.icon className="h-4 w-4 text-brand-terra" />
                    {tProduct(`screens.${s.k}.title`)}
                  </span>
                </div>
                <div className="aspect-[16/10] w-full bg-page-bg">{s.preview}</div>
                <figcaption className="px-5 py-4">
                  <div className="font-display text-[15.5px] font-bold text-brand-navy dark:text-brand-cream">
                    {tProduct(`screens.${s.k}.title`)}
                  </div>
                  <div className="mt-1 text-[13.5px] text-body-text-muted">{tProduct(`screens.${s.k}.body`)}</div>
                </figcaption>
              </figure>
            ))}
          </div>

          {/* signature financing card (the optional feature) */}
          <div data-reveal className="mt-10 grid gap-4 lg:grid-cols-[1fr_1.1fr] lg:items-center">
            <FinCard
              badge={tProduct('showcase.badge')}
              amount={tProduct('showcase.amount')}
              amountCaption={tProduct('showcase.available')}
              rows={[
                { label: tProduct('showcase.profitLabel'), value: tProduct('showcase.profitValue') },
                { label: tProduct('showcase.drawnLabel'), value: tProduct('showcase.drawnValue') },
                { label: tProduct('showcase.reviewLabel'), value: tProduct('showcase.reviewValue') },
              ]}
            />
            <div className="grid grid-cols-3 gap-3">
              {(['stat1', 'stat2', 'stat3'] as const).map((k, i) => (
                <div key={k} className="rounded-card border border-hairline bg-card p-4">
                  <div className="font-mono text-[22px] font-medium text-accent">{tProduct(`showcase.${k}Value`)}</div>
                  <div className="mt-1 text-[12px] text-body-text-muted">{tProduct(`showcase.${k}Label`)}</div>
                  <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-hairline-strong">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${[92, 78, 85][i]}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================= FOR ALINMA ================= */}
      <section id="alinma" className="scroll-mt-20 border-t border-hairline bg-chip-good-bg py-20 lg:py-28">
        <div className="mx-auto grid w-full max-w-6xl gap-11 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <div data-reveal>
              <Eyebrow className="text-risk-a">{tAlinma('eyebrow')}</Eyebrow>
            </div>
            <h2 data-reveal className={`mt-5 max-w-[24ch] ${HEADLINE_H2}`}>
              {tAlinma('title')}
            </h2>
            <p data-reveal className="mt-5 max-w-[62ch] text-[18px] leading-relaxed text-body-text-muted">
              {tAlinma('body')}
            </p>
            <Link
              data-reveal
              href="/login"
              className="mt-7 inline-flex h-12 items-center justify-center rounded-tile bg-brand-navy px-7 text-body font-bold text-brand-cream"
            >
              {tAlinma('cta')}
            </Link>
          </div>
          <div data-reveal-group className="rounded-[22px] border border-chip-good-border bg-card p-7">
            {(['p1', 'p2', 'p3', 'p4'] as const).map((p) => (
              <div key={p} data-reveal className="flex items-start gap-3 py-3 text-[15px]">
                <CheckCircle2 aria-hidden className="mt-0.5 h-[22px] w-[22px] shrink-0 text-risk-a" strokeWidth={2.2} />
                <span className="text-body-text">{tAlinma(`points.${p}`)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= BUSINESS MODEL ================= */}
      <section id="model" className="scroll-mt-20 border-t border-hairline bg-card py-20 lg:py-28">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div data-reveal>
            <Eyebrow className="text-brand-terra">{tModel('eyebrow')}</Eyebrow>
          </div>
          <h2 data-reveal className={`mt-5 max-w-[22ch] ${HEADLINE_H2}`}>
            {tModel('title')}
          </h2>
          <p data-reveal className="mt-5 max-w-[72ch] text-[18px] leading-relaxed text-body-text-muted">
            {tModel('body')}
          </p>

          <div data-reveal-group className="mt-12 grid gap-4 md:grid-cols-3">
            {tiers.map((tier, i) => {
              const featured = i === 1;
              return (
                <div
                  key={tier}
                  data-reveal
                  className={`relative flex flex-col rounded-card border p-7 ${
                    featured
                      ? 'border-brand-terra bg-brand-navy text-brand-cream shadow-[0_28px_60px_-30px_rgba(3,35,65,0.7)]'
                      : 'border-hairline bg-page-bg'
                  }`}
                >
                  <div
                    className={`font-mono text-[11px] uppercase tracking-[0.12em] ${
                      featured ? 'text-brand-terra' : 'text-brand-terra/80'
                    }`}
                  >
                    {tModel(`tiers.${tier}.meta`)}
                  </div>
                  <div
                    className={`mt-2 font-display text-[24px] font-bold ${
                      featured ? 'text-white' : 'text-brand-navy dark:text-brand-cream'
                    }`}
                  >
                    {tModel(`tiers.${tier}.name`)}
                  </div>
                  <div
                    className={`mt-3 font-mono text-[13px] ${featured ? 'text-brand-cream/70' : 'text-body-text-muted'}`}
                  >
                    {tModel(`tiers.${tier}.priceLabel`)}
                  </div>
                  <div className={`mt-5 h-px w-full ${featured ? 'bg-white/15' : 'bg-hairline'}`} />
                  <ul className="mt-5 flex flex-col gap-3">
                    {(['f1', 'f2', 'f3'] as const).map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-[14px]">
                        <CheckCircle2
                          aria-hidden
                          className={`mt-0.5 h-[18px] w-[18px] shrink-0 ${featured ? 'text-brand-terra' : 'text-risk-a'}`}
                          strokeWidth={2.4}
                        />
                        <span className={featured ? 'text-brand-cream/90' : 'text-body-text'}>
                          {tModel(`tiers.${tier}.${f}`)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          <p data-reveal className="mt-6 flex items-center gap-2 font-mono text-[12.5px] text-risk-a">
            <IconRiskShield className="h-4 w-4" />
            {tModel('note')}
          </p>
        </div>
      </section>

      {/* ================= FINAL CTA ================= */}
      <section
        id="apply"
        className="relative overflow-hidden border-t border-hairline bg-brand-navy py-24 text-center text-brand-cream"
      >
        <FlowLines className="pointer-events-none absolute inset-0 h-full w-full opacity-80" idSuffix="cta" />
        <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6">
          <h2 data-reveal className="mx-auto max-w-[20ch] font-display text-[clamp(28px,4vw,48px)] font-bold leading-tight text-white">
            {tFinal('title')}
          </h2>
          <p data-reveal className="mx-auto mt-5 max-w-[54ch] text-[18px] leading-relaxed text-brand-cream/75">
            {tFinal('subtitle')}
          </p>
          <div data-reveal>
            <Link
              href="/login"
              className="mt-8 inline-flex h-12 items-center justify-center rounded-tile bg-accent px-8 text-body font-bold text-accent-foreground shadow-[0_14px_30px_-12px_rgba(195,107,78,0.9)]"
            >
              {tFinal('cta')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
