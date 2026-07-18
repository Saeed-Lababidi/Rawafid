'use client';

import { useEffect } from 'react';
import anime from 'animejs';

/**
 * The landing page's whole motion layer, driven by anime.js (v3).
 *
 * One controller, wired by data-attributes on the markup so the JSX stays
 * declarative:
 *   data-hero="eyebrow|line|sub|cta|meta|card|scrollcue"  hero entrance timeline
 *   data-reveal            fade-and-rise the element when it scrolls in
 *   data-reveal-group      stagger every [data-reveal] inside it as one gesture
 *   data-count="1234"      count the number up on first view (+ data-suffix/prefix/decimals)
 *   data-scrollcue         perpetual bob on the hero scroll hint
 *   data-progress          scroll-progress bar (scaleX 0→1)
 *   data-navlink="id"      nav tab that lights up while #id is the section in view
 *
 * Everything degrades gracefully: no JS / reduced-motion leaves the content
 * fully visible (globals.css only hides [data-reveal] once .anim-ready is set).
 */

const EASE = 'easeOutExpo';
const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

function toArabicDigits(s: string): string {
  return s.replace(/[0-9]/g, (d) => AR_DIGITS[Number(d)]);
}

export function useLandingMotion(): void {
  useEffect(() => {
    const root = document.documentElement;
    const isArabic = root.lang === 'ar';
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    root.classList.add('anim-ready');

    const cleanups: Array<() => void> = [];

    if (reduced) {
      document
        .querySelectorAll<HTMLElement>('[data-reveal], [data-hero]')
        .forEach((el) => {
          el.style.opacity = '1';
          el.style.transform = 'none';
        });
      // still fill count targets with their final value
      document.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
        const raw = el.getAttribute('data-count') ?? '0';
        const decimals = Number(el.getAttribute('data-count-decimals') ?? 0);
        const txt = `${el.getAttribute('data-prefix') ?? ''}${Number(raw).toFixed(decimals)}${el.getAttribute('data-suffix') ?? ''}`;
        el.textContent = isArabic ? toArabicDigits(txt) : txt;
      });
      return;
    }

    // will-change is a promise to the compositor, not a decoration: hint it only
    // for the life of an animation, then hand the layer back. Leaving it on
    // permanently (as the old CSS did) pins a GPU layer per element forever and
    // is itself a scroll-jank source.
    const wc = (els: Iterable<HTMLElement>, on: boolean) => {
      for (const el of els) el.style.willChange = on ? 'transform, opacity' : 'auto';
    };

    // ---- Hero entrance timeline ----
    const hero = (sel: string) => document.querySelectorAll(`[data-hero="${sel}"]`);
    const heroEls = Array.from(document.querySelectorAll<HTMLElement>('[data-hero]'));
    wc(heroEls, true);
    const tl = anime.timeline({
      easing: EASE,
      duration: 850,
      complete: () => wc(heroEls, false),
    });
    tl.add({ targets: hero('eyebrow'), opacity: [0, 1], translateY: [18, 0], duration: 600 })
      .add(
        { targets: hero('line'), opacity: [0, 1], translateY: [40, 0], delay: anime.stagger(90), duration: 900 },
        '-=350',
      )
      .add({ targets: hero('sub'), opacity: [0, 1], translateY: [20, 0], duration: 700 }, '-=550')
      .add({ targets: hero('cta'), opacity: [0, 1], translateY: [16, 0], scale: [0.96, 1], delay: anime.stagger(70), duration: 600 }, '-=450')
      .add({ targets: hero('meta'), opacity: [0, 1], translateY: [14, 0], delay: anime.stagger(60), duration: 550 }, '-=450')
      .add({ targets: hero('card'), opacity: [0, 1], translateX: [isArabic ? -28 : 28, 0], duration: 800 }, '-=750')
      .add({ targets: hero('scrollcue'), opacity: [0, 0.85], duration: 500 }, '-=200');

    // ---- Scroll cue perpetual bob ----
    const cue = document.querySelector('[data-scrollcue] .cue-dot');
    if (cue) {
      anime({ targets: cue, translateY: [0, 7], direction: 'alternate', loop: true, duration: 900, easing: 'easeInOutSine' });
    }

    // ---- Count-ups ----
    const runCount = (el: HTMLElement) => {
      const target = Number(el.getAttribute('data-count') ?? 0);
      const decimals = Number(el.getAttribute('data-count-decimals') ?? 0);
      const prefix = el.getAttribute('data-prefix') ?? '';
      const suffix = el.getAttribute('data-suffix') ?? '';
      const obj = { v: 0 };
      anime({
        targets: obj,
        v: target,
        duration: 1600,
        easing: 'easeOutCubic',
        round: decimals === 0 ? 1 : undefined,
        update: () => {
          const txt = `${prefix}${obj.v.toFixed(decimals)}${suffix}`;
          el.textContent = isArabic ? toArabicDigits(txt) : txt;
        },
      });
    };

    // ---- Reveal observers ----
    const groups = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal-group]'));
    const grouped = new Set<Element>();
    groups.forEach((g) => g.querySelectorAll('[data-reveal]').forEach((el) => grouped.add(el)));
    const solos = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]')).filter((el) => !grouped.has(el));

    const revealIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          revealIO.unobserve(el);
          const reveal = (targets: HTMLElement | NodeListOf<Element>, extra: anime.AnimeParams) =>
            anime({
              targets,
              opacity: [0, 1],
              translateY: [26, 0],
              duration: 720,
              easing: 'easeOutCubic',
              ...extra,
              begin: (a) => a.animatables.forEach((x) => ((x.target as HTMLElement).style.willChange = 'transform, opacity')),
              complete: (a) => a.animatables.forEach((x) => ((x.target as HTMLElement).style.willChange = 'auto')),
            });
          if (el.hasAttribute('data-reveal-group')) {
            reveal(el.querySelectorAll('[data-reveal]'), { delay: anime.stagger(85) });
          } else {
            reveal(el, {});
          }
          el.querySelectorAll<HTMLElement>('[data-count]').forEach(runCount);
          if (el.hasAttribute('data-count')) runCount(el);
        });
      },
      { threshold: 0.14, rootMargin: '0px 0px -8% 0px' },
    );
    [...solos, ...groups].forEach((el) => revealIO.observe(el));
    cleanups.push(() => revealIO.disconnect());

    // Safety net: only rescue elements the user can actually SEE that somehow
    // never got their reveal (an IO hiccup on in-view content). Off-screen
    // elements are deliberately left alone - force-showing them here made every
    // lower section flash, because the IO would then re-run opacity 0->1 the
    // moment they scrolled into view. Scoping the rescue to the viewport keeps
    // nothing stranded on screen while letting the scroll reveals play clean.
    const rescueVisible = () => {
      const vh = window.innerHeight;
      document.querySelectorAll<HTMLElement>('[data-reveal], [data-hero]').forEach((el) => {
        if (getComputedStyle(el).opacity !== '0') return;
        const r = el.getBoundingClientRect();
        if (r.top < vh && r.bottom > 0) el.style.opacity = '1';
      });
    };
    const safety = window.setTimeout(rescueVisible, 3000);
    cleanups.push(() => window.clearTimeout(safety));

    // ---- Pause the flow-line atmosphere while it's off-screen ----
    // stroke-dashoffset can't be GPU-composited, so an always-on drift repaints
    // every frame even when scrolled far past it. Freeze it when out of view.
    const flowSvgs = new Set<Element>();
    document.querySelectorAll('.flow-line').forEach((p) => {
      const svg = p.closest('svg');
      if (svg) flowSvgs.add(svg);
    });
    if (flowSvgs.size) {
      const flowIO = new IntersectionObserver(
        (entries) => entries.forEach((e) => (e.target as HTMLElement).classList.toggle('flow-paused', !e.isIntersecting)),
        { rootMargin: '120px' },
      );
      flowSvgs.forEach((s) => flowIO.observe(s));
      cleanups.push(() => flowIO.disconnect());
    }

    // ---- Nav scroll-spy ----
    // A thin trigger line ~halfway down the viewport (rootMargin collapses the
    // root to a band at 45-55%) with threshold 0: whichever section straddles
    // that line is "current". The old threshold:0.5 could never fire on tall
    // full-height sections - 50% of them never fit the band - so tabs stalled.
    const links = Array.from(document.querySelectorAll<HTMLElement>('[data-navlink]'));
    if (links.length) {
      const sections = [
        ...new Set(
          links
            .map((l) => document.getElementById(l.getAttribute('data-navlink') ?? ''))
            .filter((s): s is HTMLElement => !!s),
        ),
      ];
      const spyIO = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const id = entry.target.id;
            links.forEach((l) => l.classList.toggle('is-active', l.getAttribute('data-navlink') === id));
          });
        },
        { threshold: 0, rootMargin: '-45% 0px -45% 0px' },
      );
      sections.forEach((s) => spyIO.observe(s));
      cleanups.push(() => spyIO.disconnect());
    }

    // ---- Scroll-progress bar + sticky mini-nav reveal ----
    const bar = document.querySelector<HTMLElement>('[data-progress]');
    if (bar) bar.style.transformOrigin = isArabic ? 'right center' : 'left center';
    const stickyNav = document.querySelector<HTMLElement>('[data-stickynav]');
    // Coalesce scroll work into one rAF and only touch the DOM when a value
    // actually changed - a raw per-event handler that reads layout + writes
    // styles on every tick is the difference between 60fps and stutter.
    let ticking = false;
    let lastProgress = -1;
    let lastSticky: boolean | null = null;
    const applyScroll = () => {
      ticking = false;
      const h = document.documentElement;
      if (bar) {
        const p = Math.min(1, Math.max(0, h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight)));
        if (Math.abs(p - lastProgress) > 0.001) {
          bar.style.transform = `scaleX(${p})`;
          lastProgress = p;
        }
      }
      if (stickyNav) {
        const visible = h.scrollTop > window.innerHeight * 0.82;
        if (visible !== lastSticky) {
          stickyNav.classList.toggle('is-visible', visible);
          lastSticky = visible;
        }
      }
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(applyScroll);
    };
    applyScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    cleanups.push(() => window.removeEventListener('scroll', onScroll));

    return () => cleanups.forEach((fn) => fn());
  }, []);
}
