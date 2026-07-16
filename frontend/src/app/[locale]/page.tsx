import { useTranslations } from 'next-intl';

export default function LandingPage() {
  const tHero = useTranslations('hero');
  const tHow = useTranslations('howItWorks');

  const steps = [
    { key: 'step1', title: tHow('step1.title'), body: tHow('step1.body') },
    { key: 'step2', title: tHow('step2.title'), body: tHow('step2.body') },
    { key: 'step3', title: tHow('step3.title'), body: tHow('step3.body') },
  ];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-16 px-4 py-12 sm:px-6 sm:py-16 lg:gap-24 lg:py-24">
      <section className="flex flex-col items-start gap-6 lg:gap-8">
        <h1 className="text-h1 font-bold text-brand-navy dark:text-brand-cream">
          {tHero('headline')}
        </h1>
        <p className="max-w-2xl text-body text-body-text-muted">{tHero('subheadline')}</p>
        <a
          href="#how-it-works"
          className="inline-flex h-11 items-center justify-center rounded-pill bg-accent px-6 text-body font-bold text-accent-foreground transition-opacity hover:opacity-90"
        >
          {tHero('cta')}
        </a>
      </section>

      <section id="how-it-works" className="flex scroll-mt-24 flex-col gap-6">
        <h2 className="text-h1 font-bold text-brand-navy dark:text-brand-cream">
          {tHow('title')}
        </h2>
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}
        >
          {steps.map((step) => (
            <div
              key={step.key}
              className="flex flex-col gap-2 rounded-card border border-card-border bg-card p-6"
            >
              <h3 className="text-body font-bold text-body-text">{step.title}</h3>
              <p className="text-body text-body-text-muted">{step.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
