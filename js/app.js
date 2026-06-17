import { db } from './db.js';
import { getActiveProfile, setActiveProfile, getProfile, saveProfile } from './profiles.js';
import { syncGist } from './sync.js';

// Cache-bust version — forces fresh module load on every page visit
const V = Date.now();

async function loadView(name) {
  const mod = await import(`./views/${name}.js?v=${V}`);
  return mod;
}

const VIEWS = ['dashboard', 'workout', 'meals', 'sleep', 'profile'];

async function init() {
  await db.open();

  const profileId = getActiveProfile();
  const profile   = await getProfile(profileId);

  updateProfileBtn(profile);

  if (!profile || !profile.onboardingDone) {
    showView('onboarding');
    const { renderOnboarding } = await loadView('onboarding');
    renderOnboarding(profileId, onOnboardingComplete);
    return;
  }

  setupNav();
  showView('dashboard');
  const { renderDashboard } = await loadView('dashboard');
  renderDashboard(profile);

  if (navigator.onLine) syncGist().catch(() => {});
}

async function onOnboardingComplete(profile) {
  updateProfileBtn(profile);
  setupNav();
  showView('dashboard');
  const { renderDashboard } = await loadView('dashboard');
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
      const profile   = await getProfile(profileId);
      const mod       = await loadView(view);

      if (view === 'dashboard') mod.renderDashboard(profile);
      else if (view === 'workout') mod.renderWorkout(profile);
      else if (view === 'meals')   mod.renderMeals(profile);
      else if (view === 'sleep')   mod.renderSleep(profile);
      else if (view === 'profile') mod.renderProfile(profile, refreshAll);
    });
  });

  document.getElementById('profile-switcher').addEventListener('click', switchProfile);
}

function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  const el = document.getElementById(`view-${name}`);
  if (el) el.classList.remove('hidden');
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
  const next    = current === 'user1' ? 'user2' : 'user1';
  setActiveProfile(next);
  const profile = await getProfile(next);
  updateProfileBtn(profile);

  if (!profile || !profile.onboardingDone) {
    showView('onboarding');
    const { renderOnboarding } = await loadView('onboarding');
    renderOnboarding(next, onOnboardingComplete);
    return;
  }

  setupNav();
  showView('dashboard');
  const { renderDashboard } = await loadView('dashboard');
  renderDashboard(profile);
}

async function refreshAll() {
  const profileId = getActiveProfile();
  const profile   = await getProfile(profileId);
  updateProfileBtn(profile);
  const { renderDashboard } = await loadView('dashboard');
  renderDashboard(profile);
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

init();
