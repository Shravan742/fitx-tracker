import { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ProfileProvider, useProfile } from './lib/ProfileContext';
import Header from './components/Header';
import Nav from './components/Nav';
import Onboarding from './views/Onboarding';

const Dashboard = lazy(() => import('./views/Dashboard'));
const Workout = lazy(() => import('./views/Workout'));
const Meals = lazy(() => import('./views/Meals'));
const Sleep = lazy(() => import('./views/Sleep'));
const ProfileView = lazy(() => import('./views/Profile'));

function ViewFallback() {
  return <div className="py-10 text-center text-text-muted">Loading…</div>;
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
        <Suspense fallback={<ViewFallback />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/workout" element={<Workout />} />
            <Route path="/meals" element={<Meals />} />
            <Route path="/sleep" element={<Sleep />} />
            <Route path="/profile" element={<ProfileView />} />
          </Routes>
        </Suspense>
      </main>
      <Nav />
    </div>
  );
}

export default function App() {
  return (
    <ProfileProvider>
      <HashRouter>
        <Shell />
      </HashRouter>
    </ProfileProvider>
  );
}
