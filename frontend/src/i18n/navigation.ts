import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

// Locale-aware navigation primitives (D-08). `Link`/`usePathname`/`useRouter`
// swap the /ar <-> /en prefix while preserving the current path; the resolved
// locale is persisted by the next-intl middleware cookie automatically.
export const { Link, usePathname, useRouter, redirect, getPathname } = createNavigation(routing);
