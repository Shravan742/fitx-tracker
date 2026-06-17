import { db } from './db.js';
import { getActiveProfile, setActiveProfile, getProfile, saveProfile } from './profiles.js';
import { renderOnboarding } from './views/onboarding.js';
import { renderDashboard } from './views/dashboard.js';
import { renderWorkout } from './views/workout.js';
import { renderMeals } from './views/meals.js';
import { renderSleep } from './views/sleep.js';
import { renderProfile } from './views/profile.js';
import { syncGist } from './sync.js';

const VIEWS = ['dashboard', 'workout', 'meals', 'sleep', 'profile'];

async function init() {
  await db.open();

  const profileId = getActiveProfile();
  const profile = await getProfile(profileId);

  updateProfileBtn(profile);

  if (!profile || !profile.onboardingDone) {
    showView('onboarding');
    renderOnboarding(profileId, onOnboardingComplete);
    return;
  }

  setupNav();
  showView('dashboard');
  renderDashboard(profile);

  // Attempt background sync
  if (navigator.onLine) syncGist().catch(() => {});
}

function onOnboardingComplete(profile) {
  updateProfileBtn(profile);
  setupNav();
  showView('dashboard');
  renderDashboard(profile);
}

function setupNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const view = btn.dataset.view;
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      showView(view);

      const profileId = getActiveProfile();
      const profile = await getProfile(profileId);

      if (view === 'dashboard') renderDashboard(profile);
      else if (view === 'workout') renderWorkout(profile);
      else if (view === 'meals') renderMeals(profile);
      else if (view === 'sleep') renderSleep(profile);
      else if (view === 'profile') renderProfile(profile, refreshAll);
    });
  });

  document.getElementById('profile-switcher').addEventListener('click', switchProfile);
}

function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  const el = document.getElementById(`view-${name}`);
  if (el) el.classList.remove('hidden');

  // Hide nav on onboarding
  const nav = document.getElementById('bottom-nav');
  nav.style.display = name === 'onboarding' ? 'none' : 'flex';
}

function updateProfileBtn(profile) {
  const btn = document.getElementById('profile-switcher');
  if (!profile) { btn.textContent = '?'; return; }
  btn.textContent = profile.name ? profile.name[0].toUpperCase() : '?';
  btn.title = `Active: ${profile.name || 'Unknown'} — tap to switch`;
}

async function switchProfile() {
  const current = getActiveProfile();
  const next = current === 'user1' ? 'user2' : 'user1';
  setActiveProfile(next);
  const profile = await getProfile(next);
  updateProfileBtn(profile);

  if (!profile || !profile.onboardingDone) {
    showView('onboarding');
    renderOnboarding(next, onOnboardingComplete);
    return;
  }

  showView('dashboard');
  renderDashboard(profile);
}

async function refreshAll() {
  const profileId = getActiveProfile();
  const profile = await getProfile(profileId);
  updateProfileBtn(profile);
  renderDashboard(profile);
}

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

init();
