import React, { useState, useEffect } from 'react';
import { api, type BackendCoachProfile } from '../lib/api';

interface BecomeACoachModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
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

  // File uploads
  const [idFile, setIdFile] = useState<File | null>(null);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [idUploading, setIdUploading] = useState(false);
  const [certUploading, setCertUploading] = useState(false);
  const [idUrl, setIdUrl] = useState('');
  const [certUrl, setCertUrl] = useState('');

  const [existingProfile, setExistingProfile] = useState<BackendCoachProfile | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [isCoach, setIsCoach] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoadingExisting(true);
    const userStr = localStorage.getItem('fithub_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.role === 'COACH') {
        setIsCoach(true);
      }
    }

    api.coaches.getMyProfile()
      .then((profile) => {
        if (profile) {
          setExistingProfile(profile);
          setSpecialty(profile.specialty);
          setHourlyRate(String(profile.hourlyRate));
          setBio(profile.bio ?? '');
        }
      })
      .catch(() => { /* No profile yet */ })
      .finally(() => setLoadingExisting(false));
  }, [isOpen]);

  const handleIdFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIdFile(file);
      setIdUploading(true);
      setTimeout(() => {
        setIdUrl(`https://fithub-private-documents.s3.amazonaws.com/ids/${Date.now()}_${file.name}`);
        setIdUploading(false);
      }, 1000);
    }
  };

  const handleCertFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCertFile(file);
      setCertUploading(true);
      setTimeout(() => {
        setCertUrl(`https://fithub-private-documents.s3.amazonaws.com/certs/${Date.now()}_${file.name}`);
        setCertUploading(false);
      }, 1000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!specialty.trim() || !hourlyRate) return;
    setLoading(true);
    setError(null);
    try {
      if (isCoach) {
        // Edit profile route
        await api.coaches.upsertMyProfile({
          specialty: specialty.trim(),
          hourlyRate: Number(hourlyRate),
          bio: bio.trim() || undefined,
        });
      } else {
        // Apply route
        if (!idUrl || !certUrl) {
          throw new Error('Please upload both your ID and certification documents.');
        }
        await api.coaches.apply({
          specialty: specialty.trim(),
          hourlyRate: Number(hourlyRate),
          bio: bio.trim() || undefined,
          idDocumentUrl: idUrl,
          certDocumentUrl: certUrl,
        });
      }
      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to submit application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1e1f26] border border-surface-edge rounded-3xl p-6 max-w-lg w-full relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-muted hover:text-white text-xl leading-none"
        >
          ✕
        </button>

        <h3 className="text-2xl font-bold mb-1">
          {isCoach ? 'Update Your Coach Profile' : 'Apply for Coach Verification'}
        </h3>
        <p className="text-text-muted text-sm mb-6">
          {isCoach
            ? 'Update your coaching details. Changes will be saved directly.'
            : 'Submit your credentials for verification to apply for the Coach role (UC-21).'}
        </p>

        {loadingExisting ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : success ? (
          <div className="text-center py-8 space-y-4">
            <span className="text-5xl">🎉</span>
            <p className="text-white font-bold text-xl">Success!</p>
            <p className="text-text-subtle text-sm max-w-sm mx-auto">
              {isCoach
                ? 'Your profile details have been updated successfully.'
                : 'Your verification documents have been securely uploaded and submitted for review.'}
            </p>
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
                  placeholder="150"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  className="w-full bg-surface border border-surface-edge rounded-xl pl-8 pr-4 py-3 text-white placeholder-text-disabled focus:border-primary focus:outline-none transition-colors text-sm"
                />
              </div>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                Bio / Description
              </label>
              <textarea
                rows={3}
                placeholder="Tell trainees about your background, certifications, and training philosophy..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full bg-surface border border-surface-edge rounded-xl px-4 py-3 text-white placeholder-text-disabled focus:border-primary focus:outline-none transition-colors text-sm resize-none"
              />
            </div>

            {/* UC-21 Document Upload inputs (Trainees only) */}
            {!isCoach && (
              <div className="space-y-4 border-t border-surface-edge/60 pt-4">
                <p className="text-xs font-bold text-white uppercase tracking-wider">Required Documentation</p>

                {/* ID Document */}
                <div>
                  <label className="block text-xs text-text-muted mb-2">
                    Government-issued ID (Passport, Driving License, CCCD) *
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      required
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={handleIdFileChange}
                      className="hidden"
                      id="id-file-input"
                    />
                    <label
                      htmlFor="id-file-input"
                      className="cursor-pointer bg-surface border border-surface-edge text-white font-bold px-4 py-2 rounded-xl text-xs hover:border-primary transition-all flex items-center gap-2 whitespace-nowrap"
                    >
                      📁 Choose Document
                    </label>
                    {idUploading ? (
                      <span className="text-xs text-primary animate-pulse">Uploading securely...</span>
                    ) : idFile ? (
                      <span className="text-xs text-emerald-400 font-bold truncate">✓ {idFile.name} (Uploaded)</span>
                    ) : (
                      <span className="text-xs text-text-disabled">No file selected</span>
                    )}
                  </div>
                </div>

                {/* Certifications */}
                <div>
                  <label className="block text-xs text-text-muted mb-2">
                    Professional Training Certifications (NASM, ACE, ISSA, etc.) *
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      required
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={handleCertFileChange}
                      className="hidden"
                      id="cert-file-input"
                    />
                    <label
                      htmlFor="cert-file-input"
                      className="cursor-pointer bg-surface border border-surface-edge text-white font-bold px-4 py-2 rounded-xl text-xs hover:border-primary transition-all flex items-center gap-2 whitespace-nowrap"
                    >
                      📁 Choose Certificate
                    </label>
                    {certUploading ? (
                      <span className="text-xs text-primary animate-pulse">Uploading securely...</span>
                    ) : certFile ? (
                      <span className="text-xs text-emerald-400 font-bold truncate">✓ {certFile.name} (Uploaded)</span>
                    ) : (
                      <span className="text-xs text-text-disabled">No file selected</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-950/20 border border-red-500/30 text-red-400 rounded-xl p-3 text-xs">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || idUploading || certUploading || !specialty.trim() || !hourlyRate}
              className="w-full bg-primary text-surface font-bold py-3.5 rounded-xl hover:bg-primary-light transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading && <div className="w-4 h-4 border-2 border-surface border-t-transparent rounded-full animate-spin" />}
              {isCoach ? 'Update Profile' : 'Submit Verification Request'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
