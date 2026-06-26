import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export default function Card({
  title,
  children,
  className = '',
  variant = 'default',
  interactive = false,
  delay = 0,
}: {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'glass' | 'glow' | 'stat';
  interactive?: boolean;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();

  const variantClass =
    variant === 'glass'
      ? 'glass rounded-3xl'
      : variant === 'glow'
        ? 'border border-accent/30 bg-card card-glow rounded-3xl'
        : variant === 'stat'
          ? 'border border-border bg-gradient-to-br from-card to-surface2 rounded-3xl'
          : 'border border-border bg-card rounded-2xl';

  return (
    <motion.div
      className={`relative overflow-hidden p-4 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.6)] ${variantClass} ${className}`}
      initial={reduceMotion ? undefined : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={
        interactive && !reduceMotion
          ? { y: -3, boxShadow: '0 12px 32px -10px color-mix(in srgb, var(--color-accent) 35%, transparent)' }
          : undefined
      }
    >
      {title && <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">{title}</div>}
      {children}
    </motion.div>
  );
}
