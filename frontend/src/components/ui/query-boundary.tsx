'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { CircleAlert, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/primitives';

/**
 * The one place a data screen resolves loading / error / empty.
 *
 * Pass the flags straight off a React Query result. `isEmpty` is the caller's
 * call (an empty list vs a null object differ), so it is opt-in rather than
 * inferred.
 */
export function QueryBoundary({
  isLoading,
  isError,
  onRetry,
  isEmpty = false,
  emptyTitle,
  emptyBody,
  emptyAction,
  skeleton,
  children,
}: {
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyBody?: string;
  emptyAction?: ReactNode;
  skeleton?: ReactNode;
  children: ReactNode;
}) {
  const t = useTranslations('state');

  if (isLoading) {
    return <>{skeleton ?? <SkeletonCards />}</>;
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-card border border-card-border bg-card px-6 py-12 text-center">
        <CircleAlert aria-hidden className="h-8 w-8 text-risk-d" />
        <div className="flex flex-col gap-1">
          <h2 className="text-body font-bold text-body-text">{t('errorTitle')}</h2>
          <p className="text-meta text-body-text-muted">{t('errorBody')}</p>
        </div>
        {onRetry ? (
          <Button variant="secondary" onClick={onRetry}>
            {t('retry')}
          </Button>
        ) : null}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-card border border-card-border bg-card px-6 py-12 text-center">
        <Inbox aria-hidden className="h-8 w-8 text-muted-text" />
        <div className="flex max-w-sm flex-col gap-1">
          <h2 className="text-body font-bold text-body-text">{emptyTitle ?? t('emptyTitle')}</h2>
          {emptyBody ? <p className="text-meta text-body-text-muted">{emptyBody}</p> : null}
        </div>
        {emptyAction}
      </div>
    );
  }

  return <>{children}</>;
}

/** Neutral shimmer block — dimensions come from the caller's layout. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-tile bg-hairline-strong ${className}`} />;
}

export function SkeletonCards({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-24 w-full" />
      ))}
    </div>
  );
}
