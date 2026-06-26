import { useState } from 'react';
import { motion } from 'framer-motion';
import { signUp } from '../lib/auth';
import Card from '../components/Card';
import { friendlyAuthError } from './Login';

export default function Signup({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signUp(email.trim(), password);
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <h1 className="text-center text-2xl font-bold">
        Create your <span className="gradient-text">GymOS</span> account
      </h1>
      <p className="mb-6 text-center text-sm text-text-muted">Sign up to start tracking</p>

      <Card variant="glow">
        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs text-text-muted">Email</span>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-text-muted">Password</span>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
            <span className="mt-1 block text-[0.7rem] text-text-muted">At least 6 characters.</span>
          </label>
          {error && <p className="text-xs text-danger">{error}</p>}
          <button type="submit" className="btn-primary w-full disabled:cursor-not-allowed" disabled={loading}>
            {loading ? (
              <motion.span
                className="mx-auto inline-block h-3.5 w-3.5 rounded-full border-2 border-bg/40 border-t-bg"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
              />
            ) : (
              'Sign up'
            )}
          </button>
        </form>
      </Card>

      <p className="mt-4 text-center text-sm text-text-muted">
        Already have an account?{' '}
        <button type="button" className="font-semibold text-accent" onClick={onSwitchToLogin}>
          Log in
        </button>
      </p>
    </div>
  );
}
