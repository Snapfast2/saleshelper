'use client';
import { motion, Transition } from 'motion/react';

export type BorderTrailProps = {
  className?: string;
  size?: number;
  transition?: Transition;
  onAnimationComplete?: () => void;
  style?: React.CSSProperties;
};

export function BorderTrail({
  className,
  size = 60,
  transition,
  onAnimationComplete,
  style,
}: BorderTrailProps) {
  const defaultTransition: Transition = {
    repeat: Infinity,
    duration: 3,
    ease: 'linear',
  };

  return (
    <div className='pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden'>
      {/* Rotating gradient */}
      <motion.div
        className={`absolute inset-[-100%] ${className || ''}`}
        style={{
          background: 'conic-gradient(from 90deg at 50% 50%, transparent 50%, var(--trail-color, #22c55e) 100%)',
          ...style,
        }}
        animate={{ rotate: 360 }}
        transition={transition || defaultTransition}
        onAnimationComplete={onAnimationComplete}
      />
      {/* Inner blocker to create the border effect */}
      <div className='absolute inset-[1px] rounded-[inherit] bg-[var(--bg-card)]' />
    </div>
  );
}
