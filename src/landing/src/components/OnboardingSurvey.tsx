import React, { useState } from 'react';
import {
  ACTIVITY_LABELS,
  GOAL_LABELS,
  type BiometricInput,
  type FitnessGoal,
  type ActivityLevel,
  type Gender,
  type MedicalCondition,
} from '../lib/macroCalc';
import { api, mapGender, mapGoal, mapActivity } from '../lib/api';

// ─── Sub-components ────────────────────────────────────────────────────────────

interface StepHeaderProps {
  step: number;
  total: number;
  title: string;
  subtitle: string;
}
const StepHeader: React.FC<StepHeaderProps> = ({ step, total, title, subtitle }) => (
  <div className="mb-8">
    {/* Progress dots */}
    <div className="flex items-center justify-center gap-3 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <React.Fragment key={i}>
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all duration-300 ${
              i + 1 < step
                ? 'bg-primary text-surface'
                : i + 1 === step
                ? 'bg-primary text-surface ring-4 ring-primary/30'
                : 'bg-surface-edge text-text-subtle'
            }`}
          >
            {i + 1 < step ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              i + 1
            )}
          </div>
          {i < total - 1 && (
            <div className={`flex-1 h-0.5 max-w-[40px] transition-all duration-300 ${i + 1 < step ? 'bg-primary' : 'bg-surface-edge'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
    <h2 className="text-2xl font-bold text-white mb-1">{title}</h2>
    <p className="text-text-subtle text-sm">{subtitle}</p>
  </div>
);

interface FieldProps {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}
const Field: React.FC<FieldProps> = ({ label, hint, required, children }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-semibold tracking-wider text-text-subtle uppercase">
      {label}{!required && <span className="ml-1 normal-case font-normal opacity-60">(optional)</span>}
    </label>
    {children}
    {hint && <p className="text-xs text-text-disabled">{hint}</p>}
  </div>
);

const inputClass = 'w-full bg-surface/50 border border-surface-edge rounded-xl px-4 py-3 text-white placeholder-text-subtle focus:outline-none focus:border-primary transition-colors';

// ─── Main Component ─────────────────────────────────────────────────────────────

const TOTAL_STEPS = 4;

const MEDICAL_OPTIONS: { value: MedicalCondition; label: string }[] = [
  { value: 'diabetes',     label: 'Diabetes' },
  { value: 'hypertension', label: 'Hypertension / High Blood Pressure' },
  { value: 'vegetarian',   label: 'Vegetarian' },
  { value: 'vegan',        label: 'Vegan' },
  { value: 'none',         label: 'None of the above' },
];

export const OnboardingSurvey: React.FC = () => {
  const [step, setStep]               = useState(1);
  const [age, setAge]                 = useState('');
  const [gender, setGender]           = useState<Gender>('male');
  const [weightKg, setWeightKg]       = useState('');
  const [heightCm, setHeightCm]       = useState('');
  const [bodyFat, setBodyFat]         = useState('');
  const [goal, setGoal]               = useState<FitnessGoal>('maintain');
  const [activity, setActivity]       = useState<ActivityLevel>('moderate');
  const [conditions, setConditions]   = useState<MedicalCondition[]>(['none']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError]             = useState('');

  const toggleCondition = (val: MedicalCondition) => {
    if (val === 'none') {
      setConditions(['none']);
      return;
    }
    setConditions(prev => {
      const without = prev.filter(c => c !== 'none');
      return without.includes(val) ? without.filter(c => c !== val) : [...without, val];
    });
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(s => Math.min(s + 1, TOTAL_STEPS));
  };

  const handleBack = () => setStep(s => Math.max(s - 1, 1));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // Map frontend enums → backend Prisma enums
      const payload = {
        height: Number(heightCm),
        weight: Number(weightKg),
        age: Number(age),
        gender: mapGender(gender),
        activityLevel: mapActivity(activity),
        goal: mapGoal(goal),
      };

      // Send to the backend — it calculates the macros and saves to DB
      const biometrics = await api.users.onboard(payload);

      // Cache in localStorage for the Dashboard to read immediately on next page
      localStorage.setItem('fithub_biometrics', JSON.stringify(biometrics));

      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message || 'Failed to save your profile. Please try again.');
      setIsSubmitting(false);
    }
  };

  // ── Step renders ────────────────────────────────────────────────────────────

  const renderStep1 = () => (
    <form onSubmit={handleNext} className="flex flex-col gap-5">
      <Field label="Your Age" required hint="Used to calculate your basal metabolic rate.">
        <input
          type="number" min="10" max="100" required
          value={age} onChange={e => setAge(e.target.value)}
          className={inputClass} placeholder="e.g. 24"
        />
      </Field>

      <Field label="Gender" required>
        <div className="grid grid-cols-3 gap-3">
          {(['male', 'female', 'other'] as Gender[]).map(g => (
            <button key={g} type="button" onClick={() => setGender(g)}
              className={`py-3 rounded-xl border text-sm font-semibold capitalize transition-all ${
                gender === g
                  ? 'bg-primary text-surface border-primary'
                  : 'bg-surface/50 border-surface-edge text-white hover:border-primary/60'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </Field>

      <NavButtons step={step} total={TOTAL_STEPS} onBack={handleBack} isLast={false} isSubmitting={false} />
    </form>
  );

  const renderStep2 = () => (
    <form onSubmit={handleNext} className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Weight" required hint="in kilograms">
          <input
            type="number" min="20" max="400" step="0.1" required
            value={weightKg} onChange={e => setWeightKg(e.target.value)}
            className={inputClass} placeholder="e.g. 72"
          />
        </Field>
        <Field label="Height" required hint="in centimetres">
          <input
            type="number" min="100" max="250" required
            value={heightCm} onChange={e => setHeightCm(e.target.value)}
            className={inputClass} placeholder="e.g. 175"
          />
        </Field>
      </div>

      <Field label="Body Fat %" hint="If known. Shown in your dashboard for tracking.">
        <input
          type="number" min="3" max="60" step="0.1"
          value={bodyFat} onChange={e => setBodyFat(e.target.value)}
          className={inputClass} placeholder="e.g. 18"
        />
      </Field>

      <NavButtons step={step} total={TOTAL_STEPS} onBack={handleBack} isLast={false} isSubmitting={false} />
    </form>
  );

  const renderStep3 = () => (
    <form onSubmit={handleNext} className="flex flex-col gap-6">
      <Field label="Your Goal" required>
        <div className="grid grid-cols-1 gap-3">
          {(Object.keys(GOAL_LABELS) as FitnessGoal[]).map(g => (
            <button key={g} type="button" onClick={() => setGoal(g)}
              className={`flex items-center gap-4 px-5 py-4 rounded-xl border text-left transition-all ${
                goal === g
                  ? 'border-primary bg-primary/10 text-white'
                  : 'border-surface-edge bg-surface/50 text-text-muted hover:border-primary/40'
              }`}
            >
              <div className={`w-4 h-4 rounded-full border-2 shrink-0 transition-all ${goal === g ? 'border-primary bg-primary' : 'border-surface-edge'}`} />
              <div>
                <p className="font-semibold text-white">{GOAL_LABELS[g].label}</p>
                <p className="text-xs text-text-subtle mt-0.5">{GOAL_LABELS[g].description}</p>
              </div>
            </button>
          ))}
        </div>
      </Field>

      <Field label="Activity Level" required>
        <div className="flex flex-col gap-2">
          {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map(a => (
            <button key={a} type="button" onClick={() => setActivity(a)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left text-sm transition-all ${
                activity === a
                  ? 'border-primary bg-primary/10 text-white'
                  : 'border-surface-edge bg-surface/50 text-text-muted hover:border-primary/40'
              }`}
            >
              <div className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 ${activity === a ? 'border-primary bg-primary' : 'border-surface-edge'}`} />
              {ACTIVITY_LABELS[a]}
            </button>
          ))}
        </div>
      </Field>

      <NavButtons step={step} total={TOTAL_STEPS} onBack={handleBack} isLast={false} isSubmitting={false} />
    </form>
  );

  const renderStep4 = () => (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Field label="Health & Dietary Notes" required hint="Select all that apply. This helps us tailor your macro recommendations.">
        <div className="flex flex-col gap-2">
          {MEDICAL_OPTIONS.map(opt => {
            const selected = conditions.includes(opt.value);
            return (
              <button key={opt.value} type="button" onClick={() => toggleCondition(opt.value)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left text-sm transition-all ${
                  selected
                    ? 'border-primary bg-primary/10 text-white'
                    : 'border-surface-edge bg-surface/50 text-text-muted hover:border-primary/40'
                }`}
              >
                <div className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-all ${selected ? 'border-primary bg-primary' : 'border-surface-edge'}`}>
                  {selected && (
                    <svg className="w-2.5 h-2.5 text-surface" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                {opt.label}
              </button>
            );
          })}
        </div>
      </Field>

      {error && (
        <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      <NavButtons step={step} total={TOTAL_STEPS} onBack={handleBack} isLast={true} isSubmitting={isSubmitting} />
    </form>
  );

  const steps: Record<number, { title: string; subtitle: string; content: React.ReactNode }> = {
    1: { title: 'Personal Info',  subtitle: 'Tell us a bit about yourself.',            content: renderStep1() },
    2: { title: 'Body Metrics',   subtitle: 'We\'ll use these to calculate your BMR.',   content: renderStep2() },
    3: { title: 'Your Goal',      subtitle: 'What are you training for?',                content: renderStep3() },
    4: { title: 'Health Notes',   subtitle: 'Any conditions or dietary preferences?',    content: renderStep4() },
  };

  const current = steps[step];

  return (
    <div className="w-full">
      <StepHeader step={step} total={TOTAL_STEPS} title={current.title} subtitle={current.subtitle} />
      {current.content}
    </div>
  );
};

// ─── Nav Buttons ────────────────────────────────────────────────────────────────

interface NavButtonsProps {
  step: number;
  total: number;
  onBack: () => void;
  isLast: boolean;
  isSubmitting: boolean;
}
const NavButtons: React.FC<NavButtonsProps> = ({ step, onBack, isLast, isSubmitting }) => (
  <div className="flex gap-3 pt-2">
    {step > 1 && (
      <button type="button" onClick={onBack}
        className="flex-1 py-3 rounded-xl border border-surface-edge text-text-muted font-semibold hover:border-primary/60 hover:text-white transition-all"
      >
        Back
      </button>
    )}
    <button
      type="submit"
      disabled={isSubmitting}
      className="flex-1 bg-primary text-surface font-bold py-3.5 rounded-xl hover:bg-primary-light transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
    >
      {isSubmitting && (
        <div className="w-4 h-4 border-2 border-surface border-t-transparent rounded-full animate-spin" />
      )}
      {isLast ? 'Calculate My Macros →' : 'Next →'}
    </button>
  </div>
);
