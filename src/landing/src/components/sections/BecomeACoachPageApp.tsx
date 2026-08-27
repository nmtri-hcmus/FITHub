import React, { useState, useEffect } from 'react';
import { BecomeACoachModal } from '../BecomeACoachModal';
import { api, type BackendCoachApplication } from '../../lib/api';

export const BecomeACoachPageApp: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [application, setApplication] = useState<BackendCoachApplication | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkStatus = async () => {
    const token = localStorage.getItem('fithub_token');
    const userStr = localStorage.getItem('fithub_user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        setIsLoggedIn(true);
        setUserRole(user.role);

        // Fetch application status if they are not already a coach
        if (user.role !== 'COACH') {
          const app = await api.coaches.getMyApplication();
          setApplication(app);
        }
      } catch (err) {
        console.error('Failed to load application status:', err);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    setMounted(true);
    checkStatus();
  }, []);

  if (!mounted) return null;

  // Not logged in
  if (!userRole) {
    return (
      <div className="min-h-screen bg-[#13141c] text-white flex flex-col items-center justify-center gap-6 px-4 py-20">
        <span className="text-6xl">🔒</span>
        <h1 className="text-3xl font-extrabold text-center">Login Required</h1>
        <p className="text-text-subtle text-center max-w-md">
          Join our network of certified personal trainers. Apply by uploading your certifications for review.
        </p>
        <a
          href="/login"
          className="bg-primary text-surface font-bold px-8 py-3.5 rounded-xl hover:bg-primary-light transition-all text-sm"
        >
          Log In to Continue
        </a>
      </div>
    );
  }

  // Already a coach
  if (userRole === 'COACH') {
    return (
      <div className="min-h-screen bg-[#13141c] text-white flex flex-col items-center justify-center gap-6 px-4 py-20">
        <span className="text-6xl">✅</span>
        <h1 className="text-3xl font-extrabold text-center">You are a FITHub Coach!</h1>
        <p className="text-text-subtle text-center max-w-md">
          Your account is fully verified. You can manage your clients, view your logs, and assign plans directly in the Coaching Portal.
        </p>
        <div className="flex gap-4">
          <a
            href="/coaching"
            className="bg-primary text-surface font-bold px-8 py-3.5 rounded-xl hover:bg-primary-light transition-all text-sm"
          >
            Go to Coaching Portal
          </a>
          <button
            onClick={() => setShowModal(true)}
            className="bg-surface border border-surface-edge text-white font-bold px-8 py-3.5 rounded-xl hover:border-primary transition-all text-sm"
          >
            Edit Marketplace Profile
          </button>
        </div>

        <BecomeACoachModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            alert('Profile updated successfully!');
          }}
        />
      </div>
    );
  }

  // If application is pending
  if (application && application.status === 'PENDING') {
    return (
      <div className="min-h-screen bg-[#13141c] text-white flex flex-col items-center justify-center gap-6 px-4 py-20">
        <span className="text-6xl">⏳</span>
        <h1 className="text-3xl font-extrabold text-center">Application Under Review</h1>
        <p className="text-text-subtle text-center max-w-md leading-relaxed">
          Your application for the Coach role was submitted successfully and is currently in the review queue. 
          Moderators will verify your uploaded certificates shortly.
        </p>
        <div className="bg-[#1e1f26] border border-surface-edge rounded-2xl p-5 w-full max-w-md space-y-3 text-sm">
          <p className="font-bold border-b border-surface-edge/60 pb-2">Application Details:</p>
          <p><span className="text-text-muted">Specialty:</span> {application.specialty}</p>
          <p><span className="text-text-muted">Monthly Rate:</span> ${application.hourlyRate}/mo</p>
          <p><span className="text-text-muted">Submitted on:</span> {new Date(application.createdAt).toLocaleDateString()}</p>
        </div>
        <a
          href="/coaches"
          className="bg-surface border border-surface-edge text-white font-bold px-8 py-3.5 rounded-xl hover:border-primary transition-all text-sm"
        >
          Back to Marketplace
        </a>
      </div>
    );
  }

  // If application was rejected
  if (application && application.status === 'REJECTED') {
    return (
      <div className="min-h-screen bg-[#13141c] text-white flex flex-col items-center justify-center gap-6 px-4 py-20">
        <span className="text-6xl">❌</span>
        <h1 className="text-3xl font-extrabold text-center">Application Declined</h1>
        <p className="text-text-subtle text-center max-w-md leading-relaxed">
          Unfortunately, your coach application was declined by our moderation team. This is usually due to insufficient or unverifiable certifications.
        </p>
        <div className="flex gap-4">
          <button
            onClick={() => {
              setApplication(null); // Clear state to show form
              setShowModal(true);
            }}
            className="bg-primary text-surface font-bold px-8 py-3.5 rounded-xl hover:bg-primary-light transition-all text-sm"
          >
            Re-submit Application
          </button>
          <a
            href="/coaches"
            className="bg-surface border border-surface-edge text-white font-bold px-8 py-3.5 rounded-xl hover:border-primary transition-all text-sm"
          >
            Cancel
          </a>
        </div>
      </div>
    );
  }

  // Normal Trainee viewing the page — show apply modal
  return (
    <div className="min-h-screen bg-[#13141c] text-white flex flex-col items-center justify-center gap-6 px-4 py-20">
      <span className="text-6xl">🎓</span>
      <h1 className="text-3xl font-extrabold text-center font-mono tracking-tight text-primary">BECOME A FITHUB COACH</h1>
      <p className="text-text-subtle text-center max-w-md leading-relaxed">
        Unlock your coaching workspace, design customized meal & workout plans for clients, and offer premium 1-on-1 support.
      </p>
      <button
        onClick={() => setShowModal(true)}
        className="bg-primary text-surface font-bold px-8 py-3.5 rounded-xl hover:bg-primary-light transition-all text-sm"
      >
        Submit Verification Application
      </button>

      <BecomeACoachModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => {
          setShowModal(false);
          setSubmitted(true);
          checkStatus();
        }}
      />
    </div>
  );
};
