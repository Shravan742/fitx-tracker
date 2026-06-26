import { Suspense, lazy, useState } from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { ProfileProvider, useProfile } from './lib/ProfileContext';
import Header from './components/Header';
import Nav from './components/Nav';
import Onboarding from './views/Onboarding';
import Login from './views/Login';
import Signup from './views/Signup';

const Dashboard = lazy(() => import('./views/Dashboard'));
const Workout = lazy(() => import('./views/Workout'));
const Meals = lazy(() => import('./views/Meals'));
const Sleep = lazy(() => import('./views/Sleep'));
const ProfileView = lazy(() => import('./views/Profile'));

function ViewFallback() {
  return <div className="py-10 text-center text-text-muted">Loading…</div>;
}

function AnimatedRoutes() {
  const location = useLocation();
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={reduceMotion ? undefined : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      >
        <Suspense fallback={<ViewFallback />}>
          <Routes location={location}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/workout" element={<Workout />} />
            <Route path="/meals" element={<Meals />} />
            <Route path="/sleep" element={<Sleep />} />
            <Route path="/profile" element={<ProfileView />} />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

function AuthGate() {
  const { user, authLoading } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  if (authLoading) {
    return <div className="flex h-dvh items-center justify-center text-text-muted">Loading…</div>;
  }

  if (!user) {
    return mode === 'login' ? (
      <Login onSwitchToSignup={() => setMode('signup')} />
    ) : (
      <Signup onSwitchToLogin={() => setMode('login')} />
    );
  }

  return (
    <ProfileProvider>
      <Shell />
    </ProfileProvider>
  );
}

function Shell() {
  const { profile, loading } = useProfile();

  if (loading) {
    return <div className="flex h-dvh items-center justify-center text-text-muted">Loading…</div>;
  }

  if (!profile || !profile.onboardingDone) {
    return <Onboarding />;
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="flex-1 px-4 pb-24 pt-4">
        <AnimatedRoutes />
      </main>
      <Nav />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <AuthGate />
      </HashRouter>
    </AuthProvider>
  );
}
