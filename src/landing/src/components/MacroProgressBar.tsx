import React from 'react';
import { motion } from 'framer-motion';

interface MacroProgressBarProps {
  label: string;
  consumed: number;
  target: number;
  unit?: string;
  color: string; // Tailwind text color class, e.g. 'text-blue-400'
  trackColor: string; // Tailwind bg color class, e.g. 'bg-blue-400'
}

export const MacroProgressBar: React.FC<MacroProgressBarProps> = ({
  label,
  consumed,
  target,
  unit = 'g',
  color,
  trackColor,
}) => {
  const pct = target > 0 ? Math.min((consumed / target) * 100, 100) : 0;
  const isOver = consumed > target;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <span className={`text-xs font-bold uppercase tracking-wider ${color}`}>{label}</span>
        <span className="text-xs font-semibold text-text-muted">
          <span className={`font-bold ${isOver ? 'text-red-400' : 'text-white'}`}>
            {consumed.toFixed(1)}
          </span>
          {' / '}
          {target.toFixed(0)}{unit}
        </span>
      </div>
      <div className="h-2 bg-surface-edge rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${isOver ? 'bg-red-400' : trackColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
};
