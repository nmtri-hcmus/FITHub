import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  coachId: string;
  tier: string;
  price: number;
  onSuccess: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, coachId, tier, price, onSuccess }) => {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [name, setName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0; i < match.length; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!cardNumber || !expiry || !cvc || !name) {
      setError('Please fill in all fields.');
      return;
    }

    setIsProcessing(true);
    try {
      await api.coaches.subscribe(coachId, tier, { cardNumber, expiry, cvc, name, amount: price });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Payment failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-surface border border-surface-edge rounded-2xl shadow-2xl overflow-hidden"
        >
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Complete Subscription</h2>
              <button onClick={onClose} className="p-2 text-text-muted hover:text-white transition-colors rounded-full hover:bg-white/5">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="bg-surface-alt rounded-xl p-4 mb-6 border border-surface-edge">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-text-muted">Plan</span>
                <span className="text-white font-medium">{tier} Coaching</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Total Due Today</span>
                <span className="text-primary font-bold">${price.toFixed(2)}</span>
              </div>
            </div>

            <form onSubmit={handlePay} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wider">Cardholder Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full bg-surface-alt border border-surface-edge rounded-xl px-4 py-3 text-white placeholder:text-text-muted/50 focus:outline-none focus:border-primary transition-colors"
                  disabled={isProcessing}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wider">Card Number</label>
                <div className="relative">
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={e => setCardNumber(formatCardNumber(e.target.value))}
                    maxLength={19}
                    placeholder="0000 0000 0000 0000"
                    className="w-full bg-surface-alt border border-surface-edge rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-text-muted/50 focus:outline-none focus:border-primary transition-colors font-mono"
                    disabled={isProcessing}
                  />
                  <svg className="w-5 h-5 absolute left-3 top-3.5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <p className="text-[10px] text-text-muted mt-1.5 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                  Payments are secure and encrypted.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wider">Expiry</label>
                  <input
                    type="text"
                    value={expiry}
                    onChange={e => {
                      let val = e.target.value.replace(/[^0-9]/g, '');
                      if (val.length >= 2) val = val.substring(0,2) + '/' + val.substring(2,4);
                      setExpiry(val);
                    }}
                    maxLength={5}
                    placeholder="MM/YY"
                    className="w-full bg-surface-alt border border-surface-edge rounded-xl px-4 py-3 text-white placeholder:text-text-muted/50 focus:outline-none focus:border-primary transition-colors font-mono"
                    disabled={isProcessing}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wider">CVC</label>
                  <input
                    type="text"
                    value={cvc}
                    onChange={e => setCvc(e.target.value.replace(/[^0-9]/g, ''))}
                    maxLength={4}
                    placeholder="123"
                    className="w-full bg-surface-alt border border-surface-edge rounded-xl px-4 py-3 text-white placeholder:text-text-muted/50 focus:outline-none focus:border-primary transition-colors font-mono"
                    disabled={isProcessing}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full bg-primary hover:bg-primary-light text-surface font-bold py-3.5 rounded-xl transition-all shadow-[0_0_15px_rgba(213,255,95,0.2)] hover:shadow-[0_0_25px_rgba(213,255,95,0.4)] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 mt-2"
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 rounded-full border-2 border-surface/30 border-t-surface animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Pay $${price.toFixed(2)}`
                )}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
