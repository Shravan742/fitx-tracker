import { useState } from 'react';
import type { ActivityLevel, Goal, Profile, Sex } from '../types';
import { getActiveProfileId } from '../lib/storage';
import { useProfile } from '../lib/ProfileContext';

const STEPS = ['Basic info', 'Activity', 'Goal', 'Review'] as const;

export default function Onboarding() {
  const { saveProfile } = useProfile();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<Partial<Profile>>({
    name: '',
    age: undefined,
    sex: 'male',
    heightCm: undefined,
    weightKg: undefined,
    activityLevel: 'moderate',
    goal: 'maintain',
    dietPreferences: [],
  });

  const next = () => {
    if (step === 0 && (!data.age || !data.heightCm || !data.weightKg || !data.name)) {
      alert('Please fill in your name, age, height, and weight.');
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const finish = async () => {
    const id = getActiveProfileId();
    const profile: Profile = {
      id,
      name: data.name!.trim(),
      age: data.age!,
      sex: data.sex as Sex,
      heightCm: data.heightCm!,
      weightKg: data.weightKg!,
      activityLevel: data.activityLevel as ActivityLevel,
      goal: data.goal as Goal,
      dietPreferences: data.dietPreferences ?? [],
      onboardingDone: true,
      updatedAt: new Date().toISOString(),
    };
    await saveProfile(profile);
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4 py-10">
      <h1 className="text-center text-2xl font-bold">Welcome to FitX</h1>
      <p className="mb-6 text-center text-sm text-text-muted">Let's set up your profile</p>

      <div className="mb-6 flex justify-center gap-2">
        {STEPS.map((_, i) => (
          <div key={i} className={`h-1.5 w-8 rounded-full ${i <= step ? 'bg-accent' : 'bg-border'}`} />
        ))}
      </div>

      <div className="flex-1 rounded-2xl border border-border bg-card p-5">
        {step === 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Basic info</h3>
            <Field label="Your name">
              <input
                className="input"
                placeholder="e.g. Shravan"
                value={data.name || ''}
                onChange={(e) => setData({ ...data, name: e.target.value })}
              />
            </Field>
            <Field label="Age">
              <input
                type="number"
                className="input"
                placeholder="years"
                value={data.age ?? ''}
                onChange={(e) => setData({ ...data, age: +e.target.value })}
              />
            </Field>
            <Field label="Biological sex">
              <select
                className="input"
                value={data.sex}
                onChange={(e) => setData({ ...data, sex: e.target.value as Sex })}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </Field>
            <Field label="Height (cm)">
              <input
                type="number"
                className="input"
                placeholder="e.g. 175"
                value={data.heightCm ?? ''}
                onChange={(e) => setData({ ...data, heightCm: +e.target.value })}
              />
            </Field>
            <Field label="Current weight (kg)">
              <input
                type="number"
                step="0.1"
                className="input"
                placeholder="e.g. 72"
                value={data.weightKg ?? ''}
                onChange={(e) => setData({ ...data, weightKg: +e.target.value })}
              />
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Activity level</h3>
            {(
              [
                ['sedentary', 'Sedentary (little/no exercise)'],
                ['light', 'Light (1-2 days/week)'],
                ['moderate', 'Moderate (3-5 days/week)'],
                ['active', 'Active (6-7 days/week)'],
                ['very_active', 'Very active (intense daily)'],
              ] as [ActivityLevel, string][]
            ).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setData({ ...data, activityLevel: val })}
                className={`block w-full rounded-xl border p-3 text-left text-sm ${
                  data.activityLevel === val ? 'border-accent bg-accent/10 text-accent' : 'border-border'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Your goal</h3>
            {(
              [
                ['cut', '🔥 Cut — lose fat'],
                ['maintain', '⚖️ Maintain — stay the same'],
                ['bulk', '💪 Bulk — gain muscle'],
              ] as [Goal, string][]
            ).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setData({ ...data, goal: val })}
                className={`block w-full rounded-xl border p-3 text-left text-sm ${
                  data.goal === val ? 'border-accent bg-accent/10 text-accent' : 'border-border'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3 text-sm">
            <h3 className="font-semibold">Review</h3>
            <Row label="Name" value={data.name} />
            <Row label="Age" value={data.age} />
            <Row label="Height" value={`${data.heightCm} cm`} />
            <Row label="Weight" value={`${data.weightKg} kg`} />
            <Row label="Activity" value={data.activityLevel} />
            <Row label="Goal" value={data.goal} />
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-3">
        {step > 0 && (
          <button onClick={back} className="btn-secondary flex-1">
            Back
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button onClick={next} className="btn-primary flex-1">
            Next
          </button>
        ) : (
          <button onClick={finish} className="btn-primary flex-1">
            Finish
          </button>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-text-muted">{label}</span>
      {children}
    </label>
  );
}

function Row({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="flex justify-between border-b border-border pb-2">
      <span className="text-text-muted">{label}</span>
      <span className="font-medium">{String(value)}</span>
    </div>
  );
}
