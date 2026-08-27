import React, { useState, useEffect, useCallback } from 'react';
import {
  api,
  type BackendCoachProfile,
  type BackendCoachReview,
  type BackendConsultation,
  type ConsultationStatus,
} from '../../lib/api';

// ── Helpers ────────────────────────────────────────────────────────────────────

function avgRating(reviews: BackendCoachReview[]): number {
  if (!reviews.length) return 0;
  return reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}

function specialtyLabel(specialty: string): string {
  const lower = specialty.toLowerCase();
  if (lower.includes('weight') || lower.includes('fat')) return 'Weight Loss Specialist';
  if (lower.includes('muscle') || lower.includes('strength')) return 'Muscle & Strength Coach';
  if (lower.includes('maintain') || lower.includes('performance')) return 'Fitness Maintenance';
  return specialty;
}

const STATUS_STYLES: Record<ConsultationStatus, { bg: string; text: string; label: string }> = {
  PENDING:   { bg: 'bg-amber-500/10 border-amber-500/20',   text: 'text-amber-400',   label: '⏳ Pending' },
  ACCEPTED:  { bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-400', label: '✓ Accepted' },
  REJECTED:  { bg: 'bg-red-950/20 border-red-500/30',       text: 'text-red-400',     label: '✕ Declined' },
  COMPLETED: { bg: 'bg-primary/10 border-primary/20',       text: 'text-primary',     label: '★ Completed' },
};

// ── Sub-components ─────────────────────────────────────────────────────────────

const StarRating: React.FC<{ value: number; onChange?: (v: number) => void; readonly?: boolean }> = ({
  value, onChange, readonly = false
}) => (
  <div className="flex items-center gap-1">
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        disabled={readonly}
        onClick={() => !readonly && onChange?.(star)}
        className={`text-xl transition-colors ${star <= value ? 'text-primary' : 'text-text-disabled'} ${!readonly ? 'hover:text-primary cursor-pointer' : 'cursor-default'}`}
      >
        ★
      </button>
    ))}
  </div>
);

// ── Main Component ─────────────────────────────────────────────────────────────

interface Props { coachId: string | undefined; }

