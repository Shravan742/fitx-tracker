import type { ReactNode } from 'react';

export default function Card({
  title,
  children,
  className = '',
}: {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-4 ${className}`}>
      {title && <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">{title}</div>}
      {children}
    </div>
  );
}
