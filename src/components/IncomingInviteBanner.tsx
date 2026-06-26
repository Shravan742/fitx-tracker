import { useState } from 'react';
import { motion } from 'framer-motion';
import { usePartner } from '../lib/usePartner';
import Card from './Card';

export default function IncomingInviteBanner({ uid, email }: { uid: string; email: string }) {
  const { incoming, accept, decline } = usePartner(uid, email);
  const [busy, setBusy] = useState<'accept' | 'decline' | null>(null);

  if (!incoming) return null;

  const handleAccept = async () => {
    setBusy('accept');
    try {
      await accept(incoming.id);
    } finally {
      setBusy(null);
    }
  };
  const handleDecline = async () => {
    setBusy('decline');
    try {
      await decline(incoming.id);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card variant="glow">
      <h4 className="mb-1 text-sm font-semibold">👥 Partner invite</h4>
      <p className="mb-3 text-xs text-text-muted">
        <strong className="text-text">{incoming.fromEmail}</strong> wants to plan workouts and meals together.
      </p>
      <div className="flex gap-2">
        <button className="btn-primary flex-1 disabled:cursor-not-allowed" onClick={handleAccept} disabled={busy !== null}>
          {busy === 'accept' ? (
            <motion.span
              className="mx-auto inline-block h-3.5 w-3.5 rounded-full border-2 border-bg/40 border-t-bg"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
            />
          ) : (
            'Accept'
          )}
        </button>
        <button className="btn-secondary flex-1 disabled:cursor-not-allowed" onClick={handleDecline} disabled={busy !== null}>
          Decline
        </button>
      </div>
    </Card>
  );
}
