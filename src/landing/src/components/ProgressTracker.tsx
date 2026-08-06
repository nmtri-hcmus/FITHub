import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, type ProgressLog } from '../lib/api';

export const ProgressTracker: React.FC = () => {
  const [history, setHistory] = useState<ProgressLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [weight, setWeight] = useState<string>('');
  const [bodyFat, setBodyFat] = useState<string>('');
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchHistory = async () => {
    try {
      const data = await api.progress.history();
      setHistory(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load progress history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setPhotoBase64(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weight) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await api.progress.log(
        parseFloat(weight),
        bodyFat ? parseFloat(bodyFat) : undefined,
        photoBase64 || undefined
      );
      
      // Reset form
      setWeight('');
      setBodyFat('');
      setPhotoBase64(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      // Refresh history
      await fetchHistory();
    } catch (err: any) {
      setError(err.message || 'Failed to log progress');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 mt-10">
      
      {/* Log Form Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-surface-alt rounded-2xl border border-surface-edge p-6 md:p-8 relative overflow-hidden"
      >
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-primary/5 rounded-full blur-[40px] pointer-events-none" />
        
        <h3 className="text-xl font-bold text-white mb-6">Log Today's Progress</h3>
        
        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-6 items-end">
          <div className="flex-1 w-full flex flex-col gap-2">
            <label className="text-xs font-semibold text-text-subtle uppercase tracking-wider">Weight (kg) *</label>
            <input 
              type="number" 
              step="0.1"
              required
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="bg-surface border border-surface-edge rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none transition-colors"
              placeholder="e.g. 75.5"
            />
          </div>
          
          <div className="flex-1 w-full flex flex-col gap-2">
            <label className="text-xs font-semibold text-text-subtle uppercase tracking-wider">Body Fat % (Optional)</label>
            <input 
              type="number" 
              step="0.1"
              value={bodyFat}
              onChange={(e) => setBodyFat(e.target.value)}
              className="bg-surface border border-surface-edge rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none transition-colors"
              placeholder="e.g. 15.2"
            />
          </div>

          <div className="flex-1 w-full flex flex-col gap-2 relative">
            <label className="text-xs font-semibold text-text-subtle uppercase tracking-wider">Physique Photo</label>
            <input 
              type="file" 
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-surface border border-dashed border-surface-edge hover:border-primary/50 text-text-muted hover:text-primary transition-all rounded-xl px-4 py-3 flex items-center justify-center gap-2"
            >
              {photoBase64 ? (
                <span className="text-primary font-medium truncate">Photo Selected</span>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Upload Photo</span>
                </>
              )}
            </button>
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting || !weight}
            className="w-full md:w-auto bg-primary text-surface font-bold px-8 py-3.5 rounded-xl hover:bg-primary-light transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Logging...' : 'Save Log'}
          </button>
        </form>
        {error && <p className="text-red-400 mt-4 text-sm font-medium">{error}</p>}
      </motion.div>

      {/* History Section */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-subtle mb-4">Progress History</h3>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : history.length === 0 ? (
          <div className="border border-dashed border-surface-edge rounded-2xl p-10 text-center text-text-muted">
            No progress logs yet. Start tracking today!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {history.map((log, index) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-surface rounded-2xl border border-surface-edge overflow-hidden hover:border-primary/30 transition-colors"
                >
                  {log.photoUrl ? (
                    <div className="aspect-[4/3] bg-surface-alt relative border-b border-surface-edge">
                      <img 
                        src={log.photoUrl} 
                        alt={`Physique on ${new Date(log.date).toLocaleDateString()}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="aspect-[4/3] bg-surface-alt flex items-center justify-center border-b border-surface-edge text-text-muted/30">
                      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-white font-bold text-lg">{log.bodyWeight} kg</p>
                      <p className="text-text-subtle text-xs font-medium">
                        {new Date(log.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    {log.bodyFatPercent && (
                      <div className="text-right">
                        <p className="text-primary font-bold">{log.bodyFatPercent}%</p>
                        <p className="text-text-subtle text-xs font-medium">Body Fat</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};
