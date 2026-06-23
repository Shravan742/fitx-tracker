import { useState } from 'react';
import type { ActivityLevel, Goal, Profile, Sex, Weekday } from '../types';
import { getActiveProfileId } from '../lib/storage';
import { useProfile } from '../lib/ProfileContext';

const STEPS = ['Basic info', 'Activity', 'Goal', 'Rest days', 'Budget', 'Review'] as const;

const WEEKDAYS: [Weekday, string][] = [
  ['monday', 'Mon'],
  ['tuesday', 'Tue'],
  ['wednesday', 'Wed'],
  ['thursday', 'Thu'],
  ['friday', 'Fri'],
  ['saturday', 'Sat'],
  ['sunday', 'Sun'],
];

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
    restDays: ['sunday'],
    weeklyBudget: 60,
  });

  const next = () => {
    if (step === 0 && (!data.age || !data.heightCm || !data.weightKg || !data.name)) {
      alert('Please fill in your name, age, height, and weight.');
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const toggleRestDay = (day: Weekday) => {
    const current = data.restDays ?? [];
    const updated = current.includes(day) ? current.filter((d) => d !== day) : [...current, day];
    setData({ ...data, restDays: updated });
  };

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
      restDays: data.restDays?.length ? data.restDays : ['sunday'],
      weeklyBudget: data.weeklyBudget ?? 60,
      onboardingDone: true,
      updatedAt: new Date().toISOString(),
    };
    await saveProfile(profile);
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4 py-10">
      <h1 className="text-center text-2xl font-bold">
        Welcome to <span className="gradient-text">FitX</span>
      </h1>
      <p className="mb-6 text-center text-sm text-text-muted">Let's set up your profile</p>

      <div className="mb-6 flex justify-center gap-2">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 w-7 rounded-full ${i <= step ? '' : 'bg-border'}`}
            style={i <= step ? { backgroundImage: 'linear-gradient(135deg, var(--color-accent), var(--color-accent2))' } : undefined}
          />
        ))}
      </div>

      <div className="flex-1 rounded-2xl border border-border bg-card p-5 card-glow">
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
          <div className="space-y-4">
            <h3 className="font-semibold">Rest / cooling days</h3>
            <p className="text-xs text-text-muted">
              Pick the day(s) you want off each week. We'll build your workout recommendations around the days you
              train — you can change this any time in your Profile.
            </p>
            <div className="grid grid-cols-4 gap-2">
              {WEEKDAYS.map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => toggleRestDay(val)}
                  className={`rounded-xl border p-3 text-center text-sm font-medium ${
                    data.restDays?.includes(val) ? 'border-accent bg-accent/10 text-accent' : 'border-border'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {!data.restDays?.length && (
              <p className="text-xs text-warn">Select at least one rest day, or training every day with no recovery isn't recommended.</p>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Weekly grocery budget</h3>
            <p className="text-xs text-text-muted">
              How much do you want to spend on groceries per week? We'll use this to keep your 7-day meal plan and
              shopping list within budget — you can adjust it any time.
            </p>
            <Field label="Weekly budget (€)">
              <input
                type="number"
                min={0}
                step={5}
                className="input"
                placeholder="e.g. 60"
                value={data.weeklyBudget ?? ''}
                onChange={(e) => setData({ ...data, weeklyBudget: +e.target.value })}
              />
            </Field>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-3 text-sm">
            <h3 className="font-semibold">Review</h3>
            <Row label="Name" value={data.name} />
            <Row label="Age" value={data.age} />
            <Row label="Height" value={`${data.heightCm} cm`} />
            <Row label="Weight" value={`${data.weightKg} kg`} />
            <Row label="Activity" value={data.activityLevel} />
            <Row label="Goal" value={data.goal} />
            <Row label="Rest days" value={(data.restDays ?? []).join(', ') || 'none'} />
            <Row label="Weekly budget" value={`€${data.weeklyBudget ?? 0}`} />
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
