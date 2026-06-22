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
      <span className="text-xl font-extrabold tracking-tight text-accent">FitX</span>
      <button
        onClick={switchProfile}
        title={profile ? `Active: ${profile.name} — tap to switch` : 'No profile'}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-surface2 text-sm font-bold text-text"
      >
        {profile?.name ? profile.name[0].toUpperCase() : '?'}
      </button>
    </header>
  );
}
