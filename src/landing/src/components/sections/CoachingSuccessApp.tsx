import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';

export const CoachingSuccessApp: React.FC = () => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const session = params.get('session_id');
    setSessionId(session);

    if (session) {
      api.coaches.confirmPayment(session)
        .then(() => {
          setStatus('success');
        })
        .catch((err: any) => {
          console.error(err);
          setStatus('error');
          setErrorMsg(err.message || 'Verification failed. Please contact support.');
        });
    } else {
      // If no session_id is present (e.g. mock mode / manual navigation)
      setStatus('success');
    }
  }, []);

  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <div className="bg-[#12141a] border border-surface-edge rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#CCFF00]/10 rounded-full blur-3xl pointer-events-none" />
        
        {status === 'verifying' && (
          <div className="py-6">
            <div className="w-12 h-12 border-4 border-[#CCFF00] border-t-transparent rounded-full animate-spin mx-auto mb-6" />
            <h1 className="text-xl font-black uppercase text-white tracking-wider mb-3">
              Verifying Payment...
            </h1>
            <p className="text-text-muted text-sm leading-relaxed">
              Completing your subscription. Adding you to the coaching list.
            </p>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6 border border-red-500/20">
              ⚠️
            </div>
            <h1 className="text-2xl font-black uppercase text-white tracking-wider mb-3">
              Verification Failed
            </h1>
            <p className="text-text-muted text-sm leading-relaxed mb-6">
              {errorMsg}
            </p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <div className="w-16 h-16 bg-[#CCFF00]/10 text-[#CCFF00] rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6 border border-[#CCFF00]/20">
              🎉
            </div>

            <h1 className="text-2xl font-black uppercase text-white tracking-wider mb-3">
              Payment Successful!
            </h1>
            <p className="text-text-muted text-sm leading-relaxed mb-8">
              Thank you for subscribing! Your 1-on-1 coaching subscription is now active. You have been successfully added to the coaching roster.
            </p>
          </div>
        )}

        {sessionId && (
          <div className="bg-[#0a0d0e] border border-surface-edge rounded-xl p-3 mb-8">
            <span className="text-[10px] uppercase font-bold text-text-disabled tracking-wider block mb-1">
              Stripe Session ID
            </span>
            <span className="text-[11px] text-text-muted font-mono block truncate select-all">
              {sessionId}
            </span>
          </div>
        )}

        <div className="space-y-3">
          <a
            href="/coaching"
            className="block w-full bg-[#CCFF00] text-[#0A0D0E] font-black text-center py-3.5 rounded-xl hover:bg-[#d6ff33] transition-all text-sm uppercase tracking-wider"
          >
            Go to Coaching Portal
          </a>
          <a
            href="/dashboard"
            className="block w-full bg-surface border border-surface-edge text-text-muted font-bold text-center py-3.5 rounded-xl hover:border-[#CCFF00] hover:text-white transition-all text-sm uppercase tracking-wider"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
};
