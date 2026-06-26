import { useState } from 'react';
import { motion } from 'framer-motion';
import { usePartner } from '../lib/usePartner';
import Card from './Card';

export default function PartnerLinkCard({ uid, email }: { uid: string; email: string }) {
  const { partnerProfile, outgoing, loading, sendInvite, cancelInvite } = usePartner(uid, email);
  const [toEmail, setToEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSending(true);
    try {
      await sendInvite(toEmail.trim());
      setToEmail('');
    } catch (err) {
      setError((err as Error)?.message || 'Could not send invite.');
    } finally {
      setSending(false);
    }
  };

  if (loading) return null;

  return (
    <Card title="Partner">
      {partnerProfile ? (
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Linked with {partnerProfile.name}</div>
            <div className="text-xs text-text-muted">{partnerProfile.email}</div>
          </div>
          <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">✓ Connected</span>
        </div>
      ) : outgoing ? (
        <div className="space-y-2">
          <p className="text-sm">
            Invite sent to <strong>{outgoing.toEmail}</strong> — waiting for them to accept.
          </p>
          <button className="btn-secondary w-full text-danger" onClick={cancelInvite}>
            Cancel invite
          </button>
        </div>
      ) : (
        <form onSubmit={handleSend} className="space-y-2">
          <p className="text-xs text-text-muted">
            Invite your partner by email to plan workouts and meals together. They'll need to accept it from their own
            account before "Cook together" mode becomes available.
          </p>
          <input
            type="email"
            className="input"
            placeholder="partner@email.com"
            value={toEmail}
            onChange={(e) => setToEmail(e.target.value)}
            required
          />
          {error && <p className="text-xs text-danger">{error}</p>}
          <button type="submit" className="btn-primary w-full disabled:cursor-not-allowed" disabled={sending}>
            {sending ? (
              <motion.span
                className="mx-auto inline-block h-3.5 w-3.5 rounded-full border-2 border-bg/40 border-t-bg"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
              />
            ) : (
              'Send invite'
            )}
          </button>
        </form>
      )}
    </Card>
  );
}
