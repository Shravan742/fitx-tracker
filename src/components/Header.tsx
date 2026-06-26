import { useState } from 'react';
import { useProfile } from '../lib/ProfileContext';
import { useAuth } from '../lib/AuthContext';
import { logOut } from '../lib/auth';

export default function Header() {
  const { profile } = useProfile();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/95 backdrop-blur-md">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-sm font-black text-bg">G</span>
          <span className="text-xl font-black uppercase tracking-tight text-text">
            Gym<span className="text-accent">OS</span>
          </span>
        </div>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          title={profile ? profile.name : 'Account'}
          className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-bg shadow-lg shadow-accent/30"
          style={{ backgroundImage: 'linear-gradient(135deg, var(--color-accent), var(--color-accent2))' }}
        >
          {profile?.name ? profile.name[0].toUpperCase() : '?'}
        </button>
      </div>
      {menuOpen && (
        <div className="border-t border-border px-4 py-3">
          <div className="text-sm font-semibold">{profile?.name}</div>
          <div className="mb-3 text-xs text-text-muted">{user?.email}</div>
          <button className="btn-secondary w-full text-danger" onClick={logOut}>
            Log out
          </button>
        </div>
      )}
    </header>
  );
}
