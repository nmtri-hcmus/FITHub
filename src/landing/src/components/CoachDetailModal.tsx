import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, type CoachProfile, type CoachReview } from '../lib/api';
import { PaymentModal } from './PaymentModal';

interface CoachDetailModalProps {
  coachId: string | null;
  onClose: () => void;
}

export const CoachDetailModal: React.FC<CoachDetailModalProps> = ({ coachId, onClose }) => {
  const [coach, setCoach] = useState<CoachProfile | null>(null);
  const [reviews, setReviews] = useState<CoachReview[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedTier, setSelectedTier] = useState('');
  const [selectedPrice, setSelectedPrice] = useState(0);

  // New review form
  const [reviewComment, setReviewComment] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    if (!coachId) return;
    let mounted = true;
    setIsLoading(true);

    Promise.all([
      api.coaches.getProfile(coachId),
      api.coaches.getReviews(coachId),
      api.coaches.checkSubscription(coachId)
    ]).then(([profile, revs, subStatus]) => {
      if (mounted) {
        setCoach(profile);
        setReviews(revs);
        setIsSubscribed(subStatus);
        setIsLoading(false);
      }
    }).catch(() => {
      if (mounted) setIsLoading(false);
    });

    return () => { mounted = false; };
  }, [coachId]);

  const handleBookConsultation = async () => {
    if (!coachId) return;
    await api.coaches.bookConsultation(coachId);
    alert('Free consultation booked! The coach will contact you shortly.');
  };

  const handleSubscribeClick = (tier: string, price: number) => {
    if (isSubscribed) return;
    setSelectedTier(tier);
    setSelectedPrice(price);
    setShowPayment(true);
  };

  const handlePaymentSuccess = () => {
    setShowPayment(false);
    setIsSubscribed(true);
    alert('Subscription successful! Welcome to 1-on-1 coaching.');
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coachId || !reviewComment.trim()) return;
    
    setIsSubmittingReview(true);
    try {
      await api.coaches.addReview(coachId, reviewRating, reviewComment);
      const updatedRevs = await api.coaches.getReviews(coachId);
      setReviews(updatedRevs);
      setReviewComment('');
      setReviewRating(5);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (!coachId) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />

        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="relative w-full max-w-2xl bg-surface border-l border-surface-edge h-full shadow-2xl flex flex-col overflow-hidden"
        >
          {isLoading || !coach ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="relative h-48 bg-surface-alt flex-shrink-0">
                <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent z-10" />
                <button
                  onClick={onClose}
                  className="absolute top-4 left-4 z-20 p-2 bg-black/50 hover:bg-black/80 rounded-full text-white backdrop-blur-md transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="absolute -bottom-10 left-8 z-20 flex items-end gap-5">
                  <img src={coach.imageUrl} alt={coach.name} className="w-28 h-28 rounded-2xl border-4 border-surface shadow-xl object-cover" />
                  <div className="mb-2">
                    <h2 className="text-3xl font-bold text-white leading-tight">{coach.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="flex items-center text-yellow-400 text-sm font-bold bg-yellow-400/10 px-2 py-0.5 rounded">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                        {coach.rating.toFixed(1)}
                      </span>
                      <span className="text-primary text-sm font-bold tracking-wider">{coach.specialization.replace('_', ' ')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto pt-16 px-8 pb-32 custom-scrollbar">
                
                <section className="mb-10">
                  <h3 className="text-xl font-bold text-white mb-3">About Me</h3>
                  <p className="text-text-muted leading-relaxed">{coach.bio}</p>
                </section>

                <section className="mb-10">
                  <h3 className="text-xl font-bold text-white mb-3">Certifications</h3>
                  <div className="flex flex-wrap gap-2">
                    {coach.certifications.map((cert, i) => (
                      <div key={i} className="px-3 py-1.5 bg-surface-alt border border-surface-edge rounded-lg text-sm text-text-muted flex items-center gap-2">
                        <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>
                        {cert}
                      </div>
                    ))}
                    <div className="px-3 py-1.5 bg-surface-alt border border-surface-edge rounded-lg text-sm text-text-muted flex items-center gap-2">
                      <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {coach.experienceYrs} Years Exp.
                    </div>
                  </div>
                </section>

                <section className="mb-10">
                  <h3 className="text-xl font-bold text-white mb-4">Subscription Tiers</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Basic Tier */}
                    <div className="bg-surface border border-surface-edge rounded-2xl p-5 hover:border-primary/50 transition-colors flex flex-col">
                      <h4 className="font-bold text-white mb-1">Basic Plan</h4>
                      <p className="text-2xl font-black text-primary mb-4">${coach.price}<span className="text-sm text-text-muted font-normal">/mo</span></p>
                      <ul className="text-sm text-text-muted space-y-2 mb-6 flex-1">
                        <li className="flex items-start gap-2"><svg className="w-4 h-4 text-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>Custom Workout Plan</li>
                        <li className="flex items-start gap-2"><svg className="w-4 h-4 text-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>Monthly Check-ins</li>
                        <li className="flex items-start gap-2"><svg className="w-4 h-4 text-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>Macro Targets</li>
                      </ul>
                      {isSubscribed ? (
                        <button className="w-full py-2.5 rounded-xl font-bold bg-surface-edge text-white cursor-default">Active Contract</button>
                      ) : (
                        <button onClick={() => handleSubscribeClick('Basic', coach.price)} className="w-full py-2.5 rounded-xl font-bold bg-surface-alt border border-surface-edge text-white hover:bg-surface-edge transition-colors">Subscribe</button>
                      )}
                    </div>

                    {/* Premium Tier */}
                    <div className="bg-gradient-to-b from-primary/10 to-surface border border-primary/30 rounded-2xl p-5 hover:border-primary transition-colors flex flex-col relative overflow-hidden">
                      <div className="absolute top-0 right-0 bg-primary text-surface text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-bl-lg">Recommended</div>
                      <h4 className="font-bold text-white mb-1">Premium Plan</h4>
                      <p className="text-2xl font-black text-primary mb-4">${Math.round(coach.price * 1.5)}<span className="text-sm text-text-muted font-normal">/mo</span></p>
                      <ul className="text-sm text-text-muted space-y-2 mb-6 flex-1">
                        <li className="flex items-start gap-2"><svg className="w-4 h-4 text-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>Everything in Basic</li>
                        <li className="flex items-start gap-2"><svg className="w-4 h-4 text-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>Weekly Video Calls</li>
                        <li className="flex items-start gap-2"><svg className="w-4 h-4 text-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>24/7 Chat Support</li>
                        <li className="flex items-start gap-2"><svg className="w-4 h-4 text-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>Video Form Checking</li>
                      </ul>
                      {isSubscribed ? (
                        <button className="w-full py-2.5 rounded-xl font-bold bg-primary text-surface cursor-default shadow-[0_0_15px_rgba(213,255,95,0.3)]">Active Contract</button>
                      ) : (
                        <button onClick={() => handleSubscribeClick('Premium', Math.round(coach.price * 1.5))} className="w-full py-2.5 rounded-xl font-bold bg-primary text-surface hover:bg-primary-light transition-all shadow-[0_0_15px_rgba(213,255,95,0.2)]">Subscribe</button>
                      )}
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-xl font-bold text-white mb-4">Verified Reviews</h3>
                  
                  {isSubscribed && (
                    <form onSubmit={submitReview} className="mb-6 bg-surface-alt p-4 rounded-xl border border-surface-edge">
                      <h4 className="text-sm font-bold text-white mb-3">Leave a Review</h4>
                      <div className="flex gap-1 mb-3">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button key={star} type="button" onClick={() => setReviewRating(star)} className={`w-6 h-6 ${star <= reviewRating ? 'text-yellow-400' : 'text-surface-edge'}`}>
                            <svg fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={reviewComment}
                        onChange={e => setReviewComment(e.target.value)}
                        placeholder="Share your experience..."
                        className="w-full bg-surface border border-surface-edge rounded-lg px-3 py-2 text-white placeholder:text-text-muted/50 text-sm focus:border-primary focus:outline-none mb-3 resize-none"
                        rows={3}
                      />
                      <button type="submit" disabled={isSubmittingReview || !reviewComment.trim()} className="px-4 py-2 bg-primary text-surface text-sm font-bold rounded-lg hover:bg-primary-light disabled:opacity-50 transition-colors">
                        {isSubmittingReview ? 'Posting...' : 'Post Review'}
                      </button>
                    </form>
                  )}

                  <div className="space-y-4">
                    {reviews.map(review => (
                      <div key={review.id} className="bg-surface-alt p-4 rounded-xl border border-surface-edge">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white">{review.traineeName}</span>
                            <span className="text-xs text-text-muted bg-surface px-1.5 py-0.5 rounded border border-surface-edge">Verified</span>
                          </div>
                          <span className="text-xs text-text-muted">{review.date}</span>
                        </div>
                        <div className="flex gap-1 mb-2">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <svg key={i} className={`w-3.5 h-3.5 ${i < review.rating ? 'text-yellow-400' : 'text-surface-edge'}`} fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                          ))}
                        </div>
                        <p className="text-sm text-text-muted">{review.comment}</p>
                      </div>
                    ))}
                    {reviews.length === 0 && (
                      <p className="text-text-muted text-sm italic">No reviews yet.</p>
                    )}
                  </div>
                </section>
              </div>

              {/* Fixed Footer Bar */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-surface/80 backdrop-blur-lg border-t border-surface-edge">
                {!isSubscribed ? (
                  <button onClick={handleBookConsultation} className="w-full py-3.5 rounded-xl font-bold bg-white text-surface hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    Book Free 15-Min Consult
                  </button>
                ) : (
                  <button className="w-full py-3.5 rounded-xl font-bold bg-primary text-surface shadow-[0_0_15px_rgba(213,255,95,0.2)] hover:bg-primary-light transition-colors flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
                    Message Coach (Portal Unlocked)
                  </button>
                )}
              </div>
            </>
          )}
        </motion.div>
      </div>

      <PaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        coachId={coachId}
        tier={selectedTier}
        price={selectedPrice}
        onSuccess={handlePaymentSuccess}
      />
    </AnimatePresence>
  );
};