export const CoachProfileApp: React.FC<Props> = ({ coachId }) => {
  const [coach, setCoach] = useState<BackendCoachProfile | null>(null);
  const [reviews, setReviews] = useState<BackendCoachReview[]>([]);
  const [consultations, setConsultations] = useState<BackendConsultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [hasSubscribed, setHasSubscribed] = useState(false);

  // Review state
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Consultation booking state
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Resolve coachId from URL if not passed as prop
  const resolvedCoachId = coachId ?? (typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('id') ?? undefined
    : undefined);

  const loadData = useCallback(async () => {
    if (!resolvedCoachId) return;
    setLoading(true);

    try {
      const profile = await api.coaches.getProfile(resolvedCoachId);
      setCoach(profile);
      setReviews(profile.user?.reviewsReceived ?? []);

      const token = localStorage.getItem('fithub_token');
      if (token) {
        setIsLoggedIn(true);
        const [subbed, myConsults] = await Promise.all([
          api.coaches.checkSubscription(resolvedCoachId),
          api.coaches.getMyConsultations(),
        ]);
        setHasSubscribed(subbed);
        // Only show consultations for THIS coach
        setConsultations(myConsults.filter((c) => c.coachId === resolvedCoachId));
      }
    } catch (err: any) {
      console.error('Failed to load coach profile:', err);
    } finally {
      setLoading(false);
    }
  }, [resolvedCoachId]);

  useEffect(() => { loadData(); }, [loadData]);


  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewText.trim() || !resolvedCoachId) return;
    setSubmittingReview(true);
    setReviewError(null);
    try {
      await api.coaches.addReview(resolvedCoachId, rating, reviewText);
      setReviewSuccess(true);
      setReviewText('');
      setRating(5);
      await loadData();
    } catch (err: any) {
      setReviewError(err.message || 'Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleBookConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingDate || !bookingTime || !resolvedCoachId) return;
    setBookingLoading(true);
    setBookingError(null);
    try {
      const scheduledAt = new Date(`${bookingDate}T${bookingTime}`).toISOString();
      await api.coaches.bookConsultation(resolvedCoachId, scheduledAt);
      setBookingSuccess(true);
      await loadData(); // Refresh consultations list
    } catch (err: any) {
      setBookingError(err.message || 'Booking failed. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!resolvedCoachId) return;
    setSubscribeLoading(true);
    setSubscribeError(null);
    try {
      const { url } = await api.coaches.subscribe(resolvedCoachId);
      if (url) window.location.href = url;
    } catch (err: any) {
      setSubscribeError(err.message || 'Payment failed. Please try again.');
      setSubscribeLoading(false);
    }
  };

  // ── Loading / Error states ─────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#13141c] text-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!coach) {
    return (
      <div className="min-h-screen bg-[#13141c] text-white flex flex-col items-center justify-center gap-4">
        <span className="text-5xl">🤔</span>
        <p className="text-xl font-bold">Coach profile not found</p>
        <a href="/coaches" className="bg-primary text-surface font-bold px-6 py-2.5 rounded-xl hover:bg-primary-light transition-colors">
          Back to Marketplace
        </a>
      </div>
    );
  }

  const rating_avg = avgRating(reviews);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#13141c] text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── LEFT / MAIN COLUMN ───────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Profile Header Card */}
          <div className="bg-[#1e1f26] border border-surface-edge rounded-3xl p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative">
              {/* Avatar */}
              <div className="w-28 h-28 rounded-3xl bg-primary/20 border border-primary/30 flex items-center justify-center text-5xl font-black text-primary shrink-0">
                {coach.user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 text-center sm:text-left">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div>
                    <h1 className="text-3xl font-extrabold">{coach.user.name}</h1>
                    <span className="inline-block bg-primary/10 text-primary text-xs font-black tracking-wider uppercase px-3 py-1 rounded-full mt-2">
                      {specialtyLabel(coach.specialty)}
                    </span>
                  </div>
                  {coach.isVerified && (
                    <span className="self-center sm:self-start bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                      ✓ Verified Coach
                    </span>
                  )}
                </div>

                {rating_avg > 0 && (
                  <div className="flex items-center gap-2 mt-3 justify-center sm:justify-start">
                    <StarRating value={Math.round(rating_avg)} readonly />
                    <span className="text-primary font-bold text-sm">{rating_avg.toFixed(1)}</span>
                    <span className="text-text-muted text-xs">({reviews.length} review{reviews.length !== 1 ? 's' : ''})</span>
                  </div>
                )}

                {coach.bio && (
                  <p className="text-text-subtle text-sm mt-4 leading-relaxed">{coach.bio}</p>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-[#1e1f26] border border-surface-edge rounded-3xl overflow-hidden">
            {/* Tab Nav */}
            <div className="flex border-b border-surface-edge/60">
              {[
                { key: 'reviews', label: `Reviews (${reviews.length})` },
                { key: 'credentials', label: 'Credentials' },
                { key: 'consultations', label: `My Bookings (${consultations.length})` },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as typeof activeTab)}
                  className={`flex-1 py-4 text-sm font-semibold transition-colors ${
                    activeTab === key
                      ? 'text-primary border-b-2 border-primary bg-primary/5'
                      : 'text-text-muted hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-8">

              {/* ── REVIEWS TAB ─────────────────────────────────────────────── */}
              {activeTab === 'reviews' && (
                <div className="space-y-8">
                  {/* Leave a Review */}
                  {isLoggedIn && hasSubscribed && (
                    <form onSubmit={handleAddReview} className="space-y-4 border-b border-surface-edge/60 pb-8">
                      <h4 className="text-sm font-bold text-text-subtle">Leave a Review</h4>
                      <StarRating value={rating} onChange={setRating} />
                      <textarea
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        placeholder="Share your experience with this coach..."
                        rows={3}
                        className="w-full bg-surface border border-surface-edge rounded-xl px-4 py-3 text-white placeholder-text-disabled focus:border-primary focus:outline-none transition-colors text-sm resize-none"
                      />
                      {reviewError && (
                        <p className="text-red-400 text-xs">{reviewError}</p>
                      )}
                      {reviewSuccess && (
                        <p className="text-emerald-400 text-xs">✓ Review submitted successfully!</p>
                      )}
                      <button
                        type="submit"
                        disabled={submittingReview || !reviewText.trim()}
                        className="bg-primary text-surface font-bold px-6 py-2.5 rounded-xl hover:bg-primary-light transition-all text-sm disabled:opacity-50 flex items-center gap-2"
                      >
                        {submittingReview && <div className="w-4 h-4 border-2 border-surface border-t-transparent rounded-full animate-spin" />}
                        Post Review
                      </button>
                    </form>
                  )}

                  {!isLoggedIn && (
                    <p className="text-text-muted text-sm border-b border-surface-edge/60 pb-6">
                      <a href="/login" className="text-primary hover:underline">Log in</a> to leave a review (requires an active subscription).
                    </p>
                  )}

                  {/* Review List */}
                  {reviews.length === 0 ? (
                    <div className="text-center py-8">
                      <span className="text-3xl">💬</span>
                      <p className="text-text-muted text-sm mt-3">No reviews yet. Be the first!</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {reviews.map((rev) => (
                        <div key={rev.id} className="border-b border-surface-edge/30 pb-6 last:border-0 last:pb-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white text-sm">{rev.user.name}</span>
                            <span className="text-text-muted text-xs">{formatDate(rev.createdAt)}</span>
                          </div>
                          <StarRating value={rev.rating} readonly />
                          {rev.text && <p className="text-text-subtle text-sm mt-2 leading-relaxed">{rev.text}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── CREDENTIALS TAB ─────────────────────────────────────────── */}
              {activeTab === 'credentials' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">Specialization</h4>
                    <p className="text-text-subtle text-sm leading-relaxed">
                      <span className="text-white font-bold">{specialtyLabel(coach.specialty)}</span> — {coach.specialty}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">Verification Status</h4>
                    {coach.isVerified ? (
                      <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                        <span className="text-2xl">✅</span>
                        <div>
                          <p className="text-emerald-400 font-bold text-sm">Credentials Verified</p>
                          <p className="text-text-muted text-xs">This coach's ID and certifications have been reviewed and approved by the FITHub moderation team.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                        <span className="text-2xl">⏳</span>
                        <div>
                          <p className="text-amber-400 font-bold text-sm">Verification Pending</p>
                          <p className="text-text-muted text-xs">This coach's credentials are under review by our moderation team.</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">Coach Profile Created</h4>
                    <p className="text-text-subtle text-sm">{formatDate(coach.createdAt)}</p>
                  </div>
                </div>
              )}

              {/* ── MY BOOKINGS TAB ─────────────────────────────────────────── */}
              {activeTab === 'consultations' && (
                <div className="space-y-4">
                  {!isLoggedIn ? (
                    <p className="text-text-muted text-sm text-center py-8">
                      <a href="/login" className="text-primary hover:underline">Log in</a> to view your consultation bookings.
                    </p>
                  ) : consultations.length === 0 ? (
                    <div className="text-center py-8">
                      <span className="text-3xl">📅</span>
                      <p className="text-text-muted text-sm mt-3">No consultations booked yet.</p>
                      <button
                        onClick={() => setIsBookingOpen(true)}
                        className="mt-4 bg-primary text-surface font-bold px-5 py-2.5 rounded-xl hover:bg-primary-light transition-all text-sm"
                      >
                        Book Your Free Consultation
                      </button>
                    </div>
                  ) : (
                    consultations.map((c) => {
                      const style = STATUS_STYLES[c.status] ?? STATUS_STYLES.PENDING;
                      return (
                        <div key={c.id} className={`border rounded-2xl p-5 ${style.bg}`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-white font-bold text-sm">
                                {new Date(c.scheduledAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                              </p>
                              <p className="text-text-muted text-xs mt-0.5">
                                {new Date(c.scheduledAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            <span className={`text-xs font-bold ${style.text}`}>{style.label}</span>
                          </div>
                          {c.status === 'ACCEPTED' && (
                            <p className="text-emerald-400 text-xs mt-3">
                              ✓ Your 15-minute consultation has been accepted. You'll receive a video call link soon.
                            </p>
                          )}
                          {c.status === 'REJECTED' && (
                            <p className="text-red-400 text-xs mt-3">
                              This consultation was declined. Feel free to book another time slot.
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

            </div>
          </div>
        </div>

        {/* ── RIGHT SIDEBAR ────────────────────────────────────────────────── */}
        <div className="space-y-6">
          <div className="bg-[#1e1f26] border border-surface-edge rounded-3xl p-8 sticky top-6 shadow-xl space-y-6">

            {/* Price */}
            <div>
              <h3 className="text-text-muted text-xs font-semibold uppercase tracking-wider">Monthly Plan</h3>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-extrabold">${coach.hourlyRate}</span>
                <span className="text-text-subtle text-sm">/month</span>
              </div>
              <p className="text-text-muted text-xs mt-3 leading-relaxed">
                Includes custom food & workout assignments, 1-on-1 messaging, and progress monitoring from your coach.
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              {hasSubscribed ? (
                <div className="w-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-center py-3.5 rounded-xl text-sm">
                  ✓ Active Subscription
                </div>
              ) : (
                <>
                  {subscribeError && (
                    <p className="text-red-400 text-xs text-center">{subscribeError}</p>
                  )}
                  {!isLoggedIn ? (
                    <a
                      href="/login"
                      className="block w-full bg-primary text-surface font-bold text-center py-3.5 rounded-xl hover:bg-primary-light transition-all text-sm"
                    >
                      Log In to Hire Coach
                    </a>
                  ) : (
                    <button
                      onClick={handleSubscribe}
                      disabled={subscribeLoading}
                      className="w-full bg-primary text-surface font-bold text-center py-3.5 rounded-xl hover:bg-primary-light transition-all text-sm disabled:opacity-70 flex items-center justify-center gap-2"
                    >
                      {subscribeLoading && <div className="w-4 h-4 border-2 border-surface border-t-transparent rounded-full animate-spin" />}
                      {subscribeLoading ? 'Redirecting...' : 'Hire Coach Now'}
                    </button>
                  )}
                </>
              )}

              <button
                onClick={() => { setIsBookingOpen(true); setBookingSuccess(false); setBookingError(null); }}
                disabled={!isLoggedIn}
                title={!isLoggedIn ? 'Log in to book a consultation' : undefined}
                className="w-full bg-surface border border-surface-edge text-center py-3.5 rounded-xl font-bold hover:border-primary transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Book Free Consultation
              </button>

              {!isLoggedIn && (
                <p className="text-text-muted text-xs text-center">
                  <a href="/login" className="text-primary hover:underline">Log in</a> to book consultations or subscribe.
                </p>
              )}
            </div>

            {/* Trust signals */}
            <div className="border-t border-surface-edge/60 pt-5 space-y-3">
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <span className="text-emerald-400">🔒</span> Secure payment via Stripe
              </div>
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <span className="text-primary">📅</span> Free 15-min consultation first
              </div>
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <span className="text-amber-400">⭐</span> Cancel anytime, no lock-in
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ── CONSULTATION BOOKING MODAL ────────────────────────────────────── */}
      {isBookingOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1e1f26] border border-surface-edge rounded-3xl p-6 max-w-md w-full relative">
            <button
              onClick={() => { setIsBookingOpen(false); setBookingSuccess(false); setBookingError(null); }}
              className="absolute top-4 right-4 text-text-muted hover:text-white text-xl leading-none"
            >
              ✕
            </button>
            <h3 className="text-xl font-bold mb-1">Book Free Consultation</h3>
            <p className="text-text-muted text-xs mb-6">
              Schedule a 15-minute introductory call with <span className="text-white font-semibold">{coach.user.name}</span> to align on your goals.
            </p>

            {bookingSuccess ? (
              <div className="text-center py-6 space-y-4">
                <span className="text-5xl">📅</span>
                <p className="text-white font-bold text-lg">Consultation Requested!</p>
                <p className="text-text-subtle text-sm">
                  Your request has been sent to {coach.user.name}. Check the <button onClick={() => { setIsBookingOpen(false); setActiveTab('consultations'); }} className="text-primary hover:underline font-semibold">My Bookings</button> tab to track status.
                </p>
                <button
                  onClick={() => { setIsBookingOpen(false); setBookingSuccess(false); setActiveTab('consultations'); }}
                  className="bg-primary text-surface font-bold w-full py-3 rounded-xl hover:bg-primary-light transition-all"
                >
                  View My Bookings
                </button>
              </div>
            ) : (
              <form onSubmit={handleBookConsultation} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full bg-surface border border-surface-edge rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                    Time
                  </label>
                  <input
                    type="time"
                    required
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    className="w-full bg-surface border border-surface-edge rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none transition-colors"
                  />
                </div>

                {bookingError && (
                  <div className="bg-red-950/20 border border-red-500/30 text-red-400 rounded-xl p-3 text-xs">
                    {bookingError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={bookingLoading || !bookingDate || !bookingTime}
                  className="bg-primary text-surface font-bold w-full py-3 rounded-xl hover:bg-primary-light transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {bookingLoading && <div className="w-4 h-4 border-2 border-surface border-t-transparent rounded-full animate-spin" />}
                  Confirm Booking Request
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
