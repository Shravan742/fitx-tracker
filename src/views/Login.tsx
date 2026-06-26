import { useState } from 'react';
import { motion } from 'framer-motion';
import { logIn } from '../lib/auth';
import Card from '../components/Card';

export default function Login({ onSwitchToSignup }: { onSwitchToSignup: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await logIn(email.trim(), password);
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <h1 className="text-center text-2xl font-bold">
        Welcome back to <span className="gradient-text">GymOS</span>
      </h1>
      <p className="mb-6 text-center text-sm text-text-muted">Log in to your account</p>

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
              required
            />
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
              'Log in'
            )}
          </button>
        </form>
      </Card>

      <p className="mt-4 text-center text-sm text-text-muted">
        No account yet?{' '}
        <button type="button" className="font-semibold text-accent" onClick={onSwitchToSignup}>
          Sign up
        </button>
      </p>
    </div>
  );
}

export function friendlyAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
    return 'Incorrect email or password.';
  }
  if (code.includes('email-already-in-use')) return 'An account with this email already exists.';
  if (code.includes('weak-password')) return 'Password must be at least 6 characters.';
  if (code.includes('invalid-email')) return 'That email address looks invalid.';
  return 'Something went wrong — please try again.';
}
