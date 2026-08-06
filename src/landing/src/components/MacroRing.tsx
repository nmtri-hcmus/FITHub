import React from 'react';
import { motion } from 'framer-motion';

interface MacroRingProps {
  consumed: number;
  target: number;
  label?: string;
}

export const MacroRing: React.FC<MacroRingProps> = ({ consumed, target, label = 'kcal' }) => {
  const radius = 70;
  const stroke = 10;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const pct = target > 0 ? Math.min(consumed / target, 1) : 0;
  const offset = circumference - pct * circumference;
  const remaining = Math.max(target - consumed, 0);
  const isOver = consumed > target;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative" style={{ width: radius * 2, height: radius * 2 }}>
        {/* Track */}
        <svg width={radius * 2} height={radius * 2} className="rotate-[-90deg]">
          <circle
            stroke="rgba(69,69,82,0.5)"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          {/* Animated fill */}
          <motion.circle
            stroke={isOver ? '#ff6b6b' : '#D5FF5F'}
            fill="transparent"
            strokeWidth={stroke}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            strokeDasharray={`${circumference} ${circumference}`}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-black ${isOver ? 'text-red-400' : 'text-primary'}`}>
            {consumed.toLocaleString()}
          </span>
          <span className="text-xs text-text-subtle font-semibold">{label}</span>
        </div>
      </div>
      <div className="mt-3 text-center">
        <p className="text-white font-bold text-sm">{target.toLocaleString()} kcal target</p>
        <p className={`text-xs font-medium mt-0.5 ${isOver ? 'text-red-400' : 'text-text-muted'}`}>
          {isOver ? `${(consumed - target).toLocaleString()} over` : `${remaining.toLocaleString()} remaining`}
        </p>
      </div>
    </div>
  );
};
