import { NavLink, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';

const ITEMS = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/workout', label: 'Workout', icon: '🏋️' },
  { to: '/meals', label: 'Meals', icon: '🍽️' },
  { to: '/sleep', label: 'Sleep', icon: '😴' },
  { to: '/profile', label: 'Profile', icon: '👤' },
];

export default function Nav() {
  const reduceMotion = useReducedMotion();
  const { pathname } = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-border bg-surface/90 backdrop-blur-xl">
      {ITEMS.map((item) => {
        const isActive = pathname === item.to;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={() =>
              `relative flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors duration-200 ${
                isActive ? 'text-accent' : 'text-text-muted hover:text-text'
              }`
            }
          >
            {isActive && (
              <motion.div
                layoutId="nav-pill"
                className="absolute inset-x-2 top-0.5 bottom-0.5 -z-10 rounded-2xl bg-accent/15 shadow-[0_0_16px_-2px_var(--color-accent)]"
                transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 32 }}
              />
            )}
            <motion.span
              className="text-lg leading-none"
              style={isActive ? { filter: 'drop-shadow(0 0 6px color-mix(in srgb, var(--color-accent) 70%, transparent))' } : undefined}
              animate={isActive ? { scale: 1.22, y: -1 } : { scale: 1, y: 0 }}
              whileTap={reduceMotion ? undefined : { scale: 0.85 }}
              transition={{ type: 'spring', stiffness: 420, damping: 18 }}
            >
              {item.icon}
            </motion.span>
            <span className={isActive ? 'font-bold' : ''}>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
