import { NavLink } from 'react-router-dom';

const ITEMS = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/workout', label: 'Workout', icon: '🏋️' },
  { to: '/meals', label: 'Meals', icon: '🍽️' },
  { to: '/sleep', label: 'Sleep', icon: '😴' },
  { to: '/profile', label: 'Profile', icon: '👤' },
];

export default function Nav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-border bg-surface/95 backdrop-blur-md">
      {ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
              isActive ? 'text-accent' : 'text-text-muted hover:text-text'
            }`
          }
        >
          <span className="text-lg leading-none">{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
