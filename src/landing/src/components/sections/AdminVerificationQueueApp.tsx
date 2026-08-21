import React, { useState, useEffect } from 'react';
import { api, type BackendCoachApplication } from '../../lib/api';

export const AdminVerificationQueueApp: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<BackendCoachApplication[]>([]);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadApplications = async () => {
    try {
      const apps = await api.coaches.getApplications();
      setApplications(apps);
    } catch (err: any) {
      setError(err.message || 'Failed to load verification applications.');
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('fithub_token');
    const userStr = localStorage.getItem('fithub_user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.role === 'ADMIN') {
          setIsAdmin(true);
          loadApplications().finally(() => setLoading(false));
          return;
        }
      } catch { /* ignore */ }
    }
    setLoading(false);
  }, []);

  const handleResolve = async (appId: string, approve: boolean) => {
    setResolvingId(appId);
    setError(null);
    try {
      await api.coaches.resolveApplication(appId, approve);
      await loadApplications();
      alert(`✓ Application ${approve ? 'Approved' : 'Declined'} successfully!`);
    } catch (err: any) {
      setError(err.message || 'Action failed. Please try again.');
    } finally {
      setResolvingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#13141c] text-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#13141c] text-white flex flex-col items-center justify-center gap-6 px-4 py-20">
        <span className="text-6xl">🚫</span>
        <h1 className="text-3xl font-extrabold text-center">Access Denied</h1>
        <p className="text-text-subtle text-center max-w-md">
          Only FITHub Administrators and Moderators are authorized to access the Coach Verification Queue.
        </p>
        <a
          href="/"
          className="bg-primary text-surface font-bold px-8 py-3.5 rounded-xl hover:bg-primary-light transition-all text-sm"
        >
          Return Home
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#13141c] text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-surface-edge/60 pb-6 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold font-mono tracking-tight text-primary">ADMIN VERIFICATION QUEUE</h1>
            <p className="text-text-muted text-sm mt-1">Review pending applications from Trainees requesting Coach credentials (UC-22).</p>
          </div>
          <span className="bg-primary/10 border border-primary/20 text-primary text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            {applications.length} Pending
          </span>
        </div>

        {error && (
          <div className="bg-red-950/20 border border-red-500/30 text-red-400 rounded-xl p-4 text-sm">
            {error}
          </div>
        )}

        {/* Application List */}
        {applications.length === 0 ? (
          <div className="bg-[#1e1f26] border border-surface-edge rounded-3xl p-16 text-center">
            <span className="text-5xl">📋</span>
            <p className="text-white font-bold text-lg mt-4">Verification Queue is Empty</p>
            <p className="text-text-muted text-sm mt-1">All coach verification requests have been resolved.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {applications.map((app) => (
              <div key={app.id} className="bg-[#1e1f26] border border-surface-edge hover:border-surface-edge/80 rounded-3xl p-6 transition-all space-y-6">
                
                {/* Applicant Row */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/20 text-primary border border-primary/30 rounded-full flex items-center justify-center font-black text-lg">
                      {app.user?.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{app.user?.name}</h3>
                      <p className="text-xs text-text-muted">{app.user?.email}</p>
                    </div>
                  </div>
                  <div className="text-right sm:text-left">
                    <span className="text-[10px] text-text-muted uppercase tracking-wider block">Requested Rates</span>
                    <span className="text-xl font-extrabold text-white">${app.hourlyRate}<span className="text-text-subtle font-normal text-xs">/mo</span></span>
                  </div>
                </div>

                {/* Specialties & Bio */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-surface-edge/30 text-sm">
                  <div>
                    <span className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-1">Declared Specialty</span>
                    <p className="text-white font-semibold">{app.specialty}</p>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-1">Professional Bio</span>
                    <p className="text-text-subtle leading-relaxed">{app.bio || 'No biography details provided.'}</p>
                  </div>
                </div>

                {/* Credentials & ID links */}
                <div className="bg-surface rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 border border-surface-edge/60">
                  <div>
                    <span className="text-xs text-text-muted block mb-2">Government-issued ID</span>
                    <a
                      href={app.idDocumentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline"
                    >
                      📄 View ID Document →
                    </a>
                  </div>
                  <div>
                    <span className="text-xs text-text-muted block mb-2">Training Certifications</span>
                    <a
                      href={app.certDocumentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline"
                    >
                      📜 View Certificate File →
                    </a>
                  </div>
                </div>

                {/* Resolve actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-surface-edge/30">
                  <button
                    disabled={resolvingId !== null}
                    onClick={() => handleResolve(app.id, false)}
                    className="bg-red-500/10 border border-red-500/20 text-red-400 font-bold px-6 py-2.5 rounded-xl text-xs hover:bg-red-500/20 transition-all disabled:opacity-50"
                  >
                    {resolvingId === app.id ? 'Loading...' : '✕ Decline'}
                  </button>
                  <button
                    disabled={resolvingId !== null}
                    onClick={() => handleResolve(app.id, true)}
                    className="bg-primary text-surface font-bold px-6 py-2.5 rounded-xl text-xs hover:bg-primary-light transition-all disabled:opacity-50"
                  >
                    {resolvingId === app.id ? 'Loading...' : '✓ Approve & Upgrade'}
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};
