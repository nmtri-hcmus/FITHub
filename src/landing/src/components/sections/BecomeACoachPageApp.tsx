import React, { useState, useEffect } from 'react';
import { BecomeACoachModal } from '../BecomeACoachModal';

/**
 * Full-page wrapper for the Become a Coach flow.
 * Handles auth check and role verification before rendering the form.
 */
export const BecomeACoachPageApp: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showModal, setShowModal] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem('fithub_token');
    const userStr = localStorage.getItem('fithub_user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        setIsLoggedIn(true);
        setUserRole(user.role);
      } catch { /* ignore */ }
    }
  }, []);

  if (!mounted) return null;

  // Not logged in
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#13141c] text-white flex flex-col items-center justify-center gap-6 px-4 py-20">
        <span className="text-6xl">🏋️</span>
        <h1 className="text-3xl font-extrabold text-center">Become a FITHub Coach</h1>
        <p className="text-text-subtle text-center max-w-md">
          Join our network of certified personal trainers. You need a FITHub account with a Coach role to register.
        </p>
        <a
          href="/login"
          className="bg-primary text-surface font-bold px-8 py-3.5 rounded-xl hover:bg-primary-light transition-all"
        >
          Log In to Continue
        </a>
      </div>
    );
  }

  // Wrong role
  if (userRole !== 'COACH') {
    return (
      <div className="min-h-screen bg-[#13141c] text-white flex flex-col items-center justify-center gap-6 px-4 py-20">
        <span className="text-6xl">🔒</span>
        <h1 className="text-3xl font-extrabold text-center">Coach Role Required</h1>
        <p className="text-text-subtle text-center max-w-md">
          Your current account is set to <span className="text-white font-bold">{userRole}</span> role. 
          To create a coach profile, your account must have the COACH role. 
          Please contact our support team to upgrade your account.
        </p>
        <a
          href="/coaches"
          className="bg-surface border border-surface-edge text-white font-bold px-8 py-3.5 rounded-xl hover:border-primary transition-all"
        >
          Browse Coaches Instead
        </a>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#13141c] text-white flex flex-col items-center justify-center gap-6 px-4 py-20">
        <span className="text-6xl">🎉</span>
        <h1 className="text-3xl font-extrabold text-center">Profile Submitted!</h1>
        <p className="text-text-subtle text-center max-w-md">
          Your coach profile is now pending verification by our moderation team. You'll appear in the marketplace once approved.
        </p>
        <div className="flex gap-4">
          <a href="/coaches" className="bg-primary text-surface font-bold px-8 py-3.5 rounded-xl hover:bg-primary-light transition-all">
            Browse Marketplace
          </a>
          <button
            onClick={() => { setSubmitted(false); setShowModal(true); }}
            className="bg-surface border border-surface-edge text-white font-bold px-8 py-3.5 rounded-xl hover:border-primary transition-all"
          >
            Edit Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#13141c]">
      <BecomeACoachModal
        isOpen={showModal}
        onClose={() => window.location.href = '/coaches'}
        onSuccess={() => setSubmitted(true)}
      />
    </div>
  );
};
