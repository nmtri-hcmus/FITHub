import React, { useState, useEffect } from 'react';
import { api, type BackendCoachProfile } from '../lib/api';

interface BecomeACoachModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (profile: BackendCoachProfile) => void;
}

export const BecomeACoachModal: React.FC<BecomeACoachModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [specialty, setSpecialty] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [existingProfile, setExistingProfile] = useState<BackendCoachProfile | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(false);

  // Load existing profile if the coach already has one
  useEffect(() => {
    if (!isOpen) return;
    setLoadingExisting(true);
    api.coaches.getMyProfile()
      .then((profile) => {
        if (profile) {
          setExistingProfile(profile);
          setSpecialty(profile.specialty);
          setHourlyRate(String(profile.hourlyRate));
          setBio(profile.bio ?? '');
        }
      })
      .catch(() => { /* No profile yet, that's fine */ })
      .finally(() => setLoadingExisting(false));
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!specialty.trim() || !hourlyRate) return;
    setLoading(true);
    setError(null);
    try {
      const profile = await api.coaches.upsertMyProfile({
        specialty: specialty.trim(),
        hourlyRate: Number(hourlyRate),
        bio: bio.trim() || undefined,
      });
      setSuccess(true);
      onSuccess?.(profile);
    } catch (err: any) {
      setError(err.message || 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1e1f26] border border-surface-edge rounded-3xl p-6 max-w-lg w-full relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-muted hover:text-white text-xl leading-none"
        >
          ✕
        </button>

        <h3 className="text-2xl font-bold mb-1">
          {existingProfile ? 'Update Your Coach Profile' : 'Become a Coach'}
        </h3>
        <p className="text-text-muted text-sm mb-6">
          {existingProfile
            ? 'Update your coaching details. Changes will be reviewed by our moderation team.'
            : 'Create your coach profile to appear in the FITHub marketplace. Your credentials will be reviewed before going live.'}
        </p>

        {loadingExisting ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : success ? (
          <div className="text-center py-8 space-y-4">
            <span className="text-5xl">🎉</span>
            <p className="text-white font-bold text-xl">Profile Submitted!</p>
            <p className="text-text-subtle text-sm max-w-sm mx-auto">
              Your coach profile is now pending verification. Our moderation team will review your credentials and approve it shortly.
            </p>
            <button
              onClick={onClose}
              className="bg-primary text-surface font-bold w-full py-3 rounded-xl hover:bg-primary-light transition-all"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Specialty */}
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                Specialty *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Weight Loss, Muscle Building, Athletic Performance..."
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="w-full bg-surface border border-surface-edge rounded-xl px-4 py-3 text-white placeholder-text-disabled focus:border-primary focus:outline-none transition-colors text-sm"
              />
              <p className="text-text-disabled text-xs mt-1">
                Describe your main area of expertise clearly — this is how trainees will find you.
              </p>
            </div>

            {/* Monthly Rate */}
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                Monthly Rate (USD) *
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted font-bold">$</span>
                <input
                  type="number"
                  required
                  min="10"
                  max="1000"
                  step="1"
                  placeholder="150"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  className="w-full bg-surface border border-surface-edge rounded-xl pl-8 pr-4 py-3 text-white placeholder-text-disabled focus:border-primary focus:outline-none transition-colors text-sm"
                />
              </div>
              <p className="text-text-disabled text-xs mt-1">
                The price trainees pay per month for your 1-on-1 coaching plan.
              </p>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                Bio / Description
              </label>
              <textarea
                rows={4}
                placeholder="Tell trainees about your background, certifications, training philosophy, and what makes you unique..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full bg-surface border border-surface-edge rounded-xl px-4 py-3 text-white placeholder-text-disabled focus:border-primary focus:outline-none transition-colors text-sm resize-none"
              />
            </div>

            {/* Verification notice */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-amber-400 text-xs">
              <p className="font-bold mb-1">📋 Verification Required</p>
              <p>After submitting, a FITHub moderator will review your profile and credentials. You'll appear in the marketplace only after approval. Please ensure your specialty and bio accurately reflect your qualifications.</p>
            </div>

            {error && (
              <div className="bg-red-950/20 border border-red-500/30 text-red-400 rounded-xl p-3 text-xs">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !specialty.trim() || !hourlyRate}
              className="w-full bg-primary text-surface font-bold py-3.5 rounded-xl hover:bg-primary-light transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading && <div className="w-4 h-4 border-2 border-surface border-t-transparent rounded-full animate-spin" />}
              {existingProfile ? 'Update Profile' : 'Submit Coach Profile'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
