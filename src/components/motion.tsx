import { useEffect, useRef } from 'react';
import { motion, useReducedMotion, useSpring, useTransform, useMotionValue } from 'framer-motion';
import { staggerContainer, staggerItem } from './motionVariants';

/** Animated counter — smoothly tweens a displayed number toward `value` instead of snapping. */
export function AnimatedNumber({
  value,
  className,
  decimals = 0,
  suffix = '',
  prefix = '',
}: {
  value: number;
  className?: string;
  decimals?: number;
  suffix?: string;
  prefix?: string;
}) {
  const reduceMotion = useReducedMotion();
  const motionVal = useMotionValue(value);
  const spring = useSpring(motionVal, { stiffness: 120, damping: 20, mass: 0.6 });
  const display = useTransform(spring, (v) => `${prefix}${v.toFixed(decimals)}${suffix}`);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (reduceMotion) {
      motionVal.jump(value);
    } else {
      motionVal.set(value);
    }
  }, [value, reduceMotion, motionVal]);

  useEffect(() => {
    const unsub = display.on('change', (v) => {
      if (ref.current) ref.current.textContent = v;
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <span ref={ref} className={className}>{prefix}{value.toFixed(decimals)}{suffix}</span>;
}

/** A progress bar that eases its fill width on mount/update. */
export function ProgressBar({
  pct,
  className = 'h-2',
  trackClassName = 'bg-surface2',
  color,
  gradient,
}: {
  pct: number;
  className?: string;
  trackClassName?: string;
  color?: string;
  gradient?: string;
}) {
  const reduceMotion = useReducedMotion();
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className={`overflow-hidden rounded-full ${trackClassName} ${className}`}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: gradient ?? color }}
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  );
}

/** Wraps a list of children with stagger entrance animation. Degrades gracefully under reduced motion. */
export function StaggerList({
  children,
  className,
  as: Component = motion.div,
}: {
  children: React.ReactNode;
  className?: string;
  as?: typeof motion.div;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <Component
      className={className}
      variants={reduceMotion ? undefined : staggerContainer}
      initial={reduceMotion ? undefined : 'hidden'}
      animate={reduceMotion ? undefined : 'show'}
    >
      {children}
    </Component>
  );
}

export function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div className={className} variants={reduceMotion ? undefined : staggerItem}>
      {children}
    </motion.div>
  );
}
