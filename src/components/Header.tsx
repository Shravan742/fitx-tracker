import { useProfile } from '../lib/ProfileContext';
import { getActiveProfileId, setActiveProfileId } from '../lib/storage';

export default function Header() {
  const { profile, refresh } = useProfile();

  const switchProfile = async () => {
    const current = getActiveProfileId();
    const next = current === 'user1' ? 'user2' : 'user1';
    setActiveProfileId(next);
    await refresh();
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-bg/95 px-4 py-3 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-sm font-black text-bg">G</span>
        <span className="text-xl font-black uppercase tracking-tight text-text">
          Gym<span className="text-accent">OS</span>
        </span>
      </div>
      <button
        onClick={switchProfile}
        title={profile ? `Active: ${profile.name} — tap to switch` : 'No profile'}
        className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-bg shadow-lg shadow-accent/30"
        style={{ backgroundImage: 'linear-gradient(135deg, var(--color-accent), var(--color-accent2))' }}
      >
        {profile?.name ? profile.name[0].toUpperCase() : '?'}
      </button>
    </header>
  );
}
