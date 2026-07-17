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

    // ---- Hero entrance timeline ----
    const hero = (sel: string) => document.querySelectorAll(`[data-hero="${sel}"]`);
    const tl = anime.timeline({ easing: EASE, duration: 850 });
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
          if (el.hasAttribute('data-reveal-group')) {
            const items = el.querySelectorAll('[data-reveal]');
            anime({
              targets: items,
              opacity: [0, 1],
              translateY: [26, 0],
              delay: anime.stagger(85),
              duration: 720,
              easing: 'easeOutCubic',
            });
          } else {
            anime({ targets: el, opacity: [0, 1], translateY: [26, 0], duration: 720, easing: 'easeOutCubic' });
          }
          el.querySelectorAll<HTMLElement>('[data-count]').forEach(runCount);
          if (el.hasAttribute('data-count')) runCount(el);
        });
      },
      { threshold: 0.14, rootMargin: '0px 0px -8% 0px' },
    );
    [...solos, ...groups].forEach((el) => revealIO.observe(el));
    cleanups.push(() => revealIO.disconnect());

    // Safety net: if any reveal never fired (IO hiccup, print/screenshot with no
    // scroll), force everything visible after a grace period so content can
    // never get stranded at opacity 0 during a live demo.
    const safety = window.setTimeout(() => {
      document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
        if (getComputedStyle(el).opacity === '0') el.style.opacity = '1';
      });
    }, 6000);
    cleanups.push(() => window.clearTimeout(safety));

    // ---- Nav scroll-spy ----
    const links = Array.from(document.querySelectorAll<HTMLElement>('[data-navlink]'));
    if (links.length) {
      const sections = links
        .map((l) => document.getElementById(l.getAttribute('data-navlink') ?? ''))
        .filter((s): s is HTMLElement => !!s);
      const spyIO = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const id = entry.target.id;
            links.forEach((l) => l.classList.toggle('is-active', l.getAttribute('data-navlink') === id));
          });
        },
        { threshold: 0.5, rootMargin: '-20% 0px -40% 0px' },
      );
      sections.forEach((s) => spyIO.observe(s));
      cleanups.push(() => spyIO.disconnect());
    }

    // ---- Scroll-progress bar + sticky mini-nav reveal ----
    const bar = document.querySelector<HTMLElement>('[data-progress]');
    if (bar) bar.style.transformOrigin = isArabic ? 'right center' : 'left center';
    const stickyNav = document.querySelector<HTMLElement>('[data-stickynav]');
    const onScroll = () => {
      const h = document.documentElement;
      if (bar) {
        const p = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight);
        bar.style.transform = `scaleX(${Math.min(1, Math.max(0, p))})`;
      }
      if (stickyNav) stickyNav.classList.toggle('is-visible', h.scrollTop > window.innerHeight * 0.82);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    cleanups.push(() => window.removeEventListener('scroll', onScroll));

    return () => cleanups.forEach((fn) => fn());
  }, []);
}
